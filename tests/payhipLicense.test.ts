import { afterEach, describe, expect, it, vi } from 'vitest';
import { isConfiguredOwnerKey, verifyPayhipLicense } from '../api/lib/payhip';

const originalEnvironment = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnvironment };
  vi.unstubAllGlobals();
});

describe('Payhip server-side license verification', () => {
  it('does not authorize when Payhip configuration is absent', async () => {
    delete process.env.PAYHIP_PRODUCT_SECRET_KEY;
    delete process.env.PAYHIP_PRODUCT_LINK;

    await expect(verifyPayhipLicense('SPM-TEST-1234')).resolves.toMatchObject({ valid: false, unavailable: true });
  });

  it('authorizes only an enabled key for the configured product', async () => {
    process.env.PAYHIP_PRODUCT_SECRET_KEY = 'server-only-secret';
    process.env.PAYHIP_PRODUCT_LINK = 'spendmic-product';
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      data: { enabled: true, product_link: 'spendmic-product', buyer_email: 'buyer@example.test' },
    }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(verifyPayhipLicense('SPM-PAID-1234')).resolves.toEqual({ valid: true, buyerEmail: 'buyer@example.test' });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('license_key=SPM-PAID-1234'),
      expect.objectContaining({ headers: expect.objectContaining({ 'product-secret-key': 'server-only-secret' }) })
    );
  });

  it('rejects a key for another product or a disabled purchase', async () => {
    process.env.PAYHIP_PRODUCT_SECRET_KEY = 'server-only-secret';
    process.env.PAYHIP_PRODUCT_LINK = 'spendmic-product';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      data: { enabled: false, product_link: 'another-product' },
    }), { status: 200 })));

    await expect(verifyPayhipLicense('SPM-NOT-PAID-1234')).resolves.toMatchObject({
      valid: false,
      reason: 'This license key is inactive or is for a different product.',
    });
  });

  it('recognizes an owner key only when it is configured server-side', () => {
    process.env.SPENDMIC_OWNER_LICENSE_KEY = 'SPM-OWNER-ONLY-KEY';
    expect(isConfiguredOwnerKey('SPM-OWNER-ONLY-KEY')).toBe(true);
    expect(isConfiguredOwnerKey('SPM-CUSTOMER-KEY')).toBe(false);
  });
});
