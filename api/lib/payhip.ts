import crypto from 'crypto';

export interface PayhipLicenseResult {
  valid: boolean;
  unavailable?: boolean;
  buyerEmail?: string;
  reason?: string;
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
  const expectedProduct = process.env.PAYHIP_PRODUCT_LINK;

  if (!secret || !expectedProduct) {
    return { valid: false, unavailable: true, reason: 'Licensing service is not configured yet.' };
  }

  try {
    const response = await fetch(
      `https://payhip.com/api/v2/license/verify?license_key=${encodeURIComponent(licenseKey)}`,
      { headers: { 'product-secret-key': secret, accept: 'application/json' } }
    );

    if (!response.ok) {
      // Payhip uses an empty/failed response for an unknown key. It is not a
      // temporary outage unless the response itself is a server failure.
      return response.status >= 500
        ? { valid: false, unavailable: true, reason: 'Purchase verification is temporarily unavailable.' }
        : { valid: false, reason: 'This license key is not valid.' };
    }

    const payload = await response.json().catch(() => null) as { data?: { enabled?: boolean; product_link?: string; buyer_email?: string } } | null;
    const data = payload?.data;
    if (!data || data.enabled !== true || data.product_link !== expectedProduct) {
      return { valid: false, reason: 'This license key is inactive or is for a different product.' };
    }

    return { valid: true, buyerEmail: data.buyer_email };
  } catch {
    return { valid: false, unavailable: true, reason: 'Purchase verification is temporarily unavailable.' };
  }
}

/** Owner access is deliberately separate from Payhip and only configured on the server. */
export function isConfiguredOwnerKey(licenseKey: string): boolean {
  const ownerKey = process.env.SPENDMIC_OWNER_LICENSE_KEY;
  return Boolean(ownerKey && secureEquals(licenseKey.trim().toUpperCase(), ownerKey.trim().toUpperCase()));
}
