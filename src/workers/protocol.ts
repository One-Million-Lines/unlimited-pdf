/**
 * Message protocol for the pdf-write worker. All heavy pdf-lib serialization
 * runs off the main thread. Buffers are transferred (not cloned) both ways.
 */
import type { MergeInput } from '../tools/merge';
import type { SplitSpec } from '../tools/split';
import type { ImageInput, ImagesToPdfOptions } from '../tools/images-to-pdf';
import type { WatermarkOptions } from '../tools/watermark';
import type { PageNumberOptions } from '../tools/page-numbers';
import type { OptimizeOptions } from '../tools/optimize';
import type { CompilePage } from '../tools/compile';
import type { OverlayObject } from '../core/operations/types';
import type { NamedBytes, ErrorCategory } from '../core/pipeline/types';

export type WriteRequest =
  | { id: string; kind: 'merge'; inputs: MergeInput[] }
  | {
      id: string;
      kind: 'compile';
      bytes: Uint8Array;
      pages: CompilePage[];
      overlays: [string, OverlayObject[]][];
    }
  | { id: string; kind: 'split'; bytes: Uint8Array; spec: SplitSpec; baseName: string }
  | { id: string; kind: 'imagesToPdf'; images: ImageInput[]; options: Partial<ImagesToPdfOptions> }
  | { id: string; kind: 'watermark'; bytes: Uint8Array; options: Partial<WatermarkOptions> }
  | { id: string; kind: 'pageNumbers'; bytes: Uint8Array; options: Partial<PageNumberOptions> }
  | { id: string; kind: 'optimize'; bytes: Uint8Array; options: Partial<OptimizeOptions> };

export type WriteControl = { id: string; kind: 'cancel' };
export type WriteInbound = WriteRequest | WriteControl;

export type WriteResponse =
  | { id: string; type: 'progress'; done: number; total: number }
  | { id: string; type: 'doneBytes'; bytes: Uint8Array; removedMetadata?: boolean }
  | { id: string; type: 'doneFiles'; files: NamedBytes[] }
  | { id: string; type: 'error'; category: ErrorCategory; message: string; detail?: string };
