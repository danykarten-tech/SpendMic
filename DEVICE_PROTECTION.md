# SpendMic Lightweight Device Protection & Two-Device Licensing

## 1. Architecture Overview

SpendMic AI is an offline-first, privacy-respecting Progressive Web App (PWA). The Device Protection module provides a lightweight, two-device licensing system that enforces a maximum of **two active, authorized devices** per license without compromising SpendMic's offline capabilities or privacy principles.

```
┌────────────────────────────────────────────────────────┐
│                   SpendMic PWA Client                  │
│                                                        │
│  ┌─────────────────────────┐  ┌─────────────────────┐  │
│  │ Local Financial DB      │  │ Device Protection   │  │
│  │ (IndexedDB: idb)        │  │ (localStorage cache)│  │
│  │ - Transactions          │  │ - Device UUID       │  │
│  │ - Budgets & Bills       │  │ - License Key       │  │
│  │ - Categories            │  │ - Token & State     │  │
│  │ * 100% On-Device Only   │  │ * Minimal metadata  │  │
│  └─────────────────────────┘  └──────────┬──────────┘  │
└──────────────────────────────────────────┼─────────────┘
                                           │
                        HTTPS API Calls    │ (Sends ONLY device ID,
                        with Backoff       │  license key, device name.
                                           │  ZERO financial data)
                                           ▼
┌────────────────────────────────────────────────────────┐
│           Authoritative Licensing Backend              │
│                 (Vercel Serverless API)                │
│                                                        │
│  - /api/license/activate  (Atomic slot claim)          │
│  - /api/license/verify    (HMAC-SHA256 Token check)    │
│  - /api/license/replace   (Atomic device swap)         │
│  - /api/license/status    (Slot occupancy query)       │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Persistent Store (Supabase / Neon Postgres /     │  │
│  │ local .data store for test & dev environments)   │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

---

## 2. Device Authorization State Machine

The client follows a strictly deterministic state machine:

| State | Meaning | App Access |
|---|---|---|
| `UNKNOWN` | No license or device verification attempted yet | Initial grace access |
| `PENDING_VERIFICATION` | Device registered locally while offline or server unreachable | Full offline access with subtle banner |
| `AUTHORIZED` | Confirmed by licensing server with signed authorization token | Full licensed access |
| `BLOCKED` | Server explicitly rejected activation (2-device limit reached or revoked) | Blocked screen with 1-click JSON/CSV export & replacement |
| `REPLACEMENT_REQUIRED` | Device slot limit reached; user prompted to choose a device to replace | Blocked screen offering device replacement dialog |
| `TEMPORARY_SERVER_UNAVAILABLE` | Previously authorized device running while server is offline | Full offline access preserved |

### Critical State Transition Invariant:
**A server-rejected device (`BLOCKED`) CAN NEVER be unlocked by network disconnection or page reload.**
- `BLOCKED` + `NETWORK_OFFLINE` → `BLOCKED`
- `BLOCKED` + `APP_INIT` (page refresh / PWA relaunch) → `BLOCKED`
- `BLOCKED` + `SERVER_UNAVAILABLE` → `BLOCKED`
- Only an explicit, authoritative 200 OK from the server (`SERVER_AUTHORIZED` or successful `USER_REPLACED_DEVICE`) can restore an authorized state.

---

## 3. Offline Access and Server Outage Recovery

### Previously Authorized Devices (Devices A & B):
- When the network goes down or the licensing server is unavailable, authorized devices transition quietly to `TEMPORARY_SERVER_UNAVAILABLE`.
- All normal app functions (budgeting, reports, transactions, voice assistant, imports/exports) continue working smoothly offline.
- A network error will **never** falsely block an authorized device.

### Server Recovery:
- The app listens for the browser's `online` window event.
- When the internet connection returns, the client automatically triggers an idempotent background verification.
- Re-verification uses bounded retries with exponential backoff (delay doubling up to 2 retries max), preventing tight retry loops or server flooding.

---

## 4. Two-Device Limit Enforcement Rules

1. **Per-Customer Limit:** Each individual customer license permits up to two concurrent active device installations.
2. **Server-Authoritative:** The server enforces the limit atomically using backend locks / transactional constraints.
3. **Deterministic Devices:** Devices generate and persist a stable UUID (`crypto.randomUUID()`) in `localStorage` under `spendmic_device_id`. Browser fingerprinting is avoided.
4. **First Two Devices:** Occupy slots 1 and 2 in order of activation.
5. **Third Device Attempt:**
   - Server returns HTTP 403 with `state: BLOCKED` and the list of currently authorized devices.
   - Client persists `BLOCKED` to `localStorage`.
   - Client displays `DeviceBlockedScreen`.

---

## 5. Device C Rejection & Data Preservation Guarantee

When a third device (Device C) is rejected:
1. **Expenses Are NEVER Touched:** Local IndexedDB tables (`transactions`, `categories`, `budgets`, etc.) remain completely intact and untouched.
2. **Immediate Data Export:** The lock screen provides immediate, 1-click **"Export JSON Full Backup"** and **"Export CSV Transactions"** buttons so the user can easily extract their financial data.
3. **Replacement Flow:** The lock screen provides a **"Replace One of My 2 Active Devices"** button to allow deactivating an old device and activating Device C.
4. **No Offline Unlock:** If Device C turns off Wi-Fi or closes the browser, Device C remains `BLOCKED` upon reopening.

---

## 6. Intentional Device Replacement Flow

When a user switches phones, laptops, or browsers:
1. User clicks **"Replace One of My 2 Active Devices"** on the blocked screen or in Settings.
2. A modal displays the 2 active devices (showing device platform names and activation timestamps).
3. The user explicitly selects which device to revoke.
4. The client calls `/api/license/replace` with `{ licenseKey, targetDeviceId, newDeviceId, newDeviceName }`.
5. The server atomically marks `targetDeviceId` as inactive and activates `newDeviceId`.
6. Total active devices on the server remains strictly `<= 2`.
7. The new device receives an authorization token and unlocks immediately. The replaced device will be locked upon its next online verification.

---

## 7. Backend API Endpoints & Data Model

### Endpoints
- `POST /api/license/activate` — Claims a slot for `deviceId` on `licenseKey`.
- `POST /api/license/verify` — Validates license key, device ID, and token validity.
- `POST /api/license/replace` — Atomically revokes `targetDeviceId` and authorizes `newDeviceId`.
- `GET /api/license/status?key=SPM-...` — Returns count and list of active devices.

### Data Stored on the Licensing Server
The backend stores strictly minimal licensing metadata:
- `licenseKey` (string, e.g. `SPM-XXXX-XXXX-XXXX`)
- `status` (`ACTIVE` | `REVOKED` | `EXPIRED`)
- `deviceId` (opaque random UUID)
- `deviceName` (e.g. "Chrome on macOS", "Safari on iOS")
- `activatedAt` (ISO timestamp)
- `lastVerifiedAt` (ISO timestamp)
- `isActive` (boolean)

### WHAT IS NEVER SENT TO THE BACKEND
To preserve 100% financial privacy:
- ❌ NO transaction records
- ❌ NO income or expense amounts
- ❌ NO bank accounts or balances
- ❌ NO categories or budget limits
- ❌ NO personal notes or descriptions
- ❌ NO CSV / JSON backup files
- ❌ NO GPS or invasive device tracking

---

## 8. Environment Variables and Backend Configuration

### Sample `.env.example`
```env
# Cryptographic secret for signing HMAC-SHA256 client authorization tokens
LICENSE_SECRET_KEY=your-secure-random-32-byte-hex-secret-here

# Optional: Persistent PostgreSQL Database (e.g. Supabase or Neon Postgres Free Tier)
# If omitted in local development/test mode, the server uses a persistent local file store in .data/
DATABASE_URL=postgresql://postgres:yourpassword@db.yourproject.supabase.co:5432/postgres

# Application Environment (development | production)
NODE_ENV=development
```

### Free-Tier Recommendations & Limits
- **Vercel Serverless Functions:** Free Hobby tier supports up to 100,000 function invocations per month.
- **Supabase Postgres (Free Tier):** 500 MB database, 50,000 active monthly users, 100% free ($0/month).
- **Neon Postgres (Free Tier):** 0.5 GB storage, autoscaling serverless compute, 100% free ($0/month).
- **Storage Footprint:** Each license activation record occupies `< 300 bytes`. 10,000 customers with 2 devices each consume `< 10 MB` of database space, well within free-tier limits.

---

## 9. Test-Mode vs. Production-Mode Status

- **Development / Local Test Mode:**
  - If `DATABASE_URL` is not set, the server uses an embedded persistent store in `.data/license-db.json` for local development and an in-memory test store during Vitest runs.
  - License format is validated (`SPM-XXXX-...`).
- **Production Mode Requirements:**
  - Connect a persistent PostgreSQL database (`DATABASE_URL`).
  - Set a cryptographically random `LICENSE_SECRET_KEY`.
  - Connect a one-time purchase fulfillment provider (e.g., Lemon Squeezy, Gumroad, or Stripe) to write issued licenses to the database.

---

## 10. Manual Testing Instructions (Multi-Device Flow)

### Step 1: Device A Authorization
1. Open SpendMic in Chrome Profile 1 (`http://localhost:5173`).
2. Go to **Settings & Privacy Controls** → **Device Protection & Licensing**.
3. Click **"Enter License Key"** and enter `SPM-TEST-1234-ABCD`.
4. Click **Activate**. Confirm the badge changes to **"Authorized (2-Device Limit Active)"**.

### Step 2: Device B Authorization
1. Open SpendMic in Chrome Incognito or Profile 2.
2. Go to **Settings** → **Device Protection & Licensing**.
3. Activate the same license key `SPM-TEST-1234-ABCD`.
4. Confirm Device B is authorized. Both slots (2/2) are now occupied.

### Step 3: Device C Rejection & Offline Lock Test
1. Open SpendMic in Safari or Profile 3.
2. Activate the same key `SPM-TEST-1234-ABCD`.
3. Confirm Device C is immediately rejected and redirected to the **Device Limit Reached** screen.
4. **Test Data Export:** Click **"Export JSON Backup"** or **"Export CSV"** to verify data export is accessible even while blocked.
5. **Test Offline Persistence:** Disconnect your internet connection or toggle browser offline mode.
6. Refresh the page or close and reopen the PWA on Device C.
7. Confirm that Device C **remains strictly BLOCKED** and does NOT unlock.

### Step 4: Device Replacement Test
1. On Device C's blocked screen, click **"Replace One of My 2 Active Devices"**.
2. Select Device A from the list and click **"Confirm & Authorize This Device"**.
3. Confirm Device C is now authorized.
4. Return to Device A and trigger sync: confirm Device A is now revoked and shows the blocked screen.

---

## 11. Known PWA & Browser Identity Limitations

1. **Storage Clearing:** If a user manually clears browser site data / cookies in browser settings, the stored `spendmic_device_id` and token are deleted. The server will treat a new visit as a new device activation.
2. **Incognito / Private Browsing:** Incognito windows generate ephemeral `localStorage` keys which are wiped when the window closes.
3. **No Native Hardware TPM in Browsers:** Standard browser PWAs cannot access hardware TPM / IMEI chips for tamper-proof DRM. The server remains the authoritative source of truth for online license verification.

---

## 12. How to Remove or Disable the Module Safely

If device protection needs to be removed in the future:
1. In `src/App.tsx`: Remove `DeviceProtectionProvider` and `useDeviceProtection()` checks.
2. In `src/components/layout/AppShell.tsx`: Remove `useDeviceProtection()`.
3. In `src/views/SettingsView.tsx`: Remove `<LicenseSettingsSection />`.
4. Delete `src/device-protection/` and `api/`.
5. Local expense data in IndexedDB is 100% separate and will remain completely unaffected.

---

## 13. Git Rollback Instructions

If you need to discard all device protection changes and revert to the exact pre-protection state:
```bash
# Verify current state
git status

# Revert to the checkpoint tag created before implementation
git checkout spendmic-v1-before-device-protection
```
