import { useEffect, useState } from 'preact/hooks';
import { Icon } from '../shared/icons';
import { APP_VERSION } from '../../config/version';
import {
  loadSettings,
  updateSettings,
  resetSettings,
  DEFAULT_SETTINGS,
  type Settings,
} from '../../core/persistence/settings';

const GITHUB_URL = 'https://github.com/One-Million-Lines/unlimited-pdf';
const PRIVACY_URL = 'https://onemillionlines.com/privacy/unlimitedpdf';

export function OptionsApp() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [contextMenu, setContextMenu] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    void loadSettings().then(setSettings);
    if (typeof chrome !== 'undefined' && chrome.permissions) {
      chrome.permissions.contains({ permissions: ['contextMenus'] }, (has) => setContextMenu(Boolean(has)));
    }
  }, []);

  const patch = async (p: Partial<Settings>) => setSettings(await updateSettings(p));

  const toggleContextMenu = async (on: boolean) => {
    if (!chrome?.permissions) return;
    if (on) {
      const granted = await chrome.permissions.request({ permissions: ['contextMenus'] }).catch(() => false);
      setContextMenu(Boolean(granted));
    } else {
      await chrome.permissions.remove({ permissions: ['contextMenus'] }).catch(() => false);
      setContextMenu(false);
    }
  };

  const clearAll = async () => {
    setSettings(await resetSettings());
    setStatus('All local settings were cleared.');
    setTimeout(() => setStatus(null), 2600);
  };

  return (
    <div class="opt">
      <div class="opt-head">
        <div class="opt-logo" aria-hidden="true"><Icon name="file" size={22} /></div>
        <div>
          <h1>Unlimited<span>PDF</span> settings</h1>
          <div class="ver">Version {APP_VERSION} · Manifest V3 · local-only</div>
        </div>
      </div>

      <section class="card" style="padding:4px 4px;">
        <h2 style="padding:12px 16px 0;">Preferences</h2>
        <Toggle
          label="Remember recent tools"
          desc="Keeps a short list of tool names you used (never filenames or content) so the popup can show them."
          checked={settings.rememberRecentTools}
          onChange={(v) => void patch({ rememberRecentTools: v, recentTools: v ? settings.recentTools : [] })}
        />
        <div class="setting">
          <div class="txt">
            <div class="t">Default export resolution</div>
            <div class="d">Used as the starting DPI for PDF→image exports.</div>
          </div>
          <select
            value={settings.defaultDpi}
            onChange={(e) => void patch({ defaultDpi: Number((e.target as HTMLSelectElement).value) })}
          >
            {[72, 96, 150, 200, 300].map((d) => <option value={d} key={d}>{d} DPI</option>)}
          </select>
        </div>
        <Toggle
          label="Crash recovery"
          desc="Off by default. If enabled, an interrupted session could be recovered from local storage. UnlimitedPDF does not keep documents after a session unless this is on."
          checked={settings.crashRecoveryEnabled}
          onChange={(v) => void patch({ crashRecoveryEnabled: v })}
        />
      </section>

      <section class="card" style="padding:4px 4px;">
        <h2 style="padding:12px 16px 0;">Optional feature</h2>
        <Toggle
          label="“Open link in UnlimitedPDF” menu"
          desc="Adds a right-click entry on PDF links. Requires the optional contextMenus permission, requested only when you turn this on."
          checked={contextMenu}
          onChange={(v) => void toggleContextMenu(v)}
        />
      </section>

      <section class="card" style="padding:16px;">
        <h2>Privacy</h2>
        <ul class="promise-list">
          {[
            'No file is ever uploaded — all processing happens on your device.',
            'No accounts, no analytics, no telemetry, no tracking.',
            'No recent-document list; only tool names are remembered (optional).',
            'Model/language-pack downloads (future) never include your documents.',
          ].map((t) => (
            <li key={t}><Icon name="check" size={15} /> {t}</li>
          ))}
        </ul>
        <div class="row" style="margin-top:12px; gap:8px;">
          <button class="btn btn-danger" onClick={() => void clearAll()}><Icon name="trash" size={15} /> Clear all local data</button>
          {status && <span class="small" style="color:var(--ok);">{status}</span>}
        </div>
        <p class="small muted" style="margin-top:10px;">
          Read the full <a class="link" href={PRIVACY_URL} target="_blank" rel="noopener noreferrer">privacy policy</a>.
        </p>
      </section>

      <section class="card" style="padding:16px;">
        <h2>About</h2>
        <p class="small muted">
          UnlimitedPDF is free and open source, part of the{' '}
          <a class="link" href="https://onemillionlines.com" target="_blank" rel="noopener noreferrer">One Million Lines</a> project.
          “Unlimited” means no product-enforced usage quota — real limits still come from your device’s memory and the size of your files.
        </p>
        <div class="row" style="gap:14px; margin-top:8px;">
          <a class="link" href={GITHUB_URL} target="_blank" rel="noopener noreferrer">Source code</a>
          <a class="link" href={`${GITHUB_URL}/issues`} target="_blank" rel="noopener noreferrer">Report an issue</a>
          <a class="link" href={PRIVACY_URL} target="_blank" rel="noopener noreferrer">Privacy policy</a>
        </div>
      </section>
    </div>
  );
}

function Toggle({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div class="setting">
      <div class="txt">
        <div class="t">{label}</div>
        <div class="d">{desc}</div>
      </div>
      <label class="switch">
        <input type="checkbox" checked={checked} onChange={(e) => onChange((e.target as HTMLInputElement).checked)} aria-label={label} />
        <span class="track" />
      </label>
    </div>
  );
}
