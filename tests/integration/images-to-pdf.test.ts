import { describe, it, expect } from 'vitest';
import { imagesToPdf } from '@/tools/images-to-pdf';
import { tinyPng, tinyJpeg, reopen } from '../fixtures/pdf';

describe('imagesToPdf (images → reopen)', () => {
  it('creates one page per image', async () => {
    const out = await imagesToPdf(
      [
        { bytes: tinyPng(), type: 'png' },
        { bytes: tinyJpeg(), type: 'jpeg' },
      ],
      { pageSize: 'a4' },
    );
    expect((await reopen(out)).getPageCount()).toBe(2);
  });

  it('supports image-sized pages', async () => {
    const out = await imagesToPdf([{ bytes: tinyPng(), type: 'png' }], { pageSize: 'imageSize', marginPt: 0 });
    const doc = await reopen(out);
    expect(doc.getPageCount()).toBe(1);
    const { width, height } = doc.getPage(0).getSize();
    expect(width).toBeGreaterThan(0);
    expect(height).toBeGreaterThan(0);
  });

  it('rejects an empty image list', async () => {
    await expect(imagesToPdf([], {})).rejects.toThrow();
  });
});
