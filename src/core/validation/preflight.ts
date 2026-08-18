/**
 * Memory and canvas preflight calculations (spec §7.5, §13.1).
 * Used before rasterizing a PDF page (PDF→images, raster compression) to warn
 * about requests likely to exceed safe canvas or memory limits.
 */

// Conservative browser canvas limits. Chrome caps a single dimension at 16384px
// and total area well below the theoretical maximum; we stay comfortably under.
export const MAX_CANVAS_SIDE = 16384;
export const MAX_CANVAS_AREA = 64_000_000; // ~8000×8000

export interface RasterPreflight {
  widthPx: number;
  heightPx: number;
  megapixels: number;
  /** Estimated peak RGBA bytes for one page bitmap. */
  estBytes: number;
  withinCanvasLimits: boolean;
  /** True when the render should warn/scale down before proceeding. */
  warn: boolean;
  reason?: string;
}

/**
 * Compute the pixel size and safety of rasterizing a page of the given point
 * size at a target DPI (PDF user space is 72 points-per-inch).
 */
export function preflightRaster(widthPt: number, heightPt: number, dpi: number): RasterPreflight {
  const scale = dpi / 72;
  const widthPx = Math.max(1, Math.round(widthPt * scale));
  const heightPx = Math.max(1, Math.round(heightPt * scale));
  const area = widthPx * heightPx;
  const megapixels = area / 1_000_000;
  const estBytes = area * 4; // RGBA

  const withinCanvasLimits =
    widthPx <= MAX_CANVAS_SIDE && heightPx <= MAX_CANVAS_SIDE && area <= MAX_CANVAS_AREA;

  let reason: string | undefined;
  if (!withinCanvasLimits) {
    reason =
      widthPx > MAX_CANVAS_SIDE || heightPx > MAX_CANVAS_SIDE
        ? `Requested size ${widthPx}×${heightPx}px exceeds the ${MAX_CANVAS_SIDE}px canvas limit.`
        : `Requested area ${megapixels.toFixed(0)} MP exceeds the safe canvas area.`;
  }

  return {
    widthPx,
    heightPx,
    megapixels,
    estBytes,
    withinCanvasLimits,
    warn: !withinCanvasLimits,
    reason,
  };
}

/**
 * Given a page size and target DPI that exceeds canvas limits, compute the
 * largest DPI that still fits, so the UI can offer to scale down instead of
 * failing.
 */
export function fittedDpi(widthPt: number, heightPt: number, dpi: number): number {
  let d = dpi;
  while (d > 12 && !preflightRaster(widthPt, heightPt, d).withinCanvasLimits) {
    d = Math.floor(d * 0.9);
  }
  return Math.max(12, d);
}

/** Soft guidance tier for a document of the given total byte size (spec §7.5). */
export type SizeTier = 'normal' | 'large' | 'huge';

export function sizeTier(totalBytes: number): SizeTier {
  const mb = totalBytes / (1024 * 1024);
  if (mb < 100) return 'normal';
  if (mb <= 500) return 'large';
  return 'huge';
}
