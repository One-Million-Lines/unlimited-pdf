import { render } from 'preact';
import '../shared/theme.css';
import './popup.css';
import { PopupApp } from './App';

const root = document.getElementById('app');
if (root) render(<PopupApp />, root);
