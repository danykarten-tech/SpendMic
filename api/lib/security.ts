import crypto from 'crypto';

const DEFAULT_DEV_SECRET = 'spendmic-dev-signing-secret-do-not-use-in-production-3849';

export function getSigningSecret(): string {
  if (process.env.LICENSE_SECRET_KEY) return process.env.LICENSE_SECRET_KEY;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('LICENSE_SECRET_KEY must be configured in production.');
  }
  return DEFAULT_DEV_SECRET;
}

function getPrivateSigningKey(): string | null {
  const key = process.env.LICENSE_PRIVATE_KEY;
  if (key) return key.replace(/\\n/g, '\n');
  if (process.env.NODE_ENV === 'production') {
    throw new Error('LICENSE_PRIVATE_KEY must be configured in production.');
  }
  return null;
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
  const privateKey = getPrivateSigningKey();
  // HMAC remains available only for local development and existing unit tests.
  // Production tokens are Ed25519 signed and verified in the PWA with its public key.
  const signature = privateKey
    ? crypto.sign(null, Buffer.from(payloadB64), privateKey).toString('base64url')
    : crypto.createHmac('sha256', getSigningSecret()).update(payloadB64).digest('base64url');

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
  const privateKey = getPrivateSigningKey();
  const validSignature = privateKey
    ? crypto.verify(null, Buffer.from(payloadB64), crypto.createPublicKey(privateKey), Buffer.from(signature, 'base64url'))
    : (() => {
      const expected = crypto.createHmac('sha256', getSigningSecret()).update(payloadB64).digest('base64url');
      const actualBuffer = Buffer.from(signature);
      const expectedBuffer = Buffer.from(expected);
      return actualBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(actualBuffer, expectedBuffer);
    })();
  if (!validSignature) return { valid: false, reason: 'Invalid signature' };

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
