# Security Policy — UnlimitedPDF

## Reporting a vulnerability

Please report suspected vulnerabilities privately to **security@onemillionlines.com**
(or hello@onemillionlines.com) rather than opening a public issue. Include steps
to reproduce and, where possible, a sample file. We aim to acknowledge reports
within a few business days.

Do not include real sensitive documents in reports — a minimal reproduction is
enough, and UnlimitedPDF never transmits your files.

## Threat model

Every input is treated as hostile: malformed PDFs, decompression bombs, huge page
dimensions, cyclic object graphs, embedded JavaScript, damaged fonts, crafted
images. Controls in place:

- **No remote code.** Manifest V3 with CSP `script-src 'self' 'wasm-unsafe-eval'`.
  No CDN, no `eval`, no `new Function` from remote input. All code is bundled.
- **Isolated processing.** Parsing/rendering (pdf.js) and serialization (pdf-lib)
  run in Web Workers. A fatal worker error is recoverable without reloading.
- **No PDF JavaScript execution.** pdf.js is configured to not run document
  scripts; embedded files/actions are never executed.
- **Magic-byte validation.** Inputs are validated by content signature, not just
  extension/MIME, before processing.
- **Size & canvas preflight.** Rasterization is bounded by canvas/memory limits;
  oversized requests are scaled down or warned about.
- **Network allowlist.** A single choke point (`src/core/net/guard.ts`) permits
  only the one user-authorized active-tab PDF fetch; everything else is denied.
  A unit test and an end-to-end offline test enforce this.
- **Secure randomness.** Identifiers and fingerprints use the Web Crypto API.
- **Immutable originals.** Original bytes are never mutated; outputs are new
  documents, and the original file on disk is always preserved (Save As).

## Supported versions

Security fixes target the latest released version. Dependencies are pinned in the
lockfile; updates require the test corpus to pass before merge.

## Out of scope (by design, this release)

Password/encryption removal, secure redaction, and OCR are **not** shipped yet
(see the roadmap). Encrypted PDFs are detected and reported, not bypassed.
