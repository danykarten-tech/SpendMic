import fs from 'fs';
import path from 'path';
import { LicenseRecord, DeviceRegistration } from './types';

const MAX_ACTIVE_DEVICES = 2;

// In-memory registry fallback for test and serverless ephemeral environments
const memoryStore = new Map<string, LicenseRecord>();

// File storage path: use /tmp in Vercel serverless (writable), .data in local development
const isVercel = !!process.env.VERCEL;
const DATA_DIR = isVercel ? '/tmp' : path.resolve(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'license-db.json');

function ensureDataDir(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch {
    // Ignore in read-only filesystems (e.g. AWS Lambda / Vercel serverless read-only root)
  }
}

function loadFromFile(): void {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const data = JSON.parse(raw);
      if (Array.isArray(data)) {
        for (const record of data) {
          memoryStore.set(record.licenseKey, record);
        }
      }
    }
  } catch {
    // Read error fallback
  }
}

function saveToFile(): void {
  try {
    ensureDataDir();
    const data = Array.from(memoryStore.values());
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch {
    // Ignore in serverless environments where local filesystem might be read-only
  }
}

// Initial load
loadFromFile();

// Simple lock mutex to prevent race conditions during concurrent activations
let storeMutex = Promise.resolve();

async function withLock<T>(fn: () => Promise<T> | T): Promise<T> {
  const currentLock = storeMutex;
  let release: () => void;
  const nextLock = new Promise<void>((resolve) => {
    release = resolve;
  });
  storeMutex = currentLock.then(() => nextLock);
  await currentLock;
  try {
    return await fn();
  } finally {
    release!();
  }
}

export class LicenseStore {
  /**
   * Reset store (used in automated testing)
   */
  static clear(): void {
    memoryStore.clear();
    try {
      if (fs.existsSync(DATA_FILE)) {
        fs.unlinkSync(DATA_FILE);
      }
    } catch {
      // Ignored
    }
  }

  /**
   * Seed a test license if not present
   */
  static getOrCreateLicense(key: string): LicenseRecord {
    const normalizedKey = key.trim().toUpperCase();
    let record = memoryStore.get(normalizedKey);
    if (!record) {
      record = {
        licenseKey: normalizedKey,
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        devices: [],
      };
      memoryStore.set(normalizedKey, record);
      saveToFile();
    }
    return record;
  }

  /**
   * Atomically activate a device for a license
   */
  static async activate(
    key: string,
    deviceId: string,
    deviceName: string = 'Browser Device',
    appVersion: string = '1.0.0'
  ): Promise<{
    authorized: boolean;
    reason?: string;
    activeDevices: Array<{ deviceId: string; deviceName: string; activatedAt: string }>;
  }> {
    return withLock(async () => {
      const normalizedKey = key.trim().toUpperCase();
      const license = this.getOrCreateLicense(normalizedKey);

      if (license.status !== 'ACTIVE') {
        return {
          authorized: false,
          reason: `License is ${license.status.toLowerCase()}`,
          activeDevices: [],
        };
      }

      // Check if this device is already registered
      const existing = license.devices.find((d) => d.deviceId === deviceId);
      const activeDevices = license.devices.filter((d) => d.isActive);

      if (existing) {
        if (existing.isActive) {
          existing.lastVerifiedAt = new Date().toISOString();
          existing.deviceName = deviceName || existing.deviceName;
          saveToFile();
          return {
            authorized: true,
            activeDevices: activeDevices.map((d) => ({
              deviceId: d.deviceId,
              deviceName: d.deviceName,
              activatedAt: d.activatedAt,
            })),
          };
        } else {
          // Previously revoked
          return {
            authorized: false,
            reason: 'This device was replaced or deactivated',
            activeDevices: activeDevices.map((d) => ({
              deviceId: d.deviceId,
              deviceName: d.deviceName,
              activatedAt: d.activatedAt,
            })),
          };
        }
      }

      // Device is new: enforce 2-device limit
      if (activeDevices.length >= MAX_ACTIVE_DEVICES) {
        return {
          authorized: false,
          reason: `License permits a maximum of ${MAX_ACTIVE_DEVICES} active devices.`,
          activeDevices: activeDevices.map((d) => ({
            deviceId: d.deviceId,
            deviceName: d.deviceName,
            activatedAt: d.activatedAt,
          })),
        };
      }

      // Slot is available: register
      const newReg: DeviceRegistration = {
        deviceId,
        deviceName,
        activatedAt: new Date().toISOString(),
        lastVerifiedAt: new Date().toISOString(),
        appVersion,
        isActive: true,
      };

      license.devices.push(newReg);
      saveToFile();

      const currentActive = license.devices.filter((d) => d.isActive);
      return {
        authorized: true,
        activeDevices: currentActive.map((d) => ({
          deviceId: d.deviceId,
          deviceName: d.deviceName,
          activatedAt: d.activatedAt,
        })),
      };
    });
  }

  /**
   * Verify an existing device
   */
  static async verify(
    key: string,
    deviceId: string
  ): Promise<{
    authorized: boolean;
    reason?: string;
    isActive: boolean;
  }> {
    return withLock(async () => {
      const normalizedKey = key.trim().toUpperCase();
      const license = memoryStore.get(normalizedKey);

      if (!license) {
        return { authorized: false, reason: 'License not found', isActive: false };
      }

      if (license.status !== 'ACTIVE') {
        return { authorized: false, reason: `License is ${license.status.toLowerCase()}`, isActive: false };
      }

      const dev = license.devices.find((d) => d.deviceId === deviceId);
      if (!dev) {
        return { authorized: false, reason: 'Device is not registered with this license', isActive: false };
      }

      if (!dev.isActive) {
        return { authorized: false, reason: 'Device was deactivated or replaced', isActive: false };
      }

      dev.lastVerifiedAt = new Date().toISOString();
      saveToFile();

      return { authorized: true, isActive: true };
    });
  }

  /**
   * Atomically replace an active device with a new device
   */
  static async replace(
    key: string,
    targetDeviceId: string,
    newDeviceId: string,
    newDeviceName: string = 'Replacement Device'
  ): Promise<{
    success: boolean;
    reason?: string;
  }> {
    return withLock(async () => {
      const normalizedKey = key.trim().toUpperCase();
      const license = memoryStore.get(normalizedKey);

      if (!license) {
        return { success: false, reason: 'License not found' };
      }

      const target = license.devices.find((d) => d.deviceId === targetDeviceId);
      if (!target || !target.isActive) {
        return { success: false, reason: 'Target device to replace is not an active authorized device' };
      }

      // Revoke target
      target.isActive = false;

      // Check if new device already exists in records
      let newDevice = license.devices.find((d) => d.deviceId === newDeviceId);
      if (newDevice) {
        newDevice.isActive = true;
        newDevice.lastVerifiedAt = new Date().toISOString();
        if (newDeviceName) newDevice.deviceName = newDeviceName;
      } else {
        newDevice = {
          deviceId: newDeviceId,
          deviceName: newDeviceName,
          activatedAt: new Date().toISOString(),
          lastVerifiedAt: new Date().toISOString(),
          isActive: true,
        };
        license.devices.push(newDevice);
      }

      // Enforce post-condition: strictly <= MAX_ACTIVE_DEVICES
      const activeCount = license.devices.filter((d) => d.isActive).length;
      if (activeCount > MAX_ACTIVE_DEVICES) {
        // Rollback
        target.isActive = true;
        newDevice.isActive = false;
        return { success: false, reason: 'Safety violation: active devices exceeded limit during replacement' };
      }

      saveToFile();
      return { success: true };
    });
  }

  /**
   * Get active status and devices for a license
   */
  static async getStatus(key: string): Promise<{
    found: boolean;
    status: string;
    activeDevices: Array<{ deviceId: string; deviceName: string; activatedAt: string }>;
  }> {
    return withLock(async () => {
      const normalizedKey = key.trim().toUpperCase();
      const license = memoryStore.get(normalizedKey);

      if (!license) {
        return { found: false, status: 'NOT_FOUND', activeDevices: [] };
      }

      const active = license.devices
        .filter((d) => d.isActive)
        .map((d) => ({
          deviceId: d.deviceId,
          deviceName: d.deviceName,
          activatedAt: d.activatedAt,
        }));

      return {
        found: true,
        status: license.status,
        activeDevices: active,
      };
    });
  }
}
