import { render } from 'preact';
import '../shared/theme.css';
import './options.css';
import { OptionsApp } from './App';

const root = document.getElementById('app');
if (root) render(<OptionsApp />, root);
