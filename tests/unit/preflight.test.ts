import { describe, it, expect } from 'vitest';
import { preflightRaster, fittedDpi, sizeTier, MAX_CANVAS_SIDE } from '@/core/validation/preflight';

describe('raster preflight', () => {
  it('computes pixel size from points and DPI', () => {
    const pf = preflightRaster(612, 792, 72); // Letter at 72 DPI == points
    expect(pf.widthPx).toBe(612);
    expect(pf.heightPx).toBe(792);
    expect(pf.withinCanvasLimits).toBe(true);
    expect(pf.warn).toBe(false);
  });

  it('flags requests that exceed the canvas side limit', () => {
    const pf = preflightRaster(5000, 5000, 300);
    expect(pf.widthPx).toBeGreaterThan(MAX_CANVAS_SIDE);
    expect(pf.withinCanvasLimits).toBe(false);
    expect(pf.warn).toBe(true);
    expect(pf.reason).toBeTruthy();
  });

  it('fittedDpi reduces DPI until it fits', () => {
    const dpi = fittedDpi(5000, 5000, 300);
    expect(dpi).toBeLessThan(300);
    expect(preflightRaster(5000, 5000, dpi).withinCanvasLimits).toBe(true);
  });

  it('classifies size tiers', () => {
    expect(sizeTier(10 * 1024 * 1024)).toBe('normal');
    expect(sizeTier(300 * 1024 * 1024)).toBe('large');
    expect(sizeTier(600 * 1024 * 1024)).toBe('huge');
  });
});
