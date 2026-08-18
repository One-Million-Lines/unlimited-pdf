/** Standard page sizes in PDF points (1pt = 1/72 inch). */
export const PAGE_SIZES = {
  a4: { width: 595.28, height: 841.89 },
  letter: { width: 612, height: 792 },
  legal: { width: 612, height: 1008 },
} as const;

export type NamedPageSize = keyof typeof PAGE_SIZES;

export interface Size {
  width: number;
  height: number;
}

export function orient(size: Size, orientation: 'auto' | 'portrait' | 'landscape', imageIsLandscape: boolean): Size {
  const wantLandscape =
    orientation === 'landscape' || (orientation === 'auto' && imageIsLandscape);
  const isLandscape = size.width > size.height;
  if (wantLandscape === isLandscape) return size;
  return { width: size.height, height: size.width };
}
