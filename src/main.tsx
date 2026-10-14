import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { registerServiceWorker } from './sw-register';
import { DownloadPage } from './pages/DownloadPage';
import { isRunningInstalledPWA } from './device-protection/installMode';

// The install page belongs to a normal browser tab. Chrome may launch an
// installed PWA using the current /download URL; in that case render the app
// itself so customers land in SpendMic, never in installation instructions.
const isDownloadPage =
  window.location.pathname.replace(/\/+$/, '') === '/download' && !isRunningInstalledPWA();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {isDownloadPage ? <DownloadPage /> : <App />}
  </React.StrictMode>
);

registerServiceWorker(() => {
  console.log('[PWA] New version ready for offline install.');
});
