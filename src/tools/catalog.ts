/**
 * Catalog of tools that are actually shipped in Phase 1. The popup and
 * workspace render navigation strictly from this list, so no unfinished tool is
 * ever exposed in production (spec §15, §21).
 */

export type ToolCategory = 'Organize' | 'Convert' | 'Edit' | 'Optimize';

/** What a tool needs to start: a single PDF, multiple PDFs, or images. */
export type ToolInput = 'pdf' | 'pdfs' | 'images';

export interface ToolDef {
  id: string;
  name: string;
  short: string;
  category: ToolCategory;
  input: ToolInput;
  /** Icon key resolved to an inline SVG in the UI. */
  icon: string;
  /** Destructive-change warning shown before processing where relevant. */
  warning?: string;
}

export const TOOLS: ToolDef[] = [
  {
    id: 'organize',
    name: 'Organize pages',
    short: 'Reorder, rotate, delete, duplicate and reverse pages.',
    category: 'Organize',
    input: 'pdf',
    icon: 'grid',
  },
  {
    id: 'merge',
    name: 'Merge PDFs',
    short: 'Combine several PDFs into one, in any order.',
    category: 'Organize',
    input: 'pdfs',
    icon: 'merge',
  },
  {
    id: 'split',
    name: 'Split & extract',
    short: 'Split into parts or extract page ranges.',
    category: 'Organize',
    input: 'pdf',
    icon: 'split',
  },
  {
    id: 'images-to-pdf',
    name: 'Images to PDF',
    short: 'Turn JPG, PNG or WebP images into a PDF.',
    category: 'Convert',
    input: 'images',
    icon: 'image',
  },
  {
    id: 'pdf-to-images',
    name: 'PDF to images',
    short: 'Export pages as JPG, PNG or WebP.',
    category: 'Convert',
    input: 'pdf',
    icon: 'camera',
  },
  {
    id: 'extract-text',
    name: 'Extract text',
    short: 'Get the selectable text as a .txt file.',
    category: 'Convert',
    input: 'pdf',
    icon: 'text',
  },
  {
    id: 'watermark',
    name: 'Watermark',
    short: 'Stamp text across pages with adjustable opacity.',
    category: 'Edit',
    input: 'pdf',
    icon: 'stamp',
  },
  {
    id: 'page-numbers',
    name: 'Page numbers',
    short: 'Add page numbers with a custom format and position.',
    category: 'Edit',
    input: 'pdf',
    icon: 'hash',
  },
  {
    id: 'optimize',
    name: 'Optimize (lossless)',
    short: 'Repack the file and optionally strip metadata.',
    category: 'Optimize',
    input: 'pdf',
    icon: 'zap',
  },
  {
    id: 'compress',
    name: 'Compress (raster)',
    short: 'Strongly shrink by rasterizing pages.',
    category: 'Optimize',
    input: 'pdf',
    icon: 'compress',
    warning:
      'Raster compression turns pages into images. Selectable text, links, forms, annotations and accessibility tags are lost. The original file is always kept.',
  },
];

export const CATEGORIES: ToolCategory[] = ['Organize', 'Convert', 'Edit', 'Optimize'];

export function getTool(id: string): ToolDef | undefined {
  return TOOLS.find((t) => t.id === id);
}

export function toolsByCategory(category: ToolCategory): ToolDef[] {
  return TOOLS.filter((t) => t.category === category);
}
