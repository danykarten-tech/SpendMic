import React, { useState } from 'react';
import { useDeviceProtection } from '../context';
import { useApp } from '../../context/AppContext';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { DeviceReplacementModal } from './DeviceReplacementModal';
import { useToast } from '../../components/ui/Toast';
import {
  ShieldAlert,
  Smartphone,
  RefreshCw,
  Download,
  FileSpreadsheet,
  Key,
  CheckCircle,
  RotateCcw,
} from 'lucide-react';

export const DeviceBlockedScreen: React.FC = () => {
  const {
    licenseKey,
    deviceId,
    deviceName,
    blockedReason,
    activateLicense,
    resetLicense,
  } = useDeviceProtection();

  const { exportJSONBackup, exportCSV } = useApp();
  const { showToast } = useToast();

  const [isReplacementModalOpen, setIsReplacementModalOpen] = useState<boolean>(false);
  const [isExportingJSON, setIsExportingJSON] = useState<boolean>(false);
  const [isExportingCSV, setIsExportingCSV] = useState<boolean>(false);
  const [isRetrying, setIsRetrying] = useState<boolean>(false);
  const [isChangingKey, setIsChangingKey] = useState<boolean>(false);
  const [newKeyInput, setNewKeyInput] = useState<string>('');

  const handleExportJSON = async () => {
    setIsExportingJSON(true);
    try {
      await exportJSONBackup();
      showToast({
        type: 'success',
        title: 'Backup Downloaded',
        description: 'All local expenses exported safely as JSON.',
      });
    } catch {
      showToast({
        type: 'error',
        title: 'Export Failed',
        description: 'Could not export JSON backup.',
      });
    } finally {
      setIsExportingJSON(false);
    }
  };

  const handleExportCSV = async () => {
    setIsExportingCSV(true);
    try {
      await exportCSV();
      showToast({
        type: 'success',
        title: 'CSV Downloaded',
        description: 'All transaction records exported safely as CSV.',
      });
    } catch {
      showToast({
        type: 'error',
        title: 'Export Failed',
        description: 'Could not export CSV transactions.',
      });
    } finally {
      setIsExportingCSV(false);
    }
  };

  const handleRetry = async () => {
    if (!licenseKey) return;
    setIsRetrying(true);
    try {
      const ok = await activateLicense(licenseKey);
      if (ok) {
        showToast({
          type: 'success',
          title: 'Device Authorized',
          description: 'Welcome back to SpendMic AI!',
        });
      } else {
        showToast({
          type: 'error',
          title: 'Activation Rejected',
          description: blockedReason || 'Two devices are already authorized on this license.',
        });
      }
    } finally {
      setIsRetrying(false);
    }
  };

  const handleSaveNewKey = async () => {
    if (!newKeyInput.trim()) return;
    setIsRetrying(true);
    try {
      const ok = await activateLicense(newKeyInput.trim());
      if (ok) {
        showToast({
          type: 'success',
          title: 'License Activated',
          description: 'This device is now authorized.',
        });
        setIsChangingKey(false);
      } else {
        showToast({
          type: 'error',
          title: 'Activation Failed',
          description: 'Could not activate this license on this device.',
        });
      }
    } finally {
      setIsRetrying(false);
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
      <div style={{ maxWidth: '560px', width: '100%' }}>
        <Card>
          <CardContent style={{ padding: '32px 24px' }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--danger-subtle)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '16px',
                }}
              >
                <ShieldAlert size={36} color="var(--danger-crimson)" />
              </div>

              <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 8px 0' }}>
                Device Limit Reached
              </h1>
              <p style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                Your SpendMic license permits a maximum of <strong>two active devices</strong>.
                This device is not authorized to record new transactions or edit financial plans.
              </p>
            </div>

            {/* License & Device Details Box */}
            <div
              style={{
                padding: '14px 16px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--surface-muted)',
                fontSize: '0.8125rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                marginBottom: '20px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>License Key:</span>
                <span style={{ fontWeight: 600, fontFamily: 'monospace', color: 'var(--text-main)' }}>
                  {licenseKey || 'Not registered'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>This Device:</span>
                <span style={{ fontWeight: 500, color: 'var(--text-main)' }}>
                  {deviceName}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Device Identifier:</span>
                <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {deviceId.slice(0, 16)}...
                </span>
              </div>
            </div>

            {/* Replacement & Activation Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
              <Button
                variant="primary"
                onClick={() => setIsReplacementModalOpen(true)}
                leftIcon={<Smartphone size={18} />}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                Replace One of My 2 Active Devices
              </Button>

              <div style={{ display: 'flex', gap: '8px' }}>
                <Button
                  variant="outline"
                  onClick={handleRetry}
                  disabled={isRetrying}
                  isLoading={isRetrying}
                  leftIcon={<RefreshCw size={16} />}
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  Retry Verification
                </Button>

                <Button
                  variant="ghost"
                  onClick={() => setIsChangingKey(!isChangingKey)}
                  leftIcon={<Key size={16} />}
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  {isChangingKey ? 'Cancel' : 'Change License'}
                </Button>
              </div>

              {isChangingKey && (
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <input
                    type="text"
                    placeholder="Enter valid license key..."
                    value={newKeyInput}
                    onChange={(e) => setNewKeyInput(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                      backgroundColor: 'var(--surface-card)',
                      color: 'var(--text-main)',
                      fontSize: '0.875rem',
                      textTransform: 'uppercase',
                    }}
                  />
                  <Button variant="primary" onClick={handleSaveNewKey} disabled={!newKeyInput.trim() || isRetrying}>
                    Apply
                  </Button>
                </div>
              )}

              <Button
                variant="ghost"
                onClick={() => {
                  resetLicense();
                  showToast({
                    type: 'info',
                    title: 'Local License Cleared',
                    description: 'Saved browser authorization was cleared. This does not free a device slot.',
                  });
                }}
                leftIcon={<RotateCcw size={15} />}
                style={{ width: '100%', justifyContent: 'center', fontSize: '0.8125rem', color: 'var(--text-muted)' }}
              >
                Clear Local License / Enter Different Key
              </Button>
            </div>

            {/* DATA SAFETY & EXPORT GUARANTEE SECTION */}
            <div
              style={{
                borderTop: '1px solid var(--border-subtle)',
                paddingTop: '20px',
                marginTop: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <CheckCircle size={18} color="var(--success-emerald)" />
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  Your Financial Data is Safe & Preserved
                </span>
              </div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 14px 0' }}>
                SpendMic will never erase, modify, or lock you out of your existing expenses. You can freely export your complete local database right now:
              </p>

              <div style={{ display: 'flex', gap: '10px' }}>
                <Button
                  variant="outline"
                  onClick={handleExportJSON}
                  disabled={isExportingJSON}
                  isLoading={isExportingJSON}
                  leftIcon={<Download size={16} />}
                  style={{ flex: 1, justifyContent: 'center', fontSize: '0.8125rem' }}
                >
                  Export JSON Backup
                </Button>
                <Button
                  variant="outline"
                  onClick={handleExportCSV}
                  disabled={isExportingCSV}
                  isLoading={isExportingCSV}
                  leftIcon={<FileSpreadsheet size={16} />}
                  style={{ flex: 1, justifyContent: 'center', fontSize: '0.8125rem' }}
                >
                  Export CSV
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <DeviceReplacementModal
        isOpen={isReplacementModalOpen}
        onClose={() => setIsReplacementModalOpen(false)}
      />
    </div>
  );
};
