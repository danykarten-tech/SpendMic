import { describe, it, expect } from 'vitest';
import {
  calculateNextDueDate,
  generateOccurrenceKey,
  getPendingDueOccurrences,
  calculateBillStatus,
  calculateSavingsProgress,
} from '../src/domain/recurringAndBills';
import { RecurringTemplate, Bill, SavingsGoal } from '../src/domain/types';

describe('Phase 4: Recurring Transaction & Month-End Clamping Calculations', () => {
  it('calculates weekly next due date correctly', () => {
    const next = calculateNextDueDate('2026-10-01', 'weekly');
    expect(next).toBe('2026-10-08');
  });

  it('calculates standard monthly next due date', () => {
    const next = calculateNextDueDate('2026-05-15', 'monthly');
    expect(next).toBe('2026-06-15');
  });

  it('handles month-end 31st dates deterministically (clamping to Feb 28 in non-leap year)', () => {
    // Jan 31 -> Feb 28 in 2026 (non-leap year)
    const nextFeb = calculateNextDueDate('2026-01-31', 'monthly', 31);
    expect(nextFeb).toBe('2026-02-28');

    // From Feb 28 with preferredDay 31 -> March 31
    const nextMar = calculateNextDueDate('2026-02-28', 'monthly', 31);
    expect(nextMar).toBe('2026-03-31');

    // March 31 -> April 30
    const nextApr = calculateNextDueDate('2026-03-31', 'monthly', 31);
    expect(nextApr).toBe('2026-04-30');
  });

  it('handles leap year Feb 29 correctly', () => {
    // 2028 is a leap year (Feb has 29 days)
    const nextFebLeap = calculateNextDueDate('2028-01-31', 'monthly', 31);
    expect(nextFebLeap).toBe('2028-02-29');

    // 2028-02-29 yearly -> 2029-02-28 (2029 is non-leap)
    const nextYearlyLeap = calculateNextDueDate('2028-02-29', 'yearly', 29);
    expect(nextYearlyLeap).toBe('2029-02-28');
  });

  it('handles yearly recurrence correctly', () => {
    const next = calculateNextDueDate('2026-10-10', 'yearly');
    expect(next).toBe('2027-10-10');
  });

  it('generates unique occurrence key and filters pending due items', () => {
    const key = generateOccurrenceKey('tpl_rent', '2026-10-01');
    expect(key).toBe('tpl_rent_2026-10-01');

    const templates: RecurringTemplate[] = [
      {
        id: 'tpl_rent',
        type: 'expense',
        amountMinor: 1500000,
        currency: 'INR',
        categoryId: 'cat_housing',
        frequency: 'monthly',
        startDateLocal: '2026-09-01',
        nextDueDateLocal: '2026-10-01',
        preferredDay: 1,
        status: 'active',
        createdAt: '2026-09-01T00:00:00.000Z',
        updatedAt: '2026-09-01T00:00:00.000Z',
      },
      {
        id: 'tpl_paused',
        type: 'expense',
        amountMinor: 50000,
        currency: 'INR',
        categoryId: 'cat_entertainment',
        frequency: 'monthly',
        startDateLocal: '2026-09-01',
        nextDueDateLocal: '2026-10-01',
        status: 'paused',
        createdAt: '2026-09-01T00:00:00.000Z',
        updatedAt: '2026-09-01T00:00:00.000Z',
      },
      {
        id: 'tpl_future',
        type: 'income',
        amountMinor: 5000000,
        currency: 'INR',
        categoryId: 'cat_salary',
        frequency: 'monthly',
        startDateLocal: '2026-10-01',
        nextDueDateLocal: '2026-11-01',
        status: 'active',
        createdAt: '2026-09-01T00:00:00.000Z',
        updatedAt: '2026-09-01T00:00:00.000Z',
      },
    ];

    const generatedKeys = new Set<string>();

    const pending = getPendingDueOccurrences(templates, generatedKeys, '2026-10-10');
    expect(pending.length).toBe(1);
    expect(pending[0].template.id).toBe('tpl_rent');
    expect(pending[0].occurrenceKey).toBe('tpl_rent_2026-10-01');

    // Once key is added to generatedKeys, it is NOT pending anymore
    generatedKeys.add('tpl_rent_2026-10-01');
    const pendingAfter = getPendingDueOccurrences(templates, generatedKeys, '2026-10-10');
    expect(pendingAfter.length).toBe(0);
  });
});

describe('Phase 4: Bill Tracker Calculations & Status', () => {
  it('calculates paid status correctly', () => {
    const bill: Bill = {
      id: 'bill_electric',
      name: 'Electricity Bill',
      amountMinor: 250000,
      currency: 'INR',
      dueDateLocal: '2026-10-05',
      frequency: 'monthly',
      categoryId: 'cat_utilities',
      isPaid: true,
      paidDateLocal: '2026-10-04',
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-04T00:00:00.000Z',
    };

    const status = calculateBillStatus(bill, '2026-10-10');
    expect(status.status).toBe('paid');
    expect(status.label).toContain('Paid on 2026-10-04');
  });

  it('calculates overdue bill status', () => {
    const bill: Bill = {
      id: 'bill_water',
      name: 'Water Bill',
      amountMinor: 50000,
      currency: 'INR',
      dueDateLocal: '2026-10-05',
      frequency: 'monthly',
      categoryId: 'cat_utilities',
      isPaid: false,
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z',
    };

    const status = calculateBillStatus(bill, '2026-10-10');
    expect(status.status).toBe('overdue');
    expect(status.daysDiff).toBe(-5);
    expect(status.label).toBe('Overdue by 5 days');
  });

  it('calculates due today and upcoming bill status', () => {
    const billToday: Bill = {
      id: 'bill_internet',
      name: 'Wifi Bill',
      amountMinor: 100000,
      currency: 'INR',
      dueDateLocal: '2026-10-10',
      frequency: 'monthly',
      categoryId: 'cat_utilities',
      isPaid: false,
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z',
    };

    const statusToday = calculateBillStatus(billToday, '2026-10-10');
    expect(statusToday.status).toBe('unpaid');
    expect(statusToday.label).toBe('Due Today');

    const billUpcoming: Bill = {
      ...billToday,
      dueDateLocal: '2026-10-15',
    };

    const statusUpcoming = calculateBillStatus(billUpcoming, '2026-10-10');
    expect(statusUpcoming.status).toBe('unpaid');
    expect(statusUpcoming.label).toBe('Due in 5 days');
  });
});

describe('Phase 4: Savings Goals Progress Calculations', () => {
  it('calculates progress percentage and remaining allowance', () => {
    const goal: SavingsGoal = {
      id: 'goal_vacation',
      name: 'Goa Trip',
      targetMinor: 5000000, // 50,000
      currentSavedMinor: 2000000, // 20,000
      color: '#3B82F6',
      icon: 'Plane',
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z',
    };

    const res = calculateSavingsProgress(goal);
    expect(res.percentage).toBe(40);
    expect(res.remainingMinor).toBe(3000000);
    expect(res.isCompleted).toBe(false);
  });

  it('handles completed savings goals', () => {
    const goal: SavingsGoal = {
      id: 'goal_fund',
      name: 'Emergency Fund',
      targetMinor: 10000000,
      currentSavedMinor: 10000000,
      color: '#10B981',
      icon: 'ShieldCheck',
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z',
    };

    const res = calculateSavingsProgress(goal);
    expect(res.percentage).toBe(100);
    expect(res.remainingMinor).toBe(0);
    expect(res.isCompleted).toBe(true);
  });
});
