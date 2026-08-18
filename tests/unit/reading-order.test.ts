import { describe, it, expect } from 'vitest';
import { assembleReadingOrder, type TextFragment } from '@/core/util/reading-order';

describe('assembleReadingOrder', () => {
  it('orders lines top-to-bottom and fragments left-to-right', () => {
    // PDF y is bottom-up, so the higher y is the top line.
    const frags: TextFragment[] = [
      { str: 'World', x: 60, y: 100, height: 10 },
      { str: 'Hello', x: 10, y: 100, height: 10 },
      { str: 'second', x: 10, y: 80, height: 10 },
      { str: 'line', x: 60, y: 80, height: 10 },
    ];
    expect(assembleReadingOrder(frags)).toBe('Hello World\nsecond line');
  });

  it('groups fragments on the same line within tolerance', () => {
    const frags: TextFragment[] = [
      { str: 'A', x: 10, y: 200.3, height: 12 },
      { str: 'B', x: 40, y: 199.8, height: 12 },
    ];
    expect(assembleReadingOrder(frags)).toBe('A B');
  });

  it('returns empty string for no fragments', () => {
    expect(assembleReadingOrder([])).toBe('');
  });

  it('collapses excessive blank lines', () => {
    const frags: TextFragment[] = [
      { str: 'top', x: 0, y: 500, height: 10 },
      { str: 'bottom', x: 0, y: 100, height: 10 },
    ];
    const out = assembleReadingOrder(frags);
    expect(out).toContain('top');
    expect(out).toContain('bottom');
    expect(out).not.toMatch(/\n{3,}/);
  });
});
