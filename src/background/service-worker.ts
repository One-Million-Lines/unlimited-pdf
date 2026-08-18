/**
 * Background service worker (spec §7.3). Deliberately thin: it opens the
 * workspace tab, manages the optional context-menu entry, and routes short
 * control messages. It never owns document state or long-running jobs, because
 * MV3 service workers can be terminated at any time.
 */
import { buildWorkspaceUrl } from '../ui/shared/nav';

const CONTEXT_MENU_ID = 'unlimitedpdf-open-link';

/** Open the full-tab workspace, optionally targeting a tool or import URL. */
async function openWorkspace(params: { tool?: string; importUrl?: string } = {}): Promise<void> {
  await chrome.tabs.create({ url: buildWorkspaceUrl(params) });
}

/** Create the context-menu entry (only when the optional permission is held). */
function createContextMenu(): void {
  if (!chrome.contextMenus) return;
  chrome.contextMenus.create(
    {
      id: CONTEXT_MENU_ID,
      title: 'Open link in UnlimitedPDF',
      contexts: ['link'],
      targetUrlPatterns: ['*://*/*.pdf', '*://*/*.pdf?*'],
    },
    () => void chrome.runtime.lastError,
  );
}

function removeContextMenu(): void {
  chrome.contextMenus?.remove(CONTEXT_MENU_ID, () => void chrome.runtime.lastError);
}

async function refreshContextMenu(): Promise<void> {
  if (!chrome.contextMenus) return;
  const has = await chrome.permissions.contains({ permissions: ['contextMenus'] }).catch(() => false);
  chrome.contextMenus.removeAll(() => {
    if (has) createContextMenu();
  });
}

chrome.runtime.onInstalled.addListener(() => {
  void refreshContextMenu();
});

chrome.runtime.onStartup?.addListener(() => {
  void refreshContextMenu();
});

// Recreate/remove the menu as the optional permission is granted or revoked.
chrome.permissions.onAdded?.addListener((p) => {
  if (p.permissions?.includes('contextMenus')) createContextMenu();
});
chrome.permissions.onRemoved?.addListener((p) => {
  if (p.permissions?.includes('contextMenus')) removeContextMenu();
});

chrome.contextMenus?.onClicked.addListener((info) => {
  if (info.menuItemId === CONTEXT_MENU_ID && info.linkUrl) {
    void openWorkspace({ importUrl: info.linkUrl });
  }
});

// Short control messages from the popup/workspace.
chrome.runtime.onMessage.addListener((message: { type?: string; tool?: string; importUrl?: string }, _sender, sendResponse) => {
  if (message?.type === 'openWorkspace') {
    void openWorkspace({ tool: message.tool, importUrl: message.importUrl }).then(() => sendResponse({ ok: true }));
    return true; // async response
  }
  return undefined;
});
