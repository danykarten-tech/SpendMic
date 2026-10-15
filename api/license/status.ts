import { isValidLicenseKey } from '../lib/security';
import { getPurchasedLicenseStatus } from '../lib/licenseService';
import { applyCors } from '../lib/requestSecurity';

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  if (!applyCors(req, res, 'POST, OPTIONS')) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const { licenseKey } = body;

    if (!licenseKey || !isValidLicenseKey(licenseKey)) {
      return res.status(400).json({ message: 'Invalid or missing license key' });
    }

    const info = await getPurchasedLicenseStatus(licenseKey);

    if (info.unavailable) {
      return res.status(503).json({ message: info.reason || 'Licensing service is temporarily unavailable.' });
    }

    if (!info.authorized && info.reason) {
      return res.status(403).json({ message: info.reason });
    }

    return res.status(200).json({
      status: info.authorized ? 'ACTIVE' : 'REVOKED',
      activeDeviceCount: info.devices.length,
      maxDevices: 2,
      devices: info.devices,
    });
  } catch {
    return res.status(500).json({ message: 'Server error retrieving status' });
  }
}
