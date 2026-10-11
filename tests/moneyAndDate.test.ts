import { describe, it, expect } from 'vitest';
import {
  parseAmountToMinor,
  formatMinorToMajor,
  formatMinorToDecimalString,
  getTodayLocalDateString,
  getCurrentLocalTimeString,
  formatTimeTo12Hour,
  getTransactionDisplayTime,
  formatDateLocalDisplay,
} from '../src/domain/moneyAndDate';

describe('Money & Date Utilities', () => {
  describe('parseAmountToMinor', () => {
    it('parses valid positive decimal strings into minor units', () => {
      expect(parseAmountToMinor('10.50', 'USD')).toBe(1050);
      expect(parseAmountToMinor('100', 'INR')).toBe(10000);
      expect(parseAmountToMinor('0.99', 'EUR')).toBe(99);
      expect(parseAmountToMinor('500', 'JPY')).toBe(500); // 0 decimals
    });

    it('rejects zero, negative numbers, NaN, and Infinity', () => {
      expect(() => parseAmountToMinor('0')).toThrow(/greater than zero/i);
      expect(() => parseAmountToMinor('-15.00')).toThrow(/positive number/i);
      expect(() => parseAmountToMinor('NaN')).toThrow(/valid positive number/i);
      expect(() => parseAmountToMinor('Infinity')).toThrow(/valid positive number/i);
      expect(() => parseAmountToMinor('')).toThrow(/required/i);
    });

    it('rejects invalid decimal formats and letters', () => {
      expect(() => parseAmountToMinor('abc')).toThrow();
      expect(() => parseAmountToMinor('12.345', 'USD')).toThrow(/decimal places/i);
      expect(() => parseAmountToMinor('10.5.5')).toThrow();
    });
  });

  describe('formatMinorToMajor', () => {
    it('formats minor integer into formatted currency display string', () => {
      expect(formatMinorToMajor(1050, 'USD')).toBe('$10.50');
      expect(formatMinorToMajor(10000, 'INR')).toBe('₹100.00');
      expect(formatMinorToMajor(500, 'JPY')).toBe('¥500');
    });
  });

  describe('formatMinorToDecimalString', () => {
    it('converts minor integer back to decimal string for form inputs', () => {
      expect(formatMinorToDecimalString(1050, 'USD')).toBe('10.50');
      expect(formatMinorToDecimalString(500, 'JPY')).toBe('500');
    });
  });

  describe('Date & Time Local Utilities', () => {
    it('getTodayLocalDateString returns YYYY-MM-DD in local time', () => {
      const dateStr = getTodayLocalDateString();
      expect(dateStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('getCurrentLocalTimeString returns HH:mm format', () => {
      const timeStr = getCurrentLocalTimeString();
      expect(timeStr).toMatch(/^\d{2}:\d{2}$/);
    });

    it('formatTimeTo12Hour formats HH:mm and ISO strings correctly', () => {
      expect(formatTimeTo12Hour('14:30')).toBe('2:30 PM');
      expect(formatTimeTo12Hour('09:15')).toBe('9:15 AM');
      expect(formatTimeTo12Hour('00:45')).toBe('12:45 AM');
      expect(formatTimeTo12Hour('12:00')).toBe('12:00 PM');
    });

    it('getTransactionDisplayTime returns time ONLY when dateLocal is today', () => {
      const todayStr = getTodayLocalDateString();
      const pastStr = '2026-01-15';

      // Today with timeLocal -> returns formatted time
      expect(
        getTransactionDisplayTime({
          dateLocal: todayStr,
          timeLocal: '15:45',
        })
      ).toBe('3:45 PM');

      // Today with createdAt fallback -> returns formatted time
      expect(
        getTransactionDisplayTime({
          dateLocal: todayStr,
          createdAt: new Date().toISOString(),
        })
      ).toBeTruthy();

      // Yesterday or past date -> strictly returns null (NO time display)
      expect(
        getTransactionDisplayTime({
          dateLocal: pastStr,
          timeLocal: '15:45',
          createdAt: new Date().toISOString(),
        })
      ).toBeNull();
    });

    it('formatDateLocalDisplay conditionally includes time ONLY for today and suppresses for yesterday/others', () => {
      const todayStr = getTodayLocalDateString();

      // Today without time provided
      expect(formatDateLocalDisplay(todayStr)).toBe('Today');

      // Today with time provided
      expect(formatDateLocalDisplay(todayStr, undefined, '10:30')).toBe('Today • 10:30 AM');

      // Yesterday: even if time or createdAt is passed, time is NEVER displayed
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
      expect(formatDateLocalDisplay(yStr, new Date().toISOString(), '14:00')).toBe('Yesterday');

      // Past date: never displays time
      const pastStr = '2026-01-15';
      const pastResult = formatDateLocalDisplay(pastStr, new Date().toISOString(), '14:00');
      expect(pastResult).toContain('2026');
      expect(pastResult).not.toContain('•');
      expect(pastResult).not.toContain('PM');
    });
  });
});
