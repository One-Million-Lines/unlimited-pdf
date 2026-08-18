/** Human-friendly formatting helpers used in progress/result summaries. */

/** Format a byte count as B / KB / MB / GB with one decimal where useful. */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  return `${value >= 100 ? Math.round(value) : value.toFixed(1)} ${units[i]}`;
}

/**
 * Signed percentage change from input→output size.
 * Negative means the file got smaller. Returns 0 when input is 0.
 */
export function percentChange(inputBytes: number, outputBytes: number): number {
  if (inputBytes <= 0) return 0;
  return ((outputBytes - inputBytes) / inputBytes) * 100;
}

/** Format a signed percentage like "-42%" / "+3%". */
export function formatPercent(pct: number): string {
  const rounded = Math.round(pct);
  return `${rounded > 0 ? '+' : ''}${rounded}%`;
}

/** Format elapsed milliseconds as "820 ms" or "3.4 s". */
export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '—';
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}
