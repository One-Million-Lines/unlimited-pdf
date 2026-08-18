import { Icon } from '../../shared/icons';
import { getStore } from '../store';
import { Thumb } from './Thumb';
import type { EffectivePage } from '../../../core/documents/model';

/** Organize/viewer page grid: select, rotate, reorder, delete, duplicate. */
export function PageGrid({ pages, selection }: { pages: EffectivePage[]; selection: string[] }) {
  const store = getStore();
  const selected = new Set(selection);

  const move = (index: number, dir: -1 | 1) => {
    const to = index + dir;
    if (to < 0 || to >= pages.length) return;
    const order = pages.map((p) => p.instanceId);
    const [id] = order.splice(index, 1);
    order.splice(to, 0, id);
    store.reorder(order);
  };

  return (
    <div class="pagegrid" role="list" aria-label="Document pages">
      {pages.map((p, i) => (
        <div
          key={p.instanceId}
          role="listitem"
          class={`pagecard${selected.has(p.instanceId) ? ' selected' : ''}`}
          tabIndex={0}
          onClick={(e) => store.toggleSelect(p.instanceId, e.metaKey || e.ctrlKey || e.shiftKey)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              store.toggleSelect(p.instanceId, e.metaKey || e.ctrlKey || e.shiftKey);
            }
          }}
          aria-pressed={selected.has(p.instanceId)}
        >
          <div class="pick" aria-hidden="true">
            {selected.has(p.instanceId) ? <Icon name="check" size={13} /> : null}
          </div>
          <div class="reorder">
            <button class="btn btn-sm" title="Move left" aria-label="Move left" onClick={(e) => { e.stopPropagation(); move(i, -1); }}>‹</button>
            <button class="btn btn-sm" title="Move right" aria-label="Move right" onClick={(e) => { e.stopPropagation(); move(i, 1); }}>›</button>
          </div>
          <div class="thumb-wrap">
            <Thumb pageIndex={p.sourcePageIndex} addedRotation={p.addedRotation} />
          </div>
          <div class="pageno">Page {i + 1}</div>
        </div>
      ))}
    </div>
  );
}
