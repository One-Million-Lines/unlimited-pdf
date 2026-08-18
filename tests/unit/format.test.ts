import { describe, it, expect } from 'vitest';
import { formatBytes, percentChange, formatPercent, formatDuration } from '@/core/util/format';

describe('format helpers', () => {
  it('formats bytes', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1024)).toBe('1.0 KB');
    expect(formatBytes(1024 * 1024 * 3.5)).toBe('3.5 MB');
  });

  it('computes signed percent change', () => {
    expect(percentChange(1000, 500)).toBe(-50);
    expect(percentChange(1000, 1100)).toBeCloseTo(10);
    expect(percentChange(0, 100)).toBe(0);
  });

  it('formats percent with sign', () => {
    expect(formatPercent(-42)).toBe('-42%');
    expect(formatPercent(3)).toBe('+3%');
    expect(formatPercent(0)).toBe('0%');
  });

  it('formats durations', () => {
    expect(formatDuration(820)).toBe('820 ms');
    expect(formatDuration(3400)).toBe('3.4 s');
  });
});
