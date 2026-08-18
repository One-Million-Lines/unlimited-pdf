/**
 * Compile an operation plan into a fresh PDF (spec §7.4). Rebuilding the
 * document with pdf-lib's copyPages gives reliable page rearrangement,
 * rotation, duplication and deletion. Text overlays are baked into page content
 * at export time only.
 *
 * Note (honesty, spec §5.2): library-level page copying may not preserve some
 * advanced features (certain JavaScript, portfolios, some annotation types).
 * The UI surfaces this as a feature-loss note where relevant.
 */
import { PDFDocument, StandardFonts, degrees, rgb, type PDFFont } from 'pdf-lib';
import { loadPdf, savePdf } from './pdf-lib-util';
import { parseHexColor } from '../core/util/color';
import { normalizeAngle } from '../core/operations/project';
import type { OverlayObject } from '../core/operations/types';
import { throwIfAborted } from '../core/pipeline/types';

export interface CompilePage {
  sourcePageIndex: number;
  addedRotation: number;
  instanceId: string;
}

export interface TextOverlayPayload {
  text: string;
  fontSize: number;
  colorHex: string;
  fontKey: FontKey;
  lineHeight?: number;
}

export type FontKey = 'Helvetica' | 'HelveticaBold' | 'TimesRoman' | 'Courier';

const FONT_MAP: Record<FontKey, StandardFonts> = {
  Helvetica: StandardFonts.Helvetica,
  HelveticaBold: StandardFonts.HelveticaBold,
  TimesRoman: StandardFonts.TimesRoman,
  Courier: StandardFonts.Courier,
};

export interface CompileOptions {
  signal?: AbortSignal;
  onPage?: (done: number, total: number) => void;
}

/**
 * Build a new PDF from `bytes` given the effective page list and overlays.
 * Overlays are keyed by effective page instanceId.
 */
export async function compilePlan(
  bytes: Uint8Array,
  pages: CompilePage[],
  overlays: Map<string, OverlayObject[]>,
  opts: CompileOptions = {},
): Promise<Uint8Array> {
  if (pages.length === 0) {
    throw new Error('The document would have no pages. Keep at least one page.');
  }
  const src = await loadPdf(bytes);
  const out = await PDFDocument.create();

  const indices = pages.map((p) => p.sourcePageIndex);
  const srcCount = src.getPageCount();
  for (const i of indices) {
    if (i < 0 || i >= srcCount) throw new Error(`Internal error: page index ${i} out of range.`);
  }

  const copied = await out.copyPages(src, indices);
  const fontCache = new Map<FontKey, PDFFont>();

  for (let i = 0; i < pages.length; i++) {
    throwIfAborted(opts.signal);
    const plan = pages[i];
    const page = copied[i];

    const base = page.getRotation().angle;
    page.setRotation(degrees(normalizeAngle(base + plan.addedRotation)));
    out.addPage(page);

    const pageOverlays = overlays.get(plan.instanceId);
    if (pageOverlays && pageOverlays.length > 0) {
      for (const ov of pageOverlays) {
        if (ov.type === 'text') {
          await drawTextOverlay(out, page, ov, fontCache);
        }
        // Other overlay types are defined in the model but not baked in Phase 1.
      }
    }
    opts.onPage?.(i + 1, pages.length);
  }

  return savePdf(out);
}

async function drawTextOverlay(
  doc: PDFDocument,
  page: import('pdf-lib').PDFPage,
  ov: OverlayObject,
  cache: Map<FontKey, PDFFont>,
): Promise<void> {
  const payload = ov.payload as TextOverlayPayload;
  const fontKey: FontKey = payload.fontKey in FONT_MAP ? payload.fontKey : 'Helvetica';
  let font = cache.get(fontKey);
  if (!font) {
    font = await doc.embedFont(FONT_MAP[fontKey]);
    cache.set(fontKey, font);
  }
  const color = parseHexColor(payload.colorHex, { r: 0, g: 0, b: 0 });
  const size = Math.max(1, payload.fontSize || 12);
  const lineHeight = (payload.lineHeight ?? 1.2) * size;
  const lines = String(payload.text ?? '').split('\n');

  // rect.y is the bottom of the box in unrotated PDF points; draw lines from the
  // top down so the first line sits at the top of the box.
  let y = ov.rect.y + ov.rect.height - size;
  for (const line of lines) {
    page.drawText(line, {
      x: ov.rect.x,
      y,
      size,
      font,
      color: rgb(color.r, color.g, color.b),
      opacity: clamp01(ov.opacity),
      rotate: degrees(ov.rotation || 0),
    });
    y -= lineHeight;
  }
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 1;
  return Math.max(0, Math.min(1, n));
}
