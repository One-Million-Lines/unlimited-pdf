/**
 * Local settings persistence (spec §9.2). Uses chrome.storage.local for a
 * small amount of non-sensitive UI state. Privacy-relevant options default to
 * the most private choice: no recent-tool history retention beyond tool ids, no
 * crash recovery, no signature storage.
 */

export interface Settings {
  /** Remember which tools were used recently (tool ids only, never filenames). */
  rememberRecentTools: boolean;
  recentTools: string[];
  /** Keep recoverable temporary data across reloads. Off by default. */
  crashRecoveryEnabled: boolean;
  /** Allow saving signature appearances locally. Off by default. */
  saveSignatures: boolean;
  /** UI theme preference. */
  theme: 'system' | 'light' | 'dark';
  /** Default export DPI for PDF→image. */
  defaultDpi: number;
}

export const DEFAULT_SETTINGS: Settings = {
  rememberRecentTools: true,
  recentTools: [],
  crashRecoveryEnabled: false,
  saveSignatures: false,
  theme: 'system',
  defaultDpi: 150,
};

const KEY = 'unlimitedpdf.settings';

type StorageArea = {
  get(keys: string | string[] | null): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
  remove(keys: string | string[]): Promise<void>;
};

function area(): StorageArea | null {
  const c = (globalThis as { chrome?: typeof chrome }).chrome;
  if (c?.storage?.local) return c.storage.local as unknown as StorageArea;
  return null;
}

// In-memory fallback for non-extension contexts (tests).
let memory: Settings = { ...DEFAULT_SETTINGS };

export async function loadSettings(): Promise<Settings> {
  const store = area();
  if (!store) return { ...memory };
  const raw = await store.get(KEY);
  const value = raw[KEY] as Partial<Settings> | undefined;
  return { ...DEFAULT_SETTINGS, ...(value ?? {}) };
}

export async function saveSettings(next: Settings): Promise<void> {
  const store = area();
  memory = { ...next };
  if (!store) return;
  await store.set({ [KEY]: next });
}

export async function updateSettings(patch: Partial<Settings>): Promise<Settings> {
  const current = await loadSettings();
  const next = { ...current, ...patch };
  await saveSettings(next);
  return next;
}

/** Record a used tool id at the head of the recent list (deduped, capped). */
export async function pushRecentTool(toolId: string): Promise<Settings> {
  const current = await loadSettings();
  if (!current.rememberRecentTools) return current;
  const recent = [toolId, ...current.recentTools.filter((t) => t !== toolId)].slice(0, 8);
  return updateSettings({ recentTools: recent });
}

/** Clear all persisted settings back to defaults. */
export async function resetSettings(): Promise<Settings> {
  const store = area();
  memory = { ...DEFAULT_SETTINGS };
  if (store) await store.remove(KEY);
  return { ...DEFAULT_SETTINGS };
}
