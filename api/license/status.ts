import { isValidLicenseKey } from '../lib/security';
import { getPurchasedLicenseStatus } from '../lib/licenseService';

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { key } = req.query || {};

    if (!key || !isValidLicenseKey(key)) {
      return res.status(400).json({ message: 'Invalid or missing license key' });
    }

    const info = await getPurchasedLicenseStatus(key);

    if (info.unavailable) {
      return res.status(503).json({ message: info.reason || 'Licensing service is temporarily unavailable.' });
    }

    if (!info.authorized && info.reason) {
      return res.status(403).json({ message: info.reason });
    }

    return res.status(200).json({
      licenseKey: key,
      status: info.authorized ? 'ACTIVE' : 'REVOKED',
      activeDeviceCount: info.devices.length,
      maxDevices: 2,
      devices: info.devices,
    });
  } catch {
    return res.status(500).json({ message: 'Server error retrieving status' });
  }
}
