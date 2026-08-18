/**
 * Create a PDF from images (spec §5.11). pdf-lib embeds JPEG and PNG natively.
 * WebP must be transcoded to PNG by the caller (done on-page via canvas) before
 * reaching this pure function, so the core stays Node-testable.
 *
 * Original JPEG bytes are embedded as-is (no recompression) when no transform
 * is requested, preserving quality and size.
 */
import { PDFDocument, type PDFImage } from 'pdf-lib';
import { savePdf } from './pdf-lib-util';
import { PAGE_SIZES, orient, type NamedPageSize } from './page-size';
import { throwIfAborted } from '../core/pipeline/types';

export interface ImageInput {
  bytes: Uint8Array;
  type: 'jpeg' | 'png';
  name?: string;
}

export interface ImagesToPdfOptions {
  pageSize: 'imageSize' | NamedPageSize;
  orientation: 'auto' | 'portrait' | 'landscape';
  marginPt: number;
  /** contain = fit inside page; cover = fill page (may crop). */
  fit: 'contain' | 'cover';
  signal?: AbortSignal;
  onProgress?: (done: number, total: number) => void;
}

export const DEFAULT_IMAGES_OPTIONS: ImagesToPdfOptions = {
  pageSize: 'a4',
  orientation: 'auto',
  marginPt: 24,
  fit: 'contain',
};

export async function imagesToPdf(images: ImageInput[], options: Partial<ImagesToPdfOptions> = {}): Promise<Uint8Array> {
  const opts = { ...DEFAULT_IMAGES_OPTIONS, ...options };
  if (images.length === 0) throw new Error('Add at least one image.');

  const doc = await PDFDocument.create();
  let done = 0;

  for (const img of images) {
    throwIfAborted(opts.signal);
    let embedded: PDFImage;
    if (img.type === 'jpeg') embedded = await doc.embedJpg(img.bytes);
    else if (img.type === 'png') embedded = await doc.embedPng(img.bytes);
    else throw new Error(`Unsupported image type for "${img.name ?? 'image'}".`);

    const iw = embedded.width;
    const ih = embedded.height;

    if (opts.pageSize === 'imageSize') {
      const m = Math.max(0, opts.marginPt);
      const page = doc.addPage([iw + m * 2, ih + m * 2]);
      page.drawImage(embedded, { x: m, y: m, width: iw, height: ih });
    } else {
      const base = PAGE_SIZES[opts.pageSize];
      const size = orient({ ...base }, opts.orientation, iw >= ih);
      const page = doc.addPage([size.width, size.height]);
      const m = Math.max(0, opts.marginPt);
      const availW = Math.max(1, size.width - m * 2);
      const availH = Math.max(1, size.height - m * 2);
      const scale =
        opts.fit === 'cover'
          ? Math.max(availW / iw, availH / ih)
          : Math.min(availW / iw, availH / ih);
      const w = iw * scale;
      const h = ih * scale;
      const x = (size.width - w) / 2;
      const y = (size.height - h) / 2;
      page.drawImage(embedded, { x, y, width: w, height: h });
    }

    done += 1;
    opts.onProgress?.(done, images.length);
  }

  return savePdf(doc);
}
