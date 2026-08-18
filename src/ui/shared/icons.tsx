/**
 * Shared inline SVG icons (Preact). Keeping icons inline avoids any network
 * request and keeps the bundle self-contained. Each icon inherits currentColor.
 */
import type { JSX } from 'preact';

type IconProps = { size?: number; class?: string; title?: string };

function base(size: number | undefined, extra: string, path: JSX.Element, title?: string): JSX.Element {
  return (
    <svg
      width={size ?? 20}
      height={size ?? 20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
      class={extra}
      role={title ? 'img' : 'presentation'}
      aria-hidden={title ? undefined : 'true'}
      aria-label={title}
    >
      {title ? <title>{title}</title> : null}
      {path}
    </svg>
  );
}

export function Icon({ name, size, class: cls, title }: IconProps & { name: string }): JSX.Element {
  const p = PATHS[name] ?? PATHS.file;
  return base(size, cls ?? '', p, title);
}

const PATHS: Record<string, JSX.Element> = {
  file: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
    </>
  ),
  grid: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </>
  ),
  merge: (
    <>
      <path d="M8 3H5a2 2 0 0 0-2 2v3" />
      <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
      <rect x="8" y="8" width="12" height="8" rx="1" />
      <path d="M4 12h4" />
    </>
  ),
  split: (
    <>
      <rect x="3" y="4" width="8" height="16" rx="1" />
      <path d="M15 8h6M15 12h6M15 16h6" />
    </>
  ),
  image: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </>
  ),
  camera: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      <circle cx="12" cy="14" r="3" />
    </>
  ),
  text: (
    <>
      <path d="M4 7V5h16v2" />
      <path d="M9 5v14M15 5v14" />
      <path d="M7 19h4M13 19h4" />
    </>
  ),
  type: (
    <>
      <path d="M4 7V4h16v3" />
      <path d="M12 4v16" />
      <path d="M9 20h6" />
    </>
  ),
  stamp: (
    <>
      <path d="M5 21h14" />
      <path d="M9 21v-3h6v3" />
      <path d="M12 3a3 3 0 0 0-3 3c0 2 1.5 3 1.5 5h3C13.5 9 15 8 15 6a3 3 0 0 0-3-3z" />
    </>
  ),
  hash: (
    <>
      <path d="M4 9h16M4 15h16M10 3L8 21M16 3l-2 18" />
    </>
  ),
  zap: <path d="M13 2L3 14h9l-1 8 10-12h-9z" />,
  compress: (
    <>
      <path d="M4 9V5a1 1 0 0 1 1-1h4M20 15v4a1 1 0 0 1-1 1h-4" />
      <path d="M9 15l-5 5M20 4l-5 5" />
      <path d="M15 9h5V4M9 15H4v5" />
    </>
  ),
  rotateCw: (
    <>
      <path d="M21 12a9 9 0 1 1-3-6.7" />
      <path d="M21 3v5h-5" />
    </>
  ),
  rotateCcw: (
    <>
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 3v5h5" />
    </>
  ),
  trash: (
    <>
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2M19 6l-1 14H6L5 6" />
    </>
  ),
  copy: (
    <>
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h8" />
    </>
  ),
  undo: <path d="M9 14l-4-4 4-4M5 10h9a5 5 0 0 1 0 10h-3" />,
  redo: <path d="M15 14l4-4-4-4M19 10H10a5 5 0 0 0 0 10h3" />,
  save: (
    <>
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <path d="M17 21v-8H7v8M7 3v5h8" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
      <path d="M9 12l2 2 4-4" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  x: <path d="M18 6 6 18M6 6l12 12" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.5-2.4 1a7 7 0 0 0-1.7-1L14.5 3h-4l-.3 2.5a7 7 0 0 0-1.7 1l-2.4-1-2 3.5L4 11a7 7 0 0 0 0 2l-2 1.5 2 3.5 2.4-1a7 7 0 0 0 1.7 1l.3 2.5h4l.3-2.5a7 7 0 0 0 1.7-1l2.4 1 2-3.5-2-1.5a7 7 0 0 0 .1-1z" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8h.01M11 12h1v4h1" />
    </>
  ),
  check: <path d="M20 6 9 17l-5-5" />,
};
