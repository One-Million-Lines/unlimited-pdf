import { APP_VERSION, PRODUCT_NAME, PRODUCT_SHORT } from './version';

/**
 * Typed Manifest V3 definition. Serialized to dist/manifest.json by
 * scripts/build.mjs — the manifest is never hand-edited.
 *
 * Permission philosophy (spec §7.7): request the minimum. UnlimitedPDF ships
 * with only `storage` (small settings/recent-tool list) and `activeTab`
 * (user-invoked "open the PDF in this tab"). Broad host access is requested at
 * runtime, one origin at a time, only when the user explicitly imports the
 * active-tab PDF. `contextMenus` is optional and off by default.
 *
 * The CSP keeps everything local: only extension-packaged scripts run, and
 * `wasm-unsafe-eval` is pre-authorized for future packaged WebAssembly
 * (OCR / QPDF) without permitting remote code.
 */
export function buildManifest(): Record<string, unknown> {
  const icons = {
    '16': 'icons/icon-16.png',
    '32': 'icons/icon-32.png',
    '48': 'icons/icon-48.png',
    '128': 'icons/icon-128.png',
  };

  return {
    manifest_version: 3,
    name: PRODUCT_NAME,
    short_name: PRODUCT_SHORT,
    version: APP_VERSION,
    description:
      'Merge, split, organize, convert, compress and annotate PDFs locally in Chrome. Free, open source, no uploads, no accounts.',
    minimum_chrome_version: '116',
    icons,
    action: {
      default_popup: 'popup/index.html',
      default_title: 'Open UnlimitedPDF',
      default_icon: icons,
    },
    background: {
      service_worker: 'service-worker.js',
      type: 'module',
    },
    options_ui: {
      page: 'options/index.html',
      open_in_tab: true,
    },
    permissions: ['storage', 'activeTab'],
    optional_permissions: ['contextMenus'],
    optional_host_permissions: ['http://*/*', 'https://*/*'],
    content_security_policy: {
      extension_pages: "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'",
    },
  };
}

export default buildManifest;
