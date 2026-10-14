import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useDeviceProtection } from '../context';
import { useToast } from '../../components/ui/Toast';
import { DeviceReplacementModal } from './DeviceReplacementModal';
import { isRunningInstalledPWA } from '../installMode';
import {
  ShieldCheck,
  Smartphone,
  RefreshCw,
  Key,
  RotateCcw,
} from 'lucide-react';

export const LicenseSettingsSection: React.FC = () => {
  const {
    licenseKey,
    deviceId,
    deviceName,
    isAuthorized,
    isPending,
    isBlocked,
    isTemporaryServerUnavailable,
    lastVerifiedAt,
    activeDevices,
    activateLicense,
    verifyDevice,
    resetLicense,
  } = useDeviceProtection();

  const { showToast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isEditingKey, setIsEditingKey] = useState(false);
  const [keyInput, setKeyInput] = useState('');

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const ok = await verifyDevice();
      if (ok) {
        showToast({
          type: 'success',
          title: 'Device Verified',
          description: 'Your license and device authorization are active.',
        });
      } else {
        showToast({
          type: 'warning',
          title: 'Sync Result',
          description: 'Could not refresh license status online.',
        });
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleActivateNew = async () => {
    if (!keyInput.trim()) return;
    setIsSyncing(true);
    try {
      const ok = await activateLicense(keyInput.trim());
      if (ok) {
        showToast({
          type: 'success',
          title: 'License Activated',
          description: 'This device is now registered and authorized.',
        });
        setIsEditingKey(false);
        setKeyInput('');
      } else {
        showToast({
          type: 'error',
          title: 'Activation Failed',
          description: 'Two devices are already authorized on this license or key is invalid.',
        });
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const getStatusBadge = () => {
    if (isAuthorized) {
      return <Badge variant="income">Authorized Device</Badge>;
    }
    if (isPending) {
      return <Badge variant="info">Pending Server Verification</Badge>;
    }
    if (isTemporaryServerUnavailable) {
      return <Badge variant="warning">Offline Mode (Cached Authorization)</Badge>;
    }
    if (isBlocked) {
      return <Badge variant="expense">Blocked (Limit Reached)</Badge>;
    }
    return <Badge variant="muted">Unregistered Device</Badge>;
  };

  // Browser access is intentionally key-free. Licensing appears only in the
  // installed PWA, where activation is required to use the product.
  if (!isRunningInstalledPWA()) return null;

  return (
    <>
      <Card>
        <CardHeader>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={20} color="var(--primary-brand)" />
              <CardTitle>Device Protection & Licensing</CardTitle>
            </div>
            {getStatusBadge()}
          </div>
          <CardDescription>
            License is active on this device. Financial records remain 100% private on your device.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Details list */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '12px',
                padding: '14px',
                backgroundColor: 'var(--surface-muted)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>License Key</div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, fontFamily: 'monospace', color: 'var(--text-main)', marginTop: '2px' }}>
                  {licenseKey || 'No License Configured'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>This Device</div>
                <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-main)' }}>
                  {deviceName}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Device Identifier</div>
                <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {deviceId.slice(0, 18)}...
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Last Server Verification</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-main)', marginTop: '2px' }}>
                  {lastVerifiedAt ? new Date(lastVerifiedAt).toLocaleString() : 'Not verified online yet'}
                </div>
              </div>
            </div>

            {/* Edit Key Input */}
            {isEditingKey && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="SPM-XXXX-XXXX-XXXX"
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
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
                <Button variant="primary" onClick={handleActivateNew} disabled={!keyInput.trim() || isSyncing} isLoading={isSyncing}>
                  Activate
                </Button>
                <Button variant="ghost" onClick={() => setIsEditingKey(false)}>
                  Cancel
                </Button>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              <Button
                variant="outline"
                onClick={handleSync}
                disabled={isSyncing || !licenseKey}
                isLoading={isSyncing}
                leftIcon={<RefreshCw size={16} />}
              >
                Sync with License Server
              </Button>

              <Button
                variant="outline"
                onClick={() => setIsModalOpen(true)}
                disabled={activeDevices.length === 0}
                leftIcon={<Smartphone size={16} />}
              >
                Manage Registered Devices
              </Button>

              {!isEditingKey && (
                <Button
                  variant="ghost"
                  onClick={() => setIsEditingKey(true)}
                  leftIcon={<Key size={16} />}
                >
                  {licenseKey ? 'Change License Key' : 'Enter License Key'}
                </Button>
              )}

              {licenseKey && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    resetLicense();
                    showToast({
                      type: 'info',
                      title: 'License Reset',
                      description: 'Device de-registered. Showing activation screen.',
                    });
                  }}
                  leftIcon={<RotateCcw size={16} />}
                  style={{ color: 'var(--danger-crimson)' }}
                >
                  Deactivate / Reset Device
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <DeviceReplacementModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
};
