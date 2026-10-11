import React from 'react';
import { render, screen, fireEvent, waitFor, act, cleanup } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NotificationStorage } from '../src/storage/notificationStorage';
import App from '../src/App';
import { ITransactionRepository, DashboardTotals } from '../src/storage/storageRepository';
import { Transaction, Category, Budget, StorageHealth, TransactionFilterOptions, Bill, SavingsGoal, SavingsContribution } from '../src/domain/types';
import { BUILT_IN_CATEGORIES } from '../src/domain/categoriesData';
import { getTodayLocalDateString } from '../src/domain/moneyAndDate';

class TestInMemoryRepository implements ITransactionRepository {
  private transactions: Transaction[] = [];
  private categories: Category[] = BUILT_IN_CATEGORIES.map((c) => ({ ...c }));
  private budgets: Budget[] = [];
  private bills: Bill[] = [];
  private savingsGoals: SavingsGoal[] = [];

  constructor() {}

  async init(): Promise<void> {}
  async getHealth(): Promise<StorageHealth> {
    return {
      indexedDBAvailable: true,
      databaseName: 'in_memory_test',
      databaseVersion: 1,
      transactionCount: this.transactions.length,
      categoryCount: this.categories.length,
      isStoragePersisted: true,
    };
  }

  async getTransactionCount(): Promise<number> {
    return this.transactions.length;
  }

  async getAllTransactions(filters?: TransactionFilterOptions): Promise<Transaction[]> {
    let list = [...this.transactions];
    list.sort((a, b) => b.dateLocal.localeCompare(a.dateLocal));
    if (!filters) return list;
    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      list = list.filter((t) => (t.note || '').toLowerCase().includes(q));
    }
    if (filters.type && filters.type !== 'all') {
      list = list.filter((t) => t.type === filters.type);
    }
    if (filters.categoryId && filters.categoryId !== 'all') {
      list = list.filter((t) => t.categoryId === filters.categoryId);
    }
    if (filters.month) {
      list = list.filter((t) => t.dateLocal.startsWith(filters.month!));
    }
    return list;
  }

  async getTransactionById(id: string): Promise<Transaction | null> {
    return this.transactions.find((t) => t.id === id) || null;
  }

  async addTransaction(data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<Transaction> {
    const now = new Date().toISOString();
    const newTx: Transaction = {
      ...data,
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: now,
      updatedAt: now,
    };
    this.transactions.push(newTx);
    return newTx;
  }

  async updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction> {
    const idx = this.transactions.findIndex((t) => t.id === id);
    if (idx === -1) throw new Error('Not found');
    const updated = {
      ...this.transactions[idx],
      ...updates,
      id,
      updatedAt: new Date().toISOString(),
    };
    this.transactions[idx] = updated;
    return updated;
  }

  async deleteTransaction(id: string): Promise<void> {
    this.transactions = this.transactions.filter((t) => t.id !== id);
  }

  async getAllCategories(includeArchived: boolean = false): Promise<Category[]> {
    if (!includeArchived) return this.categories.filter((c) => !c.isArchived);
    return [...this.categories];
  }

  async getCategoryById(id: string): Promise<Category | null> {
    return this.categories.find((c) => c.id === id) || null;
  }

  async addCategory(data: Omit<Category, 'id' | 'createdAt'>): Promise<Category> {
    const cat: Category = {
      ...data,
      id: `cat_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    this.categories.push(cat);
    return cat;
  }

  async updateCategory(id: string, updates: Partial<Category>): Promise<Category> {
    const idx = this.categories.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error('Not found');
    const updated = { ...this.categories[idx], ...updates, id };
    this.categories[idx] = updated;
    return updated;
  }

  async archiveCategory(id: string): Promise<Category> {
    return this.updateCategory(id, { isArchived: true });
  }

  async checkCategoryTransactionCount(categoryId: string): Promise<number> {
    return this.transactions.filter((t) => t.categoryId === categoryId).length;
  }

  async reassignCategoryTransactions(oldCategoryId: string, newCategoryId: string): Promise<void> {
    this.transactions.forEach((t) => {
      if (t.categoryId === oldCategoryId) t.categoryId = newCategoryId;
    });
  }

  // Budget methods
  async getAllBudgets(periodKey?: string): Promise<Budget[]> {
    if (periodKey) return this.budgets.filter((b) => b.periodKey === periodKey);
    return [...this.budgets];
  }

  async getBudgetById(id: string): Promise<Budget | null> {
    return this.budgets.find((b) => b.id === id) || null;
  }

  async getBudgetByPeriodAndCategory(periodKey: string, categoryId?: string): Promise<Budget | null> {
    return this.budgets.find((b) => b.periodKey === periodKey && (categoryId ? b.categoryId === categoryId : !b.categoryId)) || null;
  }

  async saveBudget(data: { periodKey: string; limitMinor: number; categoryId?: string }, editId?: string): Promise<Budget> {
    const now = new Date().toISOString();
    const existingIndex = this.budgets.findIndex((b) => {
      if (editId && b.id === editId) return true;
      if (b.periodKey === data.periodKey) {
        if (data.categoryId) return b.categoryId === data.categoryId;
        return !b.categoryId;
      }
      return false;
    });

    if (existingIndex !== -1) {
      const existing = this.budgets[existingIndex];
      const updated: Budget = {
        ...existing,
        limitMinor: data.limitMinor,
        categoryId: data.categoryId,
        updatedAt: now,
      };
      this.budgets[existingIndex] = updated;
      return updated;
    }

    const id = editId || `bgt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newBgt: Budget = {
      id,
      periodKey: data.periodKey,
      limitMinor: data.limitMinor,
      categoryId: data.categoryId,
      createdAt: now,
      updatedAt: now,
    };
    this.budgets.push(newBgt);
    return newBgt;
  }

  async deleteBudget(id: string): Promise<void> {
    this.budgets = this.budgets.filter((b) => b.id !== id);
  }

  async calculateTotals(currencyCode: string = 'INR'): Promise<DashboardTotals> {
    let totalBalanceMinor = 0;
    let monthlyIncomeMinor = 0;
    let monthlyExpenseMinor = 0;
    const prefix = getTodayLocalDateString().substring(0, 7);

    for (const t of this.transactions) {
      if (t.type === 'income') {
        totalBalanceMinor += t.amountMinor;
        if (t.dateLocal.startsWith(prefix)) monthlyIncomeMinor += t.amountMinor;
      } else {
        totalBalanceMinor -= t.amountMinor;
        if (t.dateLocal.startsWith(prefix)) monthlyExpenseMinor += t.amountMinor;
      }
    }

    let savingsRatePercentage = 0;
    if (monthlyIncomeMinor > 0) {
      savingsRatePercentage = Math.max(
        0,
        Math.round(((monthlyIncomeMinor - monthlyExpenseMinor) / monthlyIncomeMinor) * 100)
      );
    }

    return {
      totalBalanceMinor,
      monthlyIncomeMinor,
      monthlyExpenseMinor,
      savingsRatePercentage,
    };
  }

  async clearAllData(): Promise<void> {
    this.transactions = [];
    this.categories = BUILT_IN_CATEGORIES.map((c) => ({ ...c }));
    this.budgets = [];
  }

  // Phase 4 Stub Implementations for Test Repository
  async getAllRecurringTemplates() { return []; }
  async getRecurringTemplateById() { return null; }
  async saveRecurringTemplate(data: any) { return data; }
  async deleteRecurringTemplate() {}
  async getAllGeneratedOccurrenceKeys() { return new Set<string>(); }
  async recordOccurrenceGenerated() {}
  async generatePendingOccurrences() { return []; }

  async getAllBills() {
    return [...this.bills];
  }
  async getBillById(id: string) {
    return this.bills.find((b) => b.id === id) || null;
  }
  async saveBill(data: any, editId?: string) {
    const id = editId || `bill_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newBill = {
      ...data,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const idx = this.bills.findIndex((b) => b.id === id);
    if (idx !== -1) {
      this.bills[idx] = newBill;
    } else {
      this.bills.push(newBill);
    }
    return newBill;
  }
  async deleteBill(id: string) {
    this.bills = this.bills.filter((b) => b.id !== id);
  }
  async markBillPaid() {
    return { bill: {} as any };
  }

  async getAllSavingsGoals() {
    return [...this.savingsGoals];
  }
  async getSavingsGoalById(id: string) {
    return this.savingsGoals.find((g) => g.id === id) || null;
  }
  async saveSavingsGoal(data: any, editId?: string) {
    const id = editId || `goal_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newGoal = {
      ...data,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const idx = this.savingsGoals.findIndex((g) => g.id === id);
    if (idx !== -1) {
      this.savingsGoals[idx] = newGoal;
    } else {
      this.savingsGoals.push(newGoal);
    }
    return newGoal;
  }
  async deleteSavingsGoal(id: string) {
    this.savingsGoals = this.savingsGoals.filter((g) => g.id !== id);
  }
  async addSavingsContribution(goalId: string, amountMinor: number, note?: string) {
    const goal = this.savingsGoals.find((g) => g.id === goalId);
    if (goal) {
      goal.currentSavedMinor += amountMinor;
    }
    return {
      goal: goal || ({} as any),
      contribution: {
        id: `contrib_${Date.now()}`,
        goalId,
        amountMinor,
        dateLocal: getTodayLocalDateString(),
        note,
        createdAt: new Date().toISOString(),
      },
    };
  }
}

describe('App Integration Tests', () => {
  let mockRepo: TestInMemoryRepository;

  beforeEach(() => {
    mockRepo = new TestInMemoryRepository();
    NotificationStorage.clearAll();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders the Dashboard overview and empty state', async () => {
    render(<App repository={mockRepo} />);

    await waitFor(() => {
      expect(screen.getByText(/Financial Overview/i)).toBeInTheDocument();
      expect(screen.getByText(/Net Cash Flow/i)).toBeInTheDocument();
    });
  });

  it('opens Add Transaction modal, submits record, and updates dashboard metrics immediately', async () => {
    render(<App repository={mockRepo} />);

    await waitFor(() => {
      expect(screen.getByText(/Financial Overview/i)).toBeInTheDocument();
    });

    // Click Add Transaction button
    const addBtns = await screen.findAllByRole('button', { name: /Add Transaction/i });
    fireEvent.click(addBtns[0]);

    // Modal opens
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();

    // Enter amount, note, date and category
    const amountInput = document.getElementById('tx-amount') as HTMLInputElement;
    expect(amountInput).not.toBeNull();
    fireEvent.change(amountInput, { target: { value: '2500' } });

    const noteInput = document.getElementById('tx-note') as HTMLInputElement;
    expect(noteInput).not.toBeNull();
    fireEvent.change(noteInput, { target: { value: 'Monthly electric bill' } });

    const dateInput = document.getElementById('tx-date') as HTMLInputElement;
    if (dateInput) {
      fireEvent.change(dateInput, { target: { value: '2026-10-10' } });
    }

    const categorySelect = document.getElementById('tx-category') as HTMLSelectElement;
    if (categorySelect && categorySelect.options.length > 0) {
      fireEvent.change(categorySelect, { target: { value: categorySelect.options[0].value } });
    }

    // Submit form inside act to await saveTransaction promise
    const saveBtn = screen.getByRole('button', { name: /Save (Transaction|Changes)/i });
    const form = saveBtn.closest('form')!;
    await act(async () => {
      fireEvent.submit(form);
    });

    const txs = await mockRepo.getAllTransactions();
    expect(txs.length).toBe(1);
    expect(txs[0].note).toBe('Monthly electric bill');

    // Verify record saved & dashboard updated
    const itemNote = await screen.findByText(/Monthly electric bill/i);
    expect(itemNote).toBeInTheDocument();
  });

  it('navigates across tabs (Budgets & Reports) and renders budget/report UI', async () => {
    render(<App repository={mockRepo} />);

    await waitFor(() => {
      expect(screen.getByText(/Financial Overview/i)).toBeInTheDocument();
    });

    // Click Budgets navigation tab
    const budgetNavBtns = screen.getAllByRole('button', { name: /Budgets/i });
    fireEvent.click(budgetNavBtns[0]);

    await waitFor(() => {
      expect(screen.getByText(/Monthly Budgets & Limits/i)).toBeInTheDocument();
    });

    // Click Reports navigation tab
    const reportsNavBtns = screen.getAllByRole('button', { name: /Reports/i });
    fireEvent.click(reportsNavBtns[0]);

    await waitFor(() => {
      expect(screen.getByText(/Reports & Analytics/i)).toBeInTheDocument();
      expect(screen.getByText(/Monthly Cash Flow Overview/i)).toBeInTheDocument();
    });
  });

  it('renders time side-by-side when date is Today, and suppresses time when date is Yesterday', async () => {
    render(<App repository={mockRepo} />);

    await waitFor(() => {
      expect(screen.getByText(/Financial Overview/i)).toBeInTheDocument();
    });

    // Open Add Transaction modal
    const addBtn = screen.getAllByRole('button', { name: /Add Transaction/i })[0];
    fireEvent.click(addBtn);

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();

    // Verify time input is present when date is Today
    const timeInput = document.getElementById('tx-time') as HTMLInputElement;
    expect(timeInput).not.toBeNull();

    // Change date to a past date (e.g. 2026-10-09)
    const dateInput = document.getElementById('tx-date') as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: '2026-10-09' } });

    // Time input should be suppressed
    expect(document.getElementById('tx-time')).toBeNull();
    expect(screen.getByText(/Time is only recorded for today's entries/i)).toBeInTheDocument();

    // Change back to Today
    const today = getTodayLocalDateString();
    fireEvent.change(dateInput, { target: { value: today } });
    expect(document.getElementById('tx-time')).not.toBeNull();
  });

  it('verifies offline voice assistant modal workflow: cancellation, preview, and confirmed saving', async () => {
    render(<App repository={mockRepo} />);

    await waitFor(() => {
      expect(screen.getByText(/Financial Overview/i)).toBeInTheDocument();
    });

    const initialTxCount = (await mockRepo.getAllTransactions()).length;

    // 1. Open Voice Assistant modal via Voice AI button
    const voiceAiBtn = screen.getByRole('button', { name: /Voice AI/i });
    fireEvent.click(voiceAiBtn);

    await waitFor(() => {
      expect(screen.getByText(/Offline Voice Assistant/i)).toBeInTheDocument();
      expect(screen.getByText(/100% On-Device Neural Speech Recognition/i)).toBeInTheDocument();
    });

    // 2. Type a transcript into the editable input
    const transcriptInput = screen.getByPlaceholderText(/e\.g\. "My salary is/i);
    fireEvent.change(transcriptInput, { target: { value: 'Shopping par 1200 kharch kiye' } });

    // Verify preview card shows up
    await waitFor(() => {
      expect(screen.getByText(/Recognized Entry Preview/i)).toBeInTheDocument();
      expect(screen.getByText(/Confirm & Save to Account/i)).toBeInTheDocument();
    });

    // 3. Test cancellation: click Cancel
    const cancelBtn = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelBtn);

    // Modal closes
    await waitFor(() => {
      expect(screen.queryByText(/Offline Voice Assistant/i)).not.toBeInTheDocument();
    });

    // Verify no transaction was saved
    let txs = await mockRepo.getAllTransactions();
    expect(txs.length).toBe(initialTxCount);

    // 4. Open modal again and save with confirmation
    fireEvent.click(screen.getByRole('button', { name: /Voice AI/i }));
    await waitFor(() => {
      expect(screen.getByText(/Offline Voice Assistant/i)).toBeInTheDocument();
    });

    const transcriptInput2 = screen.getByPlaceholderText(/e\.g\. "My salary is/i);
    fireEvent.change(transcriptInput2, { target: { value: 'Shopping par 1200 kharch kiye' } });

    await waitFor(() => {
      expect(screen.getByText(/Confirm & Save to Account/i)).toBeInTheDocument();
    });

    const confirmBtn = screen.getByRole('button', { name: /Confirm & Save to Account/i });
    fireEvent.click(confirmBtn);

    // Modal shows success and saves
    await waitFor(
      () => {
        expect(screen.getByText(/Saved 1 transaction to your account!/i)).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    // Verify transaction exists in repository
    txs = await mockRepo.getAllTransactions();
    expect(txs.length).toBe(initialTxCount + 1);
    const savedTx = txs.find((t) => (t.note || '').toLowerCase().includes('shopping par 1200 kharch kiye'));
    expect(savedTx).toBeDefined();
    expect(savedTx?.amountMinor).toBe(120000);
    expect(savedTx?.type).toBe('expense');
    expect(savedTx?.categoryId).toBe('cat_shopping');
  });

  it('creates a savings goal and adds a contribution via Voice Assistant modal', async () => {
    render(<App repository={mockRepo} />);

    await waitFor(() => {
      expect(screen.getByText(/Financial Overview/i)).toBeInTheDocument();
    });

    // 1. Create a savings goal via Voice AI modal
    fireEvent.click(screen.getByRole('button', { name: /Voice AI/i }));
    await waitFor(() => {
      expect(screen.getByText(/Offline Voice Assistant/i)).toBeInTheDocument();
    });

    const transcriptInput = screen.getByPlaceholderText(/e\.g\. "My salary is/i);
    fireEvent.change(transcriptInput, { target: { value: 'Save for a new phone, target 20000 rupees.' } });

    await waitFor(() => {
      expect(screen.getByText(/Action Detected: Create Savings Goal/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Confirm & Create Savings Goal/i })).toBeInTheDocument();
    });

    const confirmGoalBtn = screen.getByRole('button', { name: /Confirm & Create Savings Goal/i });
    fireEvent.click(confirmGoalBtn);

    await waitFor(
      () => {
        expect(screen.getByText(/Created savings goal/i)).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    // Verify savings goal saved in repository
    const goals = await mockRepo.getAllSavingsGoals();
    expect(goals.length).toBe(1);
    expect(goals[0].name).toBe('New Phone');
    expect(goals[0].targetMinor).toBe(2000000);
    expect(goals[0].currentSavedMinor).toBe(0);

    // 2. Add contribution via Voice AI modal
    fireEvent.click(screen.getByRole('button', { name: /Voice AI/i }));
    await waitFor(() => {
      expect(screen.getByText(/Offline Voice Assistant/i)).toBeInTheDocument();
    });

    const transcriptInput2 = screen.getByPlaceholderText(/e\.g\. "My salary is/i);
    fireEvent.change(transcriptInput2, { target: { value: 'Add 500 rupees to my phone savings goal.' } });

    await waitFor(() => {
      expect(screen.getByText(/Action Detected: Add Savings Contribution/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Confirm & Add Contribution/i })).toBeInTheDocument();
    });

    const confirmContribBtn = screen.getByRole('button', { name: /Confirm & Add Contribution/i });
    fireEvent.click(confirmContribBtn);

    await waitFor(
      () => {
        expect(screen.getByText(/Added ₹500 to "New Phone"!/i)).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    // Verify savings goal balance updated
    const updatedGoals = await mockRepo.getAllSavingsGoals();
    expect(updatedGoals[0].currentSavedMinor).toBe(50000);
  });

  it('creates a recurring bill via Voice Assistant modal without creating duplicate expense transactions', async () => {
    render(<App repository={mockRepo} />);

    await waitFor(() => {
      expect(screen.getByText(/Financial Overview/i)).toBeInTheDocument();
    });

    const initialTxCount = (await mockRepo.getAllTransactions()).length;

    // Open Voice AI modal
    fireEvent.click(screen.getByRole('button', { name: /Voice AI/i }));
    await waitFor(() => {
      expect(screen.getByText(/Offline Voice Assistant/i)).toBeInTheDocument();
    });

    const transcriptInput = screen.getByPlaceholderText(/e\.g\. "My salary is/i);
    fireEvent.change(transcriptInput, { target: { value: 'Add a monthly internet bill of 999 rupees.' } });

    await waitFor(() => {
      expect(screen.getByText(/Action Detected: Create Recurring Bill/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Confirm & Save Recurring Bill/i })).toBeInTheDocument();
    });

    const confirmBillBtn = screen.getByRole('button', { name: /Confirm & Save Recurring Bill/i });
    fireEvent.click(confirmBillBtn);

    await waitFor(
      () => {
        expect(screen.getByText(/Saved recurring monthly bill/i)).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    // Verify bill saved in repository
    const bills = await mockRepo.getAllBills();
    expect(bills.length).toBe(1);
    expect(bills[0].name).toBe('Internet Bill');
    expect(bills[0].amountMinor).toBe(99900);
    expect(bills[0].frequency).toBe('monthly');
    expect(bills[0].isPaid).toBe(false);

    // Crucial check: Creating recurring bill must NOT create duplicate paid expense transactions!
    const txs = await mockRepo.getAllTransactions();
    expect(txs.length).toBe(initialTxCount);
  });
});
