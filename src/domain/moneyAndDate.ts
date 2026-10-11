import { SUPPORTED_CURRENCIES } from './types';

/**
 * Parses user input amount string/number into positive integer minor units.
 * Throws an Error with a user-friendly message if validation fails.
 */
export function parseAmountToMinor(input: string | number, currencyCode: string = 'INR'): number {
  if (input === null || input === undefined) {
    throw new Error('Amount is required.');
  }

  const strInput = String(input).trim();
  if (!strInput) {
    throw new Error('Amount is required.');
  }

  // Reject invalid characters (only digits and a single decimal point allowed)
  if (!/^\d+(\.\d+)?$/.test(strInput)) {
    throw new Error('Please enter a valid positive number for the amount.');
  }

  const num = Number(strInput);
  if (isNaN(num) || !isFinite(num)) {
    throw new Error('Amount must be a valid number.');
  }

  if (num <= 0) {
    throw new Error('Amount must be greater than zero.');
  }

  const currencyObj = SUPPORTED_CURRENCIES.find((c) => c.code === currencyCode) || SUPPORTED_CURRENCIES[0];
  const decimals = currencyObj.decimals;

  if (decimals === 0) {
    if (!Number.isInteger(num)) {
      throw new Error(`${currencyObj.code} does not support decimal fractions.`);
    }
    return Math.round(num);
  }

  // Check decimal places precision (e.g., max 2 decimal places)
  const parts = strInput.split('.');
  if (parts.length === 2 && parts[1].length > decimals) {
    throw new Error(`Amount cannot have more than ${decimals} decimal places.`);
  }

  const multiplier = Math.pow(10, decimals);
  const minor = Math.round(num * multiplier);

  if (minor <= 0 || !Number.isSafeInteger(minor)) {
    throw new Error('Amount exceeds supported limits.');
  }

  return minor;
}

/**
 * Formats minor units integer into a display currency string (e.g., 1050 -> "₹10.50").
 */
export function formatMinorToMajor(amountMinor: number, currencyCode: string = 'INR'): string {
  const currencyObj = SUPPORTED_CURRENCIES.find((c) => c.code === currencyCode) || SUPPORTED_CURRENCIES[0];
  const decimals = currencyObj.decimals;
  const major = decimals === 0 ? amountMinor : amountMinor / Math.pow(10, decimals);

  const formattedNum = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(major);

  if (currencyObj.symbolPosition === 'after') {
    return `${formattedNum} ${currencyObj.symbol}`;
  }
  return `${currencyObj.symbol}${formattedNum}`;
}

/**
 * Formats minor units integer into decimal string for input fields (e.g., 1050 -> "10.50").
 */
export function formatMinorToDecimalString(amountMinor: number, currencyCode: string = 'INR'): string {
  const currencyObj = SUPPORTED_CURRENCIES.find((c) => c.code === currencyCode) || SUPPORTED_CURRENCIES[0];
  const decimals = currencyObj.decimals;
  if (decimals === 0) return String(amountMinor);

  const major = amountMinor / Math.pow(10, decimals);
  return major.toFixed(decimals);
}

/**
 * Returns today's date in local YYYY-MM-DD format without UTC shift errors.
 */
export function getTodayLocalDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns current local time in HH:mm 24-hour format (e.g., "14:30").
 */
export function getCurrentLocalTimeString(): string {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Formats a 24-hour HH:mm string or ISO timestamp into 12-hour formatted time (e.g. "2:30 PM").
 */
export function formatTimeTo12Hour(timeStr?: string): string {
  if (!timeStr) return '';
  const trimmed = timeStr.trim();
  // Check HH:mm or H:mm format
  if (/^\d{1,2}:\d{2}$/.test(trimmed)) {
    const [hStr, mStr] = trimmed.split(':');
    let hour = parseInt(hStr, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12;
    if (hour === 0) hour = 12;
    return `${hour}:${mStr} ${ampm}`;
  }
  // Try ISO date parse
  try {
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    }
  } catch {
    // ignore
  }
  return trimmed;
}

/**
 * Extracts or formats the transaction time for display.
 * STRICT RULE: Returns the time string ONLY if dateLocal === today.
 * If dateLocal !== today (e.g. yesterday, other dates), returns null.
 */
export function getTransactionDisplayTime(tx: {
  dateLocal: string;
  timeLocal?: string;
  createdAt?: string;
}): string | null {
  const today = getTodayLocalDateString();
  if (tx.dateLocal !== today) {
    return null;
  }
  if (tx.timeLocal) {
    return formatTimeTo12Hour(tx.timeLocal);
  }
  if (tx.createdAt) {
    try {
      const d = new Date(tx.createdAt);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      }
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Formats local YYYY-MM-DD date string for user display.
 * If dateLocal is Today and time information (createdAt or timeLocal) is provided,
 * returns "Today • <time>" (e.g. "Today • 10:45 AM").
 * If dateLocal is Yesterday or any other date, returns ONLY the date label (time is omitted).
 */
export function formatDateLocalDisplay(
  dateLocal: string,
  createdAt?: string,
  timeLocal?: string
): string {
  if (!dateLocal || !/^\d{4}-\d{2}-\d{2}$/.test(dateLocal)) {
    return dateLocal || 'Unknown Date';
  }

  const today = getTodayLocalDateString();
  if (dateLocal === today) {
    const timeDisplay = getTransactionDisplayTime({ dateLocal, createdAt, timeLocal });
    return timeDisplay ? `Today • ${timeDisplay}` : 'Today';
  }

  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayYear = yesterdayDate.getFullYear();
  const yesterdayMonth = String(yesterdayDate.getMonth() + 1).padStart(2, '0');
  const yesterdayDay = String(yesterdayDate.getDate()).padStart(2, '0');
  const yesterdayStr = `${yesterdayYear}-${yesterdayMonth}-${yesterdayDay}`;

  if (dateLocal === yesterdayStr) {
    return 'Yesterday';
  }

  const [y, m, d] = dateLocal.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);

  return dateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Safely parses YYYY-MM-DD local date string into a Date object set to local midnight.
 */
export function parseLocalDate(dateLocal: string): Date {
  const [year, month, day] = dateLocal.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Formats a Date object into YYYY-MM-DD string.
 */
export function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
