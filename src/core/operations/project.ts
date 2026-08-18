/**
 * Pure projection of the operation graph onto an effective page list.
 * Given the initial pages and the applied operations, produce the ordered list
 * of effective pages (with accumulated rotation) plus the overlays anchored to
 * each effective page. This is used both for live preview and for export
 * compilation, guaranteeing the two never diverge.
 */
import type { EffectivePage, PageRef } from '../documents/model';
import type { Operation, OverlayObject } from './types';

export function projectPages(initial: PageRef[], ops: Operation[]): EffectivePage[] {
  let pages: EffectivePage[] = initial.map((p) => ({
    instanceId: p.id,
    sourcePageId: p.id,
    sourcePageIndex: p.sourcePageIndex,
    addedRotation: 0,
  }));

  for (const op of ops) {
    switch (op.type) {
      case 'rotate': {
        const set = new Set(op.pageInstanceIds);
        pages = pages.map((p) =>
          set.has(p.instanceId)
            ? { ...p, addedRotation: normalizeAngle(p.addedRotation + op.degrees) }
            : p,
        );
        break;
      }
      case 'delete': {
        const set = new Set(op.pageInstanceIds);
        pages = pages.filter((p) => !set.has(p.instanceId));
        break;
      }
      case 'duplicate': {
        const targets = new Set(op.pageInstanceIds);
        const newIds = [...op.newInstanceIds];
        const result: EffectivePage[] = [];
        for (const p of pages) {
          result.push(p);
          if (targets.has(p.instanceId)) {
            const nid = newIds.shift();
            if (nid) result.push({ ...p, instanceId: nid });
          }
        }
        pages = result;
        break;
      }
      case 'reorder': {
        const map = new Map(pages.map((p) => [p.instanceId, p]));
        const reordered: EffectivePage[] = [];
        for (const id of op.orderedInstanceIds) {
          const p = map.get(id);
          if (p) {
            reordered.push(p);
            map.delete(id);
          }
        }
        // Preserve any pages not referenced by the reorder (defensive).
        for (const p of pages) if (map.has(p.instanceId)) reordered.push(p);
        pages = reordered;
        break;
      }
      case 'overlay':
        break; // handled by collectOverlays
    }
  }

  return pages;
}

/** Overlays anchored to each effective page instance, in insertion order. */
export function collectOverlays(ops: Operation[]): Map<string, OverlayObject[]> {
  const byPage = new Map<string, OverlayObject[]>();
  for (const op of ops) {
    if (op.type !== 'overlay') continue;
    const list = byPage.get(op.object.pageInstanceId) ?? [];
    list.push(op.object);
    byPage.set(op.object.pageInstanceId, list);
  }
  return byPage;
}

/** Normalize any integer degrees to one of 0/90/180/270. */
export function normalizeAngle(deg: number): number {
  return ((Math.round(deg / 90) * 90) % 360 + 360) % 360;
}
