/**
 * Split / extract pages. Produces one or more output PDFs, each a fresh
 * document built with copyPages so page fidelity is preserved.
 */
import { PDFDocument } from 'pdf-lib';
import { loadPdf, savePdf } from './pdf-lib-util';
import { pad, outputName } from '../core/util/filename';
import { throwIfAborted, type NamedBytes } from '../core/pipeline/types';

export type SplitSpec =
  | { mode: 'everyPage' }
  | { mode: 'fixed'; groupSize: number }
  | { mode: 'afterPages'; afterPages: number[] } // cut after these 1-based pages
  | { mode: 'ranges'; ranges: { name?: string; pages: number[] }[] }; // 1-based page lists

export interface SplitOptions {
  signal?: AbortSignal;
  onProgress?: (done: number, total: number) => void;
}

/** Build the list of page-index groups (0-based) for a given spec. */
export function planSplit(pageCount: number, spec: SplitSpec): number[][] {
  const all = Array.from({ length: pageCount }, (_, i) => i);
  switch (spec.mode) {
    case 'everyPage':
      return all.map((i) => [i]);
    case 'fixed': {
      const n = Math.max(1, Math.floor(spec.groupSize));
      const groups: number[][] = [];
      for (let i = 0; i < pageCount; i += n) groups.push(all.slice(i, i + n));
      return groups;
    }
    case 'afterPages': {
      const cuts = [...new Set(spec.afterPages.map((p) => p))].sort((a, b) => a - b);
      const groups: number[][] = [];
      let start = 0;
      for (const cut of cuts) {
        const end = cut; // cut after 1-based page `cut` → 0-based end index exclusive = cut
        if (end > start && end <= pageCount) {
          groups.push(all.slice(start, end));
          start = end;
        }
      }
      if (start < pageCount) groups.push(all.slice(start));
      return groups.filter((g) => g.length > 0);
    }
    case 'ranges':
      return spec.ranges.map((r) => r.pages.map((p) => p - 1));
  }
}

export async function splitPdf(
  bytes: Uint8Array,
  spec: SplitSpec,
  baseName: string,
  opts: SplitOptions = {},
): Promise<NamedBytes[]> {
  const src = await loadPdf(bytes);
  const pageCount = src.getPageCount();
  const groups = planSplit(pageCount, spec);
  if (groups.length === 0) throw new Error('Nothing to split with the current settings.');

  for (const group of groups) {
    for (const i of group) {
      if (i < 0 || i >= pageCount) throw new Error(`Page ${i + 1} does not exist.`);
    }
  }

  const width = String(groups.length).length;
  const outputs: NamedBytes[] = [];
  for (let g = 0; g < groups.length; g++) {
    throwIfAborted(opts.signal);
    const out = await PDFDocument.create();
    const copied = await out.copyPages(src, groups[g]);
    for (const page of copied) out.addPage(page);
    const bytesOut = await savePdf(out);

    const label =
      spec.mode === 'ranges' && spec.ranges[g]?.name
        ? spec.ranges[g].name!
        : `part-${pad(g + 1, width)}`;
    outputs.push({ name: outputName(baseName, label), bytes: bytesOut, mime: 'application/pdf' });
    opts.onProgress?.(g + 1, groups.length);
  }
  return outputs;
}
