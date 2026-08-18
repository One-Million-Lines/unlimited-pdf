import { useEffect, useMemo, useState } from 'preact/hooks';
import { Icon } from '../shared/icons';
import { buildWorkspaceUrl, looksLikePdfUrl } from '../shared/nav';
import { CATEGORIES, TOOLS, toolsByCategory, getTool, type ToolDef } from '../../tools/catalog';
import { loadSettings } from '../../core/persistence/settings';

const GITHUB_URL = 'https://github.com/One-Million-Lines/unlimited-pdf';

function openWorkspace(params: { tool?: string; importUrl?: string } = {}): void {
  const url = buildWorkspaceUrl(params);
  if (typeof chrome !== 'undefined' && chrome.tabs?.create) {
    chrome.tabs.create({ url });
    window.close();
  } else {
    window.open(url, '_blank');
  }
}

export function PopupApp() {
  const [tabUrl, setTabUrl] = useState<string | undefined>(undefined);
  const [recent, setRecent] = useState<string[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    (async () => {
      const settings = await loadSettings();
      if (settings.rememberRecentTools) setRecent(settings.recentTools);
    })();
    if (typeof chrome !== 'undefined' && chrome.tabs?.query) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        setTabUrl(tabs[0]?.url);
      });
    }
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return TOOLS.filter((t) => t.name.toLowerCase().includes(q) || t.short.toLowerCase().includes(q));
  }, [query]);

  const isPdfTab = looksLikePdfUrl(tabUrl);

  return (
    <div class="popup">
      <div class="popup-head">
        <div class="popup-logo" aria-hidden="true">
          <Icon name="file" size={18} />
        </div>
        <div>
          <div class="popup-title">
            Unlimited<span>PDF</span>
          </div>
          <div class="popup-sub">Private PDF toolbox</div>
        </div>
        <div class="spacer" />
        <button
          class="btn btn-ghost btn-icon"
          title="Settings"
          aria-label="Settings"
          onClick={() => chrome.runtime?.openOptionsPage?.()}
        >
          <Icon name="settings" size={18} />
        </button>
      </div>

      <div class="primary-actions">
        <button class="btn btn-primary" onClick={() => openWorkspace()}>
          <Icon name="plus" size={18} /> Open PDF or files
        </button>
        {isPdfTab && (
          <button class="btn" onClick={() => openWorkspace({ importUrl: tabUrl })}>
            <Icon name="file" size={16} /> Use PDF from this tab
          </button>
        )}
      </div>

      <div class="tool-search">
        <Icon name="search" size={16} />
        <input
          type="text"
          placeholder="Search tools…"
          aria-label="Search tools"
          value={query}
          onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
        />
      </div>

      {recent.length > 0 && !filtered && (
        <div class="cat">
          <h3>Recent</h3>
          <div class="recent-row">
            {recent
              .map((id) => getTool(id))
              .filter((t): t is ToolDef => Boolean(t))
              .map((t) => (
                <button key={t.id} class="chip" onClick={() => openWorkspace({ tool: t.id })}>
                  {t.name}
                </button>
              ))}
          </div>
        </div>
      )}

      {filtered ? (
        <div class="cat">
          <h3>Results</h3>
          <ToolGrid tools={filtered} />
        </div>
      ) : (
        CATEGORIES.map((cat) => (
          <div class="cat" key={cat}>
            <h3>{cat}</h3>
            <ToolGrid tools={toolsByCategory(cat)} />
          </div>
        ))
      )}

      <div class="privacy-line">
        <Icon name="shield" size={15} />
        Processed on this device. Files are not uploaded.
      </div>

      <div class="popup-foot">
        <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
          Open source
        </a>
        <span class="spacer" />
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            chrome.runtime?.openOptionsPage?.();
          }}
        >
          Settings &amp; About
        </a>
      </div>
    </div>
  );
}

function ToolGrid({ tools }: { tools: ToolDef[] }) {
  return (
    <div class="tool-grid">
      {tools.map((t) => (
        <button key={t.id} class="tool-btn" title={t.short} onClick={() => openWorkspace({ tool: t.id })}>
          <span class="ic">
            <Icon name={t.icon} size={17} />
          </span>
          <span class="nm">{t.name}</span>
        </button>
      ))}
    </div>
  );
}
