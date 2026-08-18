# Privacy Policy — UnlimitedPDF

**Last updated: August 2026**

UnlimitedPDF does not collect, transmit, store, or share any personal data. Your
documents never leave your device. There is no server, no account, no analytics,
and no network request in production code during document processing. All
viewing, editing, conversion, and export happen entirely on your device.

The canonical, always-current policy lives at
<https://onemillionlines.com/privacy/unlimitedpdf>. This file mirrors it.

## What UnlimitedPDF does

It is a Manifest V3 Chrome extension that processes PDFs locally in the browser:
view/read, organize (reorder/rotate/delete/duplicate/reverse), merge, split &
extract, images↔PDF, watermark, page numbers, extract text, optimize, and raster
compression. Every operation runs on your device using bundled open-source
libraries (Mozilla PDF.js, pdf-lib, fflate).

## Data we do NOT collect

- Personal identifiers (name, email, IP, device id).
- Your PDFs, images, extracted text, or any generated output — these never leave your device.
- Filenames, document titles, or URLs.
- Browsing history or visited URLs.
- Interaction/usage analytics, telemetry, or crash reports.
- Any cross-site identifiers, ads, or tracking.

## Data stored locally (and only locally)

- **Settings** via `chrome.storage.local`: remembered recent **tool** names
  (never filenames or content), default export DPI, and UI toggles. Never synced,
  never transmitted. Clear them anytime in **Settings → Clear all local data**.
- **Documents are not persisted** after a session unless you enable **Crash
  recovery** (off by default). If enabled, recoverable temporary data is kept
  locally and can be deleted in one click.

## Chrome permissions

- `storage` — save the small settings above. No document content is ever written.
- `activeTab` — open the PDF currently visible in the active tab, only after you click.
- `contextMenus` *(optional, off by default)* — an “Open link in UnlimitedPDF” entry.
- Optional host permissions (`http(s)://*/*`) — **not** granted by default; requested
  at runtime for a **single** site only when you explicitly choose “Use PDF from
  this tab”, to fetch that one exact file.

UnlimitedPDF will **never** request `tabs`, `history`, `cookies`, `webRequest`,
`declarativeNetRequest`, `downloads`, or a permanent `<all_urls>` host permission.

## No network requests

All document processing completes offline. The only network request is the
user-initiated fetch of the exact active-tab PDF from its own site (only after
you explicitly ask). Any future optional OCR language packs or built-in AI models
would download only with your consent and would never include document data.

## Security

Manifest V3 with a strict Content Security Policy
(`script-src 'self' 'wasm-unsafe-eval'; object-src 'self'`). No remote scripts,
no `eval`, no CDN. All executable code (including PDF.js and pdf-lib) is bundled
inside the extension. Heavy processing runs in Web Workers.

## Children’s privacy

Because the extension collects no personal data, it does not knowingly collect
data from children.

## Your rights

There is nothing for us to access, correct, or delete on your behalf — all data
stays on your device under your control, and you can clear it at any time.

## Contact

Part of the open-source [One Million Lines](https://onemillionlines.com) project.
Questions: hello@onemillionlines.com, or open an issue at
<https://github.com/One-Million-Lines/unlimited-pdf>.
