# Licensing environments

## Local development

Run `npm run dev`. Vite sets `import.meta.env.DEV` at build time, so the
developer instance opens without customer activation. This bypass cannot be
enabled by a URL parameter, local storage, browser console, or a `VITE_*`
environment variable. It is removed from preview and production bundles.
Do not set `NODE_ENV=development` in `.env`: Vite supplies the correct mode for
each command, and overriding it can incorrectly make a production build behave
like a development build.

## Preview / QA

Vercel Preview deployments are customer-like: activation is required. Configure
the same server-only license settings used by production if you need to test a
real purchase flow. Do not set `SPENDMIC_ALLOW_LOCAL_TEST_LICENSES` in Vercel.

## Production

Production requires all of the following server-only environment variables:

- `LICENSE_PRIVATE_KEY` and matching `VITE_LICENSE_PUBLIC_KEY`
- `PAYHIP_PRODUCT_SECRET_KEY` and `PAYHIP_PRODUCT_LINK`
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- `SPENDMIC_OWNER_LICENSE_KEY` (optional owner access, kept private)

Payhip purchase validation runs only in Vercel API routes. A valid Payhip key is
then registered against at most two devices in Supabase. The browser stores the
resulting signed offline authorization token and local financial data stays in
IndexedDB.

Offline receipts have no automatic expiry: a customer who successfully
activated can reopen SpendMic without a network connection. A refund or
disabled Payhip key is detected only after a successful later online license
verification; a network outage must never erase financial data or by itself
block an already authorized device.

## Required email-verification integration

Payhip supplies the buyer email to the server, but this project does not yet
have an email-delivery provider or an OTP/link-verification service. Do not
claim that email ownership has been verified until you configure a provider
such as Resend, Postmark, or SendGrid and add a server-only verification flow.
The customer should enter the Payhip license key directly in the activation
form; keys are deliberately not accepted from URL query parameters.
