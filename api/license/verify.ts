import { LicenseStore } from '../lib/licenseStore';
import { isValidLicenseKey, isValidUUID, verifyAuthorizationToken, createAuthorizationToken } from '../lib/security';

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ authorized: false, message: 'Method Not Allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const { licenseKey, deviceId, token } = body;

    if (!licenseKey || !isValidLicenseKey(licenseKey)) {
      return res.status(400).json({
        authorized: false,
        state: 'BLOCKED',
        message: 'Invalid license key format',
      });
    }

    if (!deviceId || !isValidUUID(deviceId)) {
      return res.status(400).json({
        authorized: false,
        state: 'BLOCKED',
        message: 'Invalid device ID format',
      });
    }

    // Check backend store
    const storeResult = await LicenseStore.verify(licenseKey, deviceId);

    if (storeResult.authorized) {
      // Re-issue fresh token
      const newToken = createAuthorizationToken(licenseKey, deviceId);
      return res.status(200).json({
        authorized: true,
        state: 'AUTHORIZED',
        token: newToken,
        serverTime: new Date().toISOString(),
      });
    }

    // If store says device is deactivated or missing, but client provided a token: verify token signature
    if (token) {
      const tokenVerification = verifyAuthorizationToken(token, licenseKey, deviceId);
      if (!tokenVerification.valid) {
        return res.status(403).json({
          authorized: false,
          state: 'BLOCKED',
          message: 'Authorization token invalid or revoked',
          serverTime: new Date().toISOString(),
        });
      }
    }

    return res.status(403).json({
      authorized: false,
      state: 'BLOCKED',
      message: storeResult.reason || 'Device is not authorized on this license',
      serverTime: new Date().toISOString(),
    });
  } catch {
    return res.status(500).json({
      authorized: false,
      state: 'TEMPORARY_SERVER_UNAVAILABLE',
      message: 'Server error processing verification request',
      serverTime: new Date().toISOString(),
    });
  }
}
