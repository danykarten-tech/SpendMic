import { LicenseStore } from '../lib/licenseStore';
import { isValidLicenseKey, isValidUUID, createAuthorizationToken } from '../lib/security';

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const { licenseKey, targetDeviceId, newDeviceId, newDeviceName } = body;

    if (!licenseKey || !isValidLicenseKey(licenseKey)) {
      return res.status(400).json({ success: false, message: 'Invalid license key format' });
    }

    if (!targetDeviceId || !isValidUUID(targetDeviceId)) {
      return res.status(400).json({ success: false, message: 'Invalid target device ID' });
    }

    if (!newDeviceId || !isValidUUID(newDeviceId)) {
      return res.status(400).json({ success: false, message: 'Invalid new device ID' });
    }

    const result = await LicenseStore.replace(licenseKey, targetDeviceId, newDeviceId, newDeviceName);

    if (result.success) {
      const token = createAuthorizationToken(licenseKey, newDeviceId);
      return res.status(200).json({
        success: true,
        state: 'AUTHORIZED',
        token,
        message: 'Device successfully replaced and authorized',
      });
    } else {
      return res.status(400).json({
        success: false,
        state: 'BLOCKED',
        message: result.reason || 'Could not replace device',
      });
    }
  } catch {
    return res.status(500).json({
      success: false,
      state: 'TEMPORARY_SERVER_UNAVAILABLE',
      message: 'Server error processing device replacement',
    });
  }
}
