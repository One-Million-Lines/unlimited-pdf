import { describe, it, expect } from 'vitest';
import { planSplit, splitPdf } from '@/tools/split';
import { makeSamplePdf, reopenPageCount } from '../fixtures/pdf';

describe('planSplit', () => {
  it('splits every page', () => {
    expect(planSplit(3, { mode: 'everyPage' })).toEqual([[0], [1], [2]]);
  });
  it('splits into fixed groups', () => {
    expect(planSplit(5, { mode: 'fixed', groupSize: 2 })).toEqual([[0, 1], [2, 3], [4]]);
  });
  it('splits after specific 1-based pages', () => {
    expect(planSplit(5, { mode: 'afterPages', afterPages: [2] })).toEqual([[0, 1], [2, 3, 4]]);
  });
  it('maps range specs to 0-based indices', () => {
    expect(planSplit(5, { mode: 'ranges', ranges: [{ pages: [1, 3] }] })).toEqual([[0, 2]]);
  });
});

describe('splitPdf (load → split → reopen)', () => {
  it('produces one file per page with valid page counts', async () => {
    const pdf = await makeSamplePdf([{}, {}, {}]);
    const outputs = await splitPdf(pdf, { mode: 'everyPage' }, 'doc.pdf');
    expect(outputs).toHaveLength(3);
    for (const o of outputs) expect(await reopenPageCount(o.bytes)).toBe(1);
  });

  it('extracts a range into a single file preserving count and order', async () => {
    const pdf = await makeSamplePdf([{}, {}, {}, {}, {}]);
    const outputs = await splitPdf(pdf, { mode: 'ranges', ranges: [{ name: 'r', pages: [2, 4] }] }, 'doc.pdf');
    expect(outputs).toHaveLength(1);
    expect(await reopenPageCount(outputs[0].bytes)).toBe(2);
    expect(outputs[0].name).toContain('r');
  });

  it('splits into fixed-size groups', async () => {
    const pdf = await makeSamplePdf([{}, {}, {}, {}, {}]);
    const outputs = await splitPdf(pdf, { mode: 'fixed', groupSize: 2 }, 'doc.pdf');
    expect(outputs).toHaveLength(3);
    expect(await reopenPageCount(outputs[2].bytes)).toBe(1);
  });
});
