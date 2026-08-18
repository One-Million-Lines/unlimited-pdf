/**
 * Dedicated worker for pdf-lib write operations (merge, split, compile,
 * images→PDF, watermark, page numbers, optimize). Keeps CPU-heavy
 * serialization off the UI thread and supports cooperative cancellation.
 */
/// <reference lib="webworker" />
import { mergePdfs } from '../tools/merge';
import { splitPdf } from '../tools/split';
import { imagesToPdf } from '../tools/images-to-pdf';
import { addWatermark } from '../tools/watermark';
import { addPageNumbers } from '../tools/page-numbers';
import { optimizePdf } from '../tools/optimize';
import { compilePlan } from '../tools/compile';
import { ToolError } from '../core/pipeline/types';
import type { WriteInbound, WriteResponse } from './protocol';

const ctx = self as unknown as DedicatedWorkerGlobalScope;
const controllers = new Map<string, AbortController>();

function post(msg: WriteResponse, transfer: Transferable[] = []): void {
  ctx.postMessage(msg, transfer);
}

ctx.onmessage = async (event: MessageEvent<WriteInbound>) => {
  const msg = event.data;
  if (msg.kind === 'cancel') {
    controllers.get(msg.id)?.abort();
    return;
  }

  const ac = new AbortController();
  controllers.set(msg.id, ac);
  const onProgress = (done: number, total: number) => post({ id: msg.id, type: 'progress', done, total });

  try {
    switch (msg.kind) {
      case 'merge': {
        const bytes = await mergePdfs(msg.inputs, { signal: ac.signal, onProgress });
        post({ id: msg.id, type: 'doneBytes', bytes }, [bytes.buffer]);
        break;
      }
      case 'compile': {
        const bytes = await compilePlan(msg.bytes, msg.pages, new Map(msg.overlays), {
          signal: ac.signal,
          onPage: onProgress,
        });
        post({ id: msg.id, type: 'doneBytes', bytes }, [bytes.buffer]);
        break;
      }
      case 'split': {
        const files = await splitPdf(msg.bytes, msg.spec, msg.baseName, { signal: ac.signal, onProgress });
        post({ id: msg.id, type: 'doneFiles', files }, files.map((f) => f.bytes.buffer));
        break;
      }
      case 'imagesToPdf': {
        const bytes = await imagesToPdf(msg.images, { ...msg.options, signal: ac.signal, onProgress });
        post({ id: msg.id, type: 'doneBytes', bytes }, [bytes.buffer]);
        break;
      }
      case 'watermark': {
        const bytes = await addWatermark(msg.bytes, { ...msg.options, signal: ac.signal, onProgress });
        post({ id: msg.id, type: 'doneBytes', bytes }, [bytes.buffer]);
        break;
      }
      case 'pageNumbers': {
        const bytes = await addPageNumbers(msg.bytes, { ...msg.options, signal: ac.signal, onProgress });
        post({ id: msg.id, type: 'doneBytes', bytes }, [bytes.buffer]);
        break;
      }
      case 'optimize': {
        const result = await optimizePdf(msg.bytes, msg.options);
        post({ id: msg.id, type: 'doneBytes', bytes: result.bytes, removedMetadata: result.removedMetadata }, [
          result.bytes.buffer,
        ]);
        break;
      }
    }
  } catch (err) {
    if (err instanceof ToolError) {
      post({ id: msg.id, type: 'error', category: err.category, message: err.message, detail: err.detail });
    } else {
      const message = (err as { message?: string })?.message ?? 'Unexpected error.';
      post({ id: msg.id, type: 'error', category: 'unknown', message });
    }
  } finally {
    controllers.delete(msg.id);
  }
};
