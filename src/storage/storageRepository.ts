import {
  Transaction,
  Category,
  Budget,
  StorageHealth,
  TransactionFilterOptions,
  RecurringTemplate,
  RecurringOccurrence,
  Bill,
  SavingsGoal,
  SavingsContribution,
} from '../domain/types';
import { getDB, checkStorageHealth } from './db';
import { getTodayLocalDateString, getCurrentLocalTimeString } from '../domain/moneyAndDate';
import { BUILT_IN_CATEGORIES, resolveTransactionCategory } from '../domain/categoriesData';
import {
  calculateNextDueDate,
  PendingOccurrence,
} from '../domain/recurringAndBills';

export interface DashboardTotals {
  totalBalanceMinor: number;
  monthlyIncomeMinor: number;
  monthlyExpenseMinor: number;
  savingsRatePercentage: number;
}

export interface ITransactionRepository {
  init(): Promise<void>;
  getHealth(): Promise<StorageHealth>;
  getAllTransactions(filters?: TransactionFilterOptions): Promise<Transaction[]>;
  getTransactionById(id: string): Promise<Transaction | null>;
  getTransactionCount(): Promise<number>;
  addTransaction(data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<Transaction>;
  updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction>;
  deleteTransaction(id: string): Promise<void>;
  
  // Category Methods
  getAllCategories(includeArchived?: boolean): Promise<Category[]>;
  getCategoryById(id: string): Promise<Category | null>;
  addCategory(data: Omit<Category, 'id' | 'createdAt'>): Promise<Category>;
  updateCategory(id: string, updates: Partial<Category>): Promise<Category>;
  archiveCategory(id: string): Promise<Category>;
  checkCategoryTransactionCount(categoryId: string): Promise<number>;
  reassignCategoryTransactions(oldCategoryId: string, newCategoryId: string): Promise<void>;

  // Budget Methods
  getAllBudgets(periodKey?: string): Promise<Budget[]>;
  getBudgetById(id: string): Promise<Budget | null>;
  getBudgetByPeriodAndCategory(periodKey: string, categoryId?: string): Promise<Budget | null>;
  saveBudget(data: { periodKey: string; limitMinor: number; categoryId?: string }, editId?: string): Promise<Budget>;
  deleteBudget(id: string): Promise<void>;

  // Recurring Template Methods
  getAllRecurringTemplates(): Promise<RecurringTemplate[]>;
  getRecurringTemplateById(id: string): Promise<RecurringTemplate | null>;
  saveRecurringTemplate(
    data: Omit<RecurringTemplate, 'id' | 'createdAt' | 'updatedAt'>,
    editId?: string
  ): Promise<RecurringTemplate>;
  deleteRecurringTemplate(id: string): Promise<void>;
  getAllGeneratedOccurrenceKeys(): Promise<Set<string>>;
  recordOccurrenceGenerated(
    occurrenceKey: string,
    templateId: string,
    dueDateLocal: string,
    generatedTransactionId?: string
  ): Promise<void>;
  generatePendingOccurrences(occurrences: PendingOccurrence[]): Promise<Transaction[]>;

  // Bill Methods
  getAllBills(): Promise<Bill[]>;
  getBillById(id: string): Promise<Bill | null>;
  saveBill(data: Omit<Bill, 'id' | 'createdAt' | 'updatedAt'>, editId?: string): Promise<Bill>;
  deleteBill(id: string): Promise<void>;
  markBillPaid(
    billId: string,
    createExpenseTransaction?: boolean
  ): Promise<{ bill: Bill; transaction?: Transaction }>;

  // Savings Goal Methods
  getAllSavingsGoals(): Promise<SavingsGoal[]>;
  getSavingsGoalById(id: string): Promise<SavingsGoal | null>;
  saveSavingsGoal(
    data: Omit<SavingsGoal, 'id' | 'createdAt' | 'updatedAt'>,
    editId?: string
  ): Promise<SavingsGoal>;
  deleteSavingsGoal(id: string): Promise<void>;
  addSavingsContribution(
    goalId: string,
    amountMinor: number,
    note?: string
  ): Promise<{ goal: SavingsGoal; contribution: SavingsContribution }>;
  getSavingsContributionsByGoalId(goalId: string): Promise<SavingsContribution[]>;
  getAllSavingsContributions(): Promise<SavingsContribution[]>;
  deleteSavingsContribution(contributionId: string): Promise<SavingsGoal>;
  updateSavingsContribution(
    contributionId: string,
    amountMinor: number,
    note?: string,
    dateLocal?: string
  ): Promise<{ goal: SavingsGoal; contribution: SavingsContribution }>;

  calculateTotals(currencyCode?: string): Promise<DashboardTotals>;
  getAllDataForExport(): Promise<{
    categories: Category[];
    transactions: Transaction[];
    budgets: Budget[];
    recurringTemplates: RecurringTemplate[];
    bills: Bill[];
    savingsGoals: SavingsGoal[];
    savingsContributions?: SavingsContribution[];
  }>;
  restoreFullBackup(backupData: any): Promise<void>;
  clearAllData(): Promise<void>;
}

async function ensureCategoriesSeeded(dbName?: string): Promise<void> {
  const db = await getDB(dbName);
  const count = await db.count('categories');
  if (count === 0) {
    const tx = db.transaction('categories', 'readwrite');
    for (const cat of BUILT_IN_CATEGORIES) {
      tx.store.put(cat);
    }
    await tx.done;
  }
}

export class IndexedDBRepository implements ITransactionRepository {
  private customDbName?: string;

  constructor(dbName?: string) {
    this.customDbName = dbName;
  }

  private async db() {
    return await getDB(this.customDbName);
  }

  async init(): Promise<void> {
    try {
      await this.db();
      await ensureCategoriesSeeded(this.customDbName);
    } catch (err) {
      console.error('[StorageRepository] Failed to initialize IndexedDB:', err);
      throw err;
    }
  }

  async getHealth(): Promise<StorageHealth> {
    return await checkStorageHealth(this.customDbName);
  }

  async getTransactionCount(): Promise<number> {
    try {
      const db = await this.db();
      return await db.count('transactions');
    } catch (err) {
      return 0;
    }
  }

  // --- TRANSACTIONS CRUD ---

  async getAllTransactions(filters?: TransactionFilterOptions): Promise<Transaction[]> {
    try {
      const db = await this.db();
      let all = await db.getAll('transactions');
      const categories = await this.getAllCategories(true);
      const categoryMap = new Map<string, Category>(categories.map((c) => [c.id, c]));

      // Auto-repair any legacy or voice-orphaned category IDs
      for (const tx of all) {
        if (!categoryMap.has(tx.categoryId)) {
          const resolved = resolveTransactionCategory(tx.categoryId, categories, tx.note, tx.type);
          if (resolved && resolved.id !== tx.categoryId) {
            tx.categoryId = resolved.id;
            db.put('transactions', tx).catch(() => {});
          }
        }
      }

      // Sort newest first: dateLocal descending, createdAt descending
      all.sort((a, b) => {
        if (a.dateLocal !== b.dateLocal) {
          return b.dateLocal.localeCompare(a.dateLocal);
        }
        return b.createdAt.localeCompare(a.createdAt);
      });

      if (!filters) return all;

      return all.filter((tx) => {
        // Filter by type
        if (filters.type && filters.type !== 'all' && tx.type !== filters.type) {
          return false;
        }

        // Filter by categoryId
        if (filters.categoryId && filters.categoryId !== 'all' && tx.categoryId !== filters.categoryId) {
          return false;
        }

        // Filter by Month (YYYY-MM)
        if (filters.month && !tx.dateLocal.startsWith(filters.month)) {
          return false;
        }

        // Filter by Start Date
        if (filters.startDate && tx.dateLocal < filters.startDate) {
          return false;
        }

        // Filter by End Date
        if (filters.endDate && tx.dateLocal > filters.endDate) {
          return false;
        }

        // Filter by Search Query (searches in note and category name)
        if (filters.searchQuery) {
          const query = filters.searchQuery.toLowerCase().trim();
          const categoryName = categoryMap.get(tx.categoryId)?.name || resolveTransactionCategory(tx.categoryId, categories, tx.note, tx.type)?.name || '';
          const noteText = (tx.note || '').toLowerCase();
          const matches = noteText.includes(query) || categoryName.toLowerCase().includes(query);
          if (!matches) return false;
        }

        return true;
      });
    } catch (err) {
      console.error('[StorageRepository] Error fetching transactions:', err);
      throw new Error('Failed to load transactions from local database.');
    }
  }

  async getTransactionById(id: string): Promise<Transaction | null> {
    try {
      const db = await this.db();
      const tx = await db.get('transactions', id);
      return tx || null;
    } catch (err) {
      console.error(`[StorageRepository] Error fetching transaction ${id}:`, err);
      return null;
    }
  }

  async addTransaction(data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<Transaction> {
    if (!data.amountMinor || data.amountMinor <= 0) {
      throw new Error('Transaction amount must be greater than zero.');
    }
    if (!data.categoryId) {
      throw new Error('Transaction must have a valid category selected.');
    }
    if (!data.dateLocal) {
      throw new Error('Transaction date is required.');
    }

    try {
      const db = await this.db();
      const now = new Date().toISOString();
      const id = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const isToday = data.dateLocal === getTodayLocalDateString();
      const timeLocal = isToday ? (data.timeLocal || getCurrentLocalTimeString()) : undefined;

      const newTx: Transaction = {
        id,
        type: data.type,
        amountMinor: Math.round(data.amountMinor),
        currency: data.currency || 'INR',
        dateLocal: data.dateLocal,
        timeLocal,
        categoryId: data.categoryId,
        note: data.note ? data.note.trim() : undefined,
        accountId: data.accountId,
        createdAt: now,
        updatedAt: now,
      };

      await db.put('transactions', newTx);
      return newTx;
    } catch (err) {
      console.error('[StorageRepository] Error adding transaction:', err);
      throw new Error(err instanceof Error ? err.message : 'Could not save transaction to IndexedDB storage.');
    }
  }

  async updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction> {
    try {
      const db = await this.db();
      const existing = await db.get('transactions', id);
      if (!existing) {
        throw new Error(`Transaction with ID "${id}" was not found.`);
      }

      const now = new Date().toISOString();
      const targetDate = updates.dateLocal || existing.dateLocal;
      const isToday = targetDate === getTodayLocalDateString();
      let updatedTimeLocal: string | undefined = undefined;
      if (isToday) {
        updatedTimeLocal = updates.timeLocal !== undefined ? updates.timeLocal : (existing.timeLocal || getCurrentLocalTimeString());
      }

      const updatedTx: Transaction = {
        ...existing,
        ...updates,
        timeLocal: updatedTimeLocal,
        id, // Preserve existing ID, NEVER create duplicates
        amountMinor: updates.amountMinor !== undefined ? Math.round(updates.amountMinor) : existing.amountMinor,
        updatedAt: now,
      };

      if (updatedTx.amountMinor <= 0) {
        throw new Error('Transaction amount must be greater than zero.');
      }

      await db.put('transactions', updatedTx);
      return updatedTx;
    } catch (err) {
      console.error(`[StorageRepository] Error updating transaction ${id}:`, err);
      throw new Error(err instanceof Error ? err.message : 'Failed to update transaction in IndexedDB storage.');
    }
  }

  async deleteTransaction(id: string): Promise<void> {
    try {
      const db = await this.db();
      await db.delete('transactions', id);
    } catch (err) {
      console.error(`[StorageRepository] Error deleting transaction ${id}:`, err);
      throw new Error(err instanceof Error ? err.message : 'Failed to delete transaction from IndexedDB storage.');
    }
  }

  // --- CATEGORIES CRUD ---

  async getAllCategories(includeArchived: boolean = false): Promise<Category[]> {
    try {
      const db = await this.db();
      let all = await db.getAll('categories');

      if (!all || all.length === 0) {
        await ensureCategoriesSeeded(this.customDbName);
        all = await db.getAll('categories');
      }

      if (!all || all.length === 0) {
        return includeArchived ? BUILT_IN_CATEGORIES : BUILT_IN_CATEGORIES.filter((c) => !c.isArchived);
      }

      if (!includeArchived) {
        return all.filter((cat) => !cat.isArchived);
      }
      return all;
    } catch (err) {
      console.error('[StorageRepository] Error fetching categories:', err);
      return includeArchived ? BUILT_IN_CATEGORIES : BUILT_IN_CATEGORIES.filter((c) => !c.isArchived);
    }
  }

  async getCategoryById(id: string): Promise<Category | null> {
    try {
      const db = await this.db();
      const cat = await db.get('categories', id);
      return cat || null;
    } catch (err) {
      console.error(`[StorageRepository] Error fetching category ${id}:`, err);
      return null;
    }
  }

  async addCategory(data: Omit<Category, 'id' | 'createdAt'>): Promise<Category> {
    if (!data.name || !data.name.trim()) {
      throw new Error('Category name is required.');
    }

    try {
      const db = await this.db();
      const id = `cat_custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const now = new Date().toISOString();

      const newCategory: Category = {
        id,
        name: data.name.trim(),
        type: data.type,
        icon: data.icon || (data.type === 'income' ? 'DollarSign' : 'Tag'),
        color: data.color || (data.type === 'income' ? '#21845A' : '#176B87'),
        isBuiltIn: false,
        isArchived: false,
        createdAt: now,
      };

      await db.put('categories', newCategory);
      return newCategory;
    } catch (err) {
      console.error('[StorageRepository] Error adding category:', err);
      throw new Error('Failed to create custom category.');
    }
  }

  async updateCategory(id: string, updates: Partial<Category>): Promise<Category> {
    try {
      const db = await this.db();
      const existing = await db.get('categories', id);
      if (!existing) {
        throw new Error(`Category "${id}" not found.`);
      }

      const updatedCategory: Category = {
        ...existing,
        ...updates,
        id, // Preserve ID
      };

      await db.put('categories', updatedCategory);
      return updatedCategory;
    } catch (err) {
      console.error(`[StorageRepository] Error updating category ${id}:`, err);
      throw new Error('Failed to update category.');
    }
  }

  async archiveCategory(id: string): Promise<Category> {
    return await this.updateCategory(id, { isArchived: true });
  }

  async checkCategoryTransactionCount(categoryId: string): Promise<number> {
    try {
      const db = await this.db();
      const index = db.transaction('transactions', 'readonly').store.index('by_categoryId');
      return await index.count(categoryId);
    } catch (err) {
      console.error(`[StorageRepository] Error counting transactions for category ${categoryId}:`, err);
      return 0;
    }
  }

  async reassignCategoryTransactions(oldCategoryId: string, newCategoryId: string): Promise<void> {
    try {
      const db = await this.db();
      const tx = db.transaction('transactions', 'readwrite');
      const index = tx.store.index('by_categoryId');
      const transactions = await index.getAll(oldCategoryId);

      for (const t of transactions) {
        t.categoryId = newCategoryId;
        t.updatedAt = new Date().toISOString();
        await tx.store.put(t);
      }
      await tx.done;
    } catch (err) {
      console.error('[StorageRepository] Error reassigning category transactions:', err);
      throw new Error('Failed to reassign category transactions.');
    }
  }

  // --- BUDGETS CRUD ---

  async getAllBudgets(periodKey?: string): Promise<Budget[]> {
    try {
      const db = await this.db();
      const all = await db.getAll('budgets');
      if (periodKey) {
        return all.filter((b) => b.periodKey === periodKey);
      }
      return all;
    } catch (err) {
      console.error('[StorageRepository] Error fetching budgets:', err);
      return [];
    }
  }

  async getBudgetById(id: string): Promise<Budget | null> {
    try {
      const db = await this.db();
      const b = await db.get('budgets', id);
      return b || null;
    } catch (err) {
      console.error(`[StorageRepository] Error fetching budget ${id}:`, err);
      return null;
    }
  }

  async getBudgetByPeriodAndCategory(periodKey: string, categoryId?: string): Promise<Budget | null> {
    try {
      const all = await this.getAllBudgets(periodKey);
      const match = all.find((b) => {
        if (categoryId) return b.categoryId === categoryId;
        return !b.categoryId;
      });
      return match || null;
    } catch (err) {
      return null;
    }
  }

  async saveBudget(
    data: { periodKey: string; limitMinor: number; categoryId?: string },
    editId?: string
  ): Promise<Budget> {
    if (!data.periodKey || !/^\d{4}-\d{2}$/.test(data.periodKey)) {
      throw new Error('Valid period key (YYYY-MM) is required.');
    }
    if (!data.limitMinor || data.limitMinor <= 0) {
      throw new Error('Budget limit must be greater than zero.');
    }

    try {
      const db = await this.db();
      const now = new Date().toISOString();

      // Upsert check: find duplicate for periodKey & categoryId
      const existingBudgets = await this.getAllBudgets(data.periodKey);
      const duplicateMatch = existingBudgets.find((b) => {
        if (editId && b.id === editId) return false;
        if (data.categoryId) return b.categoryId === data.categoryId;
        return !b.categoryId;
      });

      let targetId = editId;
      if (!targetId && duplicateMatch) {
        targetId = duplicateMatch.id;
      }

      let existingObj: Budget | undefined;
      if (targetId) {
        existingObj = await db.get('budgets', targetId);
      }

      const id = targetId || `bgt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const savedBudget: Budget = {
        id,
        periodKey: data.periodKey,
        limitMinor: Math.round(data.limitMinor),
        categoryId: data.categoryId || undefined,
        createdAt: existingObj ? existingObj.createdAt : now,
        updatedAt: now,
      };

      await db.put('budgets', savedBudget);
      return savedBudget;
    } catch (err) {
      console.error('[StorageRepository] Error saving budget:', err);
      throw new Error('Failed to save budget record in local database.');
    }
  }

  async deleteBudget(id: string): Promise<void> {
    try {
      const db = await this.db();
      await db.delete('budgets', id);
    } catch (err) {
      console.error(`[StorageRepository] Error deleting budget ${id}:`, err);
      throw new Error('Failed to delete budget record.');
    }
  }

  // --- DASHBOARD TOTALS CALCULATIONS ---

  async calculateTotals(currencyCode: string = 'INR'): Promise<DashboardTotals> {
    try {
      const db = await this.db();
      const allTx = await db.getAll('transactions');
      const currentMonthPrefix = getTodayLocalDateString().substring(0, 7); // YYYY-MM

      let totalBalanceMinor = 0;
      let monthlyIncomeMinor = 0;
      let monthlyExpenseMinor = 0;

      for (const tx of allTx) {
        // If transaction has different currency, we include if matching or all
        if (tx.currency && tx.currency !== currencyCode) {
          // optionally handle multi-currency or standard aggregation
        }

        if (tx.type === 'income') {
          totalBalanceMinor += tx.amountMinor;
          if (tx.dateLocal.startsWith(currentMonthPrefix)) {
            monthlyIncomeMinor += tx.amountMinor;
          }
        } else {
          totalBalanceMinor -= tx.amountMinor;
          if (tx.dateLocal.startsWith(currentMonthPrefix)) {
            monthlyExpenseMinor += tx.amountMinor;
          }
        }
      }

      let savingsRatePercentage = 0;
      if (monthlyIncomeMinor > 0) {
        const netSavings = monthlyIncomeMinor - monthlyExpenseMinor;
        savingsRatePercentage = Math.max(0, Math.round((netSavings / monthlyIncomeMinor) * 100));
      }

      return {
        totalBalanceMinor,
        monthlyIncomeMinor,
        monthlyExpenseMinor,
        savingsRatePercentage,
      };
    } catch (err) {
      console.error('[StorageRepository] Error calculating totals:', err);
      return {
        totalBalanceMinor: 0,
        monthlyIncomeMinor: 0,
        monthlyExpenseMinor: 0,
        savingsRatePercentage: 0,
      };
    }
  }

  // --- RECURRING TEMPLATES STORAGE METHODS ---

  async getAllRecurringTemplates(): Promise<RecurringTemplate[]> {
    try {
      const db = await this.db();
      const list = await db.getAll('recurring_templates');
      list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return list;
    } catch (err) {
      console.error('[StorageRepository] Error fetching recurring templates:', err);
      return [];
    }
  }

  async getRecurringTemplateById(id: string): Promise<RecurringTemplate | null> {
    try {
      const db = await this.db();
      const t = await db.get('recurring_templates', id);
      return t || null;
    } catch (err) {
      console.error(`[StorageRepository] Error fetching template ${id}:`, err);
      return null;
    }
  }

  async saveRecurringTemplate(
    data: Omit<RecurringTemplate, 'id' | 'createdAt' | 'updatedAt'>,
    editId?: string
  ): Promise<RecurringTemplate> {
    try {
      const db = await this.db();
      const now = new Date().toISOString();
      const id = editId || `tpl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      let createdAt = now;
      if (editId) {
        const existing = await db.get('recurring_templates', editId);
        if (existing) createdAt = existing.createdAt;
      }

      const template: RecurringTemplate = {
        ...data,
        id,
        preferredDay: data.preferredDay || Number(data.startDateLocal.split('-')[2]),
        createdAt,
        updatedAt: now,
      };

      await db.put('recurring_templates', template);
      return template;
    } catch (err) {
      console.error('[StorageRepository] Error saving recurring template:', err);
      throw new Error('Failed to save recurring template.');
    }
  }

  async deleteRecurringTemplate(id: string): Promise<void> {
    try {
      const db = await this.db();
      await db.delete('recurring_templates', id);
    } catch (err) {
      console.error(`[StorageRepository] Error deleting template ${id}:`, err);
      throw new Error('Failed to delete recurring template.');
    }
  }

  async getAllGeneratedOccurrenceKeys(): Promise<Set<string>> {
    try {
      const db = await this.db();
      const occurrences = await db.getAll('recurring_occurrences');
      return new Set(occurrences.map((o) => o.occurrenceKey));
    } catch (err) {
      console.error('[StorageRepository] Error fetching generated occurrence keys:', err);
      return new Set();
    }
  }

  async recordOccurrenceGenerated(
    occurrenceKey: string,
    templateId: string,
    dueDateLocal: string,
    generatedTransactionId?: string
  ): Promise<void> {
    try {
      const db = await this.db();
      const occ: RecurringOccurrence = {
        occurrenceKey,
        templateId,
        dueDateLocal,
        generatedTransactionId,
        generatedAt: new Date().toISOString(),
      };
      await db.put('recurring_occurrences', occ);
    } catch (err) {
      console.error('[StorageRepository] Error recording occurrence key:', err);
    }
  }

  async generatePendingOccurrences(occurrences: PendingOccurrence[]): Promise<Transaction[]> {
    const createdTxList: Transaction[] = [];
    const generatedKeys = await this.getAllGeneratedOccurrenceKeys();

    for (const item of occurrences) {
      const { template, dueDateLocal, occurrenceKey } = item;

      // Idempotency: skip if occurrence was already generated
      if (generatedKeys.has(occurrenceKey)) {
        continue;
      }

      // 1. Create Transaction
      const newTx = await this.addTransaction({
        type: template.type,
        amountMinor: template.amountMinor,
        currency: template.currency,
        dateLocal: dueDateLocal,
        categoryId: template.categoryId,
        note: template.note ? `[Recurring] ${template.note}` : '[Recurring scheduled transaction]',
      });

      createdTxList.push(newTx);
      generatedKeys.add(occurrenceKey);

      // 2. Record occurrence key to guarantee single execution
      await this.recordOccurrenceGenerated(occurrenceKey, template.id, dueDateLocal, newTx.id);

      // 3. Advance template nextDueDateLocal to next cycle
      const nextDue = calculateNextDueDate(
        dueDateLocal,
        template.frequency,
        template.preferredDay
      );
      await this.saveRecurringTemplate(
        {
          ...template,
          nextDueDateLocal: nextDue,
        },
        template.id
      );
    }

    return createdTxList;
  }

  // --- BILL TRACKER STORAGE METHODS ---

  async getAllBills(): Promise<Bill[]> {
    try {
      const db = await this.db();
      const list = await db.getAll('bills');
      list.sort((a, b) => a.dueDateLocal.localeCompare(b.dueDateLocal));
      return list;
    } catch (err) {
      console.error('[StorageRepository] Error fetching bills:', err);
      return [];
    }
  }

  async getBillById(id: string): Promise<Bill | null> {
    try {
      const db = await this.db();
      const b = await db.get('bills', id);
      return b || null;
    } catch (err) {
      console.error(`[StorageRepository] Error fetching bill ${id}:`, err);
      return null;
    }
  }

  async saveBill(
    data: Omit<Bill, 'id' | 'createdAt' | 'updatedAt'>,
    editId?: string
  ): Promise<Bill> {
    try {
      const db = await this.db();
      const now = new Date().toISOString();
      const id = editId || `bill_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      let createdAt = now;
      let existing: Bill | undefined;
      if (editId) {
        existing = await db.get('bills', editId);
        if (existing) createdAt = existing.createdAt;
      }

      // Safe synchronization of linked payment transaction:
      if (editId && existing) {
        const txId = data.paidTransactionId || existing.paidTransactionId;
        if (existing.isPaid && !data.isPaid && txId) {
          // Reversal: delete linked payment transaction
          try {
            await db.delete('transactions', txId);
          } catch (e) {
            console.warn('[StorageRepository] Error removing reversed transaction:', e);
          }
          data.paidTransactionId = undefined;
          data.paidDateLocal = undefined;
        } else if (data.isPaid && txId) {
          // Sync changes to existing payment transaction
          try {
            const existingTx = await db.get('transactions', txId);
            if (existingTx) {
              existingTx.amountMinor = data.amountMinor;
              existingTx.note = `Bill Payment: ${data.name}`;
              existingTx.categoryId = data.categoryId;
              existingTx.updatedAt = now;
              await db.put('transactions', existingTx);
            }
          } catch (e) {
            console.warn('[StorageRepository] Error syncing bill transaction:', e);
          }
        }
      }

      const bill: Bill = {
        ...data,
        id,
        createdAt,
        updatedAt: now,
      };

      await db.put('bills', bill);
      return bill;
    } catch (err) {
      console.error('[StorageRepository] Error saving bill:', err);
      throw new Error('Failed to save bill record.');
    }
  }

  async deleteBill(id: string): Promise<void> {
    try {
      const db = await this.db();
      await db.delete('bills', id);
    } catch (err) {
      console.error(`[StorageRepository] Error deleting bill ${id}:`, err);
      throw new Error('Failed to delete bill.');
    }
  }

  async markBillPaid(
    billId: string,
    createExpenseTransaction: boolean = true
  ): Promise<{ bill: Bill; transaction?: Transaction }> {
    const existing = await this.getBillById(billId);
    if (!existing) throw new Error('Bill not found.');

    // PREVENT DUPLICATES: If already marked paid, return existing record
    if (existing.isPaid) {
      let linkedTx: Transaction | undefined;
      if (existing.paidTransactionId) {
        const tx = await this.getTransactionById(existing.paidTransactionId);
        if (tx) linkedTx = tx;
      }
      return { bill: existing, transaction: linkedTx };
    }

    const today = getTodayLocalDateString();
    let createdTx: Transaction | undefined;

    if (createExpenseTransaction) {
      createdTx = await this.addTransaction({
        type: 'expense',
        amountMinor: existing.amountMinor,
        currency: existing.currency,
        dateLocal: today,
        categoryId: existing.categoryId,
        note: `Bill Payment: ${existing.name}`,
      });
    }

    const updatedBill = await this.saveBill(
      {
        ...existing,
        isPaid: true,
        paidDateLocal: today,
        paidTransactionId: createdTx?.id,
      },
      existing.id
    );

    return { bill: updatedBill, transaction: createdTx };
  }

  // --- SAVINGS GOALS STORAGE METHODS ---

  async getAllSavingsGoals(): Promise<SavingsGoal[]> {
    try {
      const db = await this.db();
      const list = await db.getAll('savings_goals');
      list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return list;
    } catch (err) {
      console.error('[StorageRepository] Error fetching savings goals:', err);
      return [];
    }
  }

  async getSavingsGoalById(id: string): Promise<SavingsGoal | null> {
    try {
      const db = await this.db();
      const g = await db.get('savings_goals', id);
      return g || null;
    } catch (err) {
      console.error(`[StorageRepository] Error fetching goal ${id}:`, err);
      return null;
    }
  }

  async saveSavingsGoal(
    data: Omit<SavingsGoal, 'id' | 'createdAt' | 'updatedAt'>,
    editId?: string
  ): Promise<SavingsGoal> {
    try {
      const db = await this.db();
      const now = new Date().toISOString();
      const id = editId || `goal_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      let createdAt = now;
      if (editId) {
        const existing = await db.get('savings_goals', editId);
        if (existing) createdAt = existing.createdAt;
      }

      const goal: SavingsGoal = {
        ...data,
        id,
        createdAt,
        updatedAt: now,
      };

      await db.put('savings_goals', goal);
      return goal;
    } catch (err) {
      console.error('[StorageRepository] Error saving goal:', err);
      throw new Error('Failed to save savings goal.');
    }
  }

  async deleteSavingsGoal(id: string): Promise<void> {
    try {
      const db = await this.db();
      const contribs = await db.getAllFromIndex('savings_contributions', 'by_goalId', id);
      for (const c of contribs) {
        await db.delete('savings_contributions', c.id);
      }
      await db.delete('savings_goals', id);
    } catch (err) {
      console.error(`[StorageRepository] Error deleting goal ${id}:`, err);
      throw new Error('Failed to delete goal.');
    }
  }

  async addSavingsContribution(
    goalId: string,
    amountMinor: number,
    note?: string
  ): Promise<{ goal: SavingsGoal; contribution: SavingsContribution }> {
    const goal = await this.getSavingsGoalById(goalId);
    if (!goal) throw new Error('Savings goal not found.');

    const now = new Date().toISOString();
    const today = getTodayLocalDateString();
    const contribId = `contrib_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const contribution: SavingsContribution = {
      id: contribId,
      goalId,
      amountMinor,
      dateLocal: today,
      note,
      createdAt: now,
    };

    const newSaved = Math.max(0, goal.currentSavedMinor + amountMinor);
    const updatedGoal = await this.saveSavingsGoal(
      {
        ...goal,
        currentSavedMinor: newSaved,
      },
      goal.id
    );

    const db = await this.db();
    await db.put('savings_contributions', contribution);

    return { goal: updatedGoal, contribution };
  }

  async getSavingsContributionsByGoalId(goalId: string): Promise<SavingsContribution[]> {
    try {
      const db = await this.db();
      const list = await db.getAllFromIndex('savings_contributions', 'by_goalId', goalId);
      return (list || []).sort((a, b) => {
        if (b.dateLocal !== a.dateLocal) return b.dateLocal.localeCompare(a.dateLocal);
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      });
    } catch (err) {
      console.error(`[StorageRepository] Error fetching contributions for goal ${goalId}:`, err);
      return [];
    }
  }

  async getAllSavingsContributions(): Promise<SavingsContribution[]> {
    try {
      const db = await this.db();
      const list = await db.getAll('savings_contributions');
      return list || [];
    } catch (err) {
      console.error('[StorageRepository] Error fetching all savings contributions:', err);
      return [];
    }
  }

  async deleteSavingsContribution(contributionId: string): Promise<SavingsGoal> {
    try {
      const db = await this.db();
      const contrib = await db.get('savings_contributions', contributionId);
      if (!contrib) throw new Error('Contribution not found.');

      await db.delete('savings_contributions', contributionId);

      const remaining = await db.getAllFromIndex('savings_contributions', 'by_goalId', contrib.goalId);
      const newTotalSaved = remaining.reduce((sum, c) => sum + (c.amountMinor || 0), 0);

      const goal = await this.getSavingsGoalById(contrib.goalId);
      if (!goal) throw new Error('Goal not found.');

      const updatedGoal = await this.saveSavingsGoal(
        {
          ...goal,
          currentSavedMinor: Math.max(0, newTotalSaved),
        },
        goal.id
      );

      return updatedGoal;
    } catch (err) {
      console.error(`[StorageRepository] Error deleting contribution ${contributionId}:`, err);
      throw err;
    }
  }

  async updateSavingsContribution(
    contributionId: string,
    amountMinor: number,
    note?: string,
    dateLocal?: string
  ): Promise<{ goal: SavingsGoal; contribution: SavingsContribution }> {
    try {
      if (amountMinor <= 0) throw new Error('Contribution amount must be greater than zero.');
      const db = await this.db();
      const contrib = await db.get('savings_contributions', contributionId);
      if (!contrib) throw new Error('Contribution not found.');

      const updatedContrib: SavingsContribution = {
        ...contrib,
        amountMinor,
        note: note !== undefined ? note : contrib.note,
        dateLocal: dateLocal || contrib.dateLocal,
      };

      await db.put('savings_contributions', updatedContrib);

      const allForGoal = await db.getAllFromIndex('savings_contributions', 'by_goalId', contrib.goalId);
      const newTotalSaved = allForGoal.reduce((sum, c) => sum + (c.amountMinor || 0), 0);

      const goal = await this.getSavingsGoalById(contrib.goalId);
      if (!goal) throw new Error('Goal not found.');

      const updatedGoal = await this.saveSavingsGoal(
        {
          ...goal,
          currentSavedMinor: Math.max(0, newTotalSaved),
        },
        goal.id
      );

      return { goal: updatedGoal, contribution: updatedContrib };
    } catch (err) {
      console.error(`[StorageRepository] Error updating contribution ${contributionId}:`, err);
      throw err;
    }
  }

  async getAllDataForExport(): Promise<{
    categories: Category[];
    transactions: Transaction[];
    budgets: Budget[];
    recurringTemplates: RecurringTemplate[];
    bills: Bill[];
    savingsGoals: SavingsGoal[];
    savingsContributions?: SavingsContribution[];
  }> {
    try {
      const db = await this.db();
      const categories = await db.getAll('categories');
      const transactions = await db.getAll('transactions');
      const budgets = await db.getAll('budgets');
      const recurringTemplates = await db.getAll('recurring_templates');
      const bills = await db.getAll('bills');
      const savingsGoals = await db.getAll('savings_goals');
      const savingsContributions = await db.getAll('savings_contributions');

      return {
        categories: categories || [],
        transactions: transactions || [],
        budgets: budgets || [],
        recurringTemplates: recurringTemplates || [],
        bills: bills || [],
        savingsGoals: savingsGoals || [],
        savingsContributions: savingsContributions || [],
      };
    } catch (err) {
      console.error('[StorageRepository] Error fetching all data for export:', err);
      throw new Error('Failed to read data from IndexedDB for backup.');
    }
  }

  async restoreFullBackup(backupData: any): Promise<void> {
    try {
      const db = await this.db();
      const storeNames = [
        'transactions',
        'categories',
        'budgets',
        'recurring_templates',
        'recurring_occurrences',
        'bills',
        'savings_goals',
        'savings_contributions',
      ] as const;

      // 1. Wipe all stores
      for (const storeName of storeNames) {
        await db.clear(storeName);
      }

      // 2. Insert incoming records
      if (backupData.categories && backupData.categories.length > 0) {
        for (const cat of backupData.categories) {
          await db.put('categories', cat);
        }
      } else {
        for (const cat of BUILT_IN_CATEGORIES) {
          await db.put('categories', cat);
        }
      }

      if (backupData.transactions && backupData.transactions.length > 0) {
        for (const tx of backupData.transactions) {
          await db.put('transactions', tx);
        }
      }

      if (backupData.budgets && backupData.budgets.length > 0) {
        for (const b of backupData.budgets) {
          await db.put('budgets', b);
        }
      }

      if (backupData.recurringTemplates && backupData.recurringTemplates.length > 0) {
        for (const tpl of backupData.recurringTemplates) {
          await db.put('recurring_templates', tpl);
        }
      }

      if (backupData.bills && backupData.bills.length > 0) {
        for (const bill of backupData.bills) {
          await db.put('bills', bill);
        }
      }

      if (backupData.savingsGoals && backupData.savingsGoals.length > 0) {
        for (const goal of backupData.savingsGoals) {
          await db.put('savings_goals', goal);
        }
      }

      if (backupData.savingsContributions && backupData.savingsContributions.length > 0) {
        for (const contrib of backupData.savingsContributions) {
          await db.put('savings_contributions', contrib);
        }
      }
    } catch (err) {
      console.error('[StorageRepository] Error restoring backup to IndexedDB:', err);
      throw new Error('Failed to restore backup data into IndexedDB.');
    }
  }

  async clearAllData(): Promise<void> {
    try {
      const db = await this.db();
      const storeNames = [
        'transactions',
        'categories',
        'budgets',
        'recurring_templates',
        'recurring_occurrences',
        'bills',
        'savings_goals',
        'savings_contributions',
      ] as const;

      for (const storeName of storeNames) {
        await db.clear(storeName);
      }

      for (const cat of BUILT_IN_CATEGORIES) {
        await db.put('categories', cat);
      }
    } catch (err) {
      console.error('[StorageRepository] Error clearing database:', err);
      throw err;
    }
  }
}

export const transactionRepository = new IndexedDBRepository();

