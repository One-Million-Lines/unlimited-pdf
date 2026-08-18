import { Icon } from '../../shared/icons';
import { getStore, type JobState, type ErrorState, type ImportPrompt as ImportPromptState } from '../store';

export function ProgressOverlay({ job }: { job: JobState }) {
  const store = getStore();
  const pct = job.total > 0 ? Math.round((job.done / job.total) * 100) : null;
  return (
    <div class="overlay" role="dialog" aria-modal="true" aria-label="Processing">
      <div class="modal progress">
        <h2 style="margin:0 0 4px;">{job.label}…</h2>
        <p class="small muted" aria-live="polite">
          {job.total > 0 ? `${job.done} / ${job.total}` : 'Working…'}{pct !== null ? ` · ${pct}%` : ''}
        </p>
        <div class="bar"><div style={`width:${pct ?? 15}%`} /></div>
        <button class="btn" onClick={() => store.cancelJob()}>Cancel</button>
      </div>
    </div>
  );
}

export function ErrorBanner({ error }: { error: ErrorState }) {
  const store = getStore();
  return (
    <div class="overlay" role="alertdialog" aria-modal="true" aria-label="Problem">
      <div class="modal">
        <div class="row">
          <h2 style="margin:0;">Can’t complete that</h2>
          <span class="spacer" />
          <button class="btn btn-ghost btn-icon" aria-label="Close" onClick={() => store.dismissError()}><Icon name="x" size={18} /></button>
        </div>
        <p>{error.message}</p>
        {error.detail && (
          <details style="margin-top:8px;">
            <summary class="small muted">Technical details</summary>
            <pre class="small" style="white-space:pre-wrap; margin-top:6px; color:var(--muted);">{error.detail}</pre>
          </details>
        )}
        <div class="row" style="margin-top:14px;">
          <span class="spacer" />
          <button class="btn btn-primary" onClick={() => store.dismissError()}>OK</button>
        </div>
      </div>
    </div>
  );
}

export function ImportPromptModal({ prompt }: { prompt: ImportPromptState }) {
  const store = getStore();
  return (
    <div class="overlay" role="dialog" aria-modal="true" aria-label="Import from tab">
      <div class="modal">
        <h2 style="margin:0 0 8px;">Import PDF from this tab?</h2>
        <p>
          UnlimitedPDF will fetch the PDF from <strong>{prompt.origin}</strong> and process it entirely on your device.
          You may be asked to grant temporary access to that one site.
        </p>
        <p class="small muted" style="word-break:break-all;">{prompt.url}</p>
        <div class="row" style="margin-top:14px; gap:8px;">
          <span class="spacer" />
          <button class="btn" onClick={() => store.cancelImport()}>Cancel</button>
          <button class="btn btn-primary" onClick={() => void store.confirmImport()}><Icon name="file" size={15} /> Import PDF</button>
        </div>
      </div>
    </div>
  );
}
