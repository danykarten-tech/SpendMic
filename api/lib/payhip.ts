import crypto from 'crypto';

export interface PayhipLicenseResult {
  valid: boolean;
  unavailable?: boolean;
  buyerEmail?: string;
  reason?: string;
}

interface PayhipLicensePayload {
  enabled: boolean;
  product_link: string;
  license_key: string;
  buyer_email?: string;
}

function secureEquals(a: string, b: string): boolean {
  const aHash = crypto.createHash('sha256').update(a).digest();
  const bHash = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(aHash, bHash);
}

/**
 * Verifies a Payhip key from the server only. PAYHIP_PRODUCT_SECRET_KEY must
 * never be prefixed with VITE_ or otherwise exposed to the browser.
 */
export async function verifyPayhipLicense(licenseKey: string): Promise<PayhipLicenseResult> {
  const secret = process.env.PAYHIP_PRODUCT_SECRET_KEY;
  // Despite the legacy variable name, this must be Payhip's product *key*
  // (the value returned as data.product_link), not a public checkout URL.
  const expectedProduct = process.env.PAYHIP_PRODUCT_LINK;

  if (!secret || !expectedProduct) {
    return { valid: false, unavailable: true, reason: 'Licensing service is not configured yet.' };
  }

  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const normalizedKey = licenseKey.trim().toUpperCase();
    const controller = new AbortController();
    timeout = setTimeout(() => controller.abort(), 8_000);
    const response = await fetch(
      `https://payhip.com/api/v2/license/verify?license_key=${encodeURIComponent(normalizedKey)}`,
      {
        headers: { 'product-secret-key': secret, accept: 'application/json' },
        signal: controller.signal,
      }
    );
    clearTimeout(timeout);
    timeout = undefined;

    if (!response.ok) {
      // Payhip uses an empty/failed response for an unknown key. It is not a
      // temporary outage unless the response itself is a server failure.
      return response.status >= 500
        ? { valid: false, unavailable: true, reason: 'Purchase verification is temporarily unavailable.' }
        : { valid: false, reason: 'This license key is not valid.' };
    }

    const payload = await response.json().catch(() => null) as { data?: unknown } | null;
    const candidate = payload?.data;
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
      return { valid: false, reason: 'The purchase verification response was invalid.' };
    }

    const data = candidate as Partial<PayhipLicensePayload>;
    if (
      data.enabled !== true ||
      typeof data.product_link !== 'string' ||
      data.product_link !== expectedProduct ||
      typeof data.license_key !== 'string' ||
      data.license_key.trim().toUpperCase() !== normalizedKey
    ) {
      return { valid: false, reason: 'This license key is inactive or is for a different product.' };
    }

    return {
      valid: true,
      buyerEmail: typeof data.buyer_email === 'string' ? data.buyer_email : undefined,
    };
  } catch {
    return { valid: false, unavailable: true, reason: 'Purchase verification is temporarily unavailable.' };
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

/** Owner access is deliberately separate from Payhip and only configured on the server. */
export function isConfiguredOwnerKey(licenseKey: string): boolean {
  const ownerKey = process.env.SPENDMIC_OWNER_LICENSE_KEY;
  return Boolean(ownerKey && secureEquals(licenseKey.trim().toUpperCase(), ownerKey.trim().toUpperCase()));
}
