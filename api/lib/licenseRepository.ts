import crypto from 'crypto';

export interface RegisteredLicenseDevice {
  deviceId: string;
  deviceName: string;
  activatedAt: string;
}

export interface LicenseOperationResult {
  authorized: boolean;
  reason?: string;
  devices: RegisteredLicenseDevice[];
}

function getConfig(): { url: string; key: string } | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? { url: url.replace(/\/$/, ''), key } : null;
}

export function hashLicenseKey(licenseKey: string): string {
  return crypto.createHash('sha256').update(licenseKey.trim().toUpperCase()).digest('hex');
}

async function rpc<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const config = getConfig();
  if (!config) throw new Error('Persistent licensing storage is not configured.');

  const response = await fetch(`${config.url}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${config.key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) throw new Error('Persistent licensing storage is temporarily unavailable.');
  return response.json() as Promise<T>;
}

function normalizeResult(value: unknown): LicenseOperationResult {
  const row = Array.isArray(value) ? value[0] : value;
  if (!row || typeof row !== 'object') return { authorized: false, reason: 'Invalid licensing storage response.', devices: [] };
  const data = row as { authorized?: boolean; reason?: string; devices?: RegisteredLicenseDevice[] };
  return { authorized: data.authorized === true, reason: data.reason, devices: Array.isArray(data.devices) ? data.devices : [] };
}

export async function registerDevice(input: {
  licenseKey: string;
  provider: 'payhip' | 'owner';
  customerEmail?: string;
  deviceId: string;
  deviceName: string;
  appVersion: string;
}): Promise<LicenseOperationResult> {
  const value = await rpc<unknown>('activate_spendmic_device', {
    p_license_hash: hashLicenseKey(input.licenseKey),
    p_provider: input.provider,
    p_customer_email: input.customerEmail || null,
    p_device_id: input.deviceId,
    p_device_name: input.deviceName,
    p_app_version: input.appVersion,
  });
  return normalizeResult(value);
}

export async function verifyRegisteredDevice(licenseKey: string, deviceId: string): Promise<LicenseOperationResult> {
  const value = await rpc<unknown>('verify_spendmic_device', {
    p_license_hash: hashLicenseKey(licenseKey),
    p_device_id: deviceId,
  });
  return normalizeResult(value);
}

export async function replaceRegisteredDevice(licenseKey: string, targetDeviceId: string, newDeviceId: string, newDeviceName: string): Promise<LicenseOperationResult> {
  const value = await rpc<unknown>('replace_spendmic_device', {
    p_license_hash: hashLicenseKey(licenseKey),
    p_target_device_id: targetDeviceId,
    p_new_device_id: newDeviceId,
    p_new_device_name: newDeviceName,
  });
  return normalizeResult(value);
}

export async function getRegisteredDevices(licenseKey: string): Promise<LicenseOperationResult> {
  const value = await rpc<unknown>('get_spendmic_license_status', { p_license_hash: hashLicenseKey(licenseKey) });
  return normalizeResult(value);
}
