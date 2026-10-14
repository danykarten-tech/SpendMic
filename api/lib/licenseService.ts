import { createAuthorizationToken } from './security';
import { getRegisteredDevices, registerDevice, replaceRegisteredDevice, verifyRegisteredDevice, type LicenseOperationResult } from './licenseRepository';
import { isConfiguredOwnerKey, verifyPayhipLicense } from './payhip';
import { LicenseStore } from './licenseStore';

type LicenseProvider = 'payhip' | 'owner';

interface EntitlementResult {
  valid: boolean;
  unavailable?: boolean;
  provider?: LicenseProvider;
  customerEmail?: string;
  reason?: string;
}

export interface AuthorizationResult extends LicenseOperationResult {
  unavailable?: boolean;
  token?: string;
}

// This exists only to make local, pre-Payhip testing possible. It is explicitly
// disabled in production, even if an environment variable is mistakenly set.
function isLocalTestMode(): boolean {
  return process.env.NODE_ENV !== 'production' && process.env.SPENDMIC_ALLOW_LOCAL_TEST_LICENSES === 'true';
}

function fromLocalStore(result: { authorized: boolean; reason?: string; activeDevices: Array<{ deviceId: string; deviceName: string; activatedAt: string }> }): LicenseOperationResult {
  return { authorized: result.authorized, reason: result.reason, devices: result.activeDevices };
}

async function verifyEntitlement(licenseKey: string): Promise<EntitlementResult> {
  if (isConfiguredOwnerKey(licenseKey)) return { valid: true, provider: 'owner' };
  const payhip = await verifyPayhipLicense(licenseKey);
  return payhip.valid
    ? { valid: true, provider: 'payhip', customerEmail: payhip.buyerEmail }
    : { valid: false, unavailable: payhip.unavailable, reason: payhip.reason };
}

function asAuthorized(licenseKey: string, deviceId: string, result: LicenseOperationResult): AuthorizationResult {
  return { ...result, token: createAuthorizationToken(licenseKey, deviceId) };
}

export async function activatePurchasedLicense(input: {
  licenseKey: string; deviceId: string; deviceName: string; appVersion: string;
}): Promise<AuthorizationResult> {
  if (isLocalTestMode()) {
    const result = fromLocalStore(await LicenseStore.activate(input.licenseKey, input.deviceId, input.deviceName, input.appVersion));
    return result.authorized ? asAuthorized(input.licenseKey, input.deviceId, result) : result;
  }
  const entitlement = await verifyEntitlement(input.licenseKey);
  if (!entitlement.valid) return { authorized: false, unavailable: entitlement.unavailable, reason: entitlement.reason, devices: [] };
  try {
    const result = await registerDevice({ ...input, provider: entitlement.provider!, customerEmail: entitlement.customerEmail });
    return result.authorized ? asAuthorized(input.licenseKey, input.deviceId, result) : result;
  } catch (error) {
    return { authorized: false, unavailable: true, reason: error instanceof Error ? error.message : 'Licensing storage is unavailable.', devices: [] };
  }
}

export async function verifyPurchasedLicense(licenseKey: string, deviceId: string): Promise<AuthorizationResult> {
  if (isLocalTestMode()) {
    const result = fromLocalStore(await LicenseStore.verify(licenseKey, deviceId));
    return result.authorized ? asAuthorized(licenseKey, deviceId, result) : result;
  }
  const entitlement = await verifyEntitlement(licenseKey);
  if (!entitlement.valid) return { authorized: false, unavailable: entitlement.unavailable, reason: entitlement.reason, devices: [] };
  try {
    const result = await verifyRegisteredDevice(licenseKey, deviceId);
    return result.authorized ? asAuthorized(licenseKey, deviceId, result) : result;
  } catch (error) {
    return { authorized: false, unavailable: true, reason: error instanceof Error ? error.message : 'Licensing storage is unavailable.', devices: [] };
  }
}

export async function replacePurchasedDevice(licenseKey: string, targetDeviceId: string, newDeviceId: string, newDeviceName: string): Promise<AuthorizationResult> {
  if (isLocalTestMode()) {
    const result = await LicenseStore.replace(licenseKey, targetDeviceId, newDeviceId, newDeviceName);
    const normalized = fromLocalStore({ authorized: result.success, reason: result.reason, activeDevices: [] });
    return normalized.authorized ? asAuthorized(licenseKey, newDeviceId, normalized) : normalized;
  }
  const entitlement = await verifyEntitlement(licenseKey);
  if (!entitlement.valid) return { authorized: false, unavailable: entitlement.unavailable, reason: entitlement.reason, devices: [] };
  try {
    const result = await replaceRegisteredDevice(licenseKey, targetDeviceId, newDeviceId, newDeviceName);
    return result.authorized ? asAuthorized(licenseKey, newDeviceId, result) : result;
  } catch (error) {
    return { authorized: false, unavailable: true, reason: error instanceof Error ? error.message : 'Licensing storage is unavailable.', devices: [] };
  }
}

export async function getPurchasedLicenseStatus(licenseKey: string): Promise<AuthorizationResult> {
  if (isLocalTestMode()) {
    const result = await LicenseStore.getStatus(licenseKey);
    return { authorized: result.status === 'ACTIVE', devices: result.activeDevices };
  }
  const entitlement = await verifyEntitlement(licenseKey);
  if (!entitlement.valid) return { authorized: false, unavailable: entitlement.unavailable, reason: entitlement.reason, devices: [] };
  try {
    return await getRegisteredDevices(licenseKey);
  } catch (error) {
    return { authorized: false, unavailable: true, reason: error instanceof Error ? error.message : 'Licensing storage is unavailable.', devices: [] };
  }
}
