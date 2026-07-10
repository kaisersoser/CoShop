import { Component, type ErrorInfo, type ReactNode } from 'react';

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) {
    // Provider-neutral boundary: no list contents or personal data leave the device.
    console.error('CoShop render failure', error.name, info.componentStack);
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return <main className="fatal-error"><h1>CoShop needs a refresh</h1><p>Your lists are stored on this device and have not been removed.</p><button className="btn-primary" onClick={() => window.location.reload()}>Reload safely</button></main>;
  }
}
