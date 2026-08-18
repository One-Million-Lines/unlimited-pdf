import { describe, it, expect } from 'vitest';
import { OperationGraph } from '@/core/operations/graph';
import { projectPages, collectOverlays, normalizeAngle } from '@/core/operations/project';
import type { Operation, OverlayObject } from '@/core/operations/types';
import type { PageRef } from '@/core/documents/model';

function refs(n: number): PageRef[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i}`,
    sourceDocumentId: 'd',
    sourcePageIndex: i,
    widthPt: 400,
    heightPt: 600,
    intrinsicRotation: 0,
  }));
}

describe('OperationGraph', () => {
  it('supports push, undo, redo with redo-tail truncation', () => {
    const g = new OperationGraph();
    const op = (id: string): Operation => ({ id, type: 'delete', pageInstanceIds: [id] });
    g.push(op('a'));
    g.push(op('b'));
    expect(g.applied().map((o) => o.id)).toEqual(['a', 'b']);
    expect(g.undo()).toBe(true);
    expect(g.applied().map((o) => o.id)).toEqual(['a']);
    g.push(op('c')); // truncates redo of 'b'
    expect(g.applied().map((o) => o.id)).toEqual(['a', 'c']);
    expect(g.redo()).toBe(false);
  });
});

describe('projectPages', () => {
  it('accumulates rotation on targeted pages', () => {
    const ops: Operation[] = [{ id: '1', type: 'rotate', pageInstanceIds: ['p0'], degrees: 90 }];
    const pages = projectPages(refs(2), ops);
    expect(pages[0].addedRotation).toBe(90);
    expect(pages[1].addedRotation).toBe(0);
  });

  it('deletes pages', () => {
    const ops: Operation[] = [{ id: '1', type: 'delete', pageInstanceIds: ['p1'] }];
    const pages = projectPages(refs(3), ops);
    expect(pages.map((p) => p.instanceId)).toEqual(['p0', 'p2']);
  });

  it('duplicates a page directly after the original', () => {
    const ops: Operation[] = [{ id: '1', type: 'duplicate', pageInstanceIds: ['p0'], newInstanceIds: ['dup0'] }];
    const pages = projectPages(refs(2), ops);
    expect(pages.map((p) => p.instanceId)).toEqual(['p0', 'dup0', 'p1']);
    expect(pages[1].sourcePageIndex).toBe(0);
  });

  it('reorders pages by instance id', () => {
    const ops: Operation[] = [{ id: '1', type: 'reorder', orderedInstanceIds: ['p2', 'p0', 'p1'] }];
    const pages = projectPages(refs(3), ops);
    expect(pages.map((p) => p.instanceId)).toEqual(['p2', 'p0', 'p1']);
  });

  it('composes rotate → duplicate → reorder deterministically', () => {
    const ops: Operation[] = [
      { id: '1', type: 'rotate', pageInstanceIds: ['p0'], degrees: 90 },
      { id: '2', type: 'duplicate', pageInstanceIds: ['p0'], newInstanceIds: ['dup0'] },
      { id: '3', type: 'reorder', orderedInstanceIds: ['dup0', 'p1', 'p0'] },
    ];
    const pages = projectPages(refs(2), ops);
    expect(pages.map((p) => p.instanceId)).toEqual(['dup0', 'p1', 'p0']);
    // The duplicate carries the rotation captured at duplication time.
    expect(pages.find((p) => p.instanceId === 'dup0')?.addedRotation).toBe(90);
  });
});

describe('collectOverlays', () => {
  it('groups overlays by page instance in insertion order', () => {
    const ov = (id: string, page: string): OverlayObject => ({
      id,
      type: 'text',
      pageInstanceId: page,
      rect: { x: 0, y: 0, width: 10, height: 10 },
      rotation: 0,
      opacity: 1,
      payload: {},
    });
    const ops: Operation[] = [
      { id: '1', type: 'overlay', object: ov('o1', 'p0') },
      { id: '2', type: 'overlay', object: ov('o2', 'p0') },
      { id: '3', type: 'overlay', object: ov('o3', 'p1') },
    ];
    const map = collectOverlays(ops);
    expect(map.get('p0')?.map((o) => o.id)).toEqual(['o1', 'o2']);
    expect(map.get('p1')?.map((o) => o.id)).toEqual(['o3']);
  });
});

describe('normalizeAngle', () => {
  it('snaps to 0/90/180/270', () => {
    expect(normalizeAngle(360)).toBe(0);
    expect(normalizeAngle(-90)).toBe(270);
    expect(normalizeAngle(450)).toBe(90);
  });
});
