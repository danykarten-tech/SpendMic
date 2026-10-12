import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LicenseStore } from '../api/lib/licenseStore';
import { createAuthorizationToken, verifyAuthorizationToken, isValidLicenseKey, isValidUUID } from '../api/lib/security';
import { transitionState } from '../src/device-protection/stateMachine';
import { DeviceProtectionStorage } from '../src/device-protection/storage';
import { DeviceProtectionApiClient } from '../src/device-protection/apiClient';
import { DeviceProtectionState } from '../src/device-protection/types';

describe('SpendMic Device Protection Suite', () => {
  beforeEach(() => {
    LicenseStore.clear();
    DeviceProtectionStorage.clear();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('Section 4: Atomic Two-Device Authorization Limit', () => {
    it('authorizes Device A and Device B, but rejects Device C when server is online', async () => {
      const licenseKey = 'SPM-TEST-1234-ABCD';
      const deviceA = '11111111-1111-4111-8111-111111111111';
      const deviceB = '22222222-2222-4222-8222-222222222222';
      const deviceC = '33333333-3333-4333-8333-333333333333';

      // 1. Device A activation
      const resA = await LicenseStore.activate(licenseKey, deviceA, 'MacBook Pro');
      expect(resA.authorized).toBe(true);
      expect(resA.activeDevices.length).toBe(1);

      // 2. Device B activation
      const resB = await LicenseStore.activate(licenseKey, deviceB, 'iPhone 15');
      expect(resB.authorized).toBe(true);
      expect(resB.activeDevices.length).toBe(2);

      // 3. Device C activation attempt (Slots full)
      const resC = await LicenseStore.activate(licenseKey, deviceC, 'Android Pixel');
      expect(resC.authorized).toBe(false);
      expect(resC.reason).toContain('maximum of 2 active devices');
      expect(resC.activeDevices.length).toBe(2);
    });

    it('enforces atomic concurrency so simultaneous activation attempts cannot create a third slot', async () => {
      const licenseKey = 'SPM-CONCURRENT-TEST';
      const device1 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
      const device2 = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
      const device3 = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

      // Trigger all 3 simultaneously
      const results = await Promise.all([
        LicenseStore.activate(licenseKey, device1, 'Client 1'),
        LicenseStore.activate(licenseKey, device2, 'Client 2'),
        LicenseStore.activate(licenseKey, device3, 'Client 3'),
      ]);

      const authorizedCount = results.filter((r) => r.authorized).length;
      const rejectedCount = results.filter((r) => !r.authorized).length;

      expect(authorizedCount).toBe(2);
      expect(rejectedCount).toBe(1);

      const status = await LicenseStore.getStatus(licenseKey);
      expect(status.activeDevices.length).toBe(2);
    });
  });

  describe('Section 5: Critical Rule — Server-Rejected Device C Stays Locked Offline', () => {
    it('persists BLOCKED state across offline mode, storage reloads, and network drops', () => {
      // 1. Device C begins with PENDING_VERIFICATION
      let state: DeviceProtectionState = 'PENDING_VERIFICATION';

      // 2. Server explicitly rejects Device C
      state = transitionState(state, {
        type: 'SERVER_REJECTED',
        reason: 'Maximum 2 devices reached',
      });
      expect(state).toBe('BLOCKED');

      // 3. Save to durable storage
      DeviceProtectionStorage.save({
        state: 'BLOCKED',
        licenseKey: 'SPM-TEST-1234',
        deviceId: '33333333-3333-4333-8333-333333333333',
        blockedReason: 'Maximum 2 devices reached',
      });

      // 4. Simulate internet turned OFF (network error / server unavailable)
      const offlineNextState = transitionState(state, { type: 'NETWORK_OFFLINE' });
      expect(offlineNextState).toBe('BLOCKED');

      const serverUnavailableState = transitionState(state, { type: 'SERVER_UNAVAILABLE' });
      expect(serverUnavailableState).toBe('BLOCKED');

      // 5. Simulate browser refresh / PWA reopen by reloading storage
      const reloadedCache = DeviceProtectionStorage.load();
      expect(reloadedCache.state).toBe('BLOCKED');

      // 6. Attempt saving an offline error update — storage layer MUST NOT allow downgrade to UNKNOWN or PENDING
      const postOfflineSave = DeviceProtectionStorage.save({ state: 'TEMPORARY_SERVER_UNAVAILABLE' });
      expect(postOfflineSave.state).toBe('BLOCKED');

      // 7. Re-check stored state
      expect(DeviceProtectionStorage.load().state).toBe('BLOCKED');
    });

    it('allows transition out of BLOCKED only upon explicit authoritative server authorization or replacement', () => {
      const currentState: DeviceProtectionState = 'BLOCKED';

      // Explicit server authorization
      const restoredState = transitionState(currentState, {
        type: 'SERVER_AUTHORIZED',
        token: 'valid.token',
      });
      expect(restoredState).toBe('AUTHORIZED');

      // User replacement
      const replacedState = transitionState(currentState, {
        type: 'USER_REPLACED_DEVICE',
        token: 'valid.replacement.token',
      });
      expect(replacedState).toBe('AUTHORIZED');
    });
  });

  describe('Section 6: Server Outage and Offline Resilience for Authorized Devices', () => {
    it('keeps authorized devices functioning in offline mode during server outage', () => {
      let stateA: DeviceProtectionState = 'AUTHORIZED';

      // Network drops / server unavailable
      stateA = transitionState(stateA, { type: 'SERVER_UNAVAILABLE' });
      expect(stateA).toBe('TEMPORARY_SERVER_UNAVAILABLE');

      // Network drop does NOT change it to BLOCKED
      expect(stateA).not.toBe('BLOCKED');

      // App re-initializes while still offline
      const reinit = transitionState(stateA, { type: 'APP_INITIALIZED', cachedState: 'TEMPORARY_SERVER_UNAVAILABLE' });
      expect(reinit).toBe('TEMPORARY_SERVER_UNAVAILABLE');

      // Server returns online
      const onlineRestored = transitionState(stateA, { type: 'SERVER_AUTHORIZED', token: 'token' });
      expect(onlineRestored).toBe('AUTHORIZED');
    });
  });

  describe('Section 7: Intentional Device Replacement Flow', () => {
    it('allows deliberate device replacement without exceeding the two-device limit', async () => {
      const licenseKey = 'SPM-REPLACE-TEST';
      const devA = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
      const devB = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb';
      const devC = 'cccccccc-3333-4333-8333-cccccccccccc';

      // Activate A & B
      await LicenseStore.activate(licenseKey, devA, 'Phone A');
      await LicenseStore.activate(licenseKey, devB, 'Laptop B');

      // Verify A and B are active
      let status = await LicenseStore.getStatus(licenseKey);
      expect(status.activeDevices.map((d) => d.deviceId)).toEqual([devA, devB]);

      // Attempt activating C -> Rejected
      const rejectC = await LicenseStore.activate(licenseKey, devC, 'New Tablet C');
      expect(rejectC.authorized).toBe(false);

      // Now intentionally replace Dev A with Dev C
      const replaceResult = await LicenseStore.replace(licenseKey, devA, devC, 'New Tablet C');
      expect(replaceResult.success).toBe(true);

      // Check authoritative server status: strictly 2 active devices (Dev B and Dev C)
      status = await LicenseStore.getStatus(licenseKey);
      expect(status.activeDevices.length).toBe(2);
      expect(status.activeDevices.map((d) => d.deviceId).sort()).toEqual([devB, devC].sort());

      // Confirm devA is now inactive/revoked
      const verifyA = await LicenseStore.verify(licenseKey, devA);
      expect(verifyA.authorized).toBe(false);
      expect(verifyA.reason).toContain('deactivated or replaced');
    });
  });

  describe('Section 3 & 11: Privacy and Token Integrity', () => {
    it('verifies HMAC-SHA256 authorization token creation and tamper rejection', () => {
      const licenseKey = 'SPM-PRIVACY-100';
      const deviceId = '99999999-9999-4999-8999-999999999999';

      const token = createAuthorizationToken(licenseKey, deviceId);
      expect(token).toBeDefined();

      // Valid verification
      const validCheck = verifyAuthorizationToken(token, licenseKey, deviceId);
      expect(validCheck.valid).toBe(true);

      // Tampered token check
      const tamperedToken = token.slice(0, -4) + 'abcd';
      const tamperedCheck = verifyAuthorizationToken(tamperedToken, licenseKey, deviceId);
      expect(tamperedCheck.valid).toBe(false);
      expect(tamperedCheck.reason).toBe('Invalid signature');

      // Wrong device ID check
      const wrongDevCheck = verifyAuthorizationToken(token, licenseKey, '00000000-0000-4000-8000-000000000000');
      expect(wrongDevCheck.valid).toBe(false);
      expect(wrongDevCheck.reason).toBe('Device ID mismatch');
    });

    it('confirms client API requests never include financial records or expense data', async () => {
      let interceptedBody: any = null;

      vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
        interceptedBody = JSON.parse(init?.body as string);
        return {
          status: 200,
          json: async () => ({ authorized: true, token: 'mock-token' }),
        } as Response;
      });

      await DeviceProtectionApiClient.activate(
        'SPM-SAMPLE-KEY',
        '12345678-1234-4234-8234-123456789abc',
        'Safari on Mac'
      );

      expect(interceptedBody).toBeDefined();
      expect(interceptedBody.licenseKey).toBe('SPM-SAMPLE-KEY');
      expect(interceptedBody.deviceId).toBe('12345678-1234-4234-8234-123456789abc');

      // Strict Privacy Audit: Ensure zero financial keys exist
      expect(interceptedBody.transactions).toBeUndefined();
      expect(interceptedBody.expenses).toBeUndefined();
      expect(interceptedBody.budgets).toBeUndefined();
      expect(interceptedBody.amounts).toBeUndefined();
      expect(interceptedBody.notes).toBeUndefined();
      expect(interceptedBody.accounts).toBeUndefined();
      expect(interceptedBody.balances).toBeUndefined();
    });
  });
});
