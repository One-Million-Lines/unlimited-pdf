import { useRef, useState } from 'preact/hooks';
import { Icon } from '../../shared/icons';
import { getStore } from '../store';
import { TOOLS } from '../../../tools/catalog';

/** Start screen: open or drop PDFs/images. Routes to the right mode by type. */
export function StartScreen({ activeTool }: { activeTool: string }) {
  const store = getStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  const pick = () => inputRef.current?.click();

  const onFiles = (list: FileList | null) => {
    if (!list) return;
    void store.addFiles(Array.from(list));
  };

  const accept = activeTool === 'images-to-pdf' ? 'image/*' : 'application/pdf,image/*';

  return (
    <div class="start">
      <div
        class={`dropzone${drag ? ' drag' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          onFiles(e.dataTransfer?.files ?? null);
        }}
      >
        <div class="big-logo" aria-hidden="true">
          <Icon name="file" size={30} />
        </div>
        <h1>Open a PDF to get started</h1>
        <p class="muted">
          Drag &amp; drop files here, or choose them. For <strong>Merge</strong> pick several PDFs; for{' '}
          <strong>Images&nbsp;to&nbsp;PDF</strong> pick images.
        </p>
        <div class="row" style="justify-content:center; gap:10px; margin-top:6px;">
          <button class="btn btn-primary" onClick={pick}>
            <Icon name="plus" size={18} /> Open PDF or files
          </button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple
          style="display:none"
          onChange={(e) => onFiles((e.target as HTMLInputElement).files)}
        />

        <div class="start-tools">
          {TOOLS.map((t) => (
            <button
              key={t.id}
              class={`chip${activeTool === t.id ? ' active' : ''}`}
              onClick={() => {
                store.setTool(t.id);
                pick();
              }}
              title={t.short}
            >
              {t.name}
            </button>
          ))}
        </div>

        <p class="small muted" style="margin-top:18px; display:flex; gap:6px; justify-content:center; align-items:center;">
          <Icon name="shield" size={14} /> Everything runs on your device. Files are never uploaded.
        </p>
      </div>
    </div>
  );
}
