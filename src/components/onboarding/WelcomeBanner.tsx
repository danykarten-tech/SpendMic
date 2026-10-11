import React from 'react';
import { ShieldCheck, HardDrive, EyeOff, X, ArrowRight } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useApp } from '../../context/AppContext';

export const WelcomeBanner: React.FC = () => {
  const { preferences, dismissOnboarding, openAddModal } = useApp();

  if (preferences.onboardingCompleted) {
    return null;
  }

  return (
    <Card
      style={{
        backgroundColor: '#FFFFFF',
        borderColor: 'var(--primary-border)',
        boxShadow: 'var(--shadow-md)',
        marginBottom: '24px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          bottom: 0,
          width: '4px',
          backgroundColor: 'var(--primary-brand)',
        }}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Badge variant="info" icon={<ShieldCheck size={14} />}>
              100% Private & Offline First
            </Badge>
          </div>

          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--ink-primary)', marginBottom: '8px' }}>
            Welcome to SpendMic AI
          </h2>

          <p style={{ fontSize: '0.875rem', color: 'var(--ink-secondary)', lineHeight: '1.6', marginBottom: '16px' }}>
            Your financial data remains strictly on this device inside local browser IndexedDB storage.
            No accounts, no bank logins, no cloud tracking, and no external servers.
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '12px',
              marginBottom: '20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8125rem', color: 'var(--ink-primary)' }}>
              <HardDrive size={16} style={{ color: 'var(--primary-brand)', flexShrink: 0 }} />
              <span>Stored in device IndexedDB</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8125rem', color: 'var(--ink-primary)' }}>
              <EyeOff size={16} style={{ color: 'var(--positive-emerald)', flexShrink: 0 }} />
              <span>Zero telemetry or cloud tracking</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <Button variant="primary" size="sm" onClick={() => openAddModal()} rightIcon={<ArrowRight size={14} />}>
              Get Started (Phase 1)
            </Button>
            <Button variant="ghost" size="sm" onClick={dismissOnboarding}>
              Got it, hide notice
            </Button>
          </div>
        </div>

        <button
          onClick={dismissOnboarding}
          aria-label="Dismiss welcome banner"
          style={{
            color: 'var(--ink-muted)',
            padding: '4px',
            borderRadius: '4px',
            lineHeight: 1,
          }}
        >
          <X size={18} />
        </button>
      </div>
    </Card>
  );
};
