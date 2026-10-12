import { createContext, useContext } from 'react';
import { DeviceProtectionState, RegisteredDevice } from './types';

export interface DeviceProtectionContextType {
  state: DeviceProtectionState;
  licenseKey: string | null;
  deviceId: string;
  deviceName: string;
  isAuthorized: boolean;
  isBlocked: boolean;
  isPending: boolean;
  isTemporaryServerUnavailable: boolean;
  isUnactivated: boolean;
  lastVerifiedAt: string | null;
  blockedReason?: string;
  activeDevices: RegisteredDevice[];
  activateLicense: (key: string) => Promise<boolean>;
  verifyDevice: () => Promise<boolean>;
  replaceDevice: (targetDeviceId: string) => Promise<boolean>;
  resetLicense: () => void;
}

export const DeviceProtectionContext = createContext<DeviceProtectionContextType | undefined>(undefined);

export function useDeviceProtection(): DeviceProtectionContextType {
  const ctx = useContext(DeviceProtectionContext);
  if (!ctx) {
    throw new Error('useDeviceProtection must be used within a DeviceProtectionProvider');
  }
  return ctx;
}
