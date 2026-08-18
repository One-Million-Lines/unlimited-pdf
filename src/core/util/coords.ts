/**
 * Conversion between PDF point coordinates (origin bottom-left, y-up) in the
 * canonical *unrotated* page space and on-screen canvas coordinates (origin
 * top-left, y-down) for a page displayed at a given rotation and scale.
 *
 * PDF /Rotate is clockwise. Forward transforms (scale = 1), where W/H are the
 * unrotated page width/height in points:
 *   r=0   → (x, H-y)      display size (W, H)
 *   r=90  → (y, x)        display size (H, W)
 *   r=180 → (W-x, y)      display size (W, H)
 *   r=270 → (H-y, W-x)    display size (H, W)
 *
 * Every branch is covered by unit tests (spec §8/§13.1).
 */

export type Rotation = 0 | 90 | 180 | 270;

export interface Pt {
  x: number;
  y: number;
}

export interface Size {
  w: number;
  h: number;
}

export function normalizeRotation(deg: number): Rotation {
  const r = ((Math.round(deg / 90) * 90) % 360 + 360) % 360;
  return r as Rotation;
}

/** Displayed size in points for a page shown at the given rotation. */
export function displaySizePt(widthPt: number, heightPt: number, rotation: number): Size {
  const r = normalizeRotation(rotation);
  return r === 90 || r === 270 ? { w: heightPt, h: widthPt } : { w: widthPt, h: heightPt };
}

/** PDF point → canvas pixel (top-left origin), at the given rotation and scale. */
export function pdfToCanvas(
  x: number,
  y: number,
  widthPt: number,
  heightPt: number,
  rotation: number,
  scale = 1,
): Pt {
  const W = widthPt;
  const H = heightPt;
  let cx: number;
  let cy: number;
  switch (normalizeRotation(rotation)) {
    case 90:
      cx = y;
      cy = x;
      break;
    case 180:
      cx = W - x;
      cy = y;
      break;
    case 270:
      cx = H - y;
      cy = W - x;
      break;
    default:
      cx = x;
      cy = H - y;
  }
  return { x: cx * scale, y: cy * scale };
}

/** Canvas pixel (top-left origin) → PDF point, inverse of pdfToCanvas. */
export function canvasToPdf(
  cxPx: number,
  cyPx: number,
  widthPt: number,
  heightPt: number,
  rotation: number,
  scale = 1,
): Pt {
  const W = widthPt;
  const H = heightPt;
  const cx = cxPx / scale;
  const cy = cyPx / scale;
  let x: number;
  let y: number;
  switch (normalizeRotation(rotation)) {
    case 90:
      x = cy;
      y = cx;
      break;
    case 180:
      x = W - cx;
      y = cy;
      break;
    case 270:
      x = W - cy;
      y = H - cx;
      break;
    default:
      x = cx;
      y = H - cy;
  }
  return { x, y };
}
