import React, { useState, useEffect, useCallback } from 'react';
import { DeviceAuthCache } from './types';
import { DeviceProtectionStorage } from './storage';
import { transitionState } from './stateMachine';
import { DeviceProtectionApiClient } from './apiClient';
import { DeviceProtectionContext, useDeviceProtection } from './context';
import { verifyOfflineAuthorizationToken } from './licenseToken';

export { useDeviceProtection };

// Local development is determined by Vite at build time. `npm run dev` is the
// only path that reaches this branch; Vite preview builds and Vercel builds set
// DEV to false. No environment value, URL, storage value, or user setting can
// turn this into a customer-build bypass.
const IS_LOCAL_DEVELOPMENT = import.meta.env.DEV;

export const DeviceProtectionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (IS_LOCAL_DEVELOPMENT) {
    return (
      <DeviceProtectionContext.Provider
        value={{
          state: 'AUTHORIZED',
          licenseKey: 'DEV-BYPASS',
          deviceId: 'local-dev',
          deviceName: 'Local Dev Device',
          isAuthorized: true,
          isBlocked: false,
          isPending: false,
          isTemporaryServerUnavailable: false,
          isUnactivated: false,
          lastVerifiedAt: new Date().toISOString(),
          blockedReason: undefined,
          activeDevices: [],
          activateLicense: async () => true,
          verifyDevice: async () => true,
          replaceDevice: async () => true,
          resetLicense: () => {},
        }}
      >
        {children}
      </DeviceProtectionContext.Provider>
    );
  }
  const [cache, setCache] = useState<DeviceAuthCache>(() => DeviceProtectionStorage.load());
  const [hasValidOfflineToken, setHasValidOfflineToken] = useState<boolean>(() => !import.meta.env.PROD);

  // Helper to update both in-memory state and persistent storage
  const updateCache = useCallback((updates: Partial<DeviceAuthCache>) => {
    setCache((prev) => {
      const saved = DeviceProtectionStorage.save({ ...prev, ...updates });
      return saved;
    });
  }, []);

  const verifyDevice = useCallback(async (): Promise<boolean> => {
    const current = DeviceProtectionStorage.load();
    if (!current.licenseKey) return false;

    // A BLOCKED device cannot verify itself unless through replacement or re-activation
    if (current.state === 'BLOCKED') {
      return false;
    }

    const res = await DeviceProtectionApiClient.verify(
      current.licenseKey,
      current.deviceId,
      current.token
    );

    if (res.success && res.authorized) {
      const nextState = transitionState(current.state, {
        type: 'SERVER_AUTHORIZED',
        token: res.token || current.token || '',
      });
      updateCache({
        state: nextState,
        token: res.token || current.token,
        lastVerifiedAt: new Date().toISOString(),
      });
      return true;
    }

    if (res.isNetworkError) {
      const nextState = transitionState(current.state, { type: 'SERVER_UNAVAILABLE' });
      updateCache({ state: nextState });
      return current.state === 'AUTHORIZED' || current.state === 'TEMPORARY_SERVER_UNAVAILABLE';
    }

    // Explicit server rejection
    const nextState = transitionState(current.state, {
      type: 'SERVER_REJECTED',
      reason: res.message,
    });
    updateCache({
      state: nextState,
      blockedReason: res.message || 'Device license was revoked by the server',
    });
    return false;
  }, [updateCache]);

  const activateLicense = useCallback(
    async (rawKey: string): Promise<boolean> => {
      const key = rawKey.trim().toUpperCase();
      const current = DeviceProtectionStorage.load();

      const isNewKey = key !== current.licenseKey;

      const res = await DeviceProtectionApiClient.activate(
        key,
        current.deviceId,
        current.deviceName
      );

      if (res.success && res.authorized) {
        const nextState = transitionState(isNewKey ? 'UNKNOWN' : current.state, {
          type: 'SERVER_AUTHORIZED',
          token: res.token || '',
          activeDevices: res.devices,
        });
        updateCache({
          state: nextState,
          licenseKey: key,
          token: res.token,
          lastVerifiedAt: new Date().toISOString(),
          blockedReason: undefined,
          activeDevices: res.devices || [],
        });
        return true;
      }

      if (res.isNetworkError) {
        // A new key is never trusted while offline. Previously authorized
        // devices retain offline access through verifyDevice(), not activation.
        return false;
      }

      // Explicit server rejection (e.g. 2-device limit exceeded)
      const nextState = transitionState(isNewKey ? 'UNKNOWN' : current.state, {
        type: 'SERVER_REJECTED',
        reason: res.message,
        activeDevices: res.devices,
      });
      updateCache({
        state: nextState,
        licenseKey: key,
        blockedReason: res.message || 'Device limit reached for this license',
        activeDevices: res.devices || [],
      });
      return false;
    },
    [updateCache]
  );

  const replaceDevice = useCallback(
    async (targetDeviceId: string): Promise<boolean> => {
      const current = DeviceProtectionStorage.load();
      if (!current.licenseKey) return false;

      const res = await DeviceProtectionApiClient.replace(
        current.licenseKey,
        targetDeviceId,
        current.deviceId,
        current.deviceName
      );

      if (res.success) {
        const nextState = transitionState(current.state, {
          type: 'USER_REPLACED_DEVICE',
          token: res.token || '',
        });
        updateCache({
          state: nextState,
          token: res.token,
          lastVerifiedAt: new Date().toISOString(),
          blockedReason: undefined,
        });
        return true;
      }

      return false;
    },
    [updateCache]
  );

  const resetLicense = useCallback(() => {
    DeviceProtectionStorage.clear();
    setCache(DeviceProtectionStorage.getInitialCache());
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!import.meta.env.PROD) {
      setHasValidOfflineToken(true);
      return undefined;
    }
    setHasValidOfflineToken(false);
    void verifyOfflineAuthorizationToken(cache.token).then((valid) => {
      if (!cancelled) setHasValidOfflineToken(valid);
    });
    return () => { cancelled = true; };
  }, [cache.token]);

  // Background verification on load and on reconnecting online
  useEffect(() => {
    const handleOnline = () => {
      const current = DeviceProtectionStorage.load();
      if (current.licenseKey) {
        if (current.state === 'PENDING_VERIFICATION') {
          activateLicense(current.licenseKey);
        } else if (current.state === 'AUTHORIZED' || current.state === 'TEMPORARY_SERVER_UNAVAILABLE') {
          verifyDevice();
        }
      }
    };

    window.addEventListener('online', handleOnline);

    // Initial check
    if (cache.licenseKey) {
      if (cache.state === 'PENDING_VERIFICATION') {
        activateLicense(cache.licenseKey);
      } else if (cache.state === 'AUTHORIZED' || cache.state === 'TEMPORARY_SERVER_UNAVAILABLE') {
        verifyDevice();
      }
    }

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [activateLicense, verifyDevice, cache.licenseKey, cache.state]);

  const isAuthorized = cache.state === 'AUTHORIZED' && hasValidOfflineToken;
  const isBlocked = cache.state === 'BLOCKED' || cache.state === 'REPLACEMENT_REQUIRED';
  const isPending = cache.state === 'PENDING_VERIFICATION';
  const isTemporaryServerUnavailable = cache.state === 'TEMPORARY_SERVER_UNAVAILABLE';
  const isUnactivated = !cache.licenseKey || cache.state === 'UNKNOWN' || !hasValidOfflineToken;

  return (
    <DeviceProtectionContext.Provider
      value={{
        state: cache.state,
        licenseKey: cache.licenseKey,
        deviceId: cache.deviceId,
        deviceName: cache.deviceName,
        isAuthorized,
        isBlocked,
        isPending,
        isTemporaryServerUnavailable,
        isUnactivated,
        lastVerifiedAt: cache.lastVerifiedAt,
        blockedReason: cache.blockedReason,
        activeDevices: cache.activeDevices || [],
        activateLicense,
        verifyDevice,
        replaceDevice,
        resetLicense,
      }}
    >
      {children}
    </DeviceProtectionContext.Provider>
  );
};
