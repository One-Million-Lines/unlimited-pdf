import { describe, it, expect } from 'vitest';
import { sanitizeFilename, stripExtension, outputName, uniqueName, pad } from '@/core/util/filename';

describe('filename helpers', () => {
  it('removes illegal characters', () => {
    expect(sanitizeFilename('a/b:c*?"<>|.pdf')).not.toMatch(/[/\\:*?"<>|]/);
  });

  it('falls back for empty or reserved names', () => {
    expect(sanitizeFilename('')).toBe('document');
    expect(sanitizeFilename('   ')).toBe('document');
    expect(sanitizeFilename('CON')).toBe('document');
  });

  it('strips a known extension case-insensitively', () => {
    expect(stripExtension('report.PDF')).toBe('report');
    expect(stripExtension('report.txt', 'txt')).toBe('report');
  });

  it('builds an output name from base + operation', () => {
    expect(outputName('report.pdf', 'merged')).toBe('report-merged.pdf');
    expect(outputName('scan.pdf', 'p001', 'jpg')).toBe('scan-p001.jpg');
  });

  it('produces collision-safe unique names', () => {
    const used = new Set<string>();
    expect(uniqueName('a.pdf', used)).toBe('a.pdf');
    expect(uniqueName('a.pdf', used)).toBe('a (2).pdf');
    expect(uniqueName('a.pdf', used)).toBe('a (3).pdf');
  });

  it('zero-pads numbers', () => {
    expect(pad(7, 3)).toBe('007');
    expect(pad(1234, 3)).toBe('1234');
  });
});
