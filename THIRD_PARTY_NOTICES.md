# Third-Party Notices

UnlimitedPDF bundles the following open-source libraries. All executable code is
packaged inside the extension — nothing is loaded from a CDN or remote source.
Each library is used under its stated license; full license texts are available
in the respective packages under `node_modules/<pkg>/LICENSE` and at the linked
project pages.

## Bundled at runtime

| Library | Version | License | Project |
| --- | --- | --- | --- |
| pdf.js (`pdfjs-dist`) | 6.2.108 | Apache-2.0 | https://github.com/mozilla/pdf.js |
| `pdf-lib` | 1.17.1 | MIT | https://github.com/Hopding/pdf-lib |
| `fflate` | 0.8.3 | MIT | https://github.com/101arrowz/fflate |
| Preact | 10.29.8 | MIT | https://github.com/preactjs/preact |

## Build-time only (not shipped in the extension)

Vite, `@preact/preset-vite`, esbuild, TypeScript, Vitest, Playwright,
`@types/chrome`, and jsdom are used to build and test the project. They are not
included in the packaged extension.

## Notes

- **pdf.js** is licensed under the Apache License, Version 2.0. A copy of the
  license accompanies the `pdfjs-dist` package.
- **pdf-lib**, **fflate**, and **Preact** are licensed under the MIT License.
- No dependency is added without a license, maintenance, bundle-size, security,
  and browser-support review. Versions are pinned in `package-lock.json`.

If you believe an attribution is missing or incorrect, please open an issue at
<https://github.com/One-Million-Lines/unlimited-pdf/issues>.
