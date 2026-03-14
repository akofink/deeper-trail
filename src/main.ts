import { bootstrapBrowserShell, type BrowserShellWindow } from './game/runtime/browserShell';
import './styles.css';

declare global {
  interface Window extends BrowserShellWindow {}
}

void bootstrapBrowserShell();
