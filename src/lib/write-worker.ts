/**
 * Main-thread client for the pdf-write worker. Provides a typed, promise-based
 * API with per-job progress and cancellation. Input buffers are copied then
 * transferred, so the session's immutable original bytes are never detached.
 */
import type { WriteRequest, WriteResponse, WriteInbound } from '../workers/protocol';
import { ToolError, type NamedBytes } from '../core/pipeline/types';
import type { MergeInput } from '../tools/merge';
import type { SplitSpec } from '../tools/split';
import type { ImageInput, ImagesToPdfOptions } from '../tools/images-to-pdf';
import type { WatermarkOptions } from '../tools/watermark';
import type { PageNumberOptions } from '../tools/page-numbers';
import type { OptimizeOptions } from '../tools/optimize';
import type { CompilePage } from '../tools/compile';
import type { OverlayObject } from '../core/operations/types';

export type ProgressHandler = (done: number, total: number) => void;

export interface RunHandle<T> {
  promise: Promise<T>;
  cancel(): void;
}

interface Pending {
  resolve: (value: unknown) => void;
  reject: (err: unknown) => void;
  onProgress?: ProgressHandler;
}

function copy(bytes: Uint8Array): Uint8Array {
  return bytes.slice();
}

export class WriteWorkerClient {
  private worker: Worker | null = null;
  private seq = 0;
  private pending = new Map<string, Pending>();

  private ensure(): Worker {
    if (this.worker) return this.worker;
    const worker = new Worker(new URL('../workers/pdf-write.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent<WriteResponse>) => this.handle(e.data);
    worker.onerror = () => this.failAll('The processing worker crashed. Please try again.');
    this.worker = worker;
    return worker;
  }

  private handle(msg: WriteResponse): void {
    const p = this.pending.get(msg.id);
    if (!p) return;
    switch (msg.type) {
      case 'progress':
        p.onProgress?.(msg.done, msg.total);
        break;
      case 'doneBytes':
        this.pending.delete(msg.id);
        p.resolve(msg.bytes);
        break;
      case 'doneFiles':
        this.pending.delete(msg.id);
        p.resolve(msg.files);
        break;
      case 'error':
        this.pending.delete(msg.id);
        p.reject(new ToolError(msg.category, msg.message, msg.detail));
        break;
    }
  }

  private failAll(message: string): void {
    for (const [, p] of this.pending) p.reject(new ToolError('unknown', message));
    this.pending.clear();
    // Drop the worker so the next call spins up a fresh one (spec §10).
    this.worker?.terminate();
    this.worker = null;
  }

  private dispatch<T>(req: WriteRequest, transfer: Transferable[], onProgress?: ProgressHandler): RunHandle<T> {
    const worker = this.ensure();
    const promise = new Promise<T>((resolve, reject) => {
      this.pending.set(req.id, { resolve: resolve as (v: unknown) => void, reject, onProgress });
      worker.postMessage(req, transfer);
    });
    const cancel = () => {
      const control: WriteInbound = { id: req.id, kind: 'cancel' };
      this.worker?.postMessage(control);
    };
    return { promise, cancel };
  }

  private nextId(): string {
    this.seq += 1;
    return `job_${this.seq}`;
  }

  merge(inputs: MergeInput[], onProgress?: ProgressHandler): RunHandle<Uint8Array> {
    const copies = inputs.map((i) => ({ ...i, bytes: copy(i.bytes) }));
    return this.dispatch<Uint8Array>(
      { id: this.nextId(), kind: 'merge', inputs: copies },
      copies.map((i) => i.bytes.buffer),
      onProgress,
    );
  }

  compile(
    bytes: Uint8Array,
    pages: CompilePage[],
    overlays: Map<string, OverlayObject[]>,
    onProgress?: ProgressHandler,
  ): RunHandle<Uint8Array> {
    const b = copy(bytes);
    return this.dispatch<Uint8Array>(
      { id: this.nextId(), kind: 'compile', bytes: b, pages, overlays: [...overlays.entries()] },
      [b.buffer],
      onProgress,
    );
  }

  split(bytes: Uint8Array, spec: SplitSpec, baseName: string, onProgress?: ProgressHandler): RunHandle<NamedBytes[]> {
    const b = copy(bytes);
    return this.dispatch<NamedBytes[]>(
      { id: this.nextId(), kind: 'split', bytes: b, spec, baseName },
      [b.buffer],
      onProgress,
    );
  }

  imagesToPdf(images: ImageInput[], options: Partial<ImagesToPdfOptions>, onProgress?: ProgressHandler): RunHandle<Uint8Array> {
    const copies = images.map((i) => ({ ...i, bytes: copy(i.bytes) }));
    return this.dispatch<Uint8Array>(
      { id: this.nextId(), kind: 'imagesToPdf', images: copies, options },
      copies.map((i) => i.bytes.buffer),
      onProgress,
    );
  }

  watermark(bytes: Uint8Array, options: Partial<WatermarkOptions>, onProgress?: ProgressHandler): RunHandle<Uint8Array> {
    const b = copy(bytes);
    return this.dispatch<Uint8Array>({ id: this.nextId(), kind: 'watermark', bytes: b, options }, [b.buffer], onProgress);
  }

  pageNumbers(bytes: Uint8Array, options: Partial<PageNumberOptions>, onProgress?: ProgressHandler): RunHandle<Uint8Array> {
    const b = copy(bytes);
    return this.dispatch<Uint8Array>({ id: this.nextId(), kind: 'pageNumbers', bytes: b, options }, [b.buffer], onProgress);
  }

  optimize(bytes: Uint8Array, options: Partial<OptimizeOptions>, onProgress?: ProgressHandler): RunHandle<Uint8Array> {
    const b = copy(bytes);
    return this.dispatch<Uint8Array>({ id: this.nextId(), kind: 'optimize', bytes: b, options }, [b.buffer], onProgress);
  }

  terminate(): void {
    this.worker?.terminate();
    this.worker = null;
    this.pending.clear();
  }
}
