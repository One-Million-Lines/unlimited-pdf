import { describe, it, expect } from 'vitest';
import { pdfToCanvas, canvasToPdf, displaySizePt, normalizeRotation } from '@/core/util/coords';

const W = 400;
const H = 600;

describe('coordinate conversion', () => {
  it('normalizes arbitrary angles', () => {
    expect(normalizeRotation(-90)).toBe(270);
    expect(normalizeRotation(450)).toBe(90);
    expect(normalizeRotation(360)).toBe(0);
  });

  it('reports display size per rotation', () => {
    expect(displaySizePt(W, H, 0)).toEqual({ w: W, h: H });
    expect(displaySizePt(W, H, 90)).toEqual({ w: H, h: W });
    expect(displaySizePt(W, H, 180)).toEqual({ w: W, h: H });
    expect(displaySizePt(W, H, 270)).toEqual({ w: H, h: W });
  });

  for (const rotation of [0, 90, 180, 270] as const) {
    it(`round-trips PDF↔canvas at ${rotation}°`, () => {
      for (const [x, y] of [[0, 0], [W, 0], [0, H], [W, H], [123, 456]]) {
        const c = pdfToCanvas(x, y, W, H, rotation);
        const back = canvasToPdf(c.x, c.y, W, H, rotation);
        expect(back.x).toBeCloseTo(x, 6);
        expect(back.y).toBeCloseTo(y, 6);
      }
    });
  }

  it('maps the PDF origin (bottom-left) to the expected canvas corner', () => {
    // r=0: bottom-left (0,0) → top-left canvas is (0,H)
    expect(pdfToCanvas(0, 0, W, H, 0)).toEqual({ x: 0, y: H });
    // r=180: bottom-left → (W,0)
    expect(pdfToCanvas(0, 0, W, H, 180)).toEqual({ x: W, y: 0 });
  });

  it('applies scale to canvas pixels', () => {
    const c = pdfToCanvas(10, 20, W, H, 0, 2);
    expect(c).toEqual({ x: 20, y: (H - 20) * 2 });
    const back = canvasToPdf(c.x, c.y, W, H, 0, 2);
    expect(back.x).toBeCloseTo(10, 6);
    expect(back.y).toBeCloseTo(20, 6);
  });
});
