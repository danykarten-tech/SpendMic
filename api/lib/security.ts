import crypto from 'crypto';

const DEFAULT_DEV_SECRET = 'spendmic-dev-signing-secret-do-not-use-in-production-3849';

export function getSigningSecret(): string {
  return process.env.LICENSE_SECRET_KEY || DEFAULT_DEV_SECRET;
}

export function isValidUUID(id: string): boolean {
  if (!id || typeof id !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

export function isValidLicenseKey(key: string): boolean {
  if (!key || typeof key !== 'string') return false;
  const sanitized = key.trim().toUpperCase();
  // Format: SPM-XXXX-XXXX-XXXX or alphanumeric 10-32 characters
  return /^[A-Z0-9-]{8,32}$/.test(sanitized);
}

export interface TokenPayload {
  licenseKey: string;
  deviceId: string;
  authorized: boolean;
  issuedAt: number;
  expiresAt: number;
}

export function createAuthorizationToken(licenseKey: string, deviceId: string, durationMs: number = 30 * 24 * 60 * 60 * 1000): string {
  const payload: TokenPayload = {
    licenseKey: licenseKey.trim().toUpperCase(),
    deviceId,
    authorized: true,
    issuedAt: Date.now(),
    expiresAt: Date.now() + durationMs,
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const secret = getSigningSecret();
  const signature = crypto.createHmac('sha256', secret).update(payloadB64).digest('base64url');

  return `${payloadB64}.${signature}`;
}

export function verifyAuthorizationToken(token: string, expectedLicenseKey?: string, expectedDeviceId?: string): { valid: boolean; payload?: TokenPayload; reason?: string } {
  if (!token || typeof token !== 'string') {
    return { valid: false, reason: 'Missing or invalid token format' };
  }

  const parts = token.split('.');
  if (parts.length !== 2) {
    return { valid: false, reason: 'Malformed token structure' };
  }

  const [payloadB64, signature] = parts;
  const secret = getSigningSecret();
  const expectedSignature = crypto.createHmac('sha256', secret).update(payloadB64).digest('base64url');

  const sigBuffer = Buffer.from(signature);
  const expectedSigBuffer = Buffer.from(expectedSignature);

  if (sigBuffer.length !== expectedSigBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedSigBuffer)) {
    return { valid: false, reason: 'Invalid signature' };
  }

  try {
    const payload: TokenPayload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    if (payload.expiresAt < Date.now()) {
      return { valid: false, reason: 'Token has expired' };
    }
    if (expectedLicenseKey && payload.licenseKey !== expectedLicenseKey.trim().toUpperCase()) {
      return { valid: false, reason: 'License key mismatch' };
    }
    if (expectedDeviceId && payload.deviceId !== expectedDeviceId) {
      return { valid: false, reason: 'Device ID mismatch' };
    }
    return { valid: true, payload };
  } catch {
    return { valid: false, reason: 'Corrupt token payload' };
  }
}
