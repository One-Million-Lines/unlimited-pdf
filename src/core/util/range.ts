/**
 * Page-range parsing, e.g. "1-3, 5, 8-end" → page numbers.
 *
 * Rules:
 *  - Pages are 1-based in the syntax (matching what users see).
 *  - Whitespace is ignored; separators may be commas or spaces.
 *  - "end" / "last" (case-insensitive) resolves to the last page.
 *  - Reversed ranges ("5-2") expand descending on purpose.
 *  - Out-of-bounds or malformed tokens throw a RangeParseError with a clear
 *    message; the UI shows it verbatim.
 */

export class RangeParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RangeParseError';
  }
}

/**
 * Parse a range expression into an ordered list of 1-based page numbers.
 * Order and duplicates are preserved as written (e.g. "3,3,1" → [3,3,1]),
 * which matters for extraction/merge ordering.
 */
export function parsePageRanges(input: string, pageCount: number): number[] {
  if (pageCount <= 0) throw new RangeParseError('The document has no pages.');
  const trimmed = input.trim();
  if (trimmed === '') throw new RangeParseError('Enter at least one page or range.');

  const tokens = trimmed
    .split(/[,\s]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  const out: number[] = [];
  for (const token of tokens) {
    const dash = splitRange(token);
    if (dash) {
      const start = resolvePageToken(dash[0], pageCount, token);
      const end = resolvePageToken(dash[1], pageCount, token);
      if (start <= end) {
        for (let p = start; p <= end; p++) out.push(p);
      } else {
        for (let p = start; p >= end; p--) out.push(p);
      }
    } else {
      out.push(resolvePageToken(token, pageCount, token));
    }
  }
  return out;
}

/** Same as parsePageRanges but returns a unique, ascending set of pages. */
export function parsePageSet(input: string, pageCount: number): number[] {
  return [...new Set(parsePageRanges(input, pageCount))].sort((a, b) => a - b);
}

/** Split "8-end" into ["8", "end"], ignoring a leading unary sign. Returns null when there is no range dash. */
function splitRange(token: string): [string, string] | null {
  // Only treat an interior hyphen as a range separator (not a leading sign).
  const idx = token.indexOf('-', 1);
  if (idx <= 0 || idx === token.length - 1) return null;
  // Reject multiple dashes like "1-2-3".
  if (token.indexOf('-', idx + 1) !== -1) {
    throw new RangeParseError(`"${token}" is not a valid page range.`);
  }
  return [token.slice(0, idx), token.slice(idx + 1)];
}

function resolvePageToken(raw: string, pageCount: number, context: string): number {
  const t = raw.trim().toLowerCase();
  if (t === 'end' || t === 'last') return pageCount;
  if (t === 'start' || t === 'first') return 1;
  if (!/^\d+$/.test(t)) {
    throw new RangeParseError(`"${context}" contains a value that is not a page number.`);
  }
  const n = Number.parseInt(t, 10);
  if (n < 1 || n > pageCount) {
    throw new RangeParseError(`Page ${n} is out of range (document has ${pageCount} page${pageCount === 1 ? '' : 's'}).`);
  }
  return n;
}
