import { useState } from 'preact/hooks';
import { Icon } from '../../shared/icons';
import { getStore, type ResultState } from '../store';
import { saveNamedBytes, saveAsZip, saveToDirectory, canUseDirectoryPicker } from '../../../lib/save';
import { formatBytes, percentChange, formatPercent, formatDuration } from '../../../core/util/format';

export function ResultPanel({ result }: { result: ResultState }) {
  const store = getStore();
  const [status, setStatus] = useState<string | null>(null);
  const many = result.outputs.length > 1;
  const pct = percentChange(result.inputBytes, result.outputBytes);

  const saveOne = async (i: number) => {
    const ok = await saveNamedBytes(result.outputs[i]);
    if (ok) setStatus('Saved.');
  };
  const saveZip = async () => {
    const ok = await saveAsZip(result.outputs, 'unlimitedpdf-output.zip');
    if (ok) setStatus('ZIP saved.');
  };
  const saveFolder = async () => {
    const n = await saveToDirectory(result.outputs);
    if (n > 0) setStatus(`Saved ${n} files to the chosen folder.`);
  };

  return (
    <div class="overlay" role="dialog" aria-modal="true" aria-label="Result">
      <div class="modal">
        <div class="row">
          <h2 style="margin:0;"><Icon name="check" size={18} /> {result.title}</h2>
          <span class="spacer" />
          <button class="btn btn-ghost btn-icon" aria-label="Close" onClick={() => store.dismissResult()}><Icon name="x" size={18} /></button>
        </div>

        <div class="stat-grid">
          <div class="stat"><div class="k">Input</div><div class="v">{formatBytes(result.inputBytes)}</div></div>
          <div class="stat"><div class="k">Output</div><div class="v">{formatBytes(result.outputBytes)}</div></div>
          <div class="stat"><div class="k">{result.outputBytes < result.inputBytes ? 'Saved' : 'Change'}</div><div class="v">{formatPercent(pct)}</div></div>
        </div>
        <p class="small muted">Done in {formatDuration(result.elapsedMs)} · {result.outputs.length} file(s) · original file untouched.</p>

        {result.notes.length > 0 && (
          <div class="notice" style="margin:10px 0;">
            {result.notes.map((n, i) => <div key={i}>{n}</div>)}
          </div>
        )}

        <div class="result-list">
          {result.outputs.map((o, i) => (
            <div class="result-file" key={o.name}>
              <Icon name={o.mime === 'text/plain' ? 'text' : o.mime?.startsWith('image') ? 'image' : 'file'} size={16} />
              <span class="n" title={o.name}>{o.name}</span>
              <span class="meta small muted">{formatBytes(o.bytes.byteLength)}</span>
              <button class="btn btn-sm" onClick={() => void saveOne(i)}><Icon name="save" size={14} /> Save</button>
            </div>
          ))}
        </div>

        <div class="row row-wrap" style="gap:8px; margin-top:8px;">
          {many && <button class="btn btn-primary" onClick={() => void saveZip()}><Icon name="save" size={15} /> Download ZIP</button>}
          {many && canUseDirectoryPicker() && <button class="btn" onClick={() => void saveFolder()}>Save all to folder…</button>}
          {!many && <button class="btn btn-primary" onClick={() => void saveOne(0)}><Icon name="save" size={15} /> Save file</button>}
          <span class="spacer" />
          <button class="btn btn-ghost" onClick={() => store.dismissResult()}>Done</button>
        </div>
        {status && <p class="small" style="color:var(--ok); margin-top:8px;">{status}</p>}
      </div>
    </div>
  );
}
