import { describe, it, expect } from 'vitest';
import { mergePdfs } from '@/tools/merge';
import { makeSamplePdf, reopenPageCount } from '../fixtures/pdf';

describe('mergePdfs (load → merge → reopen)', () => {
  it('combines page counts in order', async () => {
    const a = await makeSamplePdf([{}, {}]); // 2 pages
    const b = await makeSamplePdf([{}, {}, {}]); // 3 pages
    const out = await mergePdfs([
      { bytes: a, name: 'a.pdf' },
      { bytes: b, name: 'b.pdf' },
    ]);
    expect(await reopenPageCount(out)).toBe(5);
  });

  it('honors per-file page selection', async () => {
    const a = await makeSamplePdf([{}, {}, {}, {}]); // 4 pages
    const out = await mergePdfs([{ bytes: a, name: 'a.pdf', pages: [1, 3] }]);
    expect(await reopenPageCount(out)).toBe(2);
  });

  it('rejects an empty input list', async () => {
    await expect(mergePdfs([])).rejects.toThrow();
  });

  it('reports a missing page in a selection', async () => {
    const a = await makeSamplePdf([{}, {}]);
    await expect(mergePdfs([{ bytes: a, name: 'a.pdf', pages: [5] }])).rejects.toThrow();
  });
});
