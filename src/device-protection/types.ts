export type DeviceProtectionState =
  | 'UNKNOWN'
  | 'PENDING_VERIFICATION'
  | 'AUTHORIZED'
  | 'BLOCKED'
  | 'REPLACEMENT_REQUIRED'
  | 'TEMPORARY_SERVER_UNAVAILABLE';

export interface RegisteredDevice {
  deviceId: string;
  deviceName: string;
  activatedAt: string;
}

export interface DeviceAuthCache {
  state: DeviceProtectionState;
  licenseKey: string | null;
  deviceId: string;
  deviceName: string;
  token?: string;
  lastVerifiedAt: string | null;
  blockedReason?: string;
  activeDevices?: RegisteredDevice[];
}

export type StateMachineEvent =
  | { type: 'APP_INITIALIZED'; cachedState?: DeviceProtectionState }
  | { type: 'SERVER_AUTHORIZED'; token: string; activeDevices?: RegisteredDevice[] }
  | { type: 'SERVER_REJECTED'; reason?: string; activeDevices?: RegisteredDevice[] }
  | { type: 'SERVER_UNAVAILABLE'; error?: string }
  | { type: 'NETWORK_OFFLINE' }
  | { type: 'USER_REPLACED_DEVICE'; token: string }
  | { type: 'RESET_LICENSE' };
