import { RegisteredDevice } from './types';

export interface ActivateApiResult {
  success: boolean;
  authorized: boolean;
  token?: string;
  message?: string;
  isNetworkError?: boolean;
  devices?: RegisteredDevice[];
}

export interface VerifyApiResult {
  success: boolean;
  authorized: boolean;
  token?: string;
  message?: string;
  isNetworkError?: boolean;
}

export interface ReplaceApiResult {
  success: boolean;
  token?: string;
  message?: string;
  isNetworkError?: boolean;
}

export class DeviceProtectionApiClient {
  private static async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Helper that retries fetch on network errors up to maxRetries with exponential backoff
   */
  private static async fetchWithBackoff(
    url: string,
    options: RequestInit,
    maxRetries: number = 2
  ): Promise<Response> {
    let attempt = 0;
    let delay = 500;

    while (attempt <= maxRetries) {
      try {
        const response = await fetch(url, options);
        return response;
      } catch (err) {
        attempt++;
        if (attempt > maxRetries) {
          throw err;
        }
        await this.sleep(delay);
        delay *= 2;
      }
    }
    throw new Error('Network request failed');
  }

  /**
   * Activate device on a license
   * PRIVACY GUARANTEE: Never sends expense, balance, or user financial data.
   */
  static async activate(
    licenseKey: string,
    deviceId: string,
    deviceName: string,
    appVersion: string = '1.0.0'
  ): Promise<ActivateApiResult> {
    try {
      const response = await this.fetchWithBackoff('/api/license/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          licenseKey: licenseKey.trim().toUpperCase(),
          deviceId,
          deviceName,
          appVersion,
        }),
      });

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        return {
          success: false,
          authorized: false,
          isNetworkError: true,
          message: 'Licensing server temporarily unavailable',
        };
      }

      const data = await response.json().catch(() => null);
      if (!data) {
        return {
          success: false,
          authorized: false,
          isNetworkError: true,
          message: 'Failed to parse licensing response',
        };
      }

      if (response.status === 200 && data.authorized) {
        return {
          success: true,
          authorized: true,
          token: data.token,
          devices: data.devices || [],
        };
      }

      // Explicit server rejection ONLY when server explicitly returns 403 or state === 'BLOCKED'
      if ((response.status === 403 || response.status === 400) && data.state === 'BLOCKED') {
        return {
          success: true,
          authorized: false,
          message: data.message || 'Device limit reached for this license.',
          devices: data.devices || [],
        };
      }

      // Any other HTTP code (401, 404, 500, etc.) is a server/network error
      return {
        success: false,
        authorized: false,
        isNetworkError: true,
        message: data.message || `Licensing server returned status ${response.status}`,
      };
    } catch {
      // Server down, network offline, timeout
      return {
        success: false,
        authorized: false,
        isNetworkError: true,
        message: 'Licensing server is temporarily unreachable',
      };
    }
  }

  /**
   * Verify device status
   */
  static async verify(
    licenseKey: string,
    deviceId: string,
    token?: string
  ): Promise<VerifyApiResult> {
    try {
      const response = await this.fetchWithBackoff('/api/license/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          licenseKey: licenseKey.trim().toUpperCase(),
          deviceId,
          token,
        }),
      });

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        return {
          success: false,
          authorized: false,
          isNetworkError: true,
          message: 'Licensing server temporarily unavailable',
        };
      }

      const data = await response.json().catch(() => null);
      if (!data) {
        return {
          success: false,
          authorized: false,
          isNetworkError: true,
          message: 'Failed to parse licensing response',
        };
      }

      if (response.status === 200 && data.authorized) {
        return {
          success: true,
          authorized: true,
          token: data.token,
        };
      }

      if ((response.status === 403 || response.status === 400) && data.state === 'BLOCKED') {
        return {
          success: true,
          authorized: false,
          message: data.message || 'Device revoked or limit reached',
        };
      }

      return {
        success: false,
        authorized: false,
        isNetworkError: true,
        message: data.message || 'Verification endpoint unavailable',
      };
    } catch {
      return {
        success: false,
        authorized: false,
        isNetworkError: true,
        message: 'Licensing server is unreachable',
      };
    }
  }

  /**
   * Replace an active device
   */
  static async replace(
    licenseKey: string,
    targetDeviceId: string,
    newDeviceId: string,
    newDeviceName: string
  ): Promise<ReplaceApiResult> {
    try {
      const response = await this.fetchWithBackoff('/api/license/replace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          licenseKey: licenseKey.trim().toUpperCase(),
          targetDeviceId,
          newDeviceId,
          newDeviceName,
        }),
      });

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        return {
          success: false,
          isNetworkError: true,
          message: 'Licensing server temporarily unavailable',
        };
      }

      const data = await response.json().catch(() => null);
      if (!data) {
        return {
          success: false,
          isNetworkError: true,
          message: 'Invalid response from server',
        };
      }

      if (response.status === 200 && data.success) {
        return {
          success: true,
          token: data.token,
          message: data.message,
        };
      }

      return {
        success: false,
        message: data.message || 'Failed to replace device',
      };
    } catch {
      return {
        success: false,
        isNetworkError: true,
        message: 'Server unreachable during replacement',
      };
    }
  }
}
