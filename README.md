# UnlimitedPDF — Private PDF Editor & Toolbox

A free, open-source, **privacy-first PDF toolbox** that runs entirely in your
browser as a Chrome (Manifest V3) extension. Merge, split, organize, convert,
watermark, number, extract text from, and compress PDFs — **all on your device**.

> UnlimitedPDF is a free, open-source PDF toolbox that processes files locally on
> your device. No uploads, no accounts, no usage limits imposed by us.

“Unlimited” means there is **no product-enforced usage quota** — not infinite
device capacity. Real limits still come from your device’s memory and file size.

- 🔒 **Local-only** — no backend, no accounts, no analytics, no telemetry, nothing uploaded.
- 🧩 **Minimal permissions** — `storage` + `activeTab`; broad site access is requested at runtime, one origin at a time, only when you explicitly import the current tab’s PDF.
- 🧠 **Honest capabilities** — every visible tool genuinely works; destructive operations warn first.
- 🛠️ **Open source** — MIT licensed, inspectable, contributions welcome.

---

## Shipped tools (Phase 1)

| Tool | What it does |
| --- | --- |
| **Reader & properties** | View a PDF, page-by-page thumbnails, and document properties. |
| **Organize pages** | Reorder, rotate, delete, duplicate, reverse — non-destructive with undo/redo. |
| **Merge** | Combine several PDFs (and per-file page selections) into one. |
| **Split & extract** | Every page, fixed groups, cut-after-pages, or extract a range. |
| **Images → PDF** | Build a PDF from JPG/PNG/WebP (A4/Letter/Legal or image-sized). |
| **PDF → images** | Export pages as JPG/PNG/WebP at a chosen DPI/quality. |
| **Watermark** | Stamp text across pages with opacity, rotation, color, tiling. |
| **Page numbers** | `{n} / {total}` style formats, six positions, custom font/size. |
| **Extract text** | Save selectable text as a `.txt` in reading order. |
| **Optimize (lossless)** | Repack with object streams; optionally strip metadata. |
| **Compress (raster)** | Strongly shrink by rasterizing pages (with clear feature-loss warnings). |

The navigation is generated strictly from a catalog of **implemented** tools, so
no unfinished feature is ever exposed. See [ROADMAP](#roadmap) for what’s next.

---

## Quick start (development)

Requirements: **Node ≥ 20**.

```bash
npm install          # install pinned dependencies
npm run build        # generate icons + build the extension into dist/
```

Then load it in Chrome:

1. Open `chrome://extensions`.
2. Enable **Developer mode** (top-right).
3. Click **Load unpacked** and select the `dist/` folder.
4. Click the UnlimitedPDF toolbar icon → **Open PDF or files**.

### Everyday commands

| Command | Purpose |
| --- | --- |
| `npm run build` | Production build → `dist/` |
| `npm run dev` | Build and **watch** `src/` for changes |
| `npm run typecheck` | Strict TypeScript check (no emit) |
| `npm test` | Unit + integration tests (Vitest) |
| `npm run test:e2e` | End-to-end tests (Playwright, loads the unpacked extension) |
| `npm run build:zip` | Production build **and** a Web Store ZIP in `dist-zip/` |
| `npm run verify` | `typecheck` → `test` → `build` (use before releasing) |
| `npm run clean` | Remove `dist/` and `dist-zip/` |

---

## Testing

- **Unit tests** cover the pure logic: page-range parsing, filename/output naming,
  coordinate conversion across 0/90/180/270°, text reading-order, the network
  allowlist, memory/canvas preflight, and the operation graph / projection.
- **Integration tests** run the real pdf-lib tools in Node and follow the
  **load → operate → export → reopen** cycle (merge, split, organize/compile,
  images→PDF, watermark, page numbers, optimize), verifying structural sanity.
- **End-to-end tests** (Playwright) load the built extension into Chromium and
  verify the popup, the pdf.js render pipeline in the workspace, an organize →
  save flow, and that **no external network request** occurs during local work.

```bash
npm test                 # unit + integration
npm run build            # e2e needs a fresh dist/
npx playwright install chromium   # first run only
npm run test:e2e
```

---

## Packaging for the Chrome Web Store

1. Bump the version in [`src/config/version.ts`](src/config/version.ts) (single source of truth).
2. Build a store package:
   ```bash
   npm run verify        # typecheck + tests + build
   npm run build:zip     # → dist-zip/unlimited-pdf-<version>.zip
   ```
3. In the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole):
   - Create/select the item and **upload** `dist-zip/unlimited-pdf-<version>.zip`.
   - Store listing title: **UnlimitedPDF — Private PDF Editor & Toolbox**.
   - Short description: *Merge, split, compress, convert, organize, extract and
     stamp PDFs locally in Chrome. Free, open source, no uploads.*
   - Privacy policy URL: `https://onemillionlines.com/privacy/unlimitedpdf`.
   - **Permissions justification** (see [Permissions](#permissions-why-each-one)).
4. For reproducible releases, build from a tagged commit in CI and attach the
   generated ZIP as the signed release artifact.

The manifest is generated from typed source ([`src/config/manifest.ts`](src/config/manifest.ts))
— never hand-edit `dist/manifest.json`.

---

## Permissions (why each one)

| Permission | Why | Notes |
| --- | --- | --- |
| `storage` | Saves small settings (recent **tool** names, default DPI, toggles). | Never stores document content, filenames, or URLs. |
| `activeTab` | Lets you open the PDF in the current tab, on an explicit click. | No access to other tabs or history. |
| `contextMenus` *(optional)* | Adds an “Open link in UnlimitedPDF” entry. | Off by default; requested only if enabled in Settings. |
| `optional_host_permissions` `http(s)://*/*` | Fetch **one** exact active-tab PDF you choose to import. | Requested at runtime for a single origin; used for nothing else. |

Never requested: `tabs`, `history`, `cookies`, `webRequest`,
`declarativeNetRequest`, `downloads`, or a permanent `<all_urls>` host permission.

CSP for extension pages: `script-src 'self' 'wasm-unsafe-eval'; object-src 'self'`
— everything is bundled locally, no CDN, no `eval`, no remote code.

---

## Architecture (short version)

- **TypeScript (strict)** + **Preact** UI, built with **Vite** (pages & workers) and
  a typed manifest, packaged by [`scripts/build.mjs`](scripts/build.mjs).
- **pdf.js** parses/renders and extracts text (in its own worker).
- **pdf-lib** creates and modifies PDFs inside a dedicated **Web Worker**
  (`src/workers/pdf-write.worker.ts`) so the UI thread stays responsive.
- A **non-destructive operation graph** (rotate/delete/duplicate/reorder/overlay)
  is projected to preview and compiled once on export.
- **fflate** builds local ZIPs; the **File System Access API** provides Save As,
  with a Blob-download fallback.

See [ARCHITECTURE.md](ARCHITECTURE.md) for the full picture.

---

## Roadmap

Phase 1 (this release) ships the core local toolbox above. Deliberately **not**
shipped yet (to keep every visible tool genuinely working): OCR & searchable
PDFs, password protect/unlock & structural repair (QPDF-WASM spike), secure
raster redaction, metadata cleanup UI, an interactive overlay/annotate/e-sign
editor, forms, batch/recipes, honest DOCX/XLSX/PPTX exports, and optional
built-in AI. These are tracked against the product specification’s Phases 2–3.

---

## Privacy & security

- [PRIVACY.md](PRIVACY.md) — what is (and is not) processed, stored, and sent.
- [SECURITY.md](SECURITY.md) — threat model and how to report issues.
- Full policy online: <https://onemillionlines.com/privacy/unlimitedpdf>.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Dependencies are pinned; no dependency is
added without a license/size/security review, and no remote code is ever loaded.

## License

[MIT](LICENSE) © One Million Lines (onemillionlines.com). Built by
[Alexandru Rada](https://www.linkedin.com/in/alexrada/). Third-party notices in
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
