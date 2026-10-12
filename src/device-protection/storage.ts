import { DeviceAuthCache, DeviceProtectionState } from './types';
import { getOrCreateDeviceId, getOrCreateDeviceName } from './deviceId';

const CACHE_KEY = 'spendmic_device_auth_cache';

export class DeviceProtectionStorage {
  static getInitialCache(): DeviceAuthCache {
    return {
      state: 'UNKNOWN',
      licenseKey: null,
      deviceId: getOrCreateDeviceId(),
      deviceName: getOrCreateDeviceName(),
      lastVerifiedAt: null,
      activeDevices: [],
    };
  }

  static load(): DeviceAuthCache {
    const defaultCache = this.getInitialCache();
    if (typeof window === 'undefined' || !window.localStorage) {
      return defaultCache;
    }

    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) {
        return defaultCache;
      }

      const parsed = JSON.parse(raw) as Partial<DeviceAuthCache>;
      return {
        ...defaultCache,
        ...parsed,
        deviceId: parsed.deviceId || defaultCache.deviceId,
        deviceName: parsed.deviceName || defaultCache.deviceName,
        state: parsed.state || 'UNKNOWN',
      };
    } catch {
      return defaultCache;
    }
  }

  static save(updates: Partial<DeviceAuthCache>): DeviceAuthCache {
    const current = this.load();

    // CRITICAL SECURITY ENFORCEMENT:
    // If the device is currently BLOCKED on the same license, an offline/network error MUST NEVER downgrade or revert it to TEMPORARY_SERVER_UNAVAILABLE or PENDING_VERIFICATION
    let nextState: DeviceProtectionState = updates.state || current.state;
    const isNewLicense = !!updates.licenseKey && updates.licenseKey !== current.licenseKey;
    if (!isNewLicense && current.state === 'BLOCKED' && (nextState === 'TEMPORARY_SERVER_UNAVAILABLE' || nextState === 'PENDING_VERIFICATION')) {
      nextState = 'BLOCKED';
    }

    const nextCache: DeviceAuthCache = {
      ...current,
      ...updates,
      state: nextState,
    };

    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(nextCache));
      } catch {
        // Storage write error fallback
      }
    }

    return nextCache;
  }

  static clear(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.removeItem(CACHE_KEY);
      } catch {
        // Storage clear error fallback
      }
    }
  }
}
