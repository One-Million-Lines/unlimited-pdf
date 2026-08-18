/**
 * Text watermark (spec §5.9). Drawn above page content with adjustable opacity,
 * rotation and color. Optionally tiled. Applied to all pages or a 1-based
 * selection. Watermarks are drawn in the page coordinate space.
 */
import { degrees, rgb, StandardFonts } from 'pdf-lib';
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

export interface WatermarkOptions {
  text: string;
  fontSize: number;
  colorHex: string;
  opacity: number;
  rotationDeg: number;
  fontKey: FontKey;
  tile: boolean;
  /** 1-based pages to mark; defaults to all pages. */
  pages?: number[];
  signal?: AbortSignal;
  onProgress?: (done: number, total: number) => void;
}

export const DEFAULT_WATERMARK: WatermarkOptions = {
  text: 'DRAFT',
  fontSize: 60,
  colorHex: '#e4453a',
  opacity: 0.18,
  rotationDeg: 45,
  fontKey: 'HelveticaBold',
  tile: false,
};

export async function addWatermark(bytes: Uint8Array, options: Partial<WatermarkOptions>): Promise<Uint8Array> {
  const opts = { ...DEFAULT_WATERMARK, ...options };
  if (!opts.text.trim()) throw new Error('Enter watermark text.');

  const doc = await loadPdf(bytes);
  const font = await doc.embedFont(FONT_MAP[opts.fontKey] ?? StandardFonts.HelveticaBold);
  const color = parseHexColor(opts.colorHex, { r: 0.9, g: 0.27, b: 0.23 });
  const pages = doc.getPages();
  const targetSet = opts.pages ? new Set(opts.pages) : null;

  const theta = (opts.rotationDeg * Math.PI) / 180;
  const textWidth = font.widthOfTextAtSize(opts.text, opts.fontSize);
  const textHeight = opts.fontSize * 0.72;

  let processed = 0;
  for (let idx = 0; idx < pages.length; idx++) {
    throwIfAborted(opts.signal);
    if (targetSet && !targetSet.has(idx + 1)) continue;
    const page = pages[idx];
    const { width, height } = page.getSize();

    if (opts.tile) {
      const stepX = Math.max(textWidth, 120) * 1.6;
      const stepY = Math.max(textHeight, 60) * 4;
      for (let y = 0; y < height + stepY; y += stepY) {
        for (let x = -stepX; x < width + stepX; x += stepX) {
          page.drawText(opts.text, {
            x,
            y,
            size: opts.fontSize,
            font,
            color: rgb(color.r, color.g, color.b),
            opacity: clamp01(opts.opacity),
            rotate: degrees(opts.rotationDeg),
          });
        }
      }
    } else {
      const cx = width / 2;
      const cy = height / 2;
      const dx = (textWidth / 2) * Math.cos(theta) - (textHeight / 2) * Math.sin(theta);
      const dy = (textWidth / 2) * Math.sin(theta) + (textHeight / 2) * Math.cos(theta);
      page.drawText(opts.text, {
        x: cx - dx,
        y: cy - dy,
        size: opts.fontSize,
        font,
        color: rgb(color.r, color.g, color.b),
        opacity: clamp01(opts.opacity),
        rotate: degrees(opts.rotationDeg),
      });
    }

    processed += 1;
    opts.onProgress?.(processed, targetSet ? targetSet.size : pages.length);
  }

  return savePdf(doc);
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 1;
  return Math.max(0, Math.min(1, n));
}

export { FONT_MAP as WATERMARK_FONTS };
