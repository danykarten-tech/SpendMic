import { describe, it, expect, beforeEach } from 'vitest';
import {
  buildJSONBackupPayload,
  validateBackupJSON,
  generateTransactionsCSV,
  escapeCSVField,
  BACKUP_SCHEMA_VERSION,
  CURRENT_APP_VERSION,
  getBackupFilenameDateString,
} from '../src/domain/backupAndExport';
import { Transaction, Category, Budget } from '../src/domain/types';
import { IndexedDBRepository } from '../src/storage/storageRepository';

describe('Backup and Export Domain & Storage Logic', () => {
  const dummyCategories: Category[] = [
    {
      id: 'cat_groceries',
      name: 'Groceries',
      type: 'expense',
      icon: 'ShoppingBag',
      color: '#176B87',
      isBuiltIn: true,
      isArchived: false,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'cat_salary',
      name: 'Salary',
      type: 'income',
      icon: 'DollarSign',
      color: '#21845A',
      isBuiltIn: true,
      isArchived: false,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  ];

  const dummyTransactions: Transaction[] = [
    {
      id: 'tx_1',
      type: 'expense',
      amountMinor: 2550, // 25.50
      currency: 'INR',
      dateLocal: '2026-10-10',
      categoryId: 'cat_groceries',
      note: 'Grocery store "Supermarket", fresh apples',
      createdAt: '2026-10-10T10:00:00.000Z',
      updatedAt: '2026-10-10T10:00:00.000Z',
    },
    {
      id: 'tx_2',
      type: 'income',
      amountMinor: 500000, // 5000.00
      currency: 'INR',
      dateLocal: '2026-10-01',
      categoryId: 'cat_salary',
      note: 'Monthly salary payout',
      createdAt: '2026-10-01T09:00:00.000Z',
      updatedAt: '2026-10-01T09:00:00.000Z',
    },
  ];

  const dummyBudgets: Budget[] = [
    {
      id: 'bgt_1',
      periodKey: '2026-10',
      limitMinor: 200000,
      categoryId: 'cat_groceries',
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z',
    },
  ];

  describe('CSV Escaping and Generation', () => {
    it('escapes standard strings and numbers without quotes if no special chars', () => {
      expect(escapeCSVField('Simple text')).toBe('Simple text');
      expect(escapeCSVField(12.5)).toBe('12.5');
      expect(escapeCSVField(undefined)).toBe('');
    });

    it('wraps fields containing commas, double quotes, and line breaks in double quotes', () => {
      expect(escapeCSVField('Hello, world')).toBe('"Hello, world"');
      expect(escapeCSVField('Say "Hello"')).toBe('"Say ""Hello"""');
      expect(escapeCSVField('Line 1\nLine 2')).toBe('"Line 1\nLine 2"');
    });

    it('generates a valid UTF-8 CSV with stable headers and formatted amounts', () => {
      const csv = generateTransactionsCSV(dummyTransactions, dummyCategories);
      expect(csv.startsWith('\uFEFF')).toBe(true);

      const lines = csv.substring(1).split('\n');
      expect(lines[0]).toBe('id,date,type,amount,currency,category,note,accountId,createdAt,updatedAt');
      expect(lines.length).toBe(3);

      // Line 1: Expense
      expect(lines[1]).toContain('tx_1');
      expect(lines[1]).toContain('2026-10-10');
      expect(lines[1]).toContain('expense');
      expect(lines[1]).toContain('25.50');
      expect(lines[1]).toContain('Groceries');
      expect(lines[1]).toContain('"Grocery store ""Supermarket"", fresh apples"');

      // Line 2: Income
      expect(lines[2]).toContain('tx_2');
      expect(lines[2]).toContain('5000.00');
      expect(lines[2]).toContain('Salary');
    });
  });

  describe('JSON Backup Validation', () => {
    it('creates a valid payload object via buildJSONBackupPayload', () => {
      const payload = buildJSONBackupPayload({
        categories: dummyCategories,
        transactions: dummyTransactions,
        budgets: dummyBudgets,
      });

      expect(payload.schemaVersion).toBe(BACKUP_SCHEMA_VERSION);
      expect(payload.appVersion).toBe(CURRENT_APP_VERSION);
      expect(payload.categories).toEqual(dummyCategories);
      expect(payload.transactions).toEqual(dummyTransactions);
      expect(payload.budgets).toEqual(dummyBudgets);
    });

    it('validates a valid backup JSON string successfully', () => {
      const payload = buildJSONBackupPayload({
        categories: dummyCategories,
        transactions: dummyTransactions,
        budgets: dummyBudgets,
      });
      const jsonStr = JSON.stringify(payload);
      const result = validateBackupJSON(jsonStr);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.counts).toEqual({
        categories: 2,
        transactions: 2,
        budgets: 1,
        recurringTemplates: 0,
        bills: 0,
        savingsGoals: 0,
      });
    });

    it('rejects corrupt or non-JSON strings', () => {
      const result = validateBackupJSON('{ corrupt json payload ...');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Failed to parse JSON');
    });

    it('rejects backup payload missing schemaVersion', () => {
      const invalidPayload = {
        categories: dummyCategories,
        transactions: dummyTransactions,
      };
      const result = validateBackupJSON(JSON.stringify(invalidPayload));
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('schemaVersion');
    });

    it('rejects backup payload with unsupported future schemaVersion', () => {
      const futurePayload = {
        schemaVersion: '99.0',
        categories: dummyCategories,
        transactions: dummyTransactions,
      };
      const result = validateBackupJSON(JSON.stringify(futurePayload));
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Unsupported backup schema version');
    });

    it('rejects payload with invalid transaction enum type', () => {
      const badTxPayload = {
        schemaVersion: '1.0',
        categories: dummyCategories,
        transactions: [
          {
            ...dummyTransactions[0],
            type: 'invalid_type_enum',
          },
        ],
        budgets: [],
      };
      const result = validateBackupJSON(JSON.stringify(badTxPayload));
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid transaction type');
    });

    it('rejects payload with duplicate transaction IDs', () => {
      const dupPayload = {
        schemaVersion: '1.0',
        categories: dummyCategories,
        transactions: [dummyTransactions[0], dummyTransactions[0]],
        budgets: [],
      };
      const result = validateBackupJSON(JSON.stringify(dupPayload));
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Duplicate transaction ID');
    });
  });

  describe('Storage Backup & Safe Replace Restore Integration', () => {
    let repo: IndexedDBRepository;
    const testDbName = `test_backup_restore_db_${Date.now()}`;

    beforeEach(async () => {
      repo = new IndexedDBRepository(testDbName);
      await repo.init();
      await repo.clearAllData();
    });

    it('performs backup export -> wipe -> restore -> compare roundtrip successfully', async () => {
      // 1. Seed records in repo
      await repo.addTransaction({
        type: 'expense',
        amountMinor: 1500,
        currency: 'INR',
        dateLocal: '2026-10-05',
        categoryId: 'cat_food',
        note: 'Test Lunch',
      });

      await repo.saveBudget({
        periodKey: '2026-10',
        limitMinor: 50000,
        categoryId: 'cat_food',
      });

      // 2. Export full backup
      const exportedData = await repo.getAllDataForExport();
      expect(exportedData.transactions.length).toBe(1);
      expect(exportedData.budgets.length).toBe(1);

      const payload = buildJSONBackupPayload(exportedData);
      const jsonStr = JSON.stringify(payload);

      // Validate JSON
      const validation = validateBackupJSON(jsonStr);
      expect(validation.isValid).toBe(true);

      // 3. Clear database completely
      await repo.clearAllData();
      const countAfterClear = await repo.getTransactionCount();
      expect(countAfterClear).toBe(0);

      // 4. Restore backup
      await repo.restoreFullBackup(validation.parsedData!);

      // 5. Compare records after restore
      const restoredTx = await repo.getAllTransactions();
      const restoredBudgets = await repo.getAllBudgets();

      expect(restoredTx.length).toBe(1);
      expect(restoredTx[0].amountMinor).toBe(1500);
      expect(restoredTx[0].note).toBe('Test Lunch');
      expect(restoredBudgets.length).toBe(1);
    });

    it('ensures invalid backup validation does NOT mutate current stored data', async () => {
      // 1. Seed initial data
      await repo.addTransaction({
        type: 'income',
        amountMinor: 10000,
        currency: 'INR',
        dateLocal: '2026-10-01',
        categoryId: 'cat_salary',
        note: 'Pre-existing salary',
      });

      const countBefore = await repo.getTransactionCount();
      expect(countBefore).toBe(1);

      // 2. Attempt validation of invalid backup file
      const invalidJson = '{"schemaVersion":"99.0","transactions":[{"invalid":"data"}]}';
      const validation = validateBackupJSON(invalidJson);
      expect(validation.isValid).toBe(false);

      // 3. Verify count and records remain unchanged
      const countAfter = await repo.getTransactionCount();
      expect(countAfter).toBe(1);
      const txList = await repo.getAllTransactions();
      expect(txList[0].note).toBe('Pre-existing salary');
    });
  });
});
