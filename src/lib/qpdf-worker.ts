/**
 * Main-thread client for the QPDF worker. Lazy-initialised — the worker and
 * its 2.3 MB WASM binary are only loaded when the user first uses protect or
 * unlock.
 */
import { ToolError } from '../core/pipeline/types';
import type { QpdfRequest, QpdfResponse } from '../workers/qpdf-protocol';

interface Pending {
  resolve: (bytes: Uint8Array) => void;
  reject: (err: unknown) => void;
}

/** Copy bytes before transferring to keep the caller's buffer intact. */
function copy(b: Uint8Array): Uint8Array {
  return b.slice();
}

export class QpdfWorkerClient {
  private worker: Worker | null = null;
  private seq = 0;
  private pending = new Map<string, Pending>();

  private ensure(): Worker {
    if (this.worker) return this.worker;
    const w = new Worker(new URL('../workers/qpdf.worker.ts', import.meta.url), { type: 'module' });
    w.onmessage = (e: MessageEvent<QpdfResponse>) => this.handle(e.data);
    w.onerror = () => this.failAll('The security worker crashed. Please try again.');
    this.worker = w;
    return w;
  }

  private handle(msg: QpdfResponse): void {
    const p = this.pending.get(msg.id);
    if (!p) return;
    this.pending.delete(msg.id);
    if (msg.type === 'done') {
      p.resolve(msg.bytes);
    } else {
      p.reject(new ToolError(msg.category, msg.message));
    }
  }

  private failAll(message: string): void {
    for (const [, p] of this.pending) p.reject(new ToolError('unknown', message));
    this.pending.clear();
    this.worker?.terminate();
    this.worker = null;
  }

  private dispatch(req: QpdfRequest, transfer: Transferable[]): Promise<Uint8Array> {
    const worker = this.ensure();
    return new Promise<Uint8Array>((resolve, reject) => {
      this.pending.set(req.id, { resolve, reject });
      worker.postMessage(req, transfer);
    });
  }

  private nextId(): string {
    this.seq += 1;
    return `q_${this.seq}`;
  }

  protect(bytes: Uint8Array, password: string): Promise<Uint8Array> {
    const b = copy(bytes);
    return this.dispatch({ id: this.nextId(), kind: 'protect', bytes: b, password }, [b.buffer]);
  }

  unlock(bytes: Uint8Array, password: string): Promise<Uint8Array> {
    const b = copy(bytes);
    return this.dispatch({ id: this.nextId(), kind: 'unlock', bytes: b, password }, [b.buffer]);
  }

  terminate(): void {
    this.worker?.terminate();
    this.worker = null;
    this.pending.clear();
  }
}
