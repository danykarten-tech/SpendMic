import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { registerServiceWorker } from './sw-register';
import { DownloadPage } from './pages/DownloadPage';

const isDownloadPage = window.location.pathname.replace(/\/+$/, '') === '/download';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {isDownloadPage ? <DownloadPage /> : <App />}
  </React.StrictMode>
);

registerServiceWorker(() => {
  console.log('[PWA] New version ready for offline install.');
});
