/**
 * Append-only operation graph with an undo/redo cursor (spec §7.4).
 * Undo/redo simply move the cursor; a new operation after an undo truncates the
 * redo tail. Compilation reads only the applied (pre-cursor) operations.
 */
import type { Operation } from './types';

export class OperationGraph {
  private ops: Operation[] = [];
  private cursor = 0;

  /** Append an operation, discarding any undone (redo) operations. */
  push(op: Operation): void {
    if (this.cursor < this.ops.length) this.ops = this.ops.slice(0, this.cursor);
    this.ops.push(op);
    this.cursor = this.ops.length;
  }

  undo(): boolean {
    if (this.cursor === 0) return false;
    this.cursor -= 1;
    return true;
  }

  redo(): boolean {
    if (this.cursor >= this.ops.length) return false;
    this.cursor += 1;
    return true;
  }

  get canUndo(): boolean {
    return this.cursor > 0;
  }

  get canRedo(): boolean {
    return this.cursor < this.ops.length;
  }

  /** Operations up to the cursor — the effective, compiled state. */
  applied(): Operation[] {
    return this.ops.slice(0, this.cursor);
  }

  /** All operations including undone ones (for persistence/debug). */
  all(): Operation[] {
    return this.ops.slice();
  }

  get position(): number {
    return this.cursor;
  }

  get total(): number {
    return this.ops.length;
  }

  clear(): void {
    this.ops = [];
    this.cursor = 0;
  }

  /** Restore from persisted state (crash recovery). */
  restore(ops: Operation[], cursor: number): void {
    this.ops = ops.slice();
    this.cursor = Math.max(0, Math.min(cursor, this.ops.length));
  }
}
