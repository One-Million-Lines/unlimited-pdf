import { describe, it, expect } from 'vitest';
import { compilePlan, type CompilePage } from '@/tools/compile';
import type { OverlayObject } from '@/core/operations/types';
import { makeSamplePdf, reopen } from '../fixtures/pdf';

const noOverlays = new Map<string, OverlayObject[]>();

describe('compilePlan (organize export)', () => {
  it('reorders and deletes pages', async () => {
    const pdf = await makeSamplePdf([{ text: 'A' }, { text: 'B' }, { text: 'C' }]);
    const plan: CompilePage[] = [
      { sourcePageIndex: 2, addedRotation: 0, instanceId: 'c' },
      { sourcePageIndex: 0, addedRotation: 0, instanceId: 'a' },
    ];
    const out = await compilePlan(pdf, plan, noOverlays);
    const doc = await reopen(out);
    expect(doc.getPageCount()).toBe(2);
  });

  it('applies rotation on top of intrinsic rotation', async () => {
    const pdf = await makeSamplePdf([{ rotation: 90 }]);
    const plan: CompilePage[] = [{ sourcePageIndex: 0, addedRotation: 90, instanceId: 'a' }];
    const out = await compilePlan(pdf, plan, noOverlays);
    const doc = await reopen(out);
    expect(doc.getPage(0).getRotation().angle).toBe(180);
  });

  it('duplicates a page (same source, new instance)', async () => {
    const pdf = await makeSamplePdf([{ text: 'A' }, { text: 'B' }]);
    const plan: CompilePage[] = [
      { sourcePageIndex: 0, addedRotation: 0, instanceId: 'a' },
      { sourcePageIndex: 0, addedRotation: 0, instanceId: 'a-dup' },
      { sourcePageIndex: 1, addedRotation: 0, instanceId: 'b' },
    ];
    const out = await compilePlan(pdf, plan, noOverlays);
    expect((await reopen(out)).getPageCount()).toBe(3);
  });

  it('bakes a text overlay and reopens cleanly', async () => {
    const pdf = await makeSamplePdf([{}]);
    const overlay: OverlayObject = {
      id: 'o1',
      type: 'text',
      pageInstanceId: 'a',
      rect: { x: 40, y: 40, width: 300, height: 40 },
      rotation: 0,
      opacity: 1,
      payload: { text: 'Stamped', fontSize: 18, colorHex: '#e4453a', fontKey: 'Helvetica' },
    };
    const plan: CompilePage[] = [{ sourcePageIndex: 0, addedRotation: 0, instanceId: 'a' }];
    const out = await compilePlan(pdf, plan, new Map([['a', [overlay]]]));
    expect((await reopen(out)).getPageCount()).toBe(1);
  });

  it('refuses to compile zero pages', async () => {
    const pdf = await makeSamplePdf([{}]);
    await expect(compilePlan(pdf, [], noOverlays)).rejects.toThrow();
  });
});
