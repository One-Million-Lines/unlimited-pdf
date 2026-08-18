/**
 * Dedicated Web Worker for QPDF-WASM operations (protect and unlock).
 * Kept separate from pdf-write.worker so the 2.3 MB WASM binary is only loaded
 * when the user actually uses these tools.
 */
/// <reference lib="webworker" />
import { protectPdf, unlockPdf } from '../tools/qpdf-lib';
import { ToolError } from '../core/pipeline/types';
import type { QpdfRequest, QpdfResponse } from './qpdf-protocol';

const ctx = self as unknown as DedicatedWorkerGlobalScope;

function post(msg: QpdfResponse, transfer: Transferable[] = []): void {
  ctx.postMessage(msg, transfer);
}

ctx.onmessage = async (event: MessageEvent<QpdfRequest>) => {
  const msg = event.data;
  try {
    let bytes: Uint8Array;
    switch (msg.kind) {
      case 'protect':
        bytes = await protectPdf(msg.bytes, { userPassword: msg.password, keyBits: 256 });
        break;
      case 'unlock':
        bytes = await unlockPdf(msg.bytes, { password: msg.password });
        break;
      default:
        throw new ToolError('validation', 'Unknown QPDF operation.');
    }
    post({ id: msg.id, type: 'done', bytes }, [bytes.buffer]);
  } catch (err) {
    if (err instanceof ToolError) {
      post({ id: msg.id, type: 'error', category: err.category, message: err.message });
    } else {
      post({ id: msg.id, type: 'error', category: 'unknown', message: (err as Error).message ?? 'Unexpected error.' });
    }
  }
};
