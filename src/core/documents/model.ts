/**
 * Session and page data model (spec §8).
 *
 * Coordinates are always stored in PDF points in a canonical, unrotated page
 * coordinate system. UI/canvas coordinates are converted at the boundary.
 * Original document bytes are treated as immutable; operations never mutate the
 * input, they are compiled at export time.
 */
import type { Operation } from '../operations/types';

export type DocumentSourceKind = 'file' | 'drop' | 'clipboard' | 'activeTab';

export type DocumentSource =
  | { kind: 'file'; fileName: string }
  | { kind: 'drop' | 'clipboard'; fileName: string }
  | { kind: 'activeTab'; sourceUrl: string; originPermissionWasTemporary: boolean };

/** A stable reference to a page within a source document. */
export interface PageRef {
  /** Stable id — remains constant even when the page is reordered. */
  id: string;
  sourceDocumentId: string;
  sourcePageIndex: number; // 0-based within the source document
  widthPt: number;
  heightPt: number;
  /** Rotation baked into the source page (0/90/180/270). */
  intrinsicRotation: number;
}

export interface DocumentSession {
  id: string;
  source: DocumentSource;
  displayName: string;
  originalSize: number;
  /** Local SHA-256 of the bytes; never transmitted. */
  fingerprint: string;
  pages: PageRef[];
  operations: Operation[];
  historyCursor: number;
  createdAt: number;
  recoveryEnabled: boolean;
}

/**
 * The effective (projected) state of a page after applying the operation graph
 * up to the history cursor. Used for preview and export compilation.
 */
export interface EffectivePage {
  /** Instance id — a duplicated page gets a fresh id. */
  instanceId: string;
  /** The originating PageRef id. */
  sourcePageId: string;
  sourcePageIndex: number;
  /** Total rotation to apply on top of the intrinsic page rotation. */
  addedRotation: number;
}
