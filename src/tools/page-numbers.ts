/**
 * Page numbers / simple header-footer text (spec §5.9). Supports a format
 * string with {n} and {total} placeholders, a start number, six positions,
 * font, size, color and margin.
 */
import { rgb, StandardFonts, type PDFFont } from 'pdf-lib';
import { loadPdf, savePdf } from './pdf-lib-util';
import { parseHexColor } from '../core/util/color';
import { throwIfAborted } from '../core/pipeline/types';
import type { FontKey } from './compile';

const FONT_MAP: Record<FontKey, StandardFonts> = {
  Helvetica: StandardFonts.Helvetica,
  HelveticaBold: StandardFonts.HelveticaBold,
  TimesRoman: StandardFonts.TimesRoman,
  Courier: StandardFonts.Courier,
};

export type PagePosition =
  | 'top-left' | 'top-center' | 'top-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right';

export interface PageNumberOptions {
  format: string;
  startNumber: number;
  position: PagePosition;
  fontSize: number;
  colorHex: string;
  fontKey: FontKey;
  marginPt: number;
  /** 1-based pages to number; defaults to all. Numbering stays sequential by page index. */
  pages?: number[];
  signal?: AbortSignal;
  onProgress?: (done: number, total: number) => void;
}

export const DEFAULT_PAGE_NUMBERS: PageNumberOptions = {
  format: '{n} / {total}',
  startNumber: 1,
  position: 'bottom-center',
  fontSize: 11,
  colorHex: '#333333',
  fontKey: 'Helvetica',
  marginPt: 28,
};

export function formatLabel(format: string, n: number, total: number): string {
  return format.replaceAll('{n}', String(n)).replaceAll('{total}', String(total));
}

export async function addPageNumbers(bytes: Uint8Array, options: Partial<PageNumberOptions>): Promise<Uint8Array> {
  const opts = { ...DEFAULT_PAGE_NUMBERS, ...options };
  const doc = await loadPdf(bytes);
  const font: PDFFont = await doc.embedFont(FONT_MAP[opts.fontKey] ?? StandardFonts.Helvetica);
  const color = parseHexColor(opts.colorHex, { r: 0.2, g: 0.2, b: 0.2 });
  const pages = doc.getPages();
  const total = pages.length;
  const targetSet = opts.pages ? new Set(opts.pages) : null;

  let processed = 0;
  for (let idx = 0; idx < pages.length; idx++) {
    throwIfAborted(opts.signal);
    if (targetSet && !targetSet.has(idx + 1)) continue;
    const page = pages[idx];
    const { width, height } = page.getSize();
    const label = formatLabel(opts.format, opts.startNumber + idx, total);
    const textWidth = font.widthOfTextAtSize(label, opts.fontSize);
    const m = opts.marginPt;

    const isTop = opts.position.startsWith('top');
    const y = isTop ? height - m - opts.fontSize * 0.8 : m;

    let x: number;
    if (opts.position.endsWith('left')) x = m;
    else if (opts.position.endsWith('right')) x = width - m - textWidth;
    else x = (width - textWidth) / 2;

    page.drawText(label, {
      x,
      y,
      size: opts.fontSize,
      font,
      color: rgb(color.r, color.g, color.b),
    });

    processed += 1;
    opts.onProgress?.(processed, targetSet ? targetSet.size : total);
  }

  return savePdf(doc);
}
