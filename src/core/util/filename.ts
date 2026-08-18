/**
 * Filename sanitization, output naming and collision-safe numbering.
 * Output names follow `{base}-{operation}.pdf` (spec §4.5).
 */

// Characters illegal on Windows/macOS filesystems plus control chars.
const ILLEGAL = /[<>:"/\\|?*\u0000-\u001f]/g;
const RESERVED_WINDOWS = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;

/** Make an arbitrary string safe to use as a single filename component. */
export function sanitizeFilename(name: string, fallback = 'document'): string {
  let out = (name ?? '').normalize('NFC').replace(ILLEGAL, ' ');
  out = out.replace(/\s+/g, ' ').trim();
  out = out.replace(/^[.\s]+|[.\s]+$/g, ''); // no leading/trailing dots or spaces
  if (out === '' || RESERVED_WINDOWS.test(out)) out = fallback;
  if (out.length > 120) out = out.slice(0, 120).trim();
  return out;
}

/** Strip a known extension (case-insensitive) from a filename. */
export function stripExtension(name: string, ext = 'pdf'): string {
  const re = new RegExp(`\\.${ext}$`, 'i');
  return name.replace(re, '');
}

/** Build an output name like `report-merged.pdf` from a base and operation. */
export function outputName(base: string, operation: string, ext = 'pdf'): string {
  const cleanBase = sanitizeFilename(stripExtension(base));
  const cleanOp = operation ? `-${operation}` : '';
  return `${cleanBase}${cleanOp}.${ext}`;
}

/**
 * Ensure a name is unique against a set of already-used names by appending
 * ` (n)` before the extension. Mutates nothing; returns the unique name.
 */
export function uniqueName(desired: string, used: Set<string>): string {
  if (!used.has(desired)) {
    used.add(desired);
    return desired;
  }
  const dot = desired.lastIndexOf('.');
  const stem = dot === -1 ? desired : desired.slice(0, dot);
  const ext = dot === -1 ? '' : desired.slice(dot);
  let n = 2;
  let candidate = `${stem} (${n})${ext}`;
  while (used.has(candidate)) {
    n += 1;
    candidate = `${stem} (${n})${ext}`;
  }
  used.add(candidate);
  return candidate;
}

/** Zero-pad a number to a fixed width (used for per-page/batch outputs and Bates). */
export function pad(n: number, width: number): string {
  const s = String(Math.trunc(Math.abs(n)));
  return (n < 0 ? '-' : '') + (s.length >= width ? s : '0'.repeat(width - s.length) + s);
}
