/**
 * Shared pdf-lib helpers: safe loading with encryption/damage classification,
 * and deterministic serialization.
 */
import { PDFDocument } from 'pdf-lib';
import { ToolError } from '../core/pipeline/types';

export interface LoadOptions {
  /** Attempt to ignore encryption (used only for read-only inspection). */
  ignoreEncryption?: boolean;
}

/** Load a PDF, mapping parser failures to actionable ToolError categories. */
export async function loadPdf(
  bytes: Uint8Array | ArrayBuffer,
  opts: LoadOptions = {},
): Promise<PDFDocument> {
  try {
    return await PDFDocument.load(bytes, {
      ignoreEncryption: opts.ignoreEncryption ?? false,
      updateMetadata: false,
    });
  } catch (e) {
    const name = (e as { name?: string })?.name ?? '';
    const message = (e as { message?: string })?.message ?? String(e);
    if (name === 'EncryptedPDFError' || /encrypt/i.test(message)) {
      throw new ToolError(
        'passwordRequired',
        'This PDF is password-protected. Opening or unlocking encrypted PDFs is not available in this version.',
      );
    }
    throw new ToolError(
      'damaged',
      'This PDF could not be read. It may be damaged or use a feature this version does not support.',
      message,
    );
  }
}

/**
 * Serialize with object streams for a smaller file. useObjectStreams packs
 * indirect objects together — a safe, lossless size win where applicable.
 */
export async function savePdf(doc: PDFDocument): Promise<Uint8Array> {
  return doc.save({ useObjectStreams: true, addDefaultPage: false });
}
