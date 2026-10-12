import React, { useState } from 'react';
import { Dialog } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';
import { useDeviceProtection } from '../context';
import { useToast } from '../../components/ui/Toast';
import { Smartphone, RefreshCw, AlertTriangle } from 'lucide-react';

interface DeviceReplacementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DeviceReplacementModal: React.FC<DeviceReplacementModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { activeDevices, replaceDevice } = useDeviceProtection();
  const { showToast } = useToast();
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [isReplacing, setIsReplacing] = useState<boolean>(false);

  const handleConfirmReplace = async () => {
    if (!selectedDeviceId) {
      showToast({
        type: 'error',
        title: 'Selection Required',
        description: 'Please select an existing device to replace.',
      });
      return;
    }

    setIsReplacing(true);
    try {
      const success = await replaceDevice(selectedDeviceId);
      if (success) {
        showToast({
          type: 'success',
          title: 'Device Replaced Successfully',
          description: 'This device is now authorized on your license.',
        });
        onClose();
      } else {
        showToast({
          type: 'error',
          title: 'Replacement Failed',
          description: 'Could not complete device replacement. Please check your connection.',
        });
      }
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Error',
        description: err.message || 'An unexpected error occurred during replacement.',
      });
    } finally {
      setIsReplacing(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Replace Authorized Device"
      subtitle="SpendMic licenses permit up to two active devices. Select an existing device to revoke its license slot and authorize this device."
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '12px' }}>
        <div
          style={{
            padding: '12px 14px',
            backgroundColor: 'var(--warning-bg)',
            border: '1px solid var(--warning-border)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            fontSize: '0.8125rem',
            color: 'var(--text-main)',
          }}
        >
          <AlertTriangle size={18} color="var(--warning-amber)" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong>Notice:</strong> The device you replace will have its license slot revoked. Local expenses on that device will remain safe and exportable, but it will be locked from entering new records.
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
            Choose device to deactivate:
          </label>

          {activeDevices.length === 0 ? (
            <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              No active devices listed. Please ensure your device is connected to the licensing server.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {activeDevices.map((dev) => {
                const isSelected = selectedDeviceId === dev.deviceId;
                const formattedDate = new Date(dev.activatedAt).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                });

                return (
                  <div
                    key={dev.deviceId}
                    onClick={() => setSelectedDeviceId(dev.deviceId)}
                    style={{
                      padding: '12px 16px',
                      borderRadius: 'var(--radius-md)',
                      border: isSelected ? '2px solid var(--primary-brand)' : '1px solid var(--border-subtle)',
                      backgroundColor: isSelected ? 'var(--primary-subtle)' : 'var(--surface-card)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Smartphone size={20} color={isSelected ? 'var(--primary-brand)' : 'var(--text-muted)'} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-main)' }}>
                          {dev.deviceName}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Activated: {formattedDate} • ID: {dev.deviceId.slice(0, 8)}...
                        </div>
                      </div>
                    </div>

                    <input
                      type="radio"
                      name="selectedDevice"
                      checked={isSelected}
                      onChange={() => setSelectedDeviceId(dev.deviceId)}
                      style={{ accentColor: 'var(--primary-brand)', cursor: 'pointer' }}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
          <Button variant="ghost" onClick={onClose} disabled={isReplacing}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirmReplace}
            disabled={!selectedDeviceId || isReplacing}
            isLoading={isReplacing}
            leftIcon={<RefreshCw size={16} />}
          >
            Confirm & Authorize This Device
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
