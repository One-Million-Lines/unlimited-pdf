/**
 * Non-destructive operation model (spec §7.4). Operations are appended to a
 * graph and compiled once at export. Only operations that are actually
 * implemented in Phase 1 are represented here, so page projection stays
 * exhaustive and honest.
 */

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type OverlayType =
  | 'text'
  | 'image'
  | 'shape'
  | 'ink'
  | 'signature'
  | 'link'
  | 'redactionMark';

export interface OverlayObject {
  id: string;
  type: OverlayType;
  /** Effective page instance the overlay is anchored to. */
  pageInstanceId: string;
  /** Rect in PDF points, canonical unrotated page coordinates. */
  rect: Rect;
  rotation: number;
  opacity: number;
  payload: unknown;
}

export type Operation =
  | { id: string; type: 'rotate'; pageInstanceIds: string[]; degrees: 90 | 180 | 270 }
  | { id: string; type: 'delete'; pageInstanceIds: string[] }
  | { id: string; type: 'duplicate'; pageInstanceIds: string[]; newInstanceIds: string[] }
  | { id: string; type: 'reorder'; orderedInstanceIds: string[] }
  | { id: string; type: 'overlay'; object: OverlayObject };

export type OperationType = Operation['type'];
