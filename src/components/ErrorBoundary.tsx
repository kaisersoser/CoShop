import { Component, type ErrorInfo, type ReactNode } from 'react';
import { translate } from '../i18n';

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) {
    // Provider-neutral boundary: no list contents or personal data leave the device.
    console.error('CoShop render failure', error.name, info.componentStack);
  }
  render() {
    if (!this.state.failed) return this.props.children;
    const language = document.documentElement.lang || navigator.language;
    return <main className="fatal-error"><h1>{translate(language, 'refreshNeeded')}</h1><p>{translate(language, 'refreshSafe')}</p><button className="btn-primary" onClick={() => window.location.reload()}>{translate(language, 'reloadSafely')}</button></main>;
  }
}
