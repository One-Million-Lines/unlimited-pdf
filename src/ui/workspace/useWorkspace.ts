import { useEffect, useState } from 'preact/hooks';
import { getStore, type WorkspaceState } from './store';

/** Subscribe a component to the workspace store snapshot. */
export function useWorkspace(): WorkspaceState {
  const store = getStore();
  const [state, setState] = useState<WorkspaceState>(store.state);
  useEffect(() => store.subscribe(setState), []);
  return state;
}

export { getStore };
