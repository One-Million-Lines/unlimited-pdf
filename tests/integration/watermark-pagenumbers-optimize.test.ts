import { describe, it, expect } from 'vitest';
import { addWatermark } from '@/tools/watermark';
import { addPageNumbers, formatLabel } from '@/tools/page-numbers';
import { optimizePdf } from '@/tools/optimize';
import { PDFDocument } from 'pdf-lib';
import { makeSamplePdf, reopen } from '../fixtures/pdf';

describe('watermark', () => {
  it('preserves page count and reopens', async () => {
    const pdf = await makeSamplePdf([{}, {}]);
    const out = await addWatermark(pdf, { text: 'DRAFT' });
    expect((await reopen(out)).getPageCount()).toBe(2);
  });

  it('rejects empty text', async () => {
    const pdf = await makeSamplePdf([{}]);
    await expect(addWatermark(pdf, { text: '   ' })).rejects.toThrow();
  });

  it('can target a subset of pages', async () => {
    const pdf = await makeSamplePdf([{}, {}, {}]);
    const out = await addWatermark(pdf, { text: 'X', pages: [2] });
    expect((await reopen(out)).getPageCount()).toBe(3);
  });
});

describe('page numbers', () => {
  it('formats labels with {n} and {total}', () => {
    expect(formatLabel('{n} / {total}', 3, 10)).toBe('3 / 10');
    expect(formatLabel('Page {n}', 1, 5)).toBe('Page 1');
  });

  it('adds numbers and reopens with same page count', async () => {
    const pdf = await makeSamplePdf([{}, {}]);
    const out = await addPageNumbers(pdf, { format: '{n}/{total}', position: 'bottom-center' });
    expect((await reopen(out)).getPageCount()).toBe(2);
  });
});

describe('optimize', () => {
  it('produces a valid PDF and can strip metadata', async () => {
    const src = await PDFDocument.create();
    src.addPage([300, 300]);
    src.setTitle('Secret title');
    src.setAuthor('Someone');
    const bytes = await src.save();

    const { bytes: out, removedMetadata } = await optimizePdf(bytes, { removeMetadata: true });
    expect(removedMetadata).toBe(true);
    const doc = await reopen(out);
    expect(doc.getTitle() ?? '').toBe('');
    expect(doc.getAuthor() ?? '').toBe('');
  });
});
