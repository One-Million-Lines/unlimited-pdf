/**
 * Test fixtures generated at runtime with pdf-lib so tests stay self-contained
 * (no binary blobs checked into the repo). Also provides tiny valid PNG/JPEG
 * byte arrays for image→PDF tests.
 */
import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';

export interface PageSpec {
  width?: number;
  height?: number;
  rotation?: 0 | 90 | 180 | 270;
  text?: string;
}

/** Build a multi-page PDF. Each page gets a visible label. */
export async function makeSamplePdf(pages: PageSpec[] = [{}, {}, {}]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  pages.forEach((spec, i) => {
    const page = doc.addPage([spec.width ?? 400, spec.height ?? 600]);
    if (spec.rotation) page.setRotation(degrees(spec.rotation));
    page.drawText(spec.text ?? `Page ${i + 1}`, { x: 40, y: 540, size: 24, font, color: rgb(0.1, 0.1, 0.1) });
  });
  return doc.save();
}

/** A minimal valid 1×1 red PNG. */
export function tinyPng(): Uint8Array {
  const b64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  return base64ToBytes(b64);
}

/** A minimal valid 1×1 JPEG (baseline, with SOF0 dimensions pdf-lib can read). */
export function tinyJpeg(): Uint8Array {
  const b64 =
    '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRof' +
    'Hh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAAB' +
    'AAAAAAAAAAAAAAAAAAAAA//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAT8Af//Z';
  return base64ToBytes(b64);
}

export function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Reopen bytes with pdf-lib and return the page count (structural sanity). */
export async function reopenPageCount(bytes: Uint8Array): Promise<number> {
  const doc = await PDFDocument.load(bytes);
  return doc.getPageCount();
}

export async function reopen(bytes: Uint8Array): Promise<PDFDocument> {
  return PDFDocument.load(bytes);
}
