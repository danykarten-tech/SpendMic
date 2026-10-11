import {
  UserPreferences,
  Category,
  Transaction,
  Budget,
  RecurringTemplate,
  Bill,
  SavingsGoal,
} from './types';
import { resolveTransactionCategory } from './categoriesData';

export const BACKUP_SCHEMA_VERSION = '1.0';
export const CURRENT_APP_VERSION = '1.0.0';

export interface BackupDataPayload {
  schemaVersion: string;
  appVersion: string;
  exportedAt: string;
  preferences?: UserPreferences;
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  recurringTemplates?: RecurringTemplate[];
  bills?: Bill[];
  savingsGoals?: SavingsGoal[];
}

export interface BackupValidationResult {
  isValid: boolean;
  error?: string;
  counts?: {
    categories: number;
    transactions: number;
    budgets: number;
    recurringTemplates: number;
    bills: number;
    savingsGoals: number;
  };
  parsedData?: BackupDataPayload;
}

/**
 * Formats a date string (YYYY-MM-DD) for backup filenames
 */
export function getBackupFilenameDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Constructs the versioned JSON backup payload object
 */
export function buildJSONBackupPayload(data: {
  preferences?: UserPreferences;
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  recurringTemplates?: RecurringTemplate[];
  bills?: Bill[];
  savingsGoals?: SavingsGoal[];
}): BackupDataPayload {
  return {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    appVersion: CURRENT_APP_VERSION,
    exportedAt: new Date().toISOString(),
    preferences: data.preferences,
    categories: data.categories || [],
    transactions: data.transactions || [],
    budgets: data.budgets || [],
    recurringTemplates: data.recurringTemplates || [],
    bills: data.bills || [],
    savingsGoals: data.savingsGoals || [],
  };
}

/**
 * Validates an imported JSON backup file string or object strictly.
 * Ensures schema version, array integrity, enum values, and no duplicate IDs.
 * Does NOT mutate existing state or storage.
 */
export function validateBackupJSON(jsonContent: string): BackupValidationResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonContent);
  } catch (err) {
    return { isValid: false, error: 'Invalid file format: Failed to parse JSON.' };
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { isValid: false, error: 'Invalid backup structure: Root must be a valid JSON object.' };
  }

  const payload = parsed as Record<string, unknown>;

  // Schema version validation
  if (!payload.schemaVersion || typeof payload.schemaVersion !== 'string') {
    return { isValid: false, error: 'Missing required field: "schemaVersion".' };
  }

  const version = payload.schemaVersion.trim();
  if (version !== '1.0' && version !== '1') {
    return {
      isValid: false,
      error: `Unsupported backup schema version "${version}". Expected version "${BACKUP_SCHEMA_VERSION}".`,
    };
  }

  // Categories validation
  if (!Array.isArray(payload.categories)) {
    return { isValid: false, error: 'Invalid backup structure: "categories" must be an array.' };
  }

  const categoryIds = new Set<string>();
  for (let i = 0; i < payload.categories.length; i++) {
    const cat = payload.categories[i];
    if (!cat || typeof cat !== 'object') {
      return { isValid: false, error: `Invalid category at index ${i}: item is not an object.` };
    }
    if (!cat.id || typeof cat.id !== 'string') {
      return { isValid: false, error: `Invalid category at index ${i}: missing "id".` };
    }
    if (categoryIds.has(cat.id)) {
      return { isValid: false, error: `Duplicate category ID found: "${cat.id}".` };
    }
    categoryIds.add(cat.id);

    if (!cat.name || typeof cat.name !== 'string') {
      return { isValid: false, error: `Invalid category at index ${i}: missing or invalid "name".` };
    }
    if (cat.type !== 'income' && cat.type !== 'expense') {
      return { isValid: false, error: `Invalid category type "${cat.type}" at index ${i}. Expected "income" or "expense".` };
    }
  }

  // Transactions validation
  if (!Array.isArray(payload.transactions)) {
    return { isValid: false, error: 'Invalid backup structure: "transactions" must be an array.' };
  }

  const transactionIds = new Set<string>();
  for (let i = 0; i < payload.transactions.length; i++) {
    const tx = payload.transactions[i];
    if (!tx || typeof tx !== 'object') {
      return { isValid: false, error: `Invalid transaction at index ${i}: item is not an object.` };
    }
    if (!tx.id || typeof tx.id !== 'string') {
      return { isValid: false, error: `Invalid transaction at index ${i}: missing "id".` };
    }
    if (transactionIds.has(tx.id)) {
      return { isValid: false, error: `Duplicate transaction ID found: "${tx.id}".` };
    }
    transactionIds.add(tx.id);

    if (tx.type !== 'income' && tx.type !== 'expense') {
      return { isValid: false, error: `Invalid transaction type "${tx.type}" at index ${i}. Expected "income" or "expense".` };
    }
    if (typeof tx.amountMinor !== 'number' || isNaN(tx.amountMinor) || tx.amountMinor < 0) {
      return { isValid: false, error: `Invalid transaction amountMinor at index ${i}: must be a non-negative number.` };
    }
    if (!tx.dateLocal || typeof tx.dateLocal !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(tx.dateLocal)) {
      return { isValid: false, error: `Invalid dateLocal "${tx.dateLocal}" at index ${i}: must be YYYY-MM-DD.` };
    }
    if (!tx.categoryId || typeof tx.categoryId !== 'string') {
      return { isValid: false, error: `Invalid transaction at index ${i}: missing "categoryId".` };
    }
  }

  // Budgets validation
  if (!Array.isArray(payload.budgets)) {
    return { isValid: false, error: 'Invalid backup structure: "budgets" must be an array.' };
  }

  const budgetIds = new Set<string>();
  for (let i = 0; i < payload.budgets.length; i++) {
    const b = payload.budgets[i];
    if (!b || typeof b !== 'object') {
      return { isValid: false, error: `Invalid budget at index ${i}: item is not an object.` };
    }
    if (!b.id || typeof b.id !== 'string') {
      return { isValid: false, error: `Invalid budget at index ${i}: missing "id".` };
    }
    if (budgetIds.has(b.id)) {
      return { isValid: false, error: `Duplicate budget ID found: "${b.id}".` };
    }
    budgetIds.add(b.id);
  }

  // Optional collections
  if (payload.recurringTemplates !== undefined && !Array.isArray(payload.recurringTemplates)) {
    return { isValid: false, error: 'Invalid backup structure: "recurringTemplates" must be an array.' };
  }
  if (payload.bills !== undefined && !Array.isArray(payload.bills)) {
    return { isValid: false, error: 'Invalid backup structure: "bills" must be an array.' };
  }
  if (payload.savingsGoals !== undefined && !Array.isArray(payload.savingsGoals)) {
    return { isValid: false, error: 'Invalid backup structure: "savingsGoals" must be an array.' };
  }

  const validData: BackupDataPayload = {
    schemaVersion: version,
    appVersion: typeof payload.appVersion === 'string' ? payload.appVersion : CURRENT_APP_VERSION,
    exportedAt: typeof payload.exportedAt === 'string' ? payload.exportedAt : new Date().toISOString(),
    preferences: typeof payload.preferences === 'object' && payload.preferences !== null ? (payload.preferences as UserPreferences) : undefined,
    categories: payload.categories as Category[],
    transactions: payload.transactions as Transaction[],
    budgets: payload.budgets as Budget[],
    recurringTemplates: (payload.recurringTemplates as RecurringTemplate[]) || [],
    bills: (payload.bills as Bill[]) || [],
    savingsGoals: (payload.savingsGoals as SavingsGoal[]) || [],
  };

  return {
    isValid: true,
    counts: {
      categories: validData.categories.length,
      transactions: validData.transactions.length,
      budgets: validData.budgets.length,
      recurringTemplates: (validData.recurringTemplates || []).length,
      bills: (validData.bills || []).length,
      savingsGoals: (validData.savingsGoals || []).length,
    },
    parsedData: validData,
  };
}

/**
 * Helper to escape CSV cell values (handles quotes, commas, newlines)
 */
export function escapeCSVField(field: string | number | undefined | null): string {
  if (field === undefined || field === null) return '';
  const str = String(field);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Generates a stable CSV string for transactions with header columns:
 * id, date, type, amount, currency, category, note, accountId, createdAt, updatedAt
 */
export function generateTransactionsCSV(
  transactions: Transaction[],
  categories: Category[]
): string {
  const categoryMap = new Map<string, string>();
  categories.forEach((c) => categoryMap.set(c.id, c.name));

  const headers = [
    'id',
    'date',
    'type',
    'amount',
    'currency',
    'category',
    'note',
    'accountId',
    'createdAt',
    'updatedAt',
  ];

  const rows = transactions.map((tx) => {
    const amountDecimal = (tx.amountMinor / 100).toFixed(2);
    const catName = categoryMap.get(tx.categoryId) || resolveTransactionCategory(tx.categoryId, categories, tx.note, tx.type)?.name || 'Uncategorized';

    return [
      escapeCSVField(tx.id),
      escapeCSVField(tx.dateLocal),
      escapeCSVField(tx.type),
      escapeCSVField(amountDecimal),
      escapeCSVField(tx.currency),
      escapeCSVField(catName),
      escapeCSVField(tx.note || ''),
      escapeCSVField(tx.accountId || ''),
      escapeCSVField(tx.createdAt),
      escapeCSVField(tx.updatedAt),
    ].join(',');
  });

  // Include UTF-8 BOM for Excel compatibility
  return '\uFEFF' + [headers.join(','), ...rows].join('\n');
}

/**
 * Triggers browser download for Blob contents (JSON or CSV)
 */
export function triggerFileDownload(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
