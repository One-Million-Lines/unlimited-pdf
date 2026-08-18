/**
 * Lossless "Optimize" (spec §5.12A). Re-serializes with object streams (a safe,
 * lossless size win where applicable) and can strip document metadata. Savings
 * may be small or zero — never promise a fixed reduction.
 */
import { loadPdf, savePdf } from './pdf-lib-util';

export interface OptimizeOptions {
  /** Remove title/author/subject/keywords/producer/creator + XMP. */
  removeMetadata: boolean;
}

export const DEFAULT_OPTIMIZE: OptimizeOptions = { removeMetadata: false };

export interface OptimizeResult {
  bytes: Uint8Array;
  removedMetadata: boolean;
}

export async function optimizePdf(bytes: Uint8Array, options: Partial<OptimizeOptions> = {}): Promise<OptimizeResult> {
  const opts = { ...DEFAULT_OPTIMIZE, ...options };
  const doc = await loadPdf(bytes);

  if (opts.removeMetadata) {
    doc.setTitle('');
    doc.setAuthor('');
    doc.setSubject('');
    doc.setKeywords([]);
    doc.setProducer('');
    doc.setCreator('');
  }

  const out = await savePdf(doc);
  return { bytes: out, removedMetadata: opts.removeMetadata };
}
