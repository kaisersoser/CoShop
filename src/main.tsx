import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { JoinListPage } from './components/JoinListPage.tsx';

const joinMatch = window.location.pathname.match(/^\/join\/([^/]+)\/?$/);

// Mount the CoShop application. StrictMode is enabled to surface side-effect
// issues during development while remaining inert in production builds.
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>{joinMatch ? <JoinListPage token={decodeURIComponent(joinMatch[1])} /> : <App />}</ErrorBoundary>
  </React.StrictMode>,
);
