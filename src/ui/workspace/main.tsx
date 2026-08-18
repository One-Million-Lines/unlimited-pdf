import { render } from 'preact';
import '../shared/theme.css';
import './workspace.css';
import { WorkspaceApp } from './App';
import { getStore } from './store';
import { parseWorkspaceParams } from '../shared/nav';

const store = getStore();
void store.init(parseWorkspaceParams(location.search));

const root = document.getElementById('app');
if (root) render(<WorkspaceApp />, root);
