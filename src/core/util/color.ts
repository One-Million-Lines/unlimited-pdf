/** Minimal color parsing for overlay/watermark/page-number styling. */

export interface Rgb {
  r: number; // 0..1
  g: number;
  b: number;
}

const NAMED: Record<string, string> = {
  black: '#000000',
  white: '#ffffff',
  red: '#e4453a',
  gray: '#808080',
  grey: '#808080',
  blue: '#1a73e8',
};

/** Parse "#RGB", "#RRGGBB" or a small set of names to normalized rgb (0..1). */
export function parseHexColor(input: string, fallback: Rgb = { r: 0, g: 0, b: 0 }): Rgb {
  if (!input) return fallback;
  let s = input.trim().toLowerCase();
  if (NAMED[s]) s = NAMED[s];
  if (s[0] === '#') s = s.slice(1);
  if (s.length === 3) s = s.split('').map((c) => c + c).join('');
  if (s.length !== 6 || /[^0-9a-f]/.test(s)) return fallback;
  return {
    r: parseInt(s.slice(0, 2), 16) / 255,
    g: parseInt(s.slice(2, 4), 16) / 255,
    b: parseInt(s.slice(4, 6), 16) / 255,
  };
}
