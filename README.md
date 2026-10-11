# Pocket Expense Tracker (Phase 5 - Release Ready)

A calm, premium, offline-first personal accounting web application designed for mobile and desktop browsers. Built with **React 18**, **TypeScript**, **Vite**, **IndexedDB**, and **Service Worker PWA** technology.

---

## 🌟 Key Features & Phase 5 Highlights

- **100% Offline-First Architecture:** Uses IndexedDB for local database storage and Service Worker caching for instant offline app relaunch.
- **Privacy Controls & Zero External Sync:** No remote cloud backend, no user tracking, no telemetry, no bank connections, and no advertising SDKs.
- **Versioned JSON Backup & Restore:**
  - Exports standardized `pocket-expense-backup-YYYY-MM-DD.json` payloads with `schemaVersion`, `appVersion`, `exportedAt`, `preferences`, `categories`, `transactions`, `budgets`, `recurringTemplates`, `bills`, and `savingsGoals`.
  - Strict pre-restore file validation checking JSON syntax, schema compatibility, enum values, and duplicate IDs without mutating current data.
  - Interactive restore preview showing record counts before executing atomic replacement.
  - Optional pre-restore auto-backup for data safety.
- **CSV Data Export:**
  - Exports transactions to `pocket-expense-transactions-YYYY-MM-DD.csv` with stable columns (`id`, `date`, `type`, `amount`, `currency`, `category`, `note`, `accountId`, `createdAt`, `updatedAt`).
  - Formatted with UTF-8 encoding and Excel-compatible BOM (`\uFEFF`).
- **Complete Financial Tooling:**
  - **Transaction Tracking:** Multi-currency support (INR ₹ default), category tagging, search & date range filters.
  - **Budgeting Engine:** Overall monthly and category-specific expense thresholds with real-time status alerts.
  - **Recurring Schedules:** Weekly, monthly (clamped 31st), and annual templates with explicit confirmation dialogs.
  - **Bill Tracker:** Due date alerts, frequency tracking, and duplicate-prevention expense creation upon payment.
  - **Savings Goals:** Target milestone tracking with deposit logging.

---

## 🛠 Tech Stack & Architecture

- **Frontend:** React 18, TypeScript 5, Vite
- **Styling:** Vanilla CSS design tokens (`var(--primary-brand)`, `var(--surface-card)`, etc.)
- **Persistence:** IndexedDB via `idb` wrapper + `localStorage` for preferences
- **Testing:** Vitest, React Testing Library, JSDOM
- **PWA Capabilities:** Service Worker static asset cache (`sw.js`) & `manifest.json`

---

## 🚀 Setup, Build & Test Commands

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### Commands

```bash
# Install dependencies
npm install

# Launch local development server (with HMR)
npm run dev

# Execute full Vitest test suite
npm test

# Build production bundle with TypeScript checking
npm run build
```

---

## 📲 PWA Installation Guide

### Android (Chrome / Edge)
1. Open the app URL in Chrome.
2. Tap the three-dot menu icon `⋮` in the top right.
3. Tap **"Install app"** or **"Add to Home screen"**.
4. Launch the app directly from your home screen icon.

### iOS (Safari)
1. Open the app URL in Safari.
2. Tap the Share button `⎘` in the bottom navigation bar.
3. Scroll down and tap **"Add to Home Screen"**.
4. Tap **Add** in the top right corner.

### Desktop (Chrome / Edge / Brave)
1. Open the app URL in your browser.
2. Click the **Install** button on the right side of the address bar, or click `⋮` -> **"Install Pocket Expense Tracker..."**.
3. Launch from your desktop application launcher.

---

## 💾 Backup & Data Management Guide

### JSON Backup & Restore
- Go to **Settings & Privacy Controls**.
- Click **"Export JSON Backup"** to save your complete financial dataset to your device.
- To restore: Click **"Restore from JSON Backup"**, choose your `.json` file, review the incoming record counts in the preview modal, and click **"Confirm & Restore Data"**.

### CSV Export vs. JSON Backup
- **CSV Export** is formatted for viewing, analysis, and reporting in Excel, Apple Numbers, or Google Sheets. It is **not** a full restorable database file.
- **JSON Backup** is the official full-system backup format used for moving data between devices or restoring after clearing browser cache.

---

## 🔒 Privacy Controls & Data Erasure

- **No Remote Servers:** All records remain 100% inside your device's browser storage.
- **Data Erasure:** To permanently wipe device data, go to **Settings** -> **"Delete All Data"**. A two-step dialog requires explicit confirmation before wiping IndexedDB.

---

## ⚠️ Known Limitations & PWA Technical Notes

1. **Browser Cache Clearing:** Clearing browser cache or site data will delete IndexedDB records unless a JSON backup has been saved.
2. **Background Execution:** PWAs cannot run background code when closed on iOS/Android due to OS battery constraints. Recurring transaction due items are checked and confirmed when opening the app.
3. **App Store Availability:** Pocket Expense Tracker is delivered purely as an offline Progressive Web App. It is not currently packaged for native Google Play Store or Apple App Store distribution.
