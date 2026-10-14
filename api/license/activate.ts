import { isValidLicenseKey, isValidUUID } from '../lib/security';
import { activatePurchasedLicense } from '../lib/licenseService';

export default async function handler(req: any, res: any) {
  // CORS & headers
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
    const { licenseKey, deviceId, deviceName, appVersion } = body;

    // Strict validation
    if (!licenseKey || !isValidLicenseKey(licenseKey)) {
      return res.status(400).json({
        authorized: false,
        state: 'BLOCKED',
        message: 'Invalid or missing license key format',
      });
    }

    if (!deviceId || !isValidUUID(deviceId)) {
      return res.status(400).json({
        authorized: false,
        state: 'BLOCKED',
        message: 'Invalid or missing device UUID',
      });
    }

    const result = await activatePurchasedLicense({
      licenseKey,
      deviceId,
      deviceName: deviceName || 'Browser Device',
      appVersion: appVersion || '1.0.0',
    });

    if (result.authorized) {
      return res.status(200).json({
        authorized: true,
        state: 'AUTHORIZED',
        token: result.token,
        devices: result.devices,
      });
    }

    if (result.unavailable) {
      return res.status(503).json({
        authorized: false,
        state: 'TEMPORARY_SERVER_UNAVAILABLE',
        message: result.reason || 'Licensing service is temporarily unavailable.',
      });
    }

    return res.status(403).json({
        authorized: false,
        state: 'BLOCKED',
        message: result.reason || 'This license could not be activated.',
        devices: result.devices,
      });
  } catch (err: any) {
    return res.status(500).json({
      authorized: false,
      state: 'TEMPORARY_SERVER_UNAVAILABLE',
      message: 'Server error processing activation request',
    });
  }
}
