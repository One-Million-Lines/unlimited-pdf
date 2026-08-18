import { useEffect, useState } from 'preact/hooks';
import { Icon } from '../shared/icons';
import { useWorkspace, getStore } from './useWorkspace';
import { CATEGORIES, toolsByCategory } from '../../tools/catalog';
import { formatBytes } from '../../core/util/format';
import { StartScreen } from './components/StartScreen';
import { PageGrid } from './components/PageGrid';
import { MergeView, ImagesView } from './components/BuilderViews';
import { Inspector, PropertiesCard } from './components/Inspector';
import { ResultPanel } from './components/ResultPanel';
import { ProgressOverlay, ErrorBanner, ImportPromptModal } from './components/Overlays';

const GITHUB_URL = 'https://github.com/One-Million-Lines/unlimited-pdf';

export function WorkspaceApp() {
  const state = useWorkspace();
  const store = getStore();
  const [showProps, setShowProps] = useState(false);

  // Auto-dismiss transient toasts.
  useEffect(() => {
    if (!state.toast) return;
    const t = setTimeout(() => store.setToast(null), 2400);
    return () => clearTimeout(t);
  }, [state.toast]);

  const isDoc = state.mode === 'document';
  const isBuilder = state.mode === 'merge' || state.mode === 'images';

  const bodyClass = state.mode === 'empty' ? 'body only-center' : isBuilder ? 'body builder' : 'body';

  return (
    <div class="ws">
      <header class="topbar">
        <div class="brand">
          <span class="logo" aria-hidden="true"><Icon name="file" size={16} /></span>
          <span>Unlimited<span>PDF</span></span>
        </div>
        {state.mode !== 'empty' && (
          <>
            <span class="doc-name" title={state.docName}>
              {isDoc ? state.docName : isBuilder ? (state.mode === 'merge' ? 'Merge PDFs' : 'Images to PDF') : ''}
            </span>
            {isDoc && <span class="doc-meta">{state.pageCount} pages · {formatBytes(state.originalSize)}</span>}
          </>
        )}
        <span class="spacer" />
        {isDoc && (
          <>
            <button class="btn btn-ghost btn-icon" title="Undo" aria-label="Undo" disabled={!state.canUndo} onClick={() => store.undo()}><Icon name="undo" size={18} /></button>
            <button class="btn btn-ghost btn-icon" title="Redo" aria-label="Redo" disabled={!state.canRedo} onClick={() => store.redo()}><Icon name="redo" size={18} /></button>
            <button class="btn btn-ghost btn-icon" title="Document properties" aria-label="Document properties" onClick={() => setShowProps(true)}><Icon name="info" size={18} /></button>
          </>
        )}
        {state.mode !== 'empty' && (
          <button class="btn" onClick={() => void store.clearWorkspace()}><Icon name="x" size={15} /> Clear workspace</button>
        )}
        <a class="btn btn-ghost" href={GITHUB_URL} target="_blank" rel="noopener noreferrer" title="View source on GitHub">
          <span style="font-size:13px;">GitHub</span>
        </a>
      </header>

      <div class={bodyClass}>
        {isDoc && <ToolRail activeTool={state.activeTool || 'organize'} />}

        <main class="center">
          {state.mode === 'empty' && <StartScreen activeTool={state.activeTool} />}
          {isDoc && <PageGrid pages={state.effectivePages} selection={state.selection} />}
          {state.mode === 'merge' && <MergeView files={state.mergeFiles} />}
          {state.mode === 'images' && <ImagesView files={state.imageFiles} />}
        </main>

        {state.mode !== 'empty' && <Inspector state={state} />}
      </div>

      <footer class="statusbar">
        {isDoc && <span>{state.effectivePages.length} pages{state.dirty ? ' · unsaved changes' : ''}</span>}
        {state.sizeWarning && <span style="color:var(--warn);">{state.sizeWarning}</span>}
        <span class="spacer" />
        <span class="privacy"><Icon name="shield" size={14} /> Local-only · files are not uploaded</span>
      </footer>

      {state.job && <ProgressOverlay job={state.job} />}
      {state.result && <ResultPanel result={state.result} />}
      {state.error && <ErrorBanner error={state.error} />}
      {state.importPrompt && <ImportPromptModal prompt={state.importPrompt} />}
      {state.toast && <div class="toast" role="status">{state.toast}</div>}

      {showProps && (
        <div class="overlay" role="dialog" aria-modal="true" aria-label="Document properties" onClick={() => setShowProps(false)}>
          <div class="modal" onClick={(e) => e.stopPropagation()}>
            <div class="row"><h2 style="margin:0;">Document properties</h2><span class="spacer" /><button class="btn btn-ghost btn-icon" aria-label="Close" onClick={() => setShowProps(false)}><Icon name="x" size={18} /></button></div>
            <PropertiesCard state={state} />
          </div>
        </div>
      )}
    </div>
  );
}

function ToolRail({ activeTool }: { activeTool: string }) {
  const store = getStore();
  return (
    <nav class="rail" aria-label="Tools">
      <button class={`rail-item${activeTool === 'organize' ? ' active' : ''}`} onClick={() => store.setTool('organize')}>
        <span class="ic"><Icon name="grid" size={17} /></span> Organize pages
      </button>
      {CATEGORIES.map((cat) => {
        const tools = toolsByCategory(cat).filter((t) => t.id !== 'organize' && t.input === 'pdf');
        if (tools.length === 0) return null;
        return (
          <div key={cat}>
            <h4>{cat}</h4>
            {tools.map((t) => (
              <button key={t.id} class={`rail-item${activeTool === t.id ? ' active' : ''}`} onClick={() => store.setTool(t.id)} title={t.short}>
                <span class="ic"><Icon name={t.icon} size={17} /></span> {t.name}
              </button>
            ))}
          </div>
        );
      })}
    </nav>
  );
}
