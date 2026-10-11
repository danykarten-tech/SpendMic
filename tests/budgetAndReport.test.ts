import { describe, it, expect } from 'vitest';
import {
  getCurrentPeriodKey,
  getShiftedPeriodKey,
  formatPeriodKeyDisplay,
  getPeriodMonthsWindow,
  calculateMonthlySummary,
  calculateBudgetProgress,
  calculateCategorySpendingBreakdown,
  calculateSixMonthTrend,
} from '../src/domain/budgetAndReport';
import { Transaction, Category, Budget } from '../src/domain/types';

describe('Budget & Report Domain Utilities', () => {
  describe('Month Navigation Utilities', () => {
    it('getCurrentPeriodKey returns YYYY-MM format', () => {
      const key = getCurrentPeriodKey();
      expect(key).toMatch(/^\d{4}-\d{2}$/);
    });

    it('getShiftedPeriodKey handles normal month shifts', () => {
      expect(getShiftedPeriodKey('2026-05', 1)).toBe('2026-06');
      expect(getShiftedPeriodKey('2026-05', -1)).toBe('2026-04');
      expect(getShiftedPeriodKey('2026-05', 0)).toBe('2026-05');
    });

    it('getShiftedPeriodKey handles year boundaries (Dec -> Jan & Jan -> Dec)', () => {
      expect(getShiftedPeriodKey('2026-12', 1)).toBe('2027-01');
      expect(getShiftedPeriodKey('2026-01', -1)).toBe('2025-12');
      expect(getShiftedPeriodKey('2026-01', -12)).toBe('2025-01');
    });

    it('getShiftedPeriodKey handles leap years gracefully', () => {
      // Leap year 2028: Feb 2028 to March 2028
      expect(getShiftedPeriodKey('2028-02', 1)).toBe('2028-03');
      expect(getShiftedPeriodKey('2028-03', -1)).toBe('2028-02');
    });

    it('formatPeriodKeyDisplay returns formatted strings', () => {
      expect(formatPeriodKeyDisplay('2026-10')).toBe('October 2026');
      expect(formatPeriodKeyDisplay('2026-10', true)).toBe('Oct 2026');
      expect(formatPeriodKeyDisplay('2026-01', true)).toBe('Jan 2026');
    });

    it('getPeriodMonthsWindow returns 6 consecutive months ending at currentPeriodKey', () => {
      const window = getPeriodMonthsWindow('2026-10', 6);
      expect(window).toEqual(['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10']);
    });
  });

  describe('calculateMonthlySummary', () => {
    const mockTx: Transaction[] = [
      {
        id: '1',
        type: 'income',
        amountMinor: 500000,
        currency: 'INR',
        dateLocal: '2026-10-01',
        categoryId: 'cat_salary',
        createdAt: '2026-10-01T00:00:00Z',
        updatedAt: '2026-10-01T00:00:00Z',
      },
      {
        id: '2',
        type: 'expense',
        amountMinor: 120000,
        currency: 'INR',
        dateLocal: '2026-10-05',
        categoryId: 'cat_food',
        createdAt: '2026-10-05T00:00:00Z',
        updatedAt: '2026-10-05T00:00:00Z',
      },
      {
        id: '3',
        type: 'expense',
        amountMinor: 80000,
        currency: 'INR',
        dateLocal: '2026-10-12',
        categoryId: 'cat_groceries',
        createdAt: '2026-10-12T00:00:00Z',
        updatedAt: '2026-10-12T00:00:00Z',
      },
      // Different month transaction
      {
        id: '4',
        type: 'expense',
        amountMinor: 50000,
        currency: 'INR',
        dateLocal: '2026-09-28',
        categoryId: 'cat_food',
        createdAt: '2026-09-28T00:00:00Z',
        updatedAt: '2026-09-28T00:00:00Z',
      },
    ];

    it('sums income, expenses, and net cash flow accurately for selected month', () => {
      const summary = calculateMonthlySummary(mockTx, '2026-10');
      expect(summary.incomeTotalMinor).toBe(500000);
      expect(summary.expenseTotalMinor).toBe(200000);
      expect(summary.netCashFlowMinor).toBe(300000); // 500000 - 200000
      expect(summary.transactionCount).toBe(3);
    });

    it('handles zero transactions gracefully', () => {
      const summary = calculateMonthlySummary([], '2026-10');
      expect(summary.incomeTotalMinor).toBe(0);
      expect(summary.expenseTotalMinor).toBe(0);
      expect(summary.netCashFlowMinor).toBe(0);
      expect(summary.transactionCount).toBe(0);
    });
  });

  describe('calculateBudgetProgress & Status Thresholds', () => {
    const budget: Budget = {
      id: 'b1',
      periodKey: '2026-10',
      limitMinor: 100000, // 1,000.00
      createdAt: '2026-10-01T00:00:00Z',
      updatedAt: '2026-10-01T00:00:00Z',
    };

    it('returns status "on_track" when spent is 0%', () => {
      const progress = calculateBudgetProgress(budget, []);
      expect(progress.spentMinor).toBe(0);
      expect(progress.remainingMinor).toBe(100000);
      expect(progress.percentageUsed).toBe(0);
      expect(progress.status).toBe('on_track');
      expect(progress.statusLabel).toBe('On track');
    });

    it('returns status "on_track" when spent is under 80%', () => {
      const txs: Transaction[] = [
        {
          id: '1',
          type: 'expense',
          amountMinor: 75000, // 75%
          currency: 'INR',
          dateLocal: '2026-10-05',
          categoryId: 'cat_food',
          createdAt: '',
          updatedAt: '',
        },
      ];
      const progress = calculateBudgetProgress(budget, txs);
      expect(progress.spentMinor).toBe(75000);
      expect(progress.remainingMinor).toBe(25000);
      expect(progress.percentageUsed).toBe(75);
      expect(progress.status).toBe('on_track');
    });

    it('returns status "near_limit" when spent is between 80% and 100%', () => {
      const txs: Transaction[] = [
        {
          id: '1',
          type: 'expense',
          amountMinor: 80000, // exactly 80%
          currency: 'INR',
          dateLocal: '2026-10-05',
          categoryId: 'cat_food',
          createdAt: '',
          updatedAt: '',
        },
      ];
      const progress = calculateBudgetProgress(budget, txs);
      expect(progress.percentageUsed).toBe(80);
      expect(progress.status).toBe('near_limit');
      expect(progress.statusLabel).toBe('Near limit');

      const txs95: Transaction[] = [
        {
          id: '1',
          type: 'expense',
          amountMinor: 95000, // 95%
          currency: 'INR',
          dateLocal: '2026-10-05',
          categoryId: 'cat_food',
          createdAt: '',
          updatedAt: '',
        },
      ];
      const progress95 = calculateBudgetProgress(budget, txs95);
      expect(progress95.status).toBe('near_limit');
    });

    it('returns status "over_budget" when spent exceeds 100%', () => {
      const txs: Transaction[] = [
        {
          id: '1',
          type: 'expense',
          amountMinor: 120000, // 120%
          currency: 'INR',
          dateLocal: '2026-10-05',
          categoryId: 'cat_food',
          createdAt: '',
          updatedAt: '',
        },
      ];
      const progress = calculateBudgetProgress(budget, txs);
      expect(progress.percentageUsed).toBe(120);
      expect(progress.remainingMinor).toBe(-20000);
      expect(progress.status).toBe('over_budget');
      expect(progress.statusLabel).toBe('Over budget');
    });

    it('never divides by zero when limitMinor is 0 or negative', () => {
      const zeroBudget: Budget = { ...budget, limitMinor: 0 };
      const progress = calculateBudgetProgress(zeroBudget, []);
      expect(progress.percentageUsed).toBe(0);
      expect(progress.status).toBe('on_track');
    });

    it('calculates category-specific budget progress accurately', () => {
      const categoryBudget: Budget = {
        id: 'b2',
        periodKey: '2026-10',
        categoryId: 'cat_food',
        limitMinor: 50000,
        createdAt: '',
        updatedAt: '',
      };
      const txs: Transaction[] = [
        {
          id: '1',
          type: 'expense',
          amountMinor: 30000,
          currency: 'INR',
          dateLocal: '2026-10-05',
          categoryId: 'cat_food',
          createdAt: '',
          updatedAt: '',
        },
        {
          id: '2',
          type: 'expense',
          amountMinor: 40000,
          currency: 'INR',
          dateLocal: '2026-10-06',
          categoryId: 'cat_groceries', // Different category -> should NOT count
          createdAt: '',
          updatedAt: '',
        },
      ];
      const progress = calculateBudgetProgress(categoryBudget, txs);
      expect(progress.spentMinor).toBe(30000); // Only cat_food counted
      expect(progress.percentageUsed).toBe(60);
    });
  });

  describe('calculateCategorySpendingBreakdown', () => {
    const categories: Category[] = [
      {
        id: 'cat_food',
        name: 'Food & Dining',
        type: 'expense',
        icon: 'Utensils',
        color: '#E07A5F',
        isBuiltIn: true,
        isArchived: false,
        createdAt: '',
      },
      {
        id: 'cat_groceries',
        name: 'Groceries',
        type: 'expense',
        icon: 'ShoppingBag',
        color: '#2A9D8F',
        isBuiltIn: true,
        isArchived: false,
        createdAt: '',
      },
    ];

    it('calculates category breakdown percentages and sorts descending by amount', () => {
      const txs: Transaction[] = [
        {
          id: '1',
          type: 'expense',
          amountMinor: 30000, // 30% of 100,000
          currency: 'INR',
          dateLocal: '2026-10-01',
          categoryId: 'cat_food',
          createdAt: '',
          updatedAt: '',
        },
        {
          id: '2',
          type: 'expense',
          amountMinor: 70000, // 70% of 100,000
          currency: 'INR',
          dateLocal: '2026-10-02',
          categoryId: 'cat_groceries',
          createdAt: '',
          updatedAt: '',
        },
      ];

      const breakdown = calculateCategorySpendingBreakdown(txs, categories, '2026-10');
      expect(breakdown.length).toBe(2);
      expect(breakdown[0].category.id).toBe('cat_groceries');
      expect(breakdown[0].totalMinor).toBe(70000);
      expect(breakdown[0].percentageOfExpense).toBe(70);

      expect(breakdown[1].category.id).toBe('cat_food');
      expect(breakdown[1].totalMinor).toBe(30000);
      expect(breakdown[1].percentageOfExpense).toBe(30);
    });
  });

  describe('calculateSixMonthTrend', () => {
    it('generates 6 trend points ending at currentPeriodKey', () => {
      const txs: Transaction[] = [
        {
          id: '1',
          type: 'income',
          amountMinor: 100000,
          currency: 'INR',
          dateLocal: '2026-10-01',
          categoryId: 'cat_salary',
          createdAt: '',
          updatedAt: '',
        },
        {
          id: '2',
          type: 'expense',
          amountMinor: 40000,
          currency: 'INR',
          dateLocal: '2026-10-05',
          categoryId: 'cat_food',
          createdAt: '',
          updatedAt: '',
        },
      ];

      const trend = calculateSixMonthTrend(txs, '2026-10');
      expect(trend.length).toBe(6);
      expect(trend[5].periodKey).toBe('2026-10');
      expect(trend[5].incomeMinor).toBe(100000);
      expect(trend[5].expenseMinor).toBe(40000);
      expect(trend[5].netCashFlowMinor).toBe(60000);
    });
  });
});
