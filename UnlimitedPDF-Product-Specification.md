# UnlimitedPDF — Browser-Only Chrome Extension Product Specification

**Document status:** Implementation-ready product and technical specification  
**Date:** 18 August 2026  
**Product:** UnlimitedPDF  
**Initial platform:** Google Chrome / Chromium, Manifest V3  
**Distribution:** Free and open source  
**Backend:** Explicitly out of scope for this version

---

## 1. Executive summary

UnlimitedPDF is a privacy-first PDF toolbox that performs document processing locally in the browser. Files must not be uploaded to UnlimitedPDF, an analytics provider, an AI service, or any other server. The extension should be useful both as:

1. a toolbar launcher for common PDF tasks; and
2. a full-tab document workspace capable of opening a local PDF or, when technically permitted, the PDF in the active browser tab.

The first release should prioritize reliable PDF-native operations rather than claiming false parity with cloud converters. Browser-side open-source libraries can reliably render PDFs, rearrange and copy pages, add content, fill forms, flatten forms, convert pages to images, create PDFs from images, extract text, and run OCR. They can also perform local structural optimization and password operations through WebAssembly after a technical validation spike.

Some Smallpdf features cannot be reproduced at the same quality without a backend, a large local runtime, or proprietary conversion engines. In particular:

- PDF-to-Word/Excel/PowerPoint can be offered as clearly labeled exports, but not as layout-perfect editable conversion.
- Office-to-PDF can be implemented for common documents with fidelity limitations, not guaranteed Microsoft Office parity.
- Existing PDF text cannot generally be edited and reflowed like a Word document.
- A drawn signature is an electronic signature appearance, not a certificate-backed digital signature.
- Secure redaction cannot be implemented by merely drawing a black rectangle.
- Strong compression is possible, but aggressive browser-only compression may rasterize pages and lose links, forms, selectable text, accessibility, and vector quality.
- Local AI depends on Chrome's built-in AI availability and supported hardware; it cannot be promised to every user.

The recommended public promise is:

> UnlimitedPDF is a free, open-source PDF toolbox that processes files locally on your device. No uploads, no accounts, no usage limits imposed by us.

Do not advertise literally unlimited file size. Browser memory, available disk, document complexity, and device performance impose real limits.

---

## 2. Product goals

### 2.1 Primary goals

- Cover the highest-demand PDF tasks with no account, paywall, watermark, backend, or artificial daily limit.
- Keep document bytes on the user's device.
- Use the minimum Chrome permissions needed for each workflow.
- Make common operations understandable to non-technical users.
- Provide predictable progress, cancellation, recovery, and output validation.
- Create a modular processing core that can later be reused in a web app, Electron/Tauri desktop application, or optional backend workers.
- Make privacy verifiable through open source code, a network-free processing architecture, and automated tests.

### 2.2 Non-goals for the initial release

- Cloud storage, synchronization, sharing links, user accounts, collaboration, or signature-request workflows.
- Server-assisted conversion, OCR, compression, or AI.
- Exact Microsoft Word/Excel/PowerPoint round-trip fidelity.
- Legal identity verification, audit trails, qualified electronic signatures, or certificate-backed signing.
- Editing arbitrary existing text with paragraph reflow.
- Mobile Chrome support.
- Silent interception or replacement of every PDF opened in Chrome.
- Circumvention of DRM, passwords, or access controls without authorization.

### 2.3 Product principles

1. **Local by default and by design.** No document content crosses the network.
2. **Honest capability labels.** Use “add text” rather than “edit existing text” when that is what the implementation does.
3. **Safe outputs.** Preserve the original file, use Save As by default, and validate every generated PDF.
4. **Progressive enhancement.** Built-in AI and direct active-tab importing appear only when available.
5. **Permission restraint.** Avoid permanent `<all_urls>`, `cookies`, `history`, and broad tab access.
6. **Feature isolation.** Heavy operations run in workers and can be cancelled without losing the workspace.

---

## 3. Research conclusions and feasibility

Mozilla PDF.js is a browser-native foundation for parsing and rendering PDFs. `pdf-lib` can create and modify PDF files, copy pages, split/merge documents, and fill forms in modern browsers. Tesseract.js can run multilingual OCR in-browser. QPDF supports structural transformations, linearization, encryption, and decryption; a WebAssembly build should be evaluated before password and structural optimization features ship. Chrome Manifest V3 permits packaged WebAssembly when the extension CSP includes `wasm-unsafe-eval`, but remotely hosted executable code is not allowed.

Chrome now exposes built-in Prompt, Summarizer, Translator, and Language Detector APIs. These can provide local AI features on eligible desktop devices after a model download, but availability and hardware requirements mean AI must remain optional. There must be no cloud fallback in the browser-only edition.

### 3.1 Feasibility matrix

| Feature | Browser-only feasibility | Quality level | Initial decision |
| --- | --- | --- | --- |
| View, search, zoom, print | High | Production | Ship |
| Merge PDFs | High | Production | Ship |
| Split/extract pages | High | Production | Ship |
| Reorder/delete/duplicate/rotate pages | High | Production | Ship |
| Add blank pages | High | Production | Ship |
| Crop pages | High | Production with box caveats | Ship |
| PDF to JPG/PNG/WebP | High | Production | Ship |
| Images to PDF | High | Production | Ship |
| Add text/images/shapes/drawing | High | Production as overlays | Ship |
| Highlight/underline/strikeout | High | Production with text-layer caveats | Ship |
| Fill AcroForms | High | Production for supported fields | Ship |
| Flatten forms | High | Production after compatibility tests | Ship |
| Draw/type/upload signature appearance | High | Production | Ship, call it e-sign |
| Certificate-backed digital signature | Low/complex | Not production-ready | Defer |
| Watermark/page numbers/header/footer | High | Production | Ship |
| Metadata viewer/editor/remover | Medium-high | Production for common metadata | Ship |
| Extract text | High for text PDFs | Production | Ship |
| Extract embedded images | Medium | Document-dependent | Later/beta |
| OCR image/scanned PDF | High but resource-heavy | Good, not enterprise OCR | Ship after core |
| Searchable OCR PDF | Medium-high | Good with alignment caveats | Ship after OCR |
| Password protect/unlock | Medium-high via WASM | Production after audit | Phase 2 |
| Repair/linearize/structural optimize | Medium via WASM | Document-dependent | Phase 2/beta |
| Lossless compression | Medium | Often modest savings | Ship as “Optimize” |
| Aggressive compression | High via rasterization | Destructive but effective | Ship with warning |
| Secure redaction | High via page rasterization | Secure but destructive | Ship as “Secure raster redaction” |
| Content-aware vector redaction | Low/complex | Hard to guarantee | Defer |
| PDF to TXT/Markdown | High | Good for simple reading order | Ship |
| PDF to DOCX | Medium | Text-focused; layout may change | Beta export |
| PDF to XLSX/CSV | Medium-low | Good only for detected tables | Beta export |
| PDF to PPTX | High as one image per slide | Visually faithful, not editable | Ship with accurate label |
| DOCX to PDF | Medium | Fidelity varies | Beta after core |
| XLSX/CSV to PDF | Medium-high | Good for simple sheets | Beta after core |
| PPTX to PDF | Low without a full renderer | Poor/incomplete | Defer |
| HTML/TXT to PDF | High | Production within supported CSS/fonts | Phase 2 |
| Summarize/translate/chat with PDF | Medium | Device/API-dependent | Optional beta |
| Request signatures/share links | Requires backend | Not applicable | Out of scope |
| Batch processing | High within device limits | Production | Phase 2 |

---

## 4. Product surfaces and user experience

### 4.1 Toolbar action

Clicking the UnlimitedPDF icon opens a compact launcher. It must not perform heavy work in the popup because a popup is destroyed when closed.

Launcher content:

- Primary button: **Open PDF or files**.
- Contextual button, when the active tab appears to be a PDF: **Use PDF from this tab**.
- Recent tools, stored locally only; do not store recent filenames by default.
- Search box for tools.
- Top shortcuts: Edit & Sign, Compress, Merge, Split, Convert, Organize.
- Privacy line: **Processed on this device. Files are not uploaded.**
- Settings and About/Open Source links.

Selecting any tool opens `workspace.html` in a normal extension tab. Files selected in the popup may be transferred through a short-lived extension message only for small files; the preferred flow is to open the workspace first and select files there.

### 4.2 Full-tab workspace

Layout:

- Top bar: logo, document name, undo, redo, tool search, privacy indicator, Save/Export.
- Left rail: tool categories.
- Center: PDF canvas or page grid.
- Right inspector: options for the selected tool/object.
- Bottom status area: page count, zoom, processing state, memory warnings.

Workspace modes:

1. **Document mode:** viewer and overlay editor.
2. **Page mode:** thumbnails for reorder, rotate, delete, duplicate, crop, split.
3. **Batch mode:** file list, shared settings, per-file progress and results.
4. **Conversion mode:** source-specific preview and export settings.

### 4.3 Input methods

- Standard `<input type="file">` fallback.
- `showOpenFilePicker()` when available.
- Drag and drop one or multiple files.
- Paste images from clipboard for image-to-PDF and signature upload.
- Import PDF from active tab after explicit user action.
- Optional context-menu entry: **Open link in UnlimitedPDF**, enabled only if the user activates this feature.

### 4.4 Active-tab PDF import

This is best-effort, not a silent universal PDF interceptor.

Flow:

1. User clicks the extension while viewing a PDF.
2. Read the active tab URL under the temporary `activeTab` grant.
3. If the URL ends in `.pdf`, is a `data:`/`blob:` PDF reachable from the page, or the response reports `application/pdf`, offer import.
4. Fetch only after the user clicks **Use PDF from this tab**.
5. For an HTTP(S) origin requiring access, request that single origin as an optional host permission at runtime if `activeTab` is insufficient.
6. Preserve credentials only when browser rules allow it. Never request the `cookies` permission.
7. Enforce size and timeout limits while streaming.
8. If the resource cannot be fetched because it is protected, a browser-internal URL, a non-transferable blob URL, or an authenticated response blocked by browser policy, explain the limitation and show **Download it, then open the file**.

Google Scholar support means importing a PDF the user has opened from Scholar; it does not mean scraping Scholar or bypassing publisher access controls.

### 4.5 Output and saving

- Default to **Save As**, never overwrite the original silently.
- Use `showSaveFilePicker()` from a direct user gesture when available.
- Fallback to a Blob URL and browser download.
- For multiple outputs, let the user choose:
  - save files one by one;
  - choose a directory and write all files; or
  - download one ZIP generated locally.
- Suggested names: `{original}-{operation}.pdf`, with collision-safe numbering.
- Show input size, output size, percentage change, elapsed time, and any destructive changes.
- If output is larger after compression, default to keeping the original and explain why.

---

## 5. Tool catalog and functional requirements

### 5.1 Reader

Capabilities:

- Open local or active-tab PDF.
- Continuous, single-page, and two-page view.
- Thumbnail sidebar.
- Zoom: fit width, fit page, presets, custom percentage.
- Page navigation and outline/bookmarks display.
- Text selection and copy where a text layer exists.
- Search across extracted text with per-page result count and highlight.
- Print through a print-friendly rendered view.
- Show properties: title, author, subject, keywords, creator, producer, creation/modification dates, page count, dimensions, encryption status, file size, and PDF version where available.
- Password prompt for encrypted inputs supported by the selected engine.

Acceptance requirements:

- Render only visible and nearby pages; never render every large-document page at full scale.
- Cancel stale render jobs when zoom or page changes.
- Preserve page rotation and crop boxes.
- Clearly mark pages where text extraction failed or where fonts are unsupported.

### 5.2 Merge PDF

- Accept multiple PDFs and supported image files.
- Drag to reorder files and pages.
- Expand a file to reorder or exclude individual pages.
- Support page-range syntax such as `1-3, 5, 8-end`.
- Allow inserting blank pages or images between documents.
- Preserve page dimensions and rotations.
- Offer bookmark strategy: preserve when possible, create top-level bookmark per source, or remove.
- Handle form field name collisions by renaming or flattening with an explicit user choice.
- Warn that some advanced signatures, JavaScript, portfolios, embedded files, layers, and annotations may not survive library-level page copying.

### 5.3 Split and extract

- Split every page.
- Split after selected pages.
- Split into fixed-size groups.
- Extract a page range into one PDF.
- Extract selected pages into individual PDFs.
- Split by file-size target is a best-effort iterative operation and should be Phase 2.
- Export multiple results as a local ZIP.

### 5.4 Organize pages

- Thumbnail multi-select with Shift/Ctrl/Cmd behavior.
- Drag reorder.
- Rotate clockwise/counter-clockwise in 90-degree steps.
- Delete with undo.
- Duplicate.
- Insert blank page with size presets or neighboring-page dimensions.
- Insert files/images at a selected position.
- Reverse page order.
- Alternate/interleave two documents, useful for front/back scans.

### 5.5 Crop and resize

- Visual crop handles with numeric margins.
- Apply to current page, selected pages, odd/even pages, or all pages.
- Option to set CropBox only (non-destructive view crop).
- Option to rasterize to the crop (destructive removal outside bounds).
- Normalize page sizes to A4, Letter, Legal, or custom dimensions using fit, fill, stretch, or center; stretch must be discouraged.
- Add margins and bleed.

### 5.6 Annotate and add content

The UI must call this **Edit & Annotate**, with help text stating that arbitrary existing paragraphs are not reflowed.

- Add text boxes with font, size, color, opacity, alignment, line height, rotation, and background.
- Bundle a small set of open-source fonts; allow users to load a local `.ttf`/`.otf` font for the current session.
- Add JPEG/PNG/WebP images; preserve transparency when possible.
- Shapes: rectangle, ellipse, line, arrow, checkmark, cross.
- Freehand ink with color, width, smoothing, eraser, undo.
- Highlight, underline, and strikeout from text selection where reliable text geometry exists.
- Sticky notes/comments may be stored as visible annotations or flattened overlays; choose one supported representation and test across Chrome, Acrobat, Preview, and Firefox.
- Links: add URL links and internal page links.
- Whiteout tool must be labeled **Cover content (not secure redaction)**.
- Copy/paste, duplicate, keyboard movement, snapping, alignment guides, layer ordering, lock, and delete for overlay objects.
- Preserve edit objects in session state; only bake them into PDF content on export.

### 5.7 Forms

- Detect AcroForm fields.
- Fill text, checkbox, radio, dropdown, option list, and button fields when supported.
- Highlight required and invalid fields.
- Clear fields.
- Import/export form values as JSON for advanced users; ensure field data alone contains no unneeded document text.
- Flatten fields into page content with a warning that fields will no longer be editable.
- XFA forms are unsupported unless a future engine explicitly supports them; show a clear message.

### 5.8 E-sign

- Create a signature by drawing, typing, or uploading an image.
- Typed signatures use bundled script fonts and are labeled as generated signature appearances.
- Remove white image backgrounds locally and offer crop/contrast controls.
- Save signatures locally only after opt-in. Encrypt saved signature data at rest if practical; otherwise explain that it is stored in the browser profile and provide a one-click delete function.
- Place, resize, rotate, duplicate, and add date/initials.
- Flatten signature appearances into the exported PDF.
- Explicitly state: **This adds a visual electronic signature. It is not a certificate-backed digital signature and does not verify identity.**

### 5.9 Watermark, page numbers, header/footer, Bates numbering

- Text or image watermark.
- Position grid, rotation, scale, opacity, pages/ranges, layer above/below content.
- Page numbers with format, start number, range, prefix/suffix, font, and position.
- Header/footer templates with filename, page number, page count, and date.
- Bates numbering with prefix, fixed digit count, start value, and live example.

### 5.10 PDF to images

- Export selected/all pages to JPG, PNG, or WebP.
- Resolution presets: 72, 96, 150, 200, 300 DPI, plus custom scale with pixel estimate.
- JPG/WebP quality slider.
- Transparent or white background where applicable.
- Color, grayscale, and black-and-white modes.
- Single output downloads directly; multiple outputs save to directory or ZIP.
- Warn before a requested render is likely to exceed safe canvas or memory limits.

### 5.11 Images to PDF

- Inputs: JPEG, PNG, WebP; HEIC only after a licensed, bundled local decoder is selected and validated.
- Drag order, rotate, crop, image enhancement, grayscale, black-and-white threshold.
- Page sizes: image size, A4, Letter, custom.
- Orientation, margin, fit/fill, one image per page or contact sheet.
- Optional OCR after PDF creation.
- Preserve original JPEG bytes where no transformation is required to avoid recompression.

### 5.12 Compression and optimization

Provide three honest modes:

#### A. Lossless optimize

- Remove unreferenced objects where supported.
- Compress eligible streams and object streams.
- Deduplicate identical resources where supported.
- Optionally remove metadata, thumbnails, and embedded files.
- Linearize for fast web viewing when the WASM engine supports it.
- Expected savings may be small or zero.

#### B. Balanced image compression

- Inspect page resources and attempt image downsampling/re-encoding only if the selected engine safely supports it.
- Target image DPI and JPEG/WebP quality controls.
- Preserve vector text, links, forms, and annotations where possible.
- If reliable resource-level replacement is not available, do not fake this mode; move it to a future engine milestone.

#### C. Strong raster compression

- Render each page to a bitmap at selectable DPI and quality, then rebuild the PDF.
- Optional grayscale or monochrome mode.
- Clearly warn that vectors, links, forms, annotations, layers, accessibility tags, and selectable text are lost.
- Optional OCR text layer to restore searchability, with a separate processing and accuracy warning.

Common requirements:

- Estimate output before final save using a representative sample for long files.
- Report which transformations were applied.
- Never promise a fixed percentage reduction.
- Never replace the original automatically.

### 5.13 OCR

- Detect whether pages already contain meaningful text and default to OCR only image-heavy pages.
- Languages are selected explicitly or downloaded as local language packs with consent. A language pack download is application data, not document upload; explain this distinction.
- Render pages at an OCR-appropriate resolution in a worker.
- Preprocessing: orientation, deskew within a conservative range, grayscale, contrast, threshold, and denoise.
- Output options:
  - plain text;
  - searchable PDF with invisible text layer;
  - searchable PDF plus corrected visible text is not required initially.
- Show per-page progress, recognized language, and confidence indicators.
- Allow correction of extracted text before TXT/DOCX export.
- Preserve the original image as the visible page for searchable PDFs.
- Document limitations for handwriting, unusual fonts, multi-column reading order, formulas, and tables.

### 5.14 Protect, unlock, and inspect

These features require a QPDF-WASM feasibility and security spike before inclusion.

- Encrypt with AES-256 when supported.
- Require a non-empty user password and securely generate a distinct owner password when the UI does not expose one.
- Password strength indicator and confirmation.
- Permission flags may be offered, but explain that PDF owner-permission restrictions are advisory and can be ignored by some tools.
- Unlock only with the correct password for password-protected files.
- Do not market removal of restrictions as bypassing security.
- Clear passwords from UI state and worker memory as soon as practical.
- Structural check/repair should output a new file and a human-readable diagnostic summary.
- Do not log passwords, file content, extracted text, or document metadata.

### 5.15 Redaction

Provide two distinct tools:

1. **Cover content:** adds an opaque shape; fast but not secure.
2. **Secure raster redaction:** user marks regions, each affected page is rendered without the marked pixels, and the page is rebuilt as an image. Remove underlying text, annotations, links, form values, comments, and metadata from the rebuilt output.

Secure redaction requirements:

- Search-and-mark exact text matches when a text layer exists, but require visual review.
- Offer redaction reason labels as visible text, optional.
- Run a post-export verification that extracted text does not contain user-entered redaction search terms.
- Warn that raster redaction is destructive and can increase file size.
- Provide an optional OCR layer only after ensuring redacted terms cannot be reintroduced.
- Future content-stream redaction must not ship until adversarial tests prove removed objects are not recoverable.

### 5.16 Metadata and privacy cleanup

- View and edit standard document information fields.
- Remove title, author, subject, keywords, creator, producer, dates, XMP metadata, thumbnails, attachments, comments, JavaScript/actions, and form values when the selected engine supports each item.
- UI must list exactly what was found and exactly what was removed.
- “Sanitize” is best-effort and must not claim forensic guarantees until independently verified.
- Offer flattening/rasterization as a stronger privacy option with its tradeoffs.

### 5.17 Text and structured exports

#### PDF to TXT

- Extract text page by page.
- Reading-order heuristics based on coordinates.
- Preserve page breaks optionally.
- Header/footer suppression using repeated-line detection.

#### PDF to Markdown

- Detect headings using font-size/style heuristics.
- Paragraphs, lists, basic tables, links, and page separators.
- Include a raw-text fallback.

#### PDF to DOCX — beta

- Generate a Word document from extracted text, paragraphs, headings, lists, and detected images.
- Optional page image as a background/reference.
- Clearly state that complex layout, columns, equations, forms, footnotes, and exact typography may not survive.
- Do not label this “perfectly editable Word conversion.”

#### PDF tables to CSV/XLSX — beta

- User selects a rectangular page area or accepts automatically detected table regions.
- Derive rows/columns from text coordinates and line geometry.
- Preview and let the user adjust column boundaries before export.
- Export CSV or XLSX.
- Scanned tables require OCR first.
- Do not present arbitrary PDF-to-Excel as reliable without a confirmed table preview.

#### PDF to PPTX

- Default reliable mode: one rendered page image per slide, matched to page aspect ratio.
- Optional extracted text speaker notes.
- A future experimental editable mode may map text and images to slide objects, but should not ship as the default.

### 5.18 Create PDF from other formats

Priorities:

- TXT/Markdown to PDF: high feasibility; pagination, fonts, headings, lists, links, page size, margins.
- HTML to PDF: support sanitized local HTML and a documented subset of CSS. Never fetch remote assets by default; let users explicitly approve external asset retrieval or omit the assets.
- CSV/XLSX to PDF: sheet selector, print area, orientation, paper size, scaling, repeat header row, gridlines, page breaks. Formula results may be stale because a browser library does not provide full Excel recalculation.
- DOCX to PDF beta: render DOCX to sanitized HTML, paginate, then generate PDF. Tell users fidelity varies; use test fixtures for tables, images, headers, footers, and page breaks.
- PPTX to PDF: defer until an open-source browser renderer passes a fidelity and license review.

### 5.19 Optional local AI

AI is a progressive enhancement, not part of the core promise.

Availability check:

- Detect Chrome's built-in Language Model, Summarizer, Translator, and Language Detector APIs.
- Report `available`, `downloadable`, `downloading`, or `unavailable` states in plain language.
- Ask for consent before a browser model download.
- If unavailable, keep non-AI extraction/search available and show no cloud fallback.

Features:

- Summarize whole document, selected pages, or selected text.
- Translate extracted text while preserving page references; exporting a translated replica with original layout is not required.
- Chat with PDF using local retrieval:
  1. extract text with page and coordinate provenance;
  2. split into bounded chunks;
  3. rank chunks locally using lexical/BM25-style retrieval initially;
  4. send only selected chunks to the local Prompt API;
  5. return page citations that open the relevant page;
  6. state when an answer is not supported by the document.
- For long documents, summarize hierarchically and keep within API context limits.
- Make it visually explicit that AI answers can be wrong.

Do not bundle a multi-gigabyte third-party language model in the first release. A future optional model pack can be evaluated separately for license, Chrome Web Store package limits, storage, and performance.

### 5.20 Additional differentiating tools

These are valuable browser-local features beyond the Smallpdf extension description:

- Compare two PDFs visually with overlay/difference view; output a marked comparison PDF.
- Alternate/interleave scan pages.
- Deskew and clean scanned pages.
- N-up/contact-sheet PDF creation.
- Poster/tile one page across multiple sheets.
- Booklet page ordering for duplex printing.
- Reverse pages and odd/even extraction.
- Add/remove margins and normalize page sizes.
- Convert PDF colors to grayscale or thresholded black-and-white.
- Extract attachments when supported.
- Count words/characters and estimate reading time from extracted text.
- Inspect fonts and image resolutions.
- Find oversized pages/images to explain file size.
- Remove blank pages using configurable visual and text thresholds.
- Local automation recipes, for example: rotate → OCR → compress → page-number.
- Batch rename outputs with variables.

---

## 6. Recommended release plan

### Phase 1 — Core local toolbox

Ship first:

- Reader and properties.
- Merge.
- Split/extract.
- Organize, reorder, rotate, delete, duplicate, blank pages.
- Crop.
- Images to PDF.
- PDF to JPG/PNG/WebP.
- Watermark and page numbers.
- Add text/images/shapes/freehand.
- E-sign appearance.
- Basic AcroForm filling and flattening.
- Text/TXT extraction.
- Lossless optimize where supported.
- Strong raster compression.
- Save/ZIP, progress, cancellation, local-only privacy controls.

Phase 1 release gate: no network requests during document workflows, except an explicit active-tab PDF fetch from its source origin and explicit download of an optional OCR/AI model asset.

### Phase 2 — Advanced local processing

- OCR and searchable PDFs.
- QPDF-WASM protect, unlock, linearize, inspect, repair spike and implementation.
- Secure raster redaction.
- Metadata/privacy cleanup.
- Batch processing and recipes.
- Compare, deskew, remove blank pages, grayscale, booklet, N-up.
- TXT/Markdown/HTML/CSV/XLSX to PDF.

### Phase 3 — Honest conversion and AI betas

- Text-focused DOCX export.
- User-guided table-to-CSV/XLSX.
- Page-image PPTX export.
- DOCX-to-PDF and XLSX-to-PDF beta.
- Built-in local AI summary, translation, and document chat.

### Deferred until desktop/backend edition

- High-fidelity Office conversion in both directions.
- Large-file, low-memory streaming operations not feasible in browser engines.
- High-accuracy document-layout OCR and complex table extraction.
- Certificate-backed signing, timestamp authorities, and identity verification.
- Signature requests, collaboration, audit logs, and share links.
- Guaranteed archival PDF/A conversion or standards conformance validation.

---

## 7. Technical architecture

### 7.1 Stack

- TypeScript with strict mode.
- React or Preact for UI; choose one and use it consistently. Preact is preferred if bundle size is a priority.
- Vite build configured for Chrome Manifest V3 and deterministic production assets.
- PDF.js for parsing, rendering, text extraction, outlines, and viewer primitives.
- `pdf-lib` for PDF creation and high-level modifications.
- Dedicated Web Workers for render, export, OCR, compression, and WASM operations.
- IndexedDB for session metadata and operation graphs.
- Origin Private File System (OPFS) for temporary large blobs when available.
- Tesseract.js for OCR, bundled worker/core with language packs downloaded on explicit demand or packaged for the default language.
- QPDF compiled to WASM only after a pinned-build, license, size, memory, CSP, and security review.
- `docx` for text-focused DOCX generation.
- PptxGenJS for page-image PPTX generation.
- SheetJS Community Edition or an equivalent vetted library for CSV/XLSX generation and reading; comply with attribution/license obligations.
- A maintained ZIP library such as `fflate` for local multi-file export.

Avoid MuPDF in the initial architecture unless the entire project adopts AGPL obligations or a commercial license is obtained. MuPDF.js is dual-licensed AGPL/commercial, which can constrain a later hosted or proprietary edition.

### 7.2 Extension components

```text
manifest.json
src/
  background/service-worker.ts
  popup/
  workspace/
  options/
  core/
    documents/
    operations/
    pipeline/
    persistence/
    validation/
  tools/
    merge/
    split/
    organize/
    annotate/
    forms/
    sign/
    compress/
    redact/
    ocr/
    convert/
  workers/
    pdf-render.worker.ts
    pdf-write.worker.ts
    raster.worker.ts
    ocr.worker.ts
    qpdf.worker.ts
  wasm/
  assets/fonts/
tests/
  unit/
  integration/
  fixtures/
  e2e/
```

### 7.3 Responsibility boundaries

- **Service worker:** open workspace, read the explicitly invoked active tab, manage optional permissions, context menus, and short control messages. It must not own document state or long-running jobs because extension service workers can be terminated.
- **Workspace page:** owns the current session, UI, file handles, worker coordination, operation history, and saves.
- **Dedicated workers:** CPU-heavy parsing, rendering, OCR, compression, and serialization. Workers communicate with transferable `ArrayBuffer` objects, not cloned multi-megabyte payloads.
- **OPFS/IndexedDB:** recoverable temporary work. No documents are persisted after the session unless the user enables crash recovery.
- **Processing adapters:** stable interfaces around PDF.js, pdf-lib, Tesseract, and QPDF-WASM so engines can later be replaced.

### 7.4 Operation model

Use a non-destructive operation graph instead of mutating the input after every click.

```ts
type Operation =
  | { id: string; type: 'rotate'; pageIds: string[]; degrees: 90 | 180 | 270 }
  | { id: string; type: 'delete'; pageIds: string[] }
  | { id: string; type: 'reorder'; orderedPageIds: string[] }
  | { id: string; type: 'crop'; pageIds: string[]; box: Rect; mode: 'cropBox' | 'raster' }
  | { id: string; type: 'overlay'; pageId: string; object: OverlayObject }
  | { id: string; type: 'flattenForm'; fieldIds?: string[] };
```

- Original bytes are immutable.
- Page IDs remain stable even when order changes.
- Undo/redo moves a cursor through operations.
- Preview applies a lightweight projection.
- Export compiles the operation graph once.
- Destructive operations create an explicit export boundary and cannot silently invalidate undo.

### 7.5 File and memory strategy

- Read files as `Blob`/`ArrayBuffer`; transfer ownership to workers when safe.
- Do not encode full documents as Base64.
- Virtualize thumbnails and page canvases.
- Cap render dimensions based on `deviceMemory`, measured allocation success, and browser canvas limits.
- Process raster/OCR pages sequentially or with a small adaptive worker pool.
- Write intermediate page images to OPFS rather than retaining all in RAM.
- Revoke Blob URLs promptly.
- Provide a preflight estimate for operations expected to use more than a safe percentage of available memory.
- Initial soft guidance, validated by device tests:
  - under 100 MB: normal path;
  - 100–500 MB: large-file mode and sequential processing;
  - above 500 MB: warn that success depends on the device and operation;
  - never enforce these as marketing “limits” unless required for stability.

### 7.6 Pipeline interface

```ts
interface ToolJob<I, O> {
  id: string;
  tool: string;
  input: I;
  signal: AbortSignal;
  onProgress(event: ProgressEvent): void;
  run(context: WorkerContext): Promise<O>;
}

interface ProgressEvent {
  phase: 'loading' | 'analyzing' | 'processing' | 'validating' | 'saving';
  completed: number;
  total?: number;
  page?: number;
  message: string;
}
```

Every job must support cancellation, structured errors, progress, cleanup, and deterministic output settings.

### 7.7 Manifest and permissions

Recommended initial manifest:

```json
{
  "manifest_version": 3,
  "name": "UnlimitedPDF — Private PDF Toolbox",
  "version": "0.1.0",
  "action": {
    "default_popup": "popup.html",
    "default_title": "Open UnlimitedPDF"
  },
  "background": {
    "service_worker": "service-worker.js",
    "type": "module"
  },
  "permissions": ["storage", "activeTab"],
  "optional_permissions": ["contextMenus"],
  "optional_host_permissions": ["http://*/*", "https://*/*"],
  "content_security_policy": {
    "extension_pages": "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'"
  }
}
```

Notes:

- Test whether `storage` can be removed by using IndexedDB/OPFS and extension-local defaults; retain it only for small settings.
- Do not request `tabs`; `activeTab` plus standard tab queries should cover user-invoked active-tab handling.
- Do not request `downloads` if file pickers and Blob downloads suffice.
- Do not request `scripting` unless a tested active-page import path truly needs injection.
- Do not request permanent host permissions. Request one origin at runtime only when the user explicitly imports the current PDF.
- Do not request `cookies`, `history`, `webRequest`, `declarativeNetRequest`, or `<all_urls>` as required permissions.
- Package every executable JS/WASM asset inside the extension. No CDN scripts, `eval`, or remote code.

### 7.8 Network policy

Implement a development and test-time network guard:

- Core workspace processing must complete with DevTools network set to Offline.
- Wrap `fetch` so only allowlisted, user-initiated purposes can occur:
  1. import the exact active-tab PDF URL;
  2. download an OCR language pack from a documented project-controlled/static source after consent;
  3. trigger Chrome's built-in AI model availability/download through browser APIs.
- No telemetry, analytics, crash-report upload, ads, fonts, images, or configuration fetched remotely.
- Record only local operational diagnostics without document content; provide a Copy Diagnostics button controlled by the user.

---

## 8. Data model

```ts
interface DocumentSession {
  id: string;
  source: DocumentSource;
  displayName: string;
  originalSize: number;
  fingerprint: string; // local hash; never transmitted
  pages: PageRef[];
  operations: Operation[];
  historyCursor: number;
  createdAt: number;
  recoveryEnabled: boolean;
}

type DocumentSource =
  | { kind: 'file'; handle?: FileSystemFileHandle }
  | { kind: 'drop' | 'clipboard' }
  | { kind: 'activeTab'; sourceUrl: string; originPermissionWasTemporary: boolean };

interface PageRef {
  id: string;
  sourceDocumentId: string;
  sourcePageIndex: number;
  widthPt: number;
  heightPt: number;
  intrinsicRotation: number;
}

interface OverlayObject {
  id: string;
  type: 'text' | 'image' | 'shape' | 'ink' | 'signature' | 'link' | 'redactionMark';
  rect: { x: number; y: number; width: number; height: number };
  rotation: number;
  opacity: number;
  payload: unknown;
}
```

Coordinates must be stored in PDF points in a canonical unrotated page coordinate system. UI canvas coordinates are converted at the boundary. Add unit tests for every 0/90/180/270-degree mapping.

---

## 9. Security, privacy, and abuse resistance

### 9.1 Threat model

Treat every input as hostile, including malformed PDFs, decompression bombs, huge page dimensions, cyclic object graphs, malicious embedded JavaScript, damaged fonts, crafted images, and ZIP-based Office files with extreme expansion ratios.

Controls:

- Parse and render in isolated workers.
- Never execute PDF JavaScript, embedded files, launch actions, or external actions.
- Sanitize URLs before making links clickable; permit only safe schemes.
- Limit nested archive expansion, entry counts, total decompressed bytes, image dimensions, page dimensions, object counts, and processing time.
- Cancel jobs and terminate/recreate workers after fatal parser or memory errors.
- Escape extracted text in all HTML UI.
- Render imported HTML through a strict sanitizer and disallow scripts, forms, iframes, remote styles, and event attributes.
- Validate magic bytes as well as file extensions/MIME types.
- Generate outputs with secure randomness where identifiers or encryption values require it.
- Add dependency scanning and lockfile integrity checks in CI.

### 9.2 Privacy promises that code must enforce

- No file upload.
- No content telemetry.
- No filenames or document titles in analytics; preferably no analytics at all initially.
- No recent-document list unless opt-in.
- Crash recovery off by default; if enabled, disclose local retention and offer **Delete recovered files**.
- Signature storage opt-in and removable.
- “Clear workspace” deletes OPFS/IndexedDB document data and releases all in-memory references.
- Model/language-pack downloads never include document data.

### 9.3 Redaction verification

For secure raster redaction, automated tests must attempt to recover:

- marked text through PDF text extraction;
- copied text from the redacted area;
- hidden annotations and form values;
- original images/resources;
- metadata containing marked terms;
- incremental-update remnants from the input.

Generate a fresh output document rather than append an incremental update.

---

## 10. Performance and reliability requirements

- Workspace interactive target: first page visible within 2 seconds for a typical 10-page, 5 MB PDF on a mid-range desktop.
- Page reorder/rotate preview target: under 100 ms for already-generated thumbnails.
- Main thread long tasks: no repeated tasks over 100 ms during processing; heavy work belongs in workers.
- Progress must advance by meaningful units, preferably pages or files.
- Cancellation target: visible stop within 500 ms where the underlying library permits; otherwise terminate the worker.
- Recover from a failed tool job without reloading the whole extension.
- Export is transactional: incomplete output is not presented as successful.
- After export, reopen the generated PDF with an independent parse path and verify page count, dimensions, and expected encryption state.
- Preserve the original file untouched in every workflow.

### 10.1 Compatibility test corpus

Include fixtures for:

- PDF versions 1.3 through 2.0 where available.
- Cross-reference tables and streams.
- Object streams and linearized PDFs.
- Mixed portrait/landscape sizes and rotations.
- Embedded/subset fonts, Unicode, CJK, RTL, and emoji fallback.
- Transparency, masks, patterns, vector-heavy engineering drawings.
- JPEG, JPEG2000, monochrome and large scanned images.
- AcroForms and unsupported XFA.
- Annotations, links, outlines, attachments, layers.
- Owner-password and user-password encryption samples.
- Valid and intentionally malformed files.
- Digitally signed PDFs to verify that modifications warn about signature invalidation.
- Very large page counts and oversized dimensions.

---

## 11. Accessibility and localization

- WCAG 2.2 AA target for extension UI.
- Complete keyboard operation for page thumbnails, toolbar, canvas objects, dialogs, and saving.
- Visible focus indicators and logical focus restoration.
- Tooltips are not the only source of essential information.
- ARIA labels and live regions for processing progress and errors.
- Do not rely on color alone for state.
- Respect reduced motion and high contrast.
- UI text extracted to localization files from the start.
- Initial UI language: English; architecture ready for German, Romanian, French, Spanish, Italian, and others.
- PDF content accessibility is preserved where possible; destructive raster operations must warn that document accessibility may be reduced.

---

## 12. Error handling and user-facing messages

Use actionable categories:

- **Password required:** ask for password; do not imply corruption.
- **Unsupported encryption:** retain the file and explain that this encryption method is not supported locally.
- **Damaged PDF:** offer local repair only if the QPDF engine is available.
- **Not enough memory:** suggest lower DPI, fewer pages, sequential batch mode, or desktop edition later.
- **Cannot import this tab:** explain how to download and open it manually.
- **Output larger than input:** offer original, explain that the file was already optimized or raster settings increased size.
- **Feature loss warning:** enumerate forms, links, selectable text, signatures, or accessibility that will be flattened/lost.
- **Digital signature invalidation:** warn before any modification to a signed PDF.
- **Cancelled:** clean temporary data and preserve the pre-operation workspace.

Never show raw stack traces to end users. Make sanitized diagnostics copyable from an expandable details section.

---

## 13. Testing strategy

### 13.1 Unit tests

- Range parser.
- Page order and interleave algorithms.
- Coordinate conversion across rotations and zoom.
- Filename sanitization and collision handling.
- Output naming.
- Operation graph undo/redo.
- Memory and canvas preflight calculations.
- Text reading-order heuristics.
- Table boundary/grid heuristics.
- Password-state handling without logging secrets.
- Network allowlist decisions.

### 13.2 Integration tests

- Load → edit → export → reopen for every tool.
- Merge mixed page sizes and rotations.
- Split preserves selected pages in order.
- Form fill and flatten across supported field types.
- Signature appearance placement at each rotation.
- OCR searchable layer alignment.
- Raster compression DPI/quality and file-size reporting.
- Secure redaction recovery attempts.
- QPDF-WASM initialization under Manifest V3 CSP.
- Worker cancellation and cleanup.
- OPFS recovery and deletion.
- No network request during local operations.

### 13.3 End-to-end tests

Use Playwright with the unpacked extension:

- Install/open popup/workspace.
- Import through picker and drag/drop.
- Use active-tab import against public, authenticated-test, and blocked cases.
- Complete top workflows with keyboard only.
- Save one output and batch ZIP.
- Reload during crash-recovery opt-in flow.
- Verify permission prompts occur only at the relevant user action.
- Verify the extension works with network disabled.

### 13.4 Cross-viewer validation

Open output fixtures in:

- Chrome PDF viewer.
- Firefox PDF.js viewer.
- Adobe Acrobat Reader.
- macOS Preview where CI/manual testing is possible.

For each release, compare page count, visible rendering, forms, annotations, links, text extraction, and password behavior.

---

## 14. Definition of done for every tool

A tool is not complete until:

1. The UI has a clear name, short description, defaults, and destructive-change warnings.
2. Input validation covers malformed, encrypted, empty, oversized, and unsupported files.
3. Processing runs outside the main UI thread.
4. Progress and cancellation work.
5. Undo/redo works for preview-stage changes where applicable.
6. Output has a sensible name and can be saved without extra permissions.
7. Output reopens and passes structural sanity checks.
8. Automated fixtures cover common and adversarial cases.
9. No document content leaves the device.
10. The tool documents what it preserves and what it may remove.
11. Accessibility and keyboard behavior are tested.
12. Errors leave the workspace recoverable.

---

## 15. Coding-agent implementation sequence

The coding agent should work in small, independently reviewable milestones.

### Milestone 0 — Repository and proof-of-concept

- Create MV3 extension, TypeScript strict build, lint, formatter, unit tests, and Playwright extension harness.
- Open the full-tab workspace from the popup.
- Load one PDF, render one page through PDF.js in a worker, and export an unchanged copy.
- Prove a packaged WASM sample loads under the final CSP.
- Add a network-blocking E2E test.
- Produce a dependency/license inventory.

### Milestone 1 — Document core

- Session model, input adapters, stable page IDs, virtualized viewer/thumbnails.
- Operation graph, undo/redo, worker protocol, progress/cancellation.
- Save As, Blob fallback, ZIP, OPFS temp storage, clear-workspace flow.

### Milestone 2 — Page tools

- Merge, split, extract, reorder, rotate, delete, duplicate, insert blank/image, reverse, interleave.
- Cross-viewer fixture validation.

### Milestone 3 — Conversion fundamentals

- PDF to images and images to PDF.
- Page resize, crop, margins, grayscale.
- Strong raster compression with warnings and size comparison.

### Milestone 4 — Overlays, forms, and e-sign

- Overlay scene model and canvas interaction.
- Text/images/shapes/ink/highlights/links.
- Watermarks, page numbers, headers/footers, Bates numbering.
- Form filling/flattening.
- Signature appearance creation and placement.

### Milestone 5 — OCR and secure privacy tools

- Tesseract worker/language packs, preprocessing, text output, searchable layer.
- Secure raster redaction and verification.
- Metadata viewer and cleanup.

### Milestone 6 — QPDF-WASM spike and gated tools

Before production integration, document:

- exact source revision and reproducible build;
- wrapper and binary licenses;
- compressed/uncompressed bundle size;
- initialization time and memory on representative devices;
- encryption compatibility;
- malformed-input behavior;
- worker cancellation behavior;
- CSP/Chrome Web Store compliance.

If the spike passes, implement protect, unlock, structural optimize, linearize, inspect, and repair. If it fails, omit those features rather than using a remote service.

### Milestone 7 — Beta exports and optional AI

- TXT/Markdown/DOCX exports.
- Table selection and CSV/XLSX export.
- Page-image PPTX export.
- Built-in AI availability UX, summary, translation, retrieval-grounded chat with page citations.

Each milestone must leave the extension releasable and must not expose unfinished tools in production navigation.

---

## 16. Suggested repository policies

- Recommended project license: AGPL-3.0 if the strategic goal is to require hosted derivatives to publish source; Apache-2.0 or MIT if maximum adoption and commercial reuse are preferred. Decide before accepting contributions.
- Add `SECURITY.md`, `PRIVACY.md`, `CONTRIBUTING.md`, `THIRD_PARTY_NOTICES.md`, and a dependency-generated SBOM.
- Require exact/pinned dependency versions in the lockfile.
- Dependabot/Renovate updates require corpus tests before merge.
- No remotely loaded scripts or WASM.
- No dependency may be added without license, maintenance, bundle-size, security, and browser-support review.
- Reproducible production build and signed release artifacts.
- Chrome Web Store package must be generated from a tagged commit in CI.

---

## 17. Chrome Web Store positioning

Working title:

**UnlimitedPDF — Private PDF Editor & Toolbox**

Short description concept:

> Merge, split, compress, convert, organize, OCR, fill and sign PDFs locally in Chrome. Free, open source, no uploads.

Avoid unprovable claims such as “everything,” “perfect conversion,” “military-grade,” “100% secure,” or “unlimited file size.” “Unlimited” should mean no product-enforced usage quota, not infinite device capacity.

Primary differentiators:

- Files stay on the device.
- No account.
- No watermark.
- No daily task quota.
- Free and open source.
- Minimal permissions.
- Works offline after required assets/language packs are installed.
- Honest warnings for destructive transformations.

### Permission disclosure draft

- **Storage:** saves settings and optional local recovery data.
- **Active tab:** lets the user explicitly open the PDF currently visible in the tab.
- **Site access, when requested:** temporary access to the current PDF's website so UnlimitedPDF can read that exact file. It is requested only when needed.
- **Context menus, optional:** adds an “Open in UnlimitedPDF” shortcut.

---

## 18. Analytics and success metrics without tracking documents

The first release should run with no analytics. If privacy-preserving telemetry is added later, it must be opt-in and must never include filenames, URLs, document metadata/content, extracted text, page images, passwords, signatures, or stable cross-site identifiers.

Useful local-only dashboard metrics:

- number of completed operations by tool;
- total local processing time;
- bytes saved through compression;
- failure categories;
- local storage consumed and clear button.

Product success can initially be measured through Chrome Web Store installs/retention, ratings, GitHub stars/issues, and aggregate store-provided metrics rather than in-extension tracking.

---

## 19. Open technical decisions and required spikes

1. Confirm whether active-tab permission alone reliably allows fetching the visible PDF across Chrome's built-in PDF viewer, redirects, cookies, and signed URLs. Keep manual-open fallback regardless.
2. Choose `pdf-lib` versus a lower-level alternative for preservation-sensitive operations after testing forms, outlines, annotations, layers, and signatures.
3. Build and audit QPDF-WASM from source rather than relying blindly on a small third-party wrapper.
4. Determine whether balanced resource-level image recompression can be done safely with the chosen open-source stack; otherwise omit the mode.
5. Measure Tesseract language-pack size, offline caching, OCR throughput, and memory.
6. Validate invisible OCR text placement for rotation, skew, and non-Latin scripts.
7. Select a maintained, license-compatible canvas interaction library or implement the limited overlay scene directly.
8. Decide project license in view of the future hosted service.
9. Test Chrome built-in AI APIs from extension pages on supported/unsupported devices and define minimum Chrome version.
10. Evaluate whether `storage` and `contextMenus` permissions can remain optional or be removed.

---

## 20. Source basis

Primary and official sources used to establish current capabilities and constraints:

- [Smallpdf tool catalog](https://smallpdf.com/pdf-tools) and [Smallpdf Chrome Web Store listing](https://chromewebstore.google.com/detail/smallpdf%E2%80%94edit-convert-com/ohfgljdgelakfkefopgklcohadegdpjf)
- [Mozilla PDF.js](https://mozilla.github.io/pdf.js/)
- [`pdf-lib` documentation](https://pdf-lib.js.org/) and [source repository](https://github.com/Hopding/pdf-lib)
- [Tesseract.js browser OCR](https://tesseract.projectnaptha.com/)
- [QPDF source and capabilities](https://github.com/qpdf/qpdf), [QPDF documentation](https://qpdf.readthedocs.io/), and [Apache 2.0 license](https://qpdf.readthedocs.io/en/stable/license.html)
- [Chrome Manifest V3 content security policy](https://developer.chrome.com/docs/extensions/reference/manifest/content-security-policy), [MV3 remote-code restrictions](https://developer.chrome.com/docs/extensions/develop/migrate/improve-security), and [WASM support](https://developer.chrome.com/docs/extensions/whats-new)
- [Chrome `activeTab`](https://developer.chrome.com/docs/extensions/reference/api/tabs), [optional permissions](https://developer.chrome.com/docs/extensions/reference/api/permissions), and [extension service-worker lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle)
- [Chrome File System Access guidance](https://developer.chrome.com/docs/capabilities/web-apis/file-system-access)
- [Chrome built-in AI](https://developer.chrome.com/docs/ai/built-in) and [Prompt API](https://developer.chrome.com/docs/ai/prompt-api)
- [`docx` browser document generation](https://github.com/dolanmiu/docx)
- [PptxGenJS browser presentation generation](https://gitbrent.github.io/PptxGenJS/)
- [SheetJS Community Edition](https://docs.sheetjs.com/docs/)
- [MuPDF.js licensing](https://github.com/ArtifexSoftware/mupdf.js/) — considered but not recommended as a default dependency without an AGPL/commercial-license decision

---

## 21. Final product boundary

UnlimitedPDF can become a strong, credible alternative to the Smallpdf extension for the workflows most users perform daily. Its advantage is not merely that it is free; it is that the processing model is local, inspectable, permission-conscious, and usable without an account.

The implementation should ship fewer tools initially, but each visible tool must genuinely work. Feature tiles must not redirect to a website, upload a file, or imply local capability that is actually unavailable. When a browser-only approach has a fidelity tradeoff, the UI must state it before processing and summarize it again before save.
