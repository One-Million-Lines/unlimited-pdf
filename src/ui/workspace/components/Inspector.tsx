import { useState } from 'preact/hooks';
import type { JSX } from 'preact';
import { Icon } from '../../shared/icons';
import { getStore, type WorkspaceState } from '../store';
import { getTool } from '../../../tools/catalog';
import { formatBytes } from '../../../core/util/format';
import { parsePageRanges, RangeParseError } from '../../../core/util/range';
import type { FontKey } from '../../../tools/compile';
import type { SplitSpec } from '../../../tools/split';
import type { PagePosition } from '../../../tools/page-numbers';

const FONTS: { key: FontKey; label: string }[] = [
  { key: 'Helvetica', label: 'Helvetica' },
  { key: 'HelveticaBold', label: 'Helvetica Bold' },
  { key: 'TimesRoman', label: 'Times' },
  { key: 'Courier', label: 'Courier' },
];

export function Inspector({ state }: { state: WorkspaceState }) {
  const tool = state.activeTool || (state.mode === 'merge' ? 'merge' : state.mode === 'images' ? 'images-to-pdf' : 'organize');
  const def = getTool(tool);

  return (
    <aside class="inspector" aria-label="Tool options">
      <h2>{def?.name ?? 'Organize pages'}</h2>
      <p class="tool-desc">{def?.short}</p>
      {def?.warning && <div class="notice" style="margin-bottom:14px;">{def.warning}</div>}
      <PanelFor tool={tool} state={state} />
    </aside>
  );
}

function PanelFor({ tool, state }: { tool: string; state: WorkspaceState }) {
  switch (tool) {
    case 'merge':
      return <MergePanel state={state} />;
    case 'images-to-pdf':
      return <ImagesPanel state={state} />;
    case 'split':
      return <SplitPanel state={state} />;
    case 'watermark':
      return <WatermarkPanel state={state} />;
    case 'page-numbers':
      return <PageNumbersPanel state={state} />;
    case 'pdf-to-images':
      return <PdfToImagesPanel />;
    case 'extract-text':
      return <ExtractTextPanel />;
    case 'optimize':
      return <OptimizePanel />;
    case 'compress':
      return <CompressPanel />;
    default:
      return <OrganizePanel state={state} />;
  }
}

/* ------------------------------- Organize ------------------------------- */

function OrganizePanel({ state }: { state: WorkspaceState }) {
  const store = getStore();
  const count = state.selection.length;
  const target = count > 0 ? `${count} selected page${count === 1 ? '' : 's'}` : 'all pages';
  return (
    <div>
      <p class="small muted">Acting on <strong>{target}</strong>. Click pages to select; changes preview live and can be undone.</p>
      <div class="row row-wrap" style="gap:8px; margin:12px 0;">
        <button class="btn btn-sm" onClick={() => store.selectAll()}>Select all</button>
        <button class="btn btn-sm" onClick={() => store.clearSelection()} disabled={count === 0}>Clear</button>
      </div>
      <div class="row row-wrap" style="gap:8px;">
        <button class="btn" onClick={() => store.rotate('ccw')}><Icon name="rotateCcw" size={16} /> Left</button>
        <button class="btn" onClick={() => store.rotate('cw')}><Icon name="rotateCw" size={16} /> Right</button>
        <button class="btn" onClick={() => store.duplicateSelected()} disabled={count === 0}><Icon name="copy" size={16} /> Duplicate</button>
        <button class="btn btn-danger" onClick={() => store.deleteSelected()} disabled={count === 0}><Icon name="trash" size={16} /> Delete</button>
        <button class="btn" onClick={() => store.reverse()}>Reverse order</button>
      </div>
      <hr style="border:none;border-top:1px solid var(--border);margin:16px 0;" />
      <button class="btn btn-primary" style="width:100%;" disabled={!state.dirty} onClick={() => void store.runOrganizeExport()}>
        <Icon name="save" size={16} /> Apply changes &amp; save
      </button>
      {!state.dirty && <p class="small muted" style="margin-top:8px;">Make a change to enable saving.</p>}
    </div>
  );
}

/* -------------------------------- Merge --------------------------------- */

function MergePanel({ state }: { state: WorkspaceState }) {
  const store = getStore();
  const total = state.mergeFiles.reduce((n, f) => n + f.pageCount, 0);
  return (
    <div>
      <p class="small muted">{state.mergeFiles.length} file(s), {total} pages total. Reorder in the list on the left.</p>
      <div class="notice notice-info" style="margin:12px 0;">Some advanced signatures, form scripts, embedded files or layers may not survive page copying.</div>
      <button class="btn btn-primary" style="width:100%;" disabled={state.mergeFiles.length < 2} onClick={() => void store.runMerge()}>
        <Icon name="merge" size={16} /> Merge {state.mergeFiles.length} PDFs
      </button>
      {state.mergeFiles.length < 2 && <p class="small muted" style="margin-top:8px;">Add at least two PDFs.</p>}
    </div>
  );
}

/* ------------------------------ Images→PDF ------------------------------ */

function ImagesPanel({ state }: { state: WorkspaceState }) {
  const store = getStore();
  const [pageSize, setPageSize] = useState('a4');
  const [orientation, setOrientation] = useState('auto');
  const [marginPt, setMarginPt] = useState(24);
  const [fit, setFit] = useState('contain');
  return (
    <div>
      <Field label="Page size">
        <select value={pageSize} onChange={(e) => setPageSize((e.target as HTMLSelectElement).value)}>
          <option value="a4">A4</option>
          <option value="letter">Letter</option>
          <option value="legal">Legal</option>
          <option value="imageSize">Match image size</option>
        </select>
      </Field>
      {pageSize !== 'imageSize' && (
        <>
          <Field label="Orientation">
            <select value={orientation} onChange={(e) => setOrientation((e.target as HTMLSelectElement).value)}>
              <option value="auto">Auto (per image)</option>
              <option value="portrait">Portrait</option>
              <option value="landscape">Landscape</option>
            </select>
          </Field>
          <Field label="Fit">
            <select value={fit} onChange={(e) => setFit((e.target as HTMLSelectElement).value)}>
              <option value="contain">Fit inside page</option>
              <option value="cover">Fill page (may crop)</option>
            </select>
          </Field>
        </>
      )}
      <Field label={`Margin: ${marginPt} pt`}>
        <input type="range" min={0} max={96} value={marginPt} onInput={(e) => setMarginPt(Number((e.target as HTMLInputElement).value))} />
      </Field>
      <button class="btn btn-primary" style="width:100%;" disabled={state.imageFiles.length < 1} onClick={() => void store.runImagesToPdf({ pageSize, orientation, marginPt, fit })}>
        <Icon name="image" size={16} /> Create PDF from {state.imageFiles.length} image(s)
      </button>
    </div>
  );
}

/* -------------------------------- Split --------------------------------- */

function SplitPanel({ state }: { state: WorkspaceState }) {
  const store = getStore();
  const [mode, setMode] = useState<'everyPage' | 'fixed' | 'extract' | 'afterPages'>('extract');
  const [groupSize, setGroupSize] = useState(2);
  const [range, setRange] = useState('1-' + Math.min(state.pageCount, 1 === state.pageCount ? 1 : state.pageCount));
  const [after, setAfter] = useState('1');
  const [err, setErr] = useState<string | null>(null);

  const run = () => {
    setErr(null);
    try {
      let spec: SplitSpec;
      if (mode === 'everyPage') spec = { mode: 'everyPage' };
      else if (mode === 'fixed') spec = { mode: 'fixed', groupSize };
      else if (mode === 'extract') {
        const pages = parsePageRanges(range, state.pageCount);
        spec = { mode: 'ranges', ranges: [{ name: 'extract', pages }] };
      } else {
        const afterPages = parsePageRanges(after, state.pageCount);
        spec = { mode: 'afterPages', afterPages };
      }
      void store.runSplit(spec);
    } catch (e) {
      setErr(e instanceof RangeParseError ? e.message : (e as Error).message);
    }
  };

  return (
    <div>
      <Field label="How to split">
        <select value={mode} onChange={(e) => setMode((e.target as HTMLSelectElement).value as typeof mode)}>
          <option value="extract">Extract a page range → one PDF</option>
          <option value="everyPage">Split every page → one PDF each</option>
          <option value="fixed">Split into fixed-size groups</option>
          <option value="afterPages">Split after specific pages</option>
        </select>
      </Field>
      {mode === 'extract' && (
        <Field label="Pages to extract" hint="e.g. 1-3, 5, 8-end">
          <input type="text" value={range} onInput={(e) => setRange((e.target as HTMLInputElement).value)} />
        </Field>
      )}
      {mode === 'fixed' && (
        <Field label="Pages per file">
          <input type="number" min={1} max={state.pageCount} value={groupSize} onInput={(e) => setGroupSize(Number((e.target as HTMLInputElement).value))} />
        </Field>
      )}
      {mode === 'afterPages' && (
        <Field label="Cut after pages" hint="e.g. 2, 5, 9">
          <input type="text" value={after} onInput={(e) => setAfter((e.target as HTMLInputElement).value)} />
        </Field>
      )}
      {err && <div class="notice notice-danger" style="margin-bottom:12px;">{err}</div>}
      <button class="btn btn-primary" style="width:100%;" onClick={run}><Icon name="split" size={16} /> Split PDF</button>
    </div>
  );
}

/* ------------------------------ Watermark ------------------------------- */

function WatermarkPanel({ state }: { state: WorkspaceState }) {
  const store = getStore();
  const [text, setText] = useState('DRAFT');
  const [fontSize, setFontSize] = useState(60);
  const [colorHex, setColorHex] = useState('#e4453a');
  const [opacity, setOpacity] = useState(0.18);
  const [rotationDeg, setRotationDeg] = useState(45);
  const [fontKey, setFontKey] = useState<FontKey>('HelveticaBold');
  const [tile, setTile] = useState(false);
  const [pagesStr, setPagesStr] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const run = () => {
    setErr(null);
    let pages: number[] | undefined;
    if (pagesStr.trim()) {
      try {
        pages = parsePageRanges(pagesStr, state.pageCount);
      } catch (e) {
        setErr((e as Error).message);
        return;
      }
    }
    void store.runWatermark({ text, fontSize, colorHex, opacity, rotationDeg, fontKey, tile, pages });
  };

  return (
    <div>
      <Field label="Text"><input type="text" value={text} onInput={(e) => setText((e.target as HTMLInputElement).value)} /></Field>
      <div class="row" style="gap:10px;">
        <Field label="Font size"><input type="number" min={8} max={300} value={fontSize} onInput={(e) => setFontSize(Number((e.target as HTMLInputElement).value))} /></Field>
        <Field label="Color"><input type="color" value={colorHex} onInput={(e) => setColorHex((e.target as HTMLInputElement).value)} /></Field>
      </div>
      <Field label={`Opacity: ${Math.round(opacity * 100)}%`}><input type="range" min={5} max={100} value={opacity * 100} onInput={(e) => setOpacity(Number((e.target as HTMLInputElement).value) / 100)} /></Field>
      <Field label={`Rotation: ${rotationDeg}°`}><input type="range" min={-90} max={90} value={rotationDeg} onInput={(e) => setRotationDeg(Number((e.target as HTMLInputElement).value))} /></Field>
      <Field label="Font"><FontSelect value={fontKey} onChange={setFontKey} /></Field>
      <Field label="Pages" hint="Blank = all. e.g. 1-3, 5"><input type="text" value={pagesStr} placeholder="all pages" onInput={(e) => setPagesStr((e.target as HTMLInputElement).value)} /></Field>
      <label class="row" style="gap:8px; margin-bottom:12px;"><input type="checkbox" checked={tile} onChange={(e) => setTile((e.target as HTMLInputElement).checked)} /> Tile across the page</label>
      {err && <div class="notice notice-danger" style="margin-bottom:12px;">{err}</div>}
      <button class="btn btn-primary" style="width:100%;" onClick={run}><Icon name="stamp" size={16} /> Add watermark</button>
    </div>
  );
}

/* ----------------------------- Page numbers ----------------------------- */

function PageNumbersPanel({ state }: { state: WorkspaceState }) {
  const store = getStore();
  const [format, setFormat] = useState('{n} / {total}');
  const [startNumber, setStartNumber] = useState(1);
  const [position, setPosition] = useState<PagePosition>('bottom-center');
  const [fontSize, setFontSize] = useState(11);
  const [colorHex, setColorHex] = useState('#333333');
  const [fontKey, setFontKey] = useState<FontKey>('Helvetica');
  const [marginPt, setMarginPt] = useState(28);
  void state;

  const run = () => void store.runPageNumbers({ format, startNumber, position, fontSize, colorHex, fontKey, marginPt });

  return (
    <div>
      <Field label="Format" hint="Use {n} and {total}"><input type="text" value={format} onInput={(e) => setFormat((e.target as HTMLInputElement).value)} /></Field>
      <div class="row" style="gap:10px;">
        <Field label="Start at"><input type="number" min={0} value={startNumber} onInput={(e) => setStartNumber(Number((e.target as HTMLInputElement).value))} /></Field>
        <Field label="Font size"><input type="number" min={6} max={48} value={fontSize} onInput={(e) => setFontSize(Number((e.target as HTMLInputElement).value))} /></Field>
      </div>
      <Field label="Position">
        <select value={position} onChange={(e) => setPosition((e.target as HTMLSelectElement).value as PagePosition)}>
          {(['top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right'] as PagePosition[]).map((p) => (
            <option value={p} key={p}>{p.replace('-', ' ')}</option>
          ))}
        </select>
      </Field>
      <div class="row" style="gap:10px;">
        <Field label="Color"><input type="color" value={colorHex} onInput={(e) => setColorHex((e.target as HTMLInputElement).value)} /></Field>
        <Field label={`Margin: ${marginPt} pt`}><input type="range" min={8} max={72} value={marginPt} onInput={(e) => setMarginPt(Number((e.target as HTMLInputElement).value))} /></Field>
      </div>
      <Field label="Font"><FontSelect value={fontKey} onChange={setFontKey} /></Field>
      <button class="btn btn-primary" style="width:100%;" onClick={run}><Icon name="hash" size={16} /> Add page numbers</button>
    </div>
  );
}

/* ----------------------------- PDF → images ----------------------------- */

function PdfToImagesPanel() {
  const store = getStore();
  const [format, setFormat] = useState<'png' | 'jpeg' | 'webp'>('png');
  const [dpi, setDpi] = useState(150);
  const [quality, setQuality] = useState(0.9);
  const [pages, setPages] = useState('');
  return (
    <div>
      <Field label="Format">
        <div class="seg" role="group" aria-label="Image format">
          {(['png', 'jpeg', 'webp'] as const).map((f) => (
            <button key={f} class={format === f ? 'on' : ''} onClick={() => setFormat(f)}>{f.toUpperCase()}</button>
          ))}
        </div>
      </Field>
      <Field label="Resolution">
        <select value={dpi} onChange={(e) => setDpi(Number((e.target as HTMLSelectElement).value))}>
          {[72, 96, 150, 200, 300].map((d) => <option value={d} key={d}>{d} DPI</option>)}
        </select>
      </Field>
      {format !== 'png' && (
        <Field label={`Quality: ${Math.round(quality * 100)}%`}>
          <input type="range" min={30} max={100} value={quality * 100} onInput={(e) => setQuality(Number((e.target as HTMLInputElement).value) / 100)} />
        </Field>
      )}
      <Field label="Pages" hint="Blank = all. e.g. 1-3, 5"><input type="text" value={pages} placeholder="all pages" onInput={(e) => setPages((e.target as HTMLInputElement).value)} /></Field>
      <button class="btn btn-primary" style="width:100%;" onClick={() => void store.runPdfToImages({ dpi, format, quality, pages })}>
        <Icon name="camera" size={16} /> Export images
      </button>
    </div>
  );
}

/* ----------------------------- Extract text ----------------------------- */

function ExtractTextPanel() {
  const store = getStore();
  return (
    <div>
      <p class="small muted">Extracts the selectable text from every page in reading order, as a .txt file. Scanned pages without a text layer will need OCR (coming later).</p>
      <button class="btn btn-primary" style="width:100%;" onClick={() => void store.runExtractText()}><Icon name="text" size={16} /> Extract text</button>
    </div>
  );
}

/* ------------------------------- Optimize ------------------------------- */

function OptimizePanel() {
  const store = getStore();
  const [removeMetadata, setRemoveMetadata] = useState(false);
  return (
    <div>
      <p class="small muted">Repacks the file with object streams. Savings can be small or zero — the original is always kept.</p>
      <label class="row" style="gap:8px; margin:12px 0;"><input type="checkbox" checked={removeMetadata} onChange={(e) => setRemoveMetadata((e.target as HTMLInputElement).checked)} /> Also remove metadata (title, author, dates)</label>
      <button class="btn btn-primary" style="width:100%;" onClick={() => void store.runOptimize(removeMetadata)}><Icon name="zap" size={16} /> Optimize</button>
    </div>
  );
}

/* ------------------------------- Compress ------------------------------- */

function CompressPanel() {
  const store = getStore();
  const [dpi, setDpi] = useState(120);
  const [quality, setQuality] = useState(0.7);
  return (
    <div>
      <Field label="Resolution">
        <select value={dpi} onChange={(e) => setDpi(Number((e.target as HTMLSelectElement).value))}>
          {[72, 96, 120, 150, 200].map((d) => <option value={d} key={d}>{d} DPI</option>)}
        </select>
      </Field>
      <Field label={`JPEG quality: ${Math.round(quality * 100)}%`}>
        <input type="range" min={30} max={95} value={quality * 100} onInput={(e) => setQuality(Number((e.target as HTMLInputElement).value) / 100)} />
      </Field>
      <button class="btn btn-primary" style="width:100%;" onClick={() => void store.runCompress({ dpi, quality, grayscale: false })}>
        <Icon name="compress" size={16} /> Compress
      </button>
    </div>
  );
}

/* ------------------------------- Properties ----------------------------- */

export function PropertiesCard({ state }: { state: WorkspaceState }) {
  const p = state.properties;
  if (!p) return null;
  const rows: [string, string | undefined][] = [
    ['Title', p.title],
    ['Author', p.author],
    ['Subject', p.subject],
    ['Keywords', p.keywords],
    ['Creator', p.creator],
    ['Producer', p.producer],
    ['Created', p.creationDate],
    ['Modified', p.modificationDate],
    ['PDF version', p.pdfVersion],
    ['Pages', String(p.pageCount)],
    ['File size', formatBytes(state.originalSize)],
    ['Has form fields', p.hasAcroForm ? 'Yes' : 'No'],
  ];
  return (
    <table class="props-table">
      {rows.filter(([, v]) => v).map(([k, v]) => (
        <tr key={k}><td class="k">{k}</td><td>{v}</td></tr>
      ))}
    </table>
  );
}

/* -------------------------------- shared -------------------------------- */

function Field({ label, hint, children }: { label: string; hint?: string; children: JSX.Element | JSX.Element[] }) {
  return (
    <div class="field">
      <label>{label}</label>
      {children}
      {hint && <span class="hint">{hint}</span>}
    </div>
  );
}

function FontSelect({ value, onChange }: { value: FontKey; onChange: (f: FontKey) => void }) {
  return (
    <select value={value} onChange={(e) => onChange((e.target as HTMLSelectElement).value as FontKey)}>
      {FONTS.map((f) => <option value={f.key} key={f.key}>{f.label}</option>)}
    </select>
  );
}
