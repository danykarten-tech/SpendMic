import {
  RecurrenceFrequency,
  RecurringTemplate,
  Bill,
  BillStatus,
  SavingsGoal,
} from './types';
import { parseLocalDate, formatLocalDate, getTodayLocalDateString } from './moneyAndDate';

/**
 * Returns the maximum number of days in a given year and month (1-indexed month).
 * Handles leap years correctly (e.g. Feb in leap years has 29 days).
 */
export function getDaysInMonth(year: number, month: number): number {
  // Month is 1-indexed (1 = Jan, 12 = Dec)
  return new Date(year, month, 0).getDate();
}

/**
 * Calculates the next due date for a recurring template based on its frequency.
 * Handles month-end dates (e.g., 31st) deterministically by clamping to the last day of target month,
 * while preserving the original preferredDay for subsequent 31-day months.
 */
export function calculateNextDueDate(
  currentDueDateLocal: string,
  frequency: RecurrenceFrequency,
  preferredDay?: number
): string {
  const parts = currentDueDateLocal.split('-').map(Number);
  let year = parts[0];
  let month = parts[1]; // 1-indexed
  let day = parts[2];

  // If preferredDay is not provided, use the original day
  const targetDay = preferredDay ?? day;

  if (frequency === 'weekly') {
    const d = parseLocalDate(currentDueDateLocal);
    d.setDate(d.getDate() + 7);
    return formatLocalDate(d);
  }

  if (frequency === 'monthly') {
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
    const maxDays = getDaysInMonth(year, month);
    const clampedDay = Math.min(targetDay, maxDays);
    const monthStr = month < 10 ? `0${month}` : `${month}`;
    const dayStr = clampedDay < 10 ? `0${clampedDay}` : `${clampedDay}`;
    return `${year}-${monthStr}-${dayStr}`;
  }

  if (frequency === 'yearly') {
    year += 1;
    const maxDays = getDaysInMonth(year, month);
    const clampedDay = Math.min(targetDay, maxDays);
    const monthStr = month < 10 ? `0${month}` : `${month}`;
    const dayStr = clampedDay < 10 ? `0${clampedDay}` : `${clampedDay}`;
    return `${year}-${monthStr}-${dayStr}`;
  }

  return currentDueDateLocal;
}

/**
 * Deterministic occurrence key to prevent duplicate transaction generation per scheduled due date.
 */
export function generateOccurrenceKey(templateId: string, dueDateLocal: string): string {
  return `${templateId}_${dueDateLocal}`;
}

export interface PendingOccurrence {
  template: RecurringTemplate;
  dueDateLocal: string;
  occurrenceKey: string;
}

/**
 * Finds all pending recurring occurrences due on or before today that have NOT been generated yet.
 */
export function getPendingDueOccurrences(
  templates: RecurringTemplate[],
  generatedKeys: Set<string>,
  todayDateLocal: string = getTodayLocalDateString()
): PendingOccurrence[] {
  const pending: PendingOccurrence[] = [];

  for (const t of templates) {
    if (t.status !== 'active') continue;
    if (t.nextDueDateLocal > todayDateLocal) continue;
    if (t.endDateLocal && t.nextDueDateLocal > t.endDateLocal) continue;

    const key = generateOccurrenceKey(t.id, t.nextDueDateLocal);
    if (!generatedKeys.has(key)) {
      pending.push({
        template: t,
        dueDateLocal: t.nextDueDateLocal,
        occurrenceKey: key,
      });
    }
  }

  return pending;
}

export interface BillStatusResult {
  status: BillStatus;
  label: string;
  daysDiff: number; // Negative if overdue, 0 if due today, positive if upcoming
}

/**
 * Calculates accessible bill status, text label, and days remaining/overdue.
 */
export function calculateBillStatus(
  bill: Bill,
  todayDateLocal: string = getTodayLocalDateString()
): BillStatusResult {
  if (bill.isPaid) {
    return {
      status: 'paid',
      label: bill.paidDateLocal ? `Paid on ${bill.paidDateLocal}` : 'Paid',
      daysDiff: 0,
    };
  }

  const today = parseLocalDate(todayDateLocal);
  const due = parseLocalDate(bill.dueDateLocal);

  const diffTime = due.getTime() - today.getTime();
  const daysDiff = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (daysDiff < 0) {
    const overdueDays = Math.abs(daysDiff);
    return {
      status: 'overdue',
      label: `Overdue by ${overdueDays} day${overdueDays === 1 ? '' : 's'}`,
      daysDiff,
    };
  }

  if (daysDiff === 0) {
    return {
      status: 'unpaid',
      label: 'Due Today',
      daysDiff: 0,
    };
  }

  return {
    status: 'unpaid',
    label: `Due in ${daysDiff} day${daysDiff === 1 ? '' : 's'}`,
    daysDiff,
  };
}

export interface SavingsProgressResult {
  percentage: number;
  remainingMinor: number;
  isCompleted: boolean;
}

/**
 * Pure calculation for savings goal progress percentage and remaining allowance.
 */
export function calculateSavingsProgress(goal: SavingsGoal): SavingsProgressResult {
  if (goal.targetMinor <= 0) {
    return { percentage: 100, remainingMinor: 0, isCompleted: true };
  }

  const percentage = Math.min(
    100,
    Math.max(0, Math.round((goal.currentSavedMinor / goal.targetMinor) * 100))
  );
  const remainingMinor = Math.max(0, goal.targetMinor - goal.currentSavedMinor);
  const isCompleted = goal.currentSavedMinor >= goal.targetMinor;

  return {
    percentage,
    remainingMinor,
    isCompleted,
  };
}
