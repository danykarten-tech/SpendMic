import {
  Transaction,
  Category,
  Budget,
  BudgetProgress,
  BudgetStatus,
  MonthlySummary,
  CategorySpendingBreakdown,
  MonthlyTrendPoint,
} from './types';
import { resolveTransactionCategory } from './categoriesData';

/**
 * Returns today's period key in local YYYY-MM format.
 */
export function getCurrentPeriodKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Shifts a YYYY-MM period key by a given number of delta months.
 * Correctly handles year boundaries (e.g. 2026-01 shifted by -1 -> 2025-12)
 * and leap years without timezone or UTC shifts.
 */
export function getShiftedPeriodKey(periodKey: string, deltaMonths: number): string {
  if (!/^\d{4}-\d{2}$/.test(periodKey)) {
    return getCurrentPeriodKey();
  }

  const parts = periodKey.split('-');
  let year = parseInt(parts[0], 10);
  let month = parseInt(parts[1], 10) - 1; // 0-indexed month

  const totalMonths = year * 12 + month + deltaMonths;
  const newYear = Math.floor(totalMonths / 12);
  const newMonth0Based = ((totalMonths % 12) + 12) % 12;
  const newMonthStr = String(newMonth0Based + 1).padStart(2, '0');

  return `${newYear}-${newMonthStr}`;
}

/**
 * Formats YYYY-MM period key into readable user string (e.g., "2026-10" -> "October 2026" or "Oct 2026").
 */
export function formatPeriodKeyDisplay(periodKey: string, short: boolean = false): string {
  if (!/^\d{4}-\d{2}$/.test(periodKey)) return periodKey;

  const parts = periodKey.split('-');
  const year = parseInt(parts[0], 10);
  const monthIndex = parseInt(parts[1], 10) - 1;

  const monthNamesFull = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const monthNamesShort = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];

  if (monthIndex < 0 || monthIndex > 11) return periodKey;

  const monthName = short ? monthNamesShort[monthIndex] : monthNamesFull[monthIndex];
  return `${monthName} ${year}`;
}

/**
 * Generates an array of `count` period keys up to and including `currentPeriodKey` in chronological order.
 */
export function getPeriodMonthsWindow(currentPeriodKey: string, count: number = 6): string[] {
  const windowKeys: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    windowKeys.push(getShiftedPeriodKey(currentPeriodKey, -i));
  }
  return windowKeys;
}

/**
 * Calculates monthly financial summary totals for a given month.
 * Note: Net cash flow = incomeTotal - expenseTotal. (Never referred to as bank balance).
 */
export function calculateMonthlySummary(transactions: Transaction[], periodKey: string): MonthlySummary {
  let incomeTotalMinor = 0;
  let expenseTotalMinor = 0;
  let count = 0;

  for (const tx of transactions) {
    if (tx.dateLocal.startsWith(periodKey)) {
      count++;
      if (tx.type === 'income') {
        incomeTotalMinor += tx.amountMinor;
      } else {
        expenseTotalMinor += tx.amountMinor;
      }
    }
  }

  return {
    periodKey,
    incomeTotalMinor,
    expenseTotalMinor,
    netCashFlowMinor: incomeTotalMinor - expenseTotalMinor,
    transactionCount: count,
  };
}

/**
 * Calculates budget progress metrics for a single budget record.
 * Protects against division by zero and correctly assigns status.
 */
export function calculateBudgetProgress(
  budget: Budget,
  transactions: Transaction[],
  category?: Category
): BudgetProgress {
  let spentMinor = 0;

  for (const tx of transactions) {
    if (tx.type === 'expense' && tx.dateLocal.startsWith(budget.periodKey)) {
      if (!budget.categoryId || tx.categoryId === budget.categoryId) {
        spentMinor += tx.amountMinor;
      }
    }
  }

  const remainingMinor = budget.limitMinor - spentMinor;

  let percentageUsed = 0;
  if (budget.limitMinor > 0) {
    percentageUsed = Math.round((spentMinor / budget.limitMinor) * 100);
  }

  let status: BudgetStatus = 'on_track';
  let statusLabel = 'On track';

  if (percentageUsed > 100) {
    status = 'over_budget';
    statusLabel = 'Over budget';
  } else if (percentageUsed >= 80) {
    status = 'near_limit';
    statusLabel = 'Near limit';
  }

  return {
    budget,
    category,
    spentMinor,
    remainingMinor,
    percentageUsed,
    status,
    statusLabel,
  };
}

/**
 * Calculates category spending breakdown for a specific month, sorted descending by spending.
 */
export function calculateCategorySpendingBreakdown(
  transactions: Transaction[],
  categories: Category[],
  periodKey: string
): CategorySpendingBreakdown[] {
  const catMap = new Map<string, Category>(categories.map((c) => [c.id, c]));

  let totalExpenseMinor = 0;
  const spendingMap = new Map<string, { totalMinor: number; count: number }>();

  for (const tx of transactions) {
    if (tx.type === 'expense' && tx.dateLocal.startsWith(periodKey)) {
      totalExpenseMinor += tx.amountMinor;
      const existing = spendingMap.get(tx.categoryId) || { totalMinor: 0, count: 0 };
      spendingMap.set(tx.categoryId, {
        totalMinor: existing.totalMinor + tx.amountMinor,
        count: existing.count + 1,
      });
    }
  }

  const result: CategorySpendingBreakdown[] = [];

  spendingMap.forEach((val, catId) => {
    const category = catMap.get(catId) || resolveTransactionCategory(catId, categories, undefined, 'expense') || {
      id: catId,
      name: 'Uncategorized',
      type: 'expense' as const,
      icon: 'Tag',
      color: '#64748B',
      isBuiltIn: false,
      isArchived: false,
      createdAt: '',
    };

    const percentageOfExpense = totalExpenseMinor > 0
      ? Math.round((val.totalMinor / totalExpenseMinor) * 100)
      : 0;

    result.push({
      category,
      totalMinor: val.totalMinor,
      percentageOfExpense,
      transactionCount: val.count,
    });
  });

  result.sort((a, b) => b.totalMinor - a.totalMinor);
  return result;
}

/**
 * Calculates 6-month income vs expense trend relative to currentPeriodKey.
 */
export function calculateSixMonthTrend(
  transactions: Transaction[],
  currentPeriodKey: string
): MonthlyTrendPoint[] {
  const windowKeys = getPeriodMonthsWindow(currentPeriodKey, 6);

  return windowKeys.map((pKey) => {
    const summary = calculateMonthlySummary(transactions, pKey);
    const monthLabel = formatPeriodKeyDisplay(pKey, true);
    return {
      periodKey: pKey,
      monthLabel,
      incomeMinor: summary.incomeTotalMinor,
      expenseMinor: summary.expenseTotalMinor,
      netCashFlowMinor: summary.netCashFlowMinor,
    };
  });
}
