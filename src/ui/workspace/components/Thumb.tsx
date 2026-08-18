import { useEffect, useRef } from 'preact/hooks';
import { renderPageToCanvas } from '../../../lib/pdfjs';
import { getStore } from '../store';

/**
 * Renders a single PDF page into a canvas at thumbnail scale, applying the
 * page's intrinsic rotation plus any pending organize rotation. Cancels stale
 * renders when the page or rotation changes (spec §5.1).
 */
export function Thumb({ pageIndex, addedRotation, maxSize = 220 }: { pageIndex: number; addedRotation: number; maxSize?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const store = getStore();
    const doc = store.getDoc();
    const canvas = ref.current;
    if (!doc || !canvas) return;
    let task: { cancel(): void } | null = null;
    let disposed = false;

    (async () => {
      try {
        const page = await doc.getPage(pageIndex + 1);
        if (disposed) return;
        const rotation = (((page.rotate + addedRotation) % 360) + 360) % 360;
        const probe = page.getViewport({ scale: 1, rotation });
        const scale = maxSize / Math.max(probe.width, probe.height);
        const render = renderPageToCanvas(page, canvas, scale, rotation);
        task = render;
        await render.promise;
      } catch {
        /* render cancelled or page unavailable — ignore */
      }
    })();

    return () => {
      disposed = true;
      task?.cancel();
    };
  }, [pageIndex, addedRotation, maxSize]);

  return <canvas ref={ref} aria-hidden="true" />;
}
