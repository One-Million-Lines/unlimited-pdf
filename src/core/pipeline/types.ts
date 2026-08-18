/**
 * Tool job + progress contract (spec §7.6). Every heavy operation is modeled as
 * a cancellable job that reports structured progress and produces a
 * deterministic output.
 */

export type JobPhase = 'loading' | 'analyzing' | 'processing' | 'validating' | 'saving';

export interface JobProgress {
  phase: JobPhase;
  completed: number;
  total?: number;
  page?: number;
  message: string;
}

export type ProgressCallback = (event: JobProgress) => void;

/** A structured, user-safe error category (spec §12). */
export type ErrorCategory =
  | 'passwordRequired'
  | 'unsupportedEncryption'
  | 'damaged'
  | 'outOfMemory'
  | 'cannotImportTab'
  | 'outputLarger'
  | 'featureLoss'
  | 'cancelled'
  | 'validation'
  | 'unknown';

export class ToolError extends Error {
  category: ErrorCategory;
  detail?: string;
  constructor(category: ErrorCategory, message: string, detail?: string) {
    super(message);
    this.name = 'ToolError';
    this.category = category;
    this.detail = detail;
  }
}

/** Throw a cancellation error if the signal has aborted. */
export function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new ToolError('cancelled', 'Operation cancelled.');
}

/** A result envelope carrying size/time deltas for the result summary. */
export interface OperationResult {
  outputs: NamedBytes[];
  inputBytes: number;
  outputBytes: number;
  elapsedMs: number;
  /** Human-readable notes about destructive changes / feature loss. */
  notes: string[];
}

export interface NamedBytes {
  name: string;
  bytes: Uint8Array;
  /** MIME type for saving; defaults to application/pdf. */
  mime?: string;
}
