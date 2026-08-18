import { useRef } from 'preact/hooks';
import { Icon } from '../../shared/icons';
import { getStore, type MergeFile, type ImageFile } from '../store';
import { formatBytes } from '../../../core/util/format';

/** Center view for the Merge flow: an ordered list of source PDFs. */
export function MergeView({ files }: { files: MergeFile[] }) {
  const store = getStore();
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <div class="row" style="margin-bottom:12px;">
        <h2 style="margin:0;">Merge PDFs</h2>
        <span class="spacer" />
        <button class="btn" onClick={() => inputRef.current?.click()}>
          <Icon name="plus" size={16} /> Add PDFs
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          multiple
          style="display:none"
          onChange={(e) => {
            const list = (e.target as HTMLInputElement).files;
            if (list) void store.addFiles(Array.from(list));
          }}
        />
      </div>
      {files.length === 0 ? (
        <p class="muted">Add two or more PDFs. They will be combined top-to-bottom in this order.</p>
      ) : (
        <div class="filelist">
          {files.map((f, i) => (
            <div class="filerow" key={f.id}>
              <Icon name="file" size={18} />
              <span class="name">{f.name}</span>
              <span class="meta">{f.pageCount} pages · {formatBytes(f.bytes.byteLength)}</span>
              <button class="btn btn-sm btn-icon" title="Move up" aria-label="Move up" disabled={i === 0} onClick={() => store.moveMergeFile(f.id, -1)}>↑</button>
              <button class="btn btn-sm btn-icon" title="Move down" aria-label="Move down" disabled={i === files.length - 1} onClick={() => store.moveMergeFile(f.id, 1)}>↓</button>
              <button class="btn btn-sm btn-icon" title="Remove" aria-label="Remove" onClick={() => store.removeMergeFile(f.id)}><Icon name="x" size={15} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Center view for the Images→PDF flow: an ordered grid of images. */
export function ImagesView({ files }: { files: ImageFile[] }) {
  const store = getStore();
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <div class="row" style="margin-bottom:12px;">
        <h2 style="margin:0;">Images to PDF</h2>
        <span class="spacer" />
        <button class="btn" onClick={() => inputRef.current?.click()}>
          <Icon name="plus" size={16} /> Add images
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          style="display:none"
          onChange={(e) => {
            const list = (e.target as HTMLInputElement).files;
            if (list) void store.addFiles(Array.from(list));
          }}
        />
      </div>
      {files.length === 0 ? (
        <p class="muted">Add JPG, PNG or WebP images. Each becomes one page, in this order.</p>
      ) : (
        <div class="imggrid">
          {files.map((f, i) => (
            <div class="imgcard" key={f.id}>
              <img src={f.url} alt={f.name} />
              <div class="cap">
                <button class="btn btn-sm btn-icon" title="Move up" aria-label="Move earlier" disabled={i === 0} onClick={() => store.moveImageFile(f.id, -1)}>↑</button>
                <span class="n" title={f.name}>{f.name}</span>
                <button class="btn btn-sm btn-icon" title="Move down" aria-label="Move later" disabled={i === files.length - 1} onClick={() => store.moveImageFile(f.id, 1)}>↓</button>
                <button class="btn btn-sm btn-icon" title="Remove" aria-label="Remove" onClick={() => store.removeImageFile(f.id)}><Icon name="x" size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
