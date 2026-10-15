import { isValidLicenseKey, isValidUUID } from '../lib/security';
import { replacePurchasedDevice } from '../lib/licenseService';
import { applyCors, isSafeDeviceName } from '../lib/requestSecurity';

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  if (!applyCors(req, res, 'POST, OPTIONS')) return;

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

    if (newDeviceName !== undefined && !isSafeDeviceName(newDeviceName)) {
      return res.status(400).json({ success: false, message: 'Invalid device name' });
    }

    const result = await replacePurchasedDevice(licenseKey, targetDeviceId, newDeviceId, newDeviceName?.trim() || 'Browser Device');

    if (result.authorized) {
      return res.status(200).json({
        success: true,
        state: 'AUTHORIZED',
        token: result.token,
        message: 'Device successfully replaced and authorized',
      });
    }

    if (result.unavailable) {
      return res.status(503).json({
        success: false,
        state: 'TEMPORARY_SERVER_UNAVAILABLE',
        message: result.reason || 'Licensing service is temporarily unavailable.',
      });
    }

    return res.status(400).json({
        success: false,
        state: 'BLOCKED',
        message: result.reason || 'Could not replace device',
      });
  } catch {
    return res.status(500).json({
      success: false,
      state: 'TEMPORARY_SERVER_UNAVAILABLE',
      message: 'Server error processing device replacement',
    });
  }
}
