/**
 * pdf.js adapter (spec §7.3 processing adapters). Owns document parsing,
 * rendering and text extraction on the workspace page. pdf.js runs its own
 * worker for decode work; the worker asset is bundled locally (no remote code).
 */
import * as pdfjs from 'pdfjs-dist';
// Vite `?worker` import → a module Worker constructor for the bundled pdf.js worker.
import PdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?worker';
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';
import { assembleReadingOrder, type TextFragment } from '../core/util/reading-order';

let workerReady = false;
function ensureWorker(): void {
  if (workerReady) return;
  pdfjs.GlobalWorkerOptions.workerPort = new PdfjsWorker();
  workerReady = true;
}

export interface DocProperties {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string;
  creator?: string;
  producer?: string;
  creationDate?: string;
  modificationDate?: string;
  pdfVersion?: string;
  pageCount: number;
  encrypted: boolean;
  hasAcroForm: boolean;
}

export class PasswordRequiredError extends Error {
  constructor() {
    super('This PDF is password-protected.');
    this.name = 'PasswordRequiredError';
  }
}

/** Load a PDF into a pdf.js document. Throws PasswordRequiredError when needed. */
export async function loadDocument(bytes: Uint8Array, password?: string): Promise<PDFDocumentProxy> {
  ensureWorker();
  // pdf.js transfers ownership of the buffer; hand it a private copy so the
  // session's immutable original bytes are never detached.
  const data = bytes.slice();
  const task = pdfjs.getDocument({
    data,
    password,
    disableAutoFetch: true,
    disableStream: true,
  });
  try {
    return await task.promise;
  } catch (e) {
    const name = (e as { name?: string })?.name ?? '';
    if (name === 'PasswordException') throw new PasswordRequiredError();
    throw e;
  }
}

export async function getProperties(doc: PDFDocumentProxy): Promise<DocProperties> {
  const meta = await doc.getMetadata().catch(() => ({ info: {} as Record<string, unknown> }));
  const info = (meta.info ?? {}) as Record<string, unknown>;
  const perms = await doc.getPermissions().catch(() => null);
  return {
    title: str(info.Title),
    author: str(info.Author),
    subject: str(info.Subject),
    keywords: str(info.Keywords),
    creator: str(info.Creator),
    producer: str(info.Producer),
    creationDate: str(info.CreationDate),
    modificationDate: str(info.ModDate),
    pdfVersion: str(info.PDFFormatVersion),
    pageCount: doc.numPages,
    encrypted: perms !== null,
    hasAcroForm: Boolean(info.IsAcroFormPresent),
  };
}

function str(v: unknown): string | undefined {
  if (v === undefined || v === null || v === '') return undefined;
  return String(v);
}

export interface RenderImageOptions {
  dpi: number;
  format: 'png' | 'jpeg' | 'webp';
  quality?: number; // 0..1 for jpeg/webp
  background?: string | null; // null → transparent (png/webp only)
}

/** Render a page to an image Blob (used by PDF→images and raster compression). */
export async function renderPageToBlob(page: PDFPageProxy, opts: RenderImageOptions): Promise<Blob> {
  const scale = opts.dpi / 72;
  const viewport = page.getViewport({ scale });
  const width = Math.max(1, Math.ceil(viewport.width));
  const height = Math.max(1, Math.ceil(viewport.height));
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d') as OffscreenCanvasRenderingContext2D;
  const wantsBackground = opts.background ?? (opts.format === 'jpeg' ? '#ffffff' : null);
  if (wantsBackground) {
    ctx.fillStyle = wantsBackground;
    ctx.fillRect(0, 0, width, height);
  }
  await page.render({
    canvas: canvas as unknown as HTMLCanvasElement,
    canvasContext: ctx as unknown as CanvasRenderingContext2D,
    viewport,
  }).promise;
  const mime = opts.format === 'png' ? 'image/png' : opts.format === 'webp' ? 'image/webp' : 'image/jpeg';
  return canvas.convertToBlob({ type: mime, quality: opts.quality });
}

/** Render a page onto an on-screen canvas for the viewer/thumbnails. Returns the
 * pdf.js RenderTask so callers can cancel it when the view changes. */
export function renderPageToCanvas(
  page: PDFPageProxy,
  canvas: HTMLCanvasElement,
  scale: number,
  rotation?: number,
): { promise: Promise<void>; cancel(): void } {
  const viewport = page.getViewport(rotation === undefined ? { scale } : { scale, rotation });
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable.');
  const task = page.render({ canvas, canvasContext: ctx, viewport });
  return { promise: task.promise, cancel: () => task.cancel() };
}

/** Extract a single page's text in reading order. */
export async function extractPageText(page: PDFPageProxy): Promise<string> {
  const content = await page.getTextContent();
  const fragments: TextFragment[] = [];
  for (const item of content.items as Array<Record<string, unknown>>) {
    if (typeof item.str !== 'string') continue;
    const transform = item.transform as number[] | undefined;
    const x = transform ? transform[4] : 0;
    const y = transform ? transform[5] : 0;
    const height = transform ? Math.hypot(transform[2], transform[3]) || (item.height as number) || 10 : 10;
    fragments.push({ str: item.str as string, x, y, height, hasEOL: Boolean(item.hasEOL) });
  }
  return assembleReadingOrder(fragments);
}

export type { PDFDocumentProxy, PDFPageProxy };
