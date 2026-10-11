export type TransactionType = 'expense' | 'income';

export interface Currency {
  code: string;
  symbol: string;
  name: string;
  symbolPosition: 'before' | 'after';
  decimals: number;
}

export const SUPPORTED_CURRENCIES: Currency[] = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', symbolPosition: 'before', decimals: 2 },
  { code: 'USD', symbol: '$', name: 'US Dollar', symbolPosition: 'before', decimals: 2 },
  { code: 'EUR', symbol: '€', name: 'Euro', symbolPosition: 'before', decimals: 2 },
  { code: 'GBP', symbol: '£', name: 'British Pound', symbolPosition: 'before', decimals: 2 },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', symbolPosition: 'before', decimals: 0 },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', symbolPosition: 'before', decimals: 2 },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', symbolPosition: 'before', decimals: 2 },
];

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  icon: string;
  color: string;
  isBuiltIn: boolean;
  isArchived: boolean;
  createdAt: string; // ISO timestamp
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amountMinor: number; // Positive integer in smallest currency unit (e.g. 1050 for 10.50)
  currency: string;
  dateLocal: string; // YYYY-MM-DD local date string
  timeLocal?: string; // HH:mm local time (recorded when added for today)
  categoryId: string;
  note?: string;
  accountId?: string; // Reserved for future multi-account support
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

export interface Budget {
  id: string;
  periodKey: string; // YYYY-MM format
  limitMinor: number; // Positive integer in smallest currency unit
  categoryId?: string; // Optional: undefined/empty means overall monthly expense budget
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

export type BudgetStatus = 'on_track' | 'near_limit' | 'over_budget';

export interface BudgetProgress {
  budget: Budget;
  category?: Category;
  spentMinor: number;
  remainingMinor: number;
  percentageUsed: number;
  status: BudgetStatus;
  statusLabel: string;
}

export interface MonthlySummary {
  periodKey: string; // YYYY-MM
  incomeTotalMinor: number;
  expenseTotalMinor: number;
  netCashFlowMinor: number; // incomeTotalMinor - expenseTotalMinor
  transactionCount: number;
}

export interface CategorySpendingBreakdown {
  category: Category;
  totalMinor: number;
  percentageOfExpense: number;
  transactionCount: number;
}

export interface MonthlyTrendPoint {
  periodKey: string; // YYYY-MM
  monthLabel: string; // e.g. "Oct 2026"
  incomeMinor: number;
  expenseMinor: number;
  netCashFlowMinor: number;
}

export interface UserPreferences {
  currency: string;
  theme: 'light' | 'dark' | 'system';
  onboardingCompleted: boolean;
  hasSeenOfflineNotice: boolean;
}

export type NavigationTab =
  | 'home'
  | 'transactions'
  | 'budgets'
  | 'reports'
  | 'recurring'
  | 'bills'
  | 'savings'
  | 'settings';

export interface StorageHealth {
  indexedDBAvailable: boolean;
  databaseName: string;
  databaseVersion: number;
  transactionCount: number;
  categoryCount: number;
  isStoragePersisted: boolean;
  error?: string;
}

export interface ToastMessage {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  description?: string;
  durationMs?: number;
}

export interface TransactionFilterOptions {
  searchQuery?: string;
  type?: 'all' | 'income' | 'expense';
  categoryId?: string;
  month?: string; // YYYY-MM format
  startDate?: string;
  endDate?: string;
}

// --- Phase 4 Types ---

export type RecurrenceFrequency = 'weekly' | 'monthly' | 'yearly';
export type RecurringTemplateStatus = 'active' | 'paused' | 'archived';

export interface RecurringTemplate {
  id: string;
  type: TransactionType;
  amountMinor: number;
  currency: string;
  categoryId: string;
  note?: string;
  frequency: RecurrenceFrequency;
  startDateLocal: string; // YYYY-MM-DD
  endDateLocal?: string; // YYYY-MM-DD (optional end limit)
  nextDueDateLocal: string; // YYYY-MM-DD
  preferredDay?: number; // Original day of month (e.g. 31) for deterministic month-end clamping
  status: RecurringTemplateStatus;
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

export interface RecurringOccurrence {
  occurrenceKey: string; // templateId_YYYY-MM-DD
  templateId: string;
  dueDateLocal: string;
  generatedTransactionId?: string;
  generatedAt?: string;
}

export type BillFrequency = 'one_off' | 'weekly' | 'monthly' | 'yearly';
export type BillStatus = 'unpaid' | 'paid' | 'overdue';

export interface Bill {
  id: string;
  name: string;
  amountMinor: number;
  currency: string;
  dueDateLocal: string; // YYYY-MM-DD
  frequency: BillFrequency;
  categoryId: string;
  isPaid: boolean;
  paidDateLocal?: string; // YYYY-MM-DD
  paidTransactionId?: string; // Optional link to generated expense transaction
  note?: string;
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

export interface SavingsContribution {
  id: string;
  goalId: string;
  amountMinor: number; // Positive for deposit, negative for withdrawal
  dateLocal: string; // YYYY-MM-DD
  note?: string;
  createdAt: string; // ISO timestamp
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetMinor: number;
  currentSavedMinor: number;
  targetDateLocal?: string; // YYYY-MM-DD
  categoryId?: string;
  color: string;
  icon: string;
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}
