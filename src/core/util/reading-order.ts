/**
 * Coordinate-based reading-order assembly for extracted PDF text (spec §5.17,
 * §13.1). Groups text fragments into lines using their y position and orders
 * lines top-to-bottom, fragments left-to-right. Pure and unit-tested.
 */

export interface TextFragment {
  str: string;
  /** PDF x of the fragment start. */
  x: number;
  /** PDF y (origin bottom-left; larger = higher on the page). */
  y: number;
  /** Approximate glyph height in points, used for line grouping tolerance. */
  height: number;
  /** pdf.js marks the visual end of a line on some fragments. */
  hasEOL?: boolean;
}

export interface ReadingOrderOptions {
  /** Fraction of glyph height within which two fragments share a line. */
  lineToleranceFactor?: number;
  /** Gap (in points) beyond which a space is inserted between fragments. */
  spaceGap?: number;
}

interface Line {
  y: number;
  height: number;
  parts: TextFragment[];
}

/** Assemble fragments into a plain-text string in natural reading order. */
export function assembleReadingOrder(fragments: TextFragment[], options: ReadingOrderOptions = {}): string {
  const lineToleranceFactor = options.lineToleranceFactor ?? 0.5;
  const items = fragments.filter((f) => f.str !== undefined && f.str !== null);
  if (items.length === 0) return '';

  // Sort primarily by descending y (top first), then ascending x.
  const sorted = [...items].sort((a, b) => (b.y - a.y) || (a.x - b.x));

  const lines: Line[] = [];
  for (const frag of sorted) {
    const last = lines[lines.length - 1];
    const tol = Math.max(frag.height, last?.height ?? frag.height) * lineToleranceFactor;
    if (last && Math.abs(last.y - frag.y) <= tol) {
      last.parts.push(frag);
      last.y = (last.y + frag.y) / 2;
      last.height = Math.max(last.height, frag.height);
    } else {
      lines.push({ y: frag.y, height: frag.height, parts: [frag] });
    }
  }

  const out: string[] = [];
  for (const line of lines) {
    line.parts.sort((a, b) => a.x - b.x);
    let text = '';
    let prevEndX: number | null = null;
    for (const part of line.parts) {
      const gap = options.spaceGap ?? Math.max(1, part.height * 0.25);
      if (prevEndX !== null && part.x - prevEndX > gap && !/\s$/.test(text) && !/^\s/.test(part.str)) {
        text += ' ';
      }
      text += part.str;
      prevEndX = part.x + estimateWidth(part);
    }
    out.push(text.replace(/[ \t]+/g, ' ').trimEnd());
  }

  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function estimateWidth(frag: TextFragment): number {
  // Rough monospace-ish estimate; only used to decide spacing between fragments.
  return frag.str.length * frag.height * 0.5;
}
