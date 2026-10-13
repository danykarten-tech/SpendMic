import React, { useState } from 'react';
import { CheckCircle2, Download, ExternalLink, Laptop, LockKeyhole, ShieldCheck, Smartphone, WifiOff } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

type Platform = 'android' | 'ios' | 'desktop' | 'other';

const INSTALL_STEPS: Record<Platform, string[]> = {
  android: [
    'Open this page in Chrome or Samsung Internet.',
    'Tap Install SpendMic below, or open the three-dot browser menu.',
    'Choose Install app or Add to Home screen, then confirm.',
  ],
  ios: [
    'Open this page in Safari.',
    'Tap the Share button at the bottom of Safari.',
    'Choose Add to Home Screen, then tap Add.',
  ],
  desktop: [
    'Open this page in Google Chrome or Microsoft Edge.',
    'Click Install SpendMic below, or use the install icon in the address bar.',
    'Confirm installation. SpendMic will open in its own app window.',
  ],
  other: [
    'Open this page in a current version of Chrome, Edge, or Safari.',
    'Look for Install app or Add to Home screen in your browser menu.',
    'Confirm installation if your browser offers it.',
  ],
};

export const DownloadPage: React.FC = () => {
  const { canNativeInstall, isInstalled, isInstalling, platform, promptInstall } = usePWAInstall();
  const [installMessage, setInstallMessage] = useState<string | null>(null);

  const openApp = () => {
    window.location.assign('/');
  };

  const handleInstall = async () => {
    const accepted = await promptInstall();
    setInstallMessage(
      accepted
        ? 'Installation started. Open SpendMic from your home screen or app list when it is ready.'
        : 'Your browser did not show an install prompt. Follow the installation steps below.'
    );
  };

  return (
    <main className="download-page">
      <section className="download-hero" aria-labelledby="download-title">
        <img
          className="download-brand"
          src="/logo-full.png"
          alt="SpendMic AI — Track Smarter. Live Better."
        />
        <div className="download-badge"><ShieldCheck size={15} /> Offline-first personal finance</div>
        <h1 id="download-title">Install SpendMic on your device</h1>
        <p className="download-lead">
          SpendMic is an installable web app—there is no APK, EXE, or separate software file to download.
          Install it from your browser, then use it like an app.
        </p>

        <div className="download-actions">
          {isInstalled ? (
            <button className="download-primary" onClick={openApp}>
              <CheckCircle2 size={19} /> Open SpendMic
            </button>
          ) : canNativeInstall ? (
            <button className="download-primary" onClick={handleInstall} disabled={isInstalling}>
              <Download size={19} /> {isInstalling ? 'Opening install prompt…' : 'Install SpendMic'}
            </button>
          ) : (
            <button className="download-primary" onClick={openApp}>
              <ExternalLink size={19} /> Open SpendMic
            </button>
          )}
          <a className="download-secondary" href="#install-steps">View install steps</a>
        </div>
        {installMessage && <p className="download-install-message" role="status">{installMessage}</p>}
      </section>

      <section className="download-grid" aria-label="How SpendMic works">
        <article><LockKeyhole size={22} /><h2>License required</h2><p>After purchase, enter your unique SpendMic license key once to unlock the app on this device.</p></article>
        <article><WifiOff size={22} /><h2>Works offline</h2><p>After successful activation, your expense records remain on your device and the app can reopen offline.</p></article>
        <article><Smartphone size={22} /><h2>Up to two devices</h2><p>Your license can be registered on up to two devices. You can replace an old device from the app if needed.</p></article>
      </section>

      <section id="install-steps" className="download-steps" aria-labelledby="steps-title">
        <div className="download-section-heading"><Laptop size={22} /><div><h2 id="steps-title">Install on {platform === 'ios' ? 'iPhone or iPad' : platform === 'android' ? 'Android' : platform === 'desktop' ? 'desktop' : 'your device'}</h2><p>Browser installation options vary by device and browser.</p></div></div>
        <ol>
          {INSTALL_STEPS[platform].map((step, index) => <li key={step}><span>{index + 1}</span>{step}</li>)}
        </ol>
        {platform === 'ios' && <p className="download-note">On iPhone and iPad, Safari’s Add to Home Screen is the supported installation method.</p>}
      </section>

      <section className="download-ready" aria-label="Ready to activate">
        <h2>Already have a license key?</h2>
        <p>Open SpendMic and enter the key from your purchase email. Your financial data is never uploaded as part of activation.</p>
        <button className="download-primary" onClick={openApp}>Open SpendMic <ExternalLink size={17} /></button>
      </section>
    </main>
  );
};
