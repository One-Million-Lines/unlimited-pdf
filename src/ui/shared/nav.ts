/**
 * Helpers for building and parsing the workspace URL. The workspace opens as a
 * normal extension tab; an optional tool id and/or an active-tab import URL are
 * passed as query parameters.
 */

export interface WorkspaceParams {
  tool?: string;
  /** An http(s) URL the user chose to import from the active tab. */
  importUrl?: string;
}

const WORKSPACE_PATH = 'workspace/index.html';

export function buildWorkspaceUrl(params: WorkspaceParams = {}): string {
  const base =
    typeof chrome !== 'undefined' && chrome.runtime?.getURL
      ? chrome.runtime.getURL(WORKSPACE_PATH)
      : `/${WORKSPACE_PATH}`;
  const search = new URLSearchParams();
  if (params.tool) search.set('tool', params.tool);
  if (params.importUrl) search.set('import', params.importUrl);
  const qs = search.toString();
  return qs ? `${base}?${qs}` : base;
}

export function parseWorkspaceParams(search: string): WorkspaceParams {
  const params = new URLSearchParams(search);
  const out: WorkspaceParams = {};
  const tool = params.get('tool');
  const importUrl = params.get('import');
  if (tool) out.tool = tool;
  if (importUrl) out.importUrl = importUrl;
  return out;
}

/** Heuristic: does this URL look like a directly-importable PDF? (spec §4.4) */
export function looksLikePdfUrl(url: string | undefined): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    return /\.pdf(\?|#|$)/i.test(u.pathname + u.search);
  } catch {
    return false;
  }
}
