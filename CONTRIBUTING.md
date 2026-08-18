# Contributing to UnlimitedPDF

Thanks for helping build a genuinely private PDF toolbox! A few ground rules keep
the project trustworthy.

## Principles

1. **Local by default.** No document bytes may cross the network. All processing
   stays on the device. There is no backend.
2. **Honest capabilities.** A tool ships only when it genuinely works. Don’t add a
   navigation tile for something incomplete — the catalog in
   `src/tools/catalog.ts` is the single source of exposed tools.
3. **Permission restraint.** Don’t add permissions. `storage` + `activeTab` are the
   baseline; broad host access is requested at runtime, one origin at a time.
4. **No remote code.** No CDN scripts, no `eval`, no remotely-hosted WASM. Everything
   is bundled. CSP stays `script-src 'self' 'wasm-unsafe-eval'`.

## Development

```bash
npm install
npm run dev          # watch build → load dist/ as an unpacked extension
npm run typecheck    # strict TS
npm test             # unit + integration
npm run build && npm run test:e2e   # end-to-end
```

Before opening a PR, run `npm run verify` (typecheck + tests + build). New tools
must add fixtures/tests covering common **and** adversarial inputs, and follow the
**load → operate → export → reopen** validation pattern.

## Code style

- TypeScript strict mode; no `any` unless justified.
- Pure, testable core logic under `src/core`; engine adapters under `src/lib`;
  pdf-lib tool functions under `src/tools` (must run in Node for tests).
- Comment only where intent isn’t obvious.
- UI is Preact; keep heavy work in workers, never on the main thread.

## Dependencies

- Pin exact versions. No dependency is added without a **license, maintenance,
  bundle-size, security, and browser-support review**.
- Update the lockfile deliberately; the test corpus must pass before merge.
- Record third-party attributions in `THIRD_PARTY_NOTICES.md`.

## Reporting issues

Bugs and feature requests: <https://github.com/One-Million-Lines/unlimited-pdf/issues>.
Security reports: see [SECURITY.md](SECURITY.md) — please disclose privately.
