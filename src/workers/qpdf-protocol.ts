/**
 * Message types for the QPDF worker. Kept separate from the main write-worker
 * protocol to isolate the WASM dependency.
 */
import type { ErrorCategory } from '../core/pipeline/types';

export type QpdfRequest =
  | { id: string; kind: 'protect'; bytes: Uint8Array; password: string }
  | { id: string; kind: 'unlock'; bytes: Uint8Array; password: string };

export type QpdfResponse =
  | { id: string; type: 'done'; bytes: Uint8Array }
  | { id: string; type: 'error'; category: ErrorCategory; message: string };
