import React, { useState } from 'react';
import { useDeviceProtection } from '../context';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { useToast } from '../../components/ui/Toast';
import {
  Key,
  Smartphone,
  ExternalLink,
  Lock,
} from 'lucide-react';

interface DeviceActivationScreenProps {
  buyUrl?: string;
}

export const DeviceActivationScreen: React.FC<DeviceActivationScreenProps> = ({
  buyUrl = '/download',
}) => {
  const { activateLicense, deviceName, deviceId } = useDeviceProtection();
  const { showToast } = useToast();

  const [keyInput, setKeyInput] = useState<string>('');
  const [isActivating, setIsActivating] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleActivate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanKey = keyInput.trim().toUpperCase();

    if (!cleanKey) {
      setErrorMessage('Please enter your license key to activate SpendMic.');
      return;
    }

    setIsActivating(true);
    setErrorMessage(null);

    try {
      const success = await activateLicense(cleanKey);
      if (success) {
        showToast({
          type: 'success',
          title: 'Device Authorized',
          description: 'Welcome to SpendMic AI! Your device is now active.',
        });
      } else {
        setErrorMessage('We could not verify this license. Check the key and your internet connection, then try again.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Unable to connect to license verification server.');
    } finally {
      setIsActivating(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        backgroundColor: 'var(--bg-app)',
      }}
    >
      <div style={{ maxWidth: '480px', width: '100%' }}>
        <Card>
          <CardContent style={{ padding: '36px 28px' }}>
            {/* Logo / Badge Header */}
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <img
                src="/logo-full.png"
                alt="SpendMic AI — Track Smarter. Live Better."
                style={{
                  display: 'block',
                  width: 'min(100%, 260px)',
                  height: 'auto',
                  margin: '0 auto 16px',
                }}
              />

              <h1
                style={{
                  fontSize: '1.625rem',
                  fontWeight: 700,
                  color: 'var(--text-main)',
                  margin: '0 0 8px 0',
                  letterSpacing: '-0.02em',
                }}
              >
                Activate SpendMic AI
              </h1>
              <p
                style={{
                  fontSize: '0.9375rem',
                  color: 'var(--text-secondary)',
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                Enter your license key to unlock your personal offline expense tracker on this device.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleActivate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label
                  htmlFor="license-key-input"
                  style={{
                    display: 'block',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    marginBottom: '8px',
                  }}
                >
                  License Key
                </label>

                <div style={{ position: 'relative' }}>
                  <input
                    id="license-key-input"
                    type="text"
                    placeholder="SPM-XXXX-XXXX-XXXX"
                    value={keyInput}
                    onChange={(e) => {
                      setKeyInput(e.target.value.toUpperCase());
                      if (errorMessage) setErrorMessage(null);
                    }}
                    autoFocus
                    autoComplete="off"
                    spellCheck="false"
                    style={{
                      width: '100%',
                      padding: '12px 14px 12px 42px',
                      borderRadius: 'var(--radius-md)',
                      border: errorMessage ? '1px solid var(--danger-crimson)' : '1px solid var(--border-subtle)',
                      backgroundColor: 'var(--surface-muted)',
                      color: 'var(--text-main)',
                      fontSize: '1rem',
                      fontFamily: 'monospace',
                      letterSpacing: '0.05em',
                      boxSizing: 'border-box',
                    }}
                  />
                  <Key
                    size={18}
                    color="var(--text-muted)"
                    style={{
                      position: 'absolute',
                      left: '14px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      pointerEvents: 'none',
                    }}
                  />
                </div>

                {errorMessage && (
                  <div
                    style={{
                      color: 'var(--danger-crimson)',
                      fontSize: '0.8125rem',
                      marginTop: '6px',
                      fontWeight: 500,
                    }}
                  >
                    {errorMessage}
                  </div>
                )}
              </div>

              {/* Device metadata pill */}
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--surface-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                }}
              >
                <Smartphone size={16} color="var(--primary-brand)" style={{ flexShrink: 0 }} />
                <div>
                  Registering as: <strong>{deviceName}</strong> (UUID: {deviceId.slice(0, 8)}...)
                </div>
              </div>

              {/* Submit Button */}
              <Button
                variant="primary"
                type="submit"
                disabled={isActivating || !keyInput.trim()}
                isLoading={isActivating}
                leftIcon={<Lock size={16} />}
                style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '0.9375rem' }}
              >
                Activate This Device
              </Button>
            </form>

            {/* Privacy & Offline Notice */}
            <div
              style={{
                marginTop: '24px',
                paddingTop: '20px',
                borderTop: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                100% offline-first. Your transactions, budgets, and personal data remain stored solely on your device.
              </div>

              {/* Purchase / Help Link */}
              <div style={{ marginTop: '4px' }}>
                <a
                  href={buyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.8125rem',
                    color: 'var(--primary-brand)',
                    textDecoration: 'none',
                    fontWeight: 500,
                  }}
                >
                  <span>Need installation help? Visit the SpendMic guide</span>
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
