import React, { useState } from 'react';
import { Smartphone, Monitor, Share, MoreVertical, PlusSquare, X, CheckCircle2, Download } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

/* ─────────────────────────── helper ─────────────────────────── */
const Step: React.FC<{ n: number; text: React.ReactNode }> = ({ n, text }) => (
  <li
    style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: '12px',
      marginBottom: '10px',
    }}
  >
    <span
      style={{
        flexShrink: 0,
        width: '24px',
        height: '24px',
        borderRadius: '50%',
        background: 'var(--primary-brand)',
        color: '#fff',
        fontSize: '0.75rem',
        fontWeight: 700,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {n}
    </span>
    <span style={{ fontSize: '0.875rem', color: 'var(--ink-secondary)', lineHeight: '1.5' }}>
      {text}
    </span>
  </li>
);

const InlineIcon: React.FC<{ icon: React.ReactNode }> = ({ icon }) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      verticalAlign: 'middle',
      margin: '0 3px',
      color: 'var(--primary-brand)',
    }}
  >
    {icon}
  </span>
);

/* ─────────────────────────── main component ─────────────────── */
export const PWAInstallSection: React.FC = () => {
  const { canNativeInstall, isInstalled, isInstalling, platform, promptInstall } = usePWAInstall();
  const [installResult, setInstallResult] = useState<'accepted' | 'dismissed' | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);

  /* Already installed */
  if (isInstalled) {
    return (
      <div
        style={{
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-default)',
          background: 'var(--positive-bg)',
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
        }}
      >
        <CheckCircle2 size={24} color="var(--positive-emerald)" />
        <div>
          <p
            style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--positive-emerald)', marginBottom: '2px' }}
          >
            SpendMic is installed
          </p>
          <p style={{ fontSize: '0.8125rem', color: 'var(--ink-secondary)' }}>
            You're running in app mode. Fully offline. Open anytime from your home screen.
          </p>
        </div>
      </div>
    );
  }

  const handleInstallClick = async () => {
    const accepted = await promptInstall();
    setInstallResult(accepted ? 'accepted' : 'dismissed');
  };

  /* Native install available (Chrome / Edge / Samsung Internet) */
  const nativeButton = canNativeInstall && (
    <div>
      {installResult === 'accepted' && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: 'var(--positive-emerald)',
            marginBottom: '12px',
            fontSize: '0.875rem',
            fontWeight: 500,
          }}
        >
          <CheckCircle2 size={16} /> Install started — check your home screen!
        </div>
      )}
      {installResult === 'dismissed' && (
        <p style={{ fontSize: '0.8125rem', color: 'var(--ink-muted)', marginBottom: '12px' }}>
          You dismissed the prompt. Tap &quot;Install&quot; whenever you&apos;re ready.
        </p>
      )}
      <button
        id="pwa-install-btn"
        onClick={handleInstallClick}
        disabled={isInstalling}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 24px',
          borderRadius: 'var(--radius-sm)',
          border: 'none',
          cursor: isInstalling ? 'not-allowed' : 'pointer',
          fontSize: '0.9375rem',
          fontWeight: 600,
          background: isInstalling ? 'var(--surface-subtle)' : 'var(--primary-brand)',
          color: isInstalling ? 'var(--ink-muted)' : '#fff',
          transition: 'background 0.2s, transform 0.1s',
        }}
        onMouseEnter={(e) => {
          if (!isInstalling) (e.currentTarget as HTMLButtonElement).style.background = 'var(--primary-hover)';
        }}
        onMouseLeave={(e) => {
          if (!isInstalling) (e.currentTarget as HTMLButtonElement).style.background = 'var(--primary-brand)';
        }}
        onMouseDown={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.97)';
        }}
        onMouseUp={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
        }}
      >
        <Download size={18} />
        {isInstalling ? 'Installing…' : 'Install SpendMic'}
      </button>
    </div>
  );

  /* Platform-specific instructions (iOS / Firefox / other) */
  const iosInstructions = (
    <ol style={{ listStyle: 'none', margin: '0', padding: '0' }}>
      <Step
        n={1}
        text={
          <>
            In <strong>Safari</strong>, tap the{' '}
            <InlineIcon icon={<Share size={14} />} /> <strong>Share</strong> button at the bottom of the screen.
          </>
        }
      />
      <Step
        n={2}
        text={
          <>
            Scroll down and tap{' '}
            <InlineIcon icon={<PlusSquare size={14} />} />{' '}
            <strong>Add to Home Screen</strong>.
          </>
        }
      />
      <Step
        n={3}
        text={<>Confirm by tapping <strong>Add</strong> in the top-right corner.</>}
      />
    </ol>
  );

  const androidInstructions = (
    <ol style={{ listStyle: 'none', margin: '0', padding: '0' }}>
      <Step
        n={1}
        text={
          <>
            Open SpendMic in <strong>Chrome</strong> or <strong>Samsung Internet</strong>.
          </>
        }
      />
      <Step
        n={2}
        text={
          <>
            Tap the <InlineIcon icon={<MoreVertical size={14} />} /> <strong>three-dot menu</strong> (top-right) and
            choose <strong>Add to Home Screen</strong> or <strong>Install App</strong>.
          </>
        }
      />
      <Step n={3} text={<>Tap <strong>Install</strong> to confirm.</>} />
    </ol>
  );

  const desktopInstructions = (
    <ol style={{ listStyle: 'none', margin: '0', padding: '0' }}>
      <Step
        n={1}
        text={
          <>
            Open SpendMic in <strong>Google Chrome</strong> or <strong>Microsoft Edge</strong>.
          </>
        }
      />
      <Step
        n={2}
        text={
          <>
            Click the <InlineIcon icon={<Monitor size={14} />} /> <strong>install icon</strong> in the address bar
            (right side) or open the browser menu → <strong>Install SpendMic</strong>.
          </>
        }
      />
      <Step n={3} text={<>Click <strong>Install</strong> to confirm. SpendMic opens as a standalone window.</>} />
    </ol>
  );

  const instructionsMap: Record<string, React.ReactNode> = {
    ios: iosInstructions,
    android: androidInstructions,
    desktop: desktopInstructions,
    other: desktopInstructions,
  };

  const platformLabel: Record<string, string> = {
    ios: 'iPhone / iPad',
    android: 'Android',
    desktop: 'Desktop',
    other: 'Your Device',
  };

  const currentInstructions = instructionsMap[platform];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Benefit strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '12px',
        }}
      >
        {[
          { icon: '⚡', title: 'Instant Launch', desc: 'Opens in < 1s, even offline' },
          { icon: '🔒', title: '100% Private', desc: 'No cloud, no account needed' },
          { icon: '📱', title: 'Home Screen', desc: 'Works like a native app' },
          { icon: '🔕', title: 'No Banners', desc: 'Clean full-screen experience' },
        ].map((b) => (
          <div
            key={b.title}
            style={{
              padding: '14px 16px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--surface-subtle)',
              border: '1px solid var(--border-default)',
            }}
          >
            <div style={{ fontSize: '1.25rem', marginBottom: '4px' }}>{b.icon}</div>
            <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--ink-primary)', marginBottom: '2px' }}>
              {b.title}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--ink-muted)' }}>{b.desc}</div>
          </div>
        ))}
      </div>

      {/* Install controls */}
      {nativeButton}

      {/* Fallback / manual instructions toggle */}
      {!canNativeInstall && (
        <div>
          <button
            id="pwa-how-to-install-btn"
            onClick={() => setShowInstructions((v) => !v)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              borderRadius: 'var(--radius-sm)',
              border: '1.5px solid var(--primary-brand)',
              background: 'transparent',
              color: 'var(--primary-brand)',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'var(--primary-subtle)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            }}
          >
            <Smartphone size={16} />
            {showInstructions ? 'Hide Instructions' : `How to install on ${platformLabel[platform]}`}
          </button>
        </div>
      )}

      {/* Detailed instructions panel */}
      {(showInstructions || (canNativeInstall && platform === 'ios')) && (
        <div
          style={{
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-default)',
            background: 'var(--surface-subtle)',
            padding: '20px 24px',
            position: 'relative',
          }}
        >
          <button
            aria-label="Close instructions"
            onClick={() => setShowInstructions(false)}
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--ink-muted)',
              padding: '4px',
            }}
          >
            <X size={16} />
          </button>
          <p
            style={{
              fontSize: '0.8125rem',
              fontWeight: 700,
              color: 'var(--ink-primary)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: '14px',
            }}
          >
            Install on {platformLabel[platform]}
          </p>
          {currentInstructions}
        </div>
      )}

      {/* Always show instructions toggle when native install IS available, so user knows what it does */}
      {canNativeInstall && (
        <button
          id="pwa-show-manual-btn"
          onClick={() => setShowInstructions((v) => !v)}
          style={{
            background: 'none',
            border: 'none',
            padding: '0',
            color: 'var(--ink-muted)',
            fontSize: '0.8125rem',
            cursor: 'pointer',
            textDecoration: 'underline',
            textAlign: 'left',
            width: 'fit-content',
          }}
        >
          {showInstructions ? 'Hide' : 'Not working? Show manual install steps'}
        </button>
      )}
    </div>
  );
};
