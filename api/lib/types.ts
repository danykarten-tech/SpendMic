export interface DeviceRegistration {
  deviceId: string;
  deviceName: string;
  activatedAt: string;
  lastVerifiedAt: string;
  appVersion?: string;
  isActive: boolean;
}

export interface LicenseRecord {
  licenseKey: string;
  customerEmail?: string;
  status: 'ACTIVE' | 'REVOKED' | 'EXPIRED';
  createdAt: string;
  devices: DeviceRegistration[];
}

export type DeviceProtectionState =
  | 'UNKNOWN'
  | 'PENDING_VERIFICATION'
  | 'AUTHORIZED'
  | 'BLOCKED'
  | 'REPLACEMENT_REQUIRED'
  | 'TEMPORARY_SERVER_UNAVAILABLE';

export interface ActivateRequest {
  licenseKey: string;
  deviceId: string;
  deviceName?: string;
  appVersion?: string;
}

export interface ActivateResponse {
  authorized: boolean;
  state: DeviceProtectionState;
  token?: string;
  message?: string;
  devices?: Array<{
    deviceId: string;
    deviceName: string;
    activatedAt: string;
  }>;
}

export interface VerifyRequest {
  licenseKey: string;
  deviceId: string;
  token?: string;
}

export interface VerifyResponse {
  authorized: boolean;
  state: DeviceProtectionState;
  token?: string;
  message?: string;
  serverTime: string;
}

export interface ReplaceRequest {
  licenseKey: string;
  newDeviceId: string;
  newDeviceName?: string;
  targetDeviceId: string;
}

export interface ReplaceResponse {
  success: boolean;
  state: DeviceProtectionState;
  token?: string;
  message?: string;
}

export interface StatusResponse {
  status: string;
  activeDeviceCount: number;
  maxDevices: number;
  devices: Array<{
    deviceId: string;
    deviceName: string;
    activatedAt: string;
  }>;
}
