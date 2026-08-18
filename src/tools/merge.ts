/**
 * Merge multiple PDFs (and optional per-file page selections) into one, in the
 * given order. Page dimensions and rotations are preserved by copyPages.
 */
import { PDFDocument } from 'pdf-lib';
import { loadPdf, savePdf } from './pdf-lib-util';
import { throwIfAborted } from '../core/pipeline/types';

export interface MergeInput {
  bytes: Uint8Array;
  name: string;
  /** Optional 1-based page selection (order preserved). Defaults to all pages. */
  pages?: number[];
}

export interface MergeOptions {
  signal?: AbortSignal;
  onProgress?: (done: number, total: number) => void;
}

export async function mergePdfs(inputs: MergeInput[], opts: MergeOptions = {}): Promise<Uint8Array> {
  if (inputs.length === 0) throw new Error('Add at least one PDF to merge.');

  const out = await PDFDocument.create();
  let done = 0;
  const total = inputs.length;

  for (const input of inputs) {
    throwIfAborted(opts.signal);
    const doc = await loadPdf(input.bytes);
    const count = doc.getPageCount();
    const indices =
      input.pages && input.pages.length > 0
        ? input.pages.map((p) => p - 1)
        : Array.from({ length: count }, (_, i) => i);

    for (const i of indices) {
      if (i < 0 || i >= count) {
        throw new Error(`"${input.name}" has no page ${i + 1}.`);
      }
    }

    const copied = await out.copyPages(doc, indices);
    for (const page of copied) out.addPage(page);

    done += 1;
    opts.onProgress?.(done, total);
  }

  if (out.getPageCount() === 0) throw new Error('The merged document would have no pages.');
  return savePdf(out);
}
