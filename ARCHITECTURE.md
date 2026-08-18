# Architecture

UnlimitedPDF is a Manifest V3 Chrome extension that does all PDF work locally.

## High-level flow

```
 Popup (launcher)  ──opens──▶  Workspace tab (Preact app)
        │                              │
        │                     ┌────────┴─────────┐
        │                     │  pdf.js (worker) │  parse / render / text
   Service worker             │  pdf-lib (worker)│  create / modify / serialize
   (thin: open tab,           └────────┬─────────┘
    context menu,                      │
    optional perms)          File System Access API / Blob download / fflate ZIP
```

The **service worker is deliberately thin** — it opens the workspace, manages the
optional context menu, and routes short messages. It never owns document state or
long-running jobs, because MV3 workers can be terminated at any time.

## Source layout

```
src/
  config/         version + typed MV3 manifest (serialized at build time)
  background/     service-worker.ts
  core/
    documents/    session & page model
    operations/   operation types, undo/redo graph, page projection
    pipeline/     job/progress/error contracts
    validation/   magic-byte input validation, memory/canvas preflight
    persistence/  chrome.storage settings
    net/          the single network allow/deny choke point
    util/         range parser, filename, coords, color, reading-order, ids, format
  lib/            engine adapters: pdfjs.ts, write-worker.ts (client), save.ts
  tools/          pure pdf-lib tools (merge, split, compile, images-to-pdf,
                  watermark, page-numbers, optimize) + catalog + page-size
  workers/        pdf-write.worker.ts + protocol
  ui/
    popup/        launcher (Preact)
    workspace/    store + App + components (viewer, grid, inspector, overlays)
    options/      privacy settings
    shared/       theme.css, icons, nav helpers
```

## Key design decisions

### Non-destructive operation graph
Organize actions (rotate/delete/duplicate/reorder) and overlays are **operations**
appended to a graph with an undo/redo cursor (`core/operations`). A pure
`projectPages()` computes the effective page list for both preview and export, so
the two can never diverge. Original bytes are immutable; the graph is compiled to
a fresh PDF only on export.

### Engine boundaries (adapters)
- **pdf.js** (`lib/pdfjs.ts`) — parsing, rendering to canvas/bitmap, text
  extraction. Runs its own bundled worker; configured to never execute document
  JavaScript.
- **pdf-lib** (`tools/*`) — document creation/modification. These are **pure
  functions** so they run in Node for the integration tests, and inside a
  dedicated worker at runtime.

### Worker protocol
`workers/pdf-write.worker.ts` routes typed messages to the pdf-lib tools with
cooperative cancellation (an `AbortController` per job) and transfers
`ArrayBuffer`s both ways. The main-thread client (`lib/write-worker.ts`) copies
input bytes before transferring, so the session’s immutable original is never
detached; a crashed worker is dropped and recreated.

### Rasterization split
PDF→images and raster compression render pages with pdf.js to an `OffscreenCanvas`
(decode work stays in pdf.js’s worker), bounded by `validation/preflight.ts`
(canvas side/area limits, DPI fitting). Compression then re-assembles the page
images into a PDF via the write worker.

### Network policy
`core/net/guard.ts` is the only place a `fetch` is allowed, and only for a URL that
was explicitly authorized (one-shot) for an active-tab import. A unit test proves
the allow/deny logic, and a Playwright test proves the workspace performs **zero**
external requests during local work.

### Coordinates
All overlay/geometry math stores PDF **points** in the canonical *unrotated* page
space; `core/util/coords.ts` converts to/from canvas pixels for each of
0/90/180/270°, with round-trip unit tests for every rotation.

## Build

`scripts/build.mjs` runs Vite twice — once for the ESM service worker, once for the
HTML pages (Preact) — bundling the pdf.js worker (`?worker`) and the write worker
(`new URL(..., import.meta.url)`) as local assets. The manifest is generated from
`config/manifest.ts`. `--zip` packages `dist/` into `dist-zip/` with fflate.
