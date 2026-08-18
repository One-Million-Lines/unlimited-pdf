/**
 * Workspace controller. Holds all mutable workspace state (immutable original
 * bytes, the pdf.js document, the operation graph, the write-worker) outside of
 * the render tree, and exposes an immutable snapshot to Preact via subscribe().
 *
 * Modes:
 *   - 'empty'    : start screen (open/drop files)
 *   - 'document' : one PDF loaded → viewer, organize grid, single-doc tools
 *   - 'merge'    : combine several PDFs
 *   - 'images'   : build a PDF from images
 */
import type { PDFDocumentProxy } from '../../lib/pdfjs';
import { loadDocument, getProperties, extractPageText, renderPageToBlob, PasswordRequiredError, type DocProperties } from '../../lib/pdfjs';
import { WriteWorkerClient } from '../../lib/write-worker';
import { QpdfWorkerClient } from '../../lib/qpdf-worker';
import { OperationGraph } from '../../core/operations/graph';
import { projectPages, collectOverlays } from '../../core/operations/project';
import type { Operation, OverlayObject } from '../../core/operations/types';
import type { EffectivePage, PageRef } from '../../core/documents/model';
import { makeId, fingerprint } from '../../core/util/id';
import { detectType, validatePdfInput, validateImageInput, isPdfBytes } from '../../core/validation/input';
import { preflightRaster, fittedDpi, sizeTier } from '../../core/validation/preflight';
import { outputName } from '../../core/util/filename';
import { parsePageSet } from '../../core/util/range';
import { pushRecentTool } from '../../core/persistence/settings';
import { NetworkGuard } from '../../core/net/guard';
import { ToolError, type NamedBytes } from '../../core/pipeline/types';
import type { CompilePage } from '../../tools/compile';

export type Mode = 'empty' | 'document' | 'merge' | 'images';

export interface JobState {
  label: string;
  phase: string;
  done: number;
  total: number;
}

export interface ResultState {
  title: string;
  outputs: NamedBytes[];
  notes: string[];
  inputBytes: number;
  outputBytes: number;
  elapsedMs: number;
}

export interface ErrorState {
  category: string;
  message: string;
  detail?: string;
}

export interface MergeFile {
  id: string;
  name: string;
  bytes: Uint8Array;
  pageCount: number;
}

export interface ImageFile {
  id: string;
  name: string;
  bytes: Uint8Array;
  type: 'jpeg' | 'png';
  url: string;
}

export interface ImportPrompt {
  url: string;
  origin: string;
}

export interface WorkspaceState {
  mode: Mode;
  busy: boolean;
  docName: string;
  originalSize: number;
  pageCount: number;
  properties: DocProperties | null;
  pageRefs: PageRef[];
  effectivePages: EffectivePage[];
  selection: string[];
  activeTool: string;
  canUndo: boolean;
  canRedo: boolean;
  dirty: boolean;
  sizeWarning: string | null;
  job: JobState | null;
  result: ResultState | null;
  error: ErrorState | null;
  importPrompt: ImportPrompt | null;
  mergeFiles: MergeFile[];
  imageFiles: ImageFile[];
  toast: string | null;
}

const INITIAL: WorkspaceState = {
  mode: 'empty',
  busy: false,
  docName: '',
  originalSize: 0,
  pageCount: 0,
  properties: null,
  pageRefs: [],
  effectivePages: [],
  selection: [],
  activeTool: '',
  canUndo: false,
  canRedo: false,
  dirty: false,
  sizeWarning: null,
  job: null,
  result: null,
  error: null,
  importPrompt: null,
  mergeFiles: [],
  imageFiles: [],
  toast: null,
};

type Listener = (s: WorkspaceState) => void;

export class WorkspaceStore {
  state: WorkspaceState = INITIAL;
  private listeners = new Set<Listener>();

  // Non-render mutable state.
  private bytes: Uint8Array | null = null;
  private doc: PDFDocumentProxy | null = null;
  private graph = new OperationGraph();
  private worker = new WriteWorkerClient();
  private qpdfWorker = new QpdfWorkerClient();
  private net = new NetworkGuard();
  private currentCancel: (() => void) | null = null;

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private set(patch: Partial<WorkspaceState>): void {
    this.state = { ...this.state, ...patch };
    for (const fn of this.listeners) fn(this.state);
  }

  getDoc(): PDFDocumentProxy | null {
    return this.doc;
  }

  /** Look up the display geometry for an effective page. */
  pageGeometry(sourcePageId: string): { width: number; height: number; rotation: number } {
    const ref = this.state.pageRefs.find((p) => p.id === sourcePageId);
    return ref
      ? { width: ref.widthPt, height: ref.heightPt, rotation: ref.intrinsicRotation }
      : { width: 612, height: 792, rotation: 0 };
  }

  /* --------------------------- initialization --------------------------- */

  async init(params: { tool?: string; importUrl?: string }): Promise<void> {
    if (params.tool) this.set({ activeTool: params.tool });
    if (params.importUrl) {
      try {
        const u = new URL(params.importUrl);
        this.set({ importPrompt: { url: params.importUrl, origin: u.origin } });
      } catch {
        /* ignore malformed */
      }
    }
  }

  /* ------------------------------ file input ---------------------------- */

  /** Route dropped/selected files based on type and the active tool. */
  async addFiles(files: File[]): Promise<void> {
    if (files.length === 0) return;
    this.set({ error: null });
    const buffers = await Promise.all(
      files.map(async (f) => ({ name: f.name, bytes: new Uint8Array(await f.arrayBuffer()) })),
    );

    const pdfs = buffers.filter((b) => isPdfBytes(b.bytes));
    const images = buffers.filter((b) => {
      const t = detectType(b.bytes);
      return t === 'jpeg' || t === 'png' || t === 'webp';
    });

    // Honor the active tool intent first.
    if (this.state.activeTool === 'merge' || (this.state.mode !== 'document' && pdfs.length > 1)) {
      await this.addMergeFiles(pdfs);
      return;
    }
    if (this.state.activeTool === 'images-to-pdf' || (this.state.mode !== 'document' && images.length > 0 && pdfs.length === 0)) {
      await this.addImageFiles(images);
      return;
    }
    if (this.state.mode === 'merge') {
      await this.addMergeFiles(pdfs);
      return;
    }
    if (this.state.mode === 'images') {
      await this.addImageFiles(images);
      return;
    }
    if (pdfs.length >= 1) {
      await this.loadPdf(pdfs[0].bytes, pdfs[0].name);
      return;
    }
    if (images.length > 0) {
      await this.addImageFiles(images);
      return;
    }
    this.set({ error: { category: 'validation', message: 'Please choose a PDF or image file (PDF, JPG, PNG, WebP).' } });
  }

  async loadPdf(bytes: Uint8Array, name: string): Promise<void> {
    try {
      validatePdfInput(bytes, name);
    } catch (e) {
      this.set({ error: { category: 'validation', message: (e as Error).message } });
      return;
    }
    this.set({ busy: true, error: null });
    try {
      const doc = await loadDocument(bytes);
      const pageRefs: PageRef[] = [];
      const docId = makeId('doc');
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const view = page.view; // [x0,y0,x1,y1] in points, unrotated
        pageRefs.push({
          id: makeId('pg'),
          sourceDocumentId: docId,
          sourcePageIndex: i - 1,
          widthPt: view[2] - view[0],
          heightPt: view[3] - view[1],
          intrinsicRotation: ((page.rotate % 360) + 360) % 360,
        });
      }
      const properties = await getProperties(doc);
      await fingerprint(bytes); // computed locally; never transmitted

      this.bytes = bytes;
      this.doc = doc;
      this.graph.clear();

      const tier = sizeTier(bytes.byteLength);
      this.set({
        mode: 'document',
        busy: false,
        docName: name,
        originalSize: bytes.byteLength,
        pageCount: doc.numPages,
        properties,
        pageRefs,
        selection: [],
        result: null,
        importPrompt: null,
        sizeWarning:
          tier === 'huge'
            ? 'This is a very large file — success depends on your device and the operation.'
            : tier === 'large'
              ? 'Large file: heavy operations run in a slower, memory-careful mode.'
              : null,
      });
      this.recomputePages();
    } catch (e) {
      this.set({ busy: false });
      if (e instanceof PasswordRequiredError) {
        this.set({ error: { category: 'passwordRequired', message: 'This PDF is password-protected and cannot be opened in this version.' } });
      } else {
        this.set({ error: { category: 'damaged', message: 'This PDF could not be opened. It may be damaged or unsupported.', detail: (e as Error).message } });
      }
    }
  }

  private async addMergeFiles(pdfs: { name: string; bytes: Uint8Array }[]): Promise<void> {
    const added: MergeFile[] = [];
    for (const p of pdfs) {
      try {
        validatePdfInput(p.bytes, p.name);
        const doc = await loadDocument(p.bytes);
        added.push({ id: makeId('m'), name: p.name, bytes: p.bytes, pageCount: doc.numPages });
        await (doc as unknown as { destroy?: () => Promise<void> }).destroy?.();
      } catch {
        /* skip invalid/encrypted files, reported below */
      }
    }
    if (added.length === 0 && this.state.mergeFiles.length === 0) {
      this.set({ mode: 'merge', activeTool: 'merge', error: { category: 'validation', message: 'Add valid, unencrypted PDF files to merge.' } });
      return;
    }
    this.set({ mode: 'merge', activeTool: 'merge', mergeFiles: [...this.state.mergeFiles, ...added], result: null, error: null });
  }

  private async addImageFiles(images: { name: string; bytes: Uint8Array }[]): Promise<void> {
    const added: ImageFile[] = [];
    for (const img of images) {
      try {
        const type = validateImageInput(img.bytes, img.name);
        let bytes = img.bytes;
        let finalType: 'jpeg' | 'png';
        if (type === 'webp') {
          bytes = await transcodeToPng(img.bytes);
          finalType = 'png';
        } else {
          finalType = type;
        }
        const url = URL.createObjectURL(new Blob([bytes.slice().buffer], { type: finalType === 'png' ? 'image/png' : 'image/jpeg' }));
        added.push({ id: makeId('img'), name: img.name, bytes, type: finalType, url });
      } catch {
        /* skip */
      }
    }
    this.set({ mode: 'images', activeTool: 'images-to-pdf', imageFiles: [...this.state.imageFiles, ...added], result: null, error: null });
  }

  /* --------------------------- active-tab import ------------------------ */

  async confirmImport(): Promise<void> {
    const prompt = this.state.importPrompt;
    if (!prompt) return;
    this.set({ busy: true, error: null });
    try {
      // Request the single origin as an optional host permission (user gesture).
      if (typeof chrome !== 'undefined' && chrome.permissions?.request) {
        await chrome.permissions.request({ origins: [`${prompt.origin}/*`] }).catch(() => false);
      }
      this.net.allowOnce(prompt.url);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);
      const resp = await this.net.fetch(prompt.url, { signal: controller.signal });
      clearTimeout(timeout);
      if (!resp.ok) throw new Error(`Server responded ${resp.status}`);
      const buf = new Uint8Array(await resp.arrayBuffer());
      if (!isPdfBytes(buf)) throw new Error('The response was not a PDF.');
      const name = decodeURIComponent(prompt.url.split('/').pop() || 'imported.pdf').split('?')[0];
      this.set({ importPrompt: null });
      await this.loadPdf(buf, name.endsWith('.pdf') ? name : `${name}.pdf`);
    } catch (e) {
      this.set({
        busy: false,
        error: {
          category: 'cannotImportTab',
          message: 'This PDF could not be imported from the tab. Download it, then open the file here.',
          detail: (e as Error).message,
        },
      });
    }
  }

  cancelImport(): void {
    this.set({ importPrompt: null });
  }

  /* ------------------------------ organize ------------------------------ */

  setTool(tool: string): void {
    this.set({ activeTool: tool, result: null, error: null });
    if (tool) void pushRecentTool(tool);
  }

  toggleSelect(instanceId: string, additive: boolean): void {
    const set = new Set(this.state.selection);
    if (additive) {
      set.has(instanceId) ? set.delete(instanceId) : set.add(instanceId);
    } else {
      if (set.has(instanceId) && set.size === 1) set.clear();
      else {
        set.clear();
        set.add(instanceId);
      }
    }
    this.set({ selection: [...set] });
  }

  selectAll(): void {
    this.set({ selection: this.state.effectivePages.map((p) => p.instanceId) });
  }

  clearSelection(): void {
    this.set({ selection: [] });
  }

  private targets(): string[] {
    return this.state.selection.length > 0
      ? this.state.selection
      : this.state.effectivePages.map((p) => p.instanceId);
  }

  rotate(dir: 'cw' | 'ccw'): void {
    const ids = this.targets();
    if (ids.length === 0) return;
    this.apply({ id: makeId('op'), type: 'rotate', pageInstanceIds: ids, degrees: dir === 'cw' ? 90 : 270 });
  }

  deleteSelected(): void {
    const ids = this.state.selection;
    if (ids.length === 0) return;
    if (ids.length >= this.state.effectivePages.length) {
      this.set({ error: { category: 'validation', message: 'You cannot delete every page. Keep at least one.' } });
      return;
    }
    this.apply({ id: makeId('op'), type: 'delete', pageInstanceIds: ids });
    this.set({ selection: [] });
  }

  duplicateSelected(): void {
    const ids = this.state.selection.length > 0 ? this.state.selection : [];
    if (ids.length === 0) return;
    this.apply({
      id: makeId('op'),
      type: 'duplicate',
      pageInstanceIds: ids,
      newInstanceIds: ids.map(() => makeId('pg')),
    });
  }

  reverse(): void {
    const order = [...this.state.effectivePages].reverse().map((p) => p.instanceId);
    this.apply({ id: makeId('op'), type: 'reorder', orderedInstanceIds: order });
  }

  reorder(orderedInstanceIds: string[]): void {
    this.apply({ id: makeId('op'), type: 'reorder', orderedInstanceIds });
  }

  private apply(op: Operation): void {
    this.graph.push(op);
    this.recomputePages();
  }

  undo(): void {
    if (this.graph.undo()) this.recomputePages();
  }

  redo(): void {
    if (this.graph.redo()) this.recomputePages();
  }

  private recomputePages(): void {
    const effectivePages = projectPages(this.state.pageRefs, this.graph.applied());
    const valid = new Set(effectivePages.map((p) => p.instanceId));
    this.set({
      effectivePages,
      selection: this.state.selection.filter((id) => valid.has(id)),
      canUndo: this.graph.position > 0,
      canRedo: this.graph.position < this.graph.total,
      dirty: this.graph.applied().length > 0,
    });
  }

  /* --------------------------- current bytes ---------------------------- */

  /** Compile the current organize state to bytes (or return original if clean). */
  private async currentBytes(): Promise<Uint8Array> {
    if (!this.bytes) throw new ToolError('validation', 'No document is open.');
    const applied = this.graph.applied();
    if (applied.length === 0) return this.bytes;
    const pages: CompilePage[] = this.state.effectivePages.map((p) => ({
      sourcePageIndex: p.sourcePageIndex,
      addedRotation: p.addedRotation,
      instanceId: p.instanceId,
    }));
    const overlays = collectOverlays(applied) as Map<string, OverlayObject[]>;
    const handle = this.worker.compile(this.bytes, pages, overlays);
    return handle.promise;
  }

  /* ------------------------------ job runner ---------------------------- */

  private async runJob<T>(
    label: string,
    fn: (report: (done: number, total: number) => void, signal: AbortSignal) => Promise<T>,
  ): Promise<T | null> {
    const controller = new AbortController();
    this.currentCancel = () => controller.abort();
    this.set({ busy: true, error: null, result: null, job: { label, phase: 'processing', done: 0, total: 0 } });
    const started = performance.now();
    try {
      const report = (done: number, total: number) => this.set({ job: { label, phase: 'processing', done, total } });
      const value = await fn(report, controller.signal);
      this.set({ busy: false, job: null });
      void started;
      return value;
    } catch (e) {
      this.set({ busy: false, job: null });
      if (e instanceof ToolError && e.category === 'cancelled') {
        this.set({ toast: 'Cancelled.' });
      } else if (e instanceof ToolError) {
        this.set({ error: { category: e.category, message: e.message, detail: e.detail } });
      } else {
        this.set({ error: { category: 'unknown', message: (e as Error).message } });
      }
      return null;
    } finally {
      this.currentCancel = null;
    }
  }

  cancelJob(): void {
    this.currentCancel?.();
  }

  private finishResult(title: string, outputs: NamedBytes[], inputBytes: number, startedMs: number, notes: string[] = []): void {
    const outputBytes = outputs.reduce((n, o) => n + o.bytes.byteLength, 0);
    this.set({
      result: { title, outputs, notes, inputBytes, outputBytes, elapsedMs: performance.now() - startedMs },
      toast: null,
    });
    if (this.state.activeTool) void pushRecentTool(this.state.activeTool);
  }

  /* -------------------------------- tools ------------------------------- */

  async runOrganizeExport(): Promise<void> {
    const started = performance.now();
    if (!this.bytes) return;
    const input = this.bytes.byteLength;
    const out = await this.runJob('Applying page changes', async (report) => {
      const pages: CompilePage[] = this.state.effectivePages.map((p) => ({
        sourcePageIndex: p.sourcePageIndex,
        addedRotation: p.addedRotation,
        instanceId: p.instanceId,
      }));
      const overlays = collectOverlays(this.graph.applied()) as Map<string, OverlayObject[]>;
      const handle = this.worker.compile(this.bytes!, pages, overlays, report);
      this.currentCancel = handle.cancel;
      return handle.promise;
    });
    if (out) this.finishResult('Organized PDF', [{ name: outputName(this.state.docName, 'organized'), bytes: out }], input, started);
  }

  async runMerge(): Promise<void> {
    const started = performance.now();
    const files = this.state.mergeFiles;
    if (files.length < 1) return;
    const input = files.reduce((n, f) => n + f.bytes.byteLength, 0);
    const out = await this.runJob('Merging PDFs', async (report) => {
      const handle = this.worker.merge(files.map((f) => ({ bytes: f.bytes, name: f.name })), report);
      this.currentCancel = handle.cancel;
      return handle.promise;
    });
    if (out) {
      this.finishResult('Merged PDF', [{ name: outputName(files[0].name, 'merged') , bytes: out }], input, started, [
        'Some advanced signatures, form scripts, embedded files or layers may not survive page copying.',
      ]);
    }
  }

  async runImagesToPdf(options: { pageSize: string; orientation: string; marginPt: number; fit: string }): Promise<void> {
    const started = performance.now();
    const files = this.state.imageFiles;
    if (files.length < 1) return;
    const input = files.reduce((n, f) => n + f.bytes.byteLength, 0);
    const out = await this.runJob('Building PDF from images', async (report) => {
      const handle = this.worker.imagesToPdf(
        files.map((f) => ({ bytes: f.bytes, type: f.type, name: f.name })),
        options as never,
        report,
      );
      this.currentCancel = handle.cancel;
      return handle.promise;
    });
    if (out) this.finishResult('Images → PDF', [{ name: 'images.pdf', bytes: out }], input, started);
  }

  async runSplit(spec: import('../../tools/split').SplitSpec): Promise<void> {
    const started = performance.now();
    const out = await this.runJob('Splitting PDF', async (report, signal) => {
      const bytes = await this.currentBytes();
      void signal;
      const handle = this.worker.split(bytes, spec, this.state.docName, report);
      this.currentCancel = handle.cancel;
      return handle.promise;
    });
    if (out) this.finishResult(`Split into ${out.length} file${out.length === 1 ? '' : 's'}`, out, this.state.originalSize, started);
  }

  async runWatermark(options: import('../../tools/watermark').WatermarkOptions): Promise<void> {
    const started = performance.now();
    const out = await this.runJob('Adding watermark', async (report) => {
      const bytes = await this.currentBytes();
      const handle = this.worker.watermark(bytes, options, report);
      this.currentCancel = handle.cancel;
      return handle.promise;
    });
    if (out) this.finishResult('Watermarked PDF', [{ name: outputName(this.state.docName, 'watermark'), bytes: out }], this.state.originalSize, started);
  }

  async runPageNumbers(options: import('../../tools/page-numbers').PageNumberOptions): Promise<void> {
    const started = performance.now();
    const out = await this.runJob('Adding page numbers', async (report) => {
      const bytes = await this.currentBytes();
      const handle = this.worker.pageNumbers(bytes, options, report);
      this.currentCancel = handle.cancel;
      return handle.promise;
    });
    if (out) this.finishResult('Numbered PDF', [{ name: outputName(this.state.docName, 'numbered'), bytes: out }], this.state.originalSize, started);
  }

  async runOptimize(removeMetadata: boolean): Promise<void> {
    const started = performance.now();
    const out = await this.runJob('Optimizing PDF', async (report) => {
      const bytes = await this.currentBytes();
      const handle = this.worker.optimize(bytes, { removeMetadata }, report);
      this.currentCancel = handle.cancel;
      return handle.promise;
    });
    if (out) {
      const notes: string[] = [];
      if (out.byteLength >= this.state.originalSize) notes.push('This file was already well optimized — the output is not smaller, so keep the original.');
      if (removeMetadata) notes.push('Document metadata (title, author, dates, etc.) was removed.');
      this.finishResult('Optimized PDF', [{ name: outputName(this.state.docName, 'optimized'), bytes: out }], this.state.originalSize, started, notes);
    }
  }

  async runExtractText(): Promise<void> {
    const started = performance.now();
    const out = await this.runJob('Extracting text', async (report, signal) => {
      const doc = this.doc!;
      const parts: string[] = [];
      for (let i = 1; i <= doc.numPages; i++) {
        if (signal.aborted) throw new ToolError('cancelled', 'Cancelled.');
        const page = await doc.getPage(i);
        const text = await extractPageText(page);
        parts.push(text);
        report(i, doc.numPages);
      }
      return parts.join('\n\n\f\n\n');
    });
    if (out !== null) {
      const bytes = new TextEncoder().encode(out);
      const hasText = out.trim().length > 0;
      this.finishResult(
        'Extracted text',
        [{ name: outputName(this.state.docName, 'text', 'txt'), bytes, mime: 'text/plain' }],
        this.state.originalSize,
        started,
        hasText ? [] : ['No selectable text was found. This looks like a scanned document — OCR (coming later) would be needed.'],
      );
    }
  }

  async runPdfToImages(options: { dpi: number; format: 'png' | 'jpeg' | 'webp'; quality: number; pages: string }): Promise<void> {
    const started = performance.now();
    const out = await this.runJob('Rendering pages to images', async (report, signal) => {
      const doc = this.doc!;
      let pageNumbers: number[];
      try {
        pageNumbers = options.pages.trim() ? parsePageSet(options.pages, doc.numPages) : Array.from({ length: doc.numPages }, (_, i) => i + 1);
      } catch (e) {
        throw new ToolError('validation', (e as Error).message);
      }
      const files: NamedBytes[] = [];
      const width = String(pageNumbers.length).length;
      let done = 0;
      for (const n of pageNumbers) {
        if (signal.aborted) throw new ToolError('cancelled', 'Cancelled.');
        const page = await doc.getPage(n);
        const view = page.getViewport({ scale: 1 });
        let dpi = options.dpi;
        const pf = preflightRaster(view.width, view.height, dpi);
        if (!pf.withinCanvasLimits) dpi = fittedDpi(view.width, view.height, dpi);
        const blob = await renderPageToBlob(page, { dpi, format: options.format, quality: options.quality });
        const bytes = new Uint8Array(await blob.arrayBuffer());
        const ext = options.format === 'jpeg' ? 'jpg' : options.format;
        files.push({ name: outputName(this.state.docName, `p${String(n).padStart(width, '0')}`, ext), bytes, mime: blob.type });
        done += 1;
        report(done, pageNumbers.length);
      }
      return files;
    });
    if (out) this.finishResult(`${out.length} image${out.length === 1 ? '' : 's'}`, out, this.state.originalSize, started);
  }

  async runCompress(options: { dpi: number; quality: number; grayscale: boolean }): Promise<void> {
    const started = performance.now();
    const out = await this.runJob('Compressing (rasterizing pages)', async (report, signal) => {
      const doc = this.doc!;
      const images: { bytes: Uint8Array; type: 'jpeg' }[] = [];
      for (let i = 1; i <= doc.numPages; i++) {
        if (signal.aborted) throw new ToolError('cancelled', 'Cancelled.');
        const page = await doc.getPage(i);
        const view = page.getViewport({ scale: 1 });
        let dpi = options.dpi;
        if (!preflightRaster(view.width, view.height, dpi).withinCanvasLimits) dpi = fittedDpi(view.width, view.height, dpi);
        const blob = await renderPageToBlob(page, { dpi, format: 'jpeg', quality: options.quality, background: '#ffffff' });
        images.push({ bytes: new Uint8Array(await blob.arrayBuffer()), type: 'jpeg' });
        report(i, doc.numPages);
      }
      // Assemble page-sized images back into a PDF via the worker.
      const handle = this.worker.imagesToPdf(images, { pageSize: 'imageSize', marginPt: 0, fit: 'contain', orientation: 'auto' });
      this.currentCancel = handle.cancel;
      return handle.promise;
    });
    if (out) {
      const notes = [
        'Raster compression replaced pages with images: selectable text, links, forms, annotations and accessibility are lost. The original is untouched.',
      ];
      if (out.byteLength >= this.state.originalSize) notes.push('The result is not smaller than the original at these settings — keep the original and try a lower DPI/quality.');
      this.finishResult('Compressed PDF', [{ name: outputName(this.state.docName, 'compressed'), bytes: out }], this.state.originalSize, started, notes);
    }
  }

  async runProtect(password: string): Promise<void> {
    const started = performance.now();
    if (!this.bytes) return;
    const inputBytes = this.bytes.byteLength;
    const out = await this.runJob('Protecting PDF with AES-256…', async (_report, signal) => {
      const bytes = await this.currentBytes();
      const p = this.qpdfWorker.protect(bytes, password);
      // Support cancellation via a race.
      return await Promise.race([
        p,
        new Promise<Uint8Array>((_, reject) => {
          signal.addEventListener('abort', () => reject(new ToolError('cancelled', 'Cancelled.')), { once: true });
        }),
      ]);
    });
    if (out) {
      this.finishResult('Protected PDF', [{ name: outputName(this.state.docName, 'protected'), bytes: out }], inputBytes, started, [
        'AES-256 password protection applied. Anyone opening the file will need the password you set.',
        'Keep the password safe — there is no recovery mechanism for forgotten passwords.',
      ]);
    }
  }

  async runUnlock(password: string): Promise<void> {
    const started = performance.now();
    if (!this.bytes) return;
    const inputBytes = this.bytes.byteLength;
    const out = await this.runJob('Removing password protection…', async (_report, signal) => {
      const bytes = await this.currentBytes();
      const p = this.qpdfWorker.unlock(bytes, password);
      return await Promise.race([
        p,
        new Promise<Uint8Array>((_, reject) => {
          signal.addEventListener('abort', () => reject(new ToolError('cancelled', 'Cancelled.')), { once: true });
        }),
      ]);
    });
    if (out) {
      this.finishResult('Unlocked PDF', [{ name: outputName(this.state.docName, 'unlocked'), bytes: out }], inputBytes, started, [
        'Password protection removed. The output is an unprotected PDF — store it carefully.',
      ]);
    }
  }

  /* ----------------------------- list editing --------------------------- */

  moveMergeFile(id: string, dir: -1 | 1): void {
    this.set({ mergeFiles: moveInList(this.state.mergeFiles, id, dir) });
  }
  removeMergeFile(id: string): void {
    this.set({ mergeFiles: this.state.mergeFiles.filter((f) => f.id !== id) });
  }
  moveImageFile(id: string, dir: -1 | 1): void {
    this.set({ imageFiles: moveInList(this.state.imageFiles, id, dir) });
  }
  removeImageFile(id: string): void {
    const file = this.state.imageFiles.find((f) => f.id === id);
    if (file) URL.revokeObjectURL(file.url);
    this.set({ imageFiles: this.state.imageFiles.filter((f) => f.id !== id) });
  }

  /* ------------------------------- toast -------------------------------- */

  setToast(msg: string | null): void {
    this.set({ toast: msg });
  }
  dismissError(): void {
    this.set({ error: null });
  }
  dismissResult(): void {
    this.set({ result: null });
  }

  /* ---------------------------- clear workspace ------------------------- */

  async clearWorkspace(): Promise<void> {
    if (this.doc) await (this.doc as unknown as { destroy?: () => Promise<void> }).destroy?.();
    for (const f of this.state.imageFiles) URL.revokeObjectURL(f.url);
    this.bytes = null;
    this.doc = null;
    this.graph.clear();
    this.worker.terminate();
    this.worker = new WriteWorkerClient();
    this.qpdfWorker.terminate();
    this.qpdfWorker = new QpdfWorkerClient();
    this.state = { ...INITIAL };
    for (const fn of this.listeners) fn(this.state);
  }
}

/* -------------------------------- helpers -------------------------------- */

function moveInList<T extends { id: string }>(list: T[], id: string, dir: -1 | 1): T[] {
  const idx = list.findIndex((x) => x.id === id);
  if (idx === -1) return list;
  const to = idx + dir;
  if (to < 0 || to >= list.length) return list;
  const copy = list.slice();
  const [item] = copy.splice(idx, 1);
  copy.splice(to, 0, item);
  return copy;
}

/** Transcode WebP (or any canvas-decodable image) to PNG bytes on the page. */
async function transcodeToPng(bytes: Uint8Array): Promise<Uint8Array> {
  const blob = new Blob([bytes.slice().buffer], { type: 'image/webp' });
  const bitmap = await createImageBitmap(blob);
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Cannot decode image.');
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  const png = await canvas.convertToBlob({ type: 'image/png' });
  return new Uint8Array(await png.arrayBuffer());
}

let singleton: WorkspaceStore | null = null;
export function getStore(): WorkspaceStore {
  if (!singleton) singleton = new WorkspaceStore();
  return singleton;
}
