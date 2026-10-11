import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import FDBFactory from 'fake-indexeddb/lib/FDBFactory';
import { IndexedDBRepository } from '../src/storage/storageRepository';
import { getTodayLocalDateString } from '../src/domain/moneyAndDate';
import { setDBName, closeDB, closeAllDBs } from '../src/storage/db';

describe('IndexedDB Storage Repository', () => {
  let repo: IndexedDBRepository;
  const dbName = `test_repo_storage_${Date.now()}`;

  beforeAll(async () => {
    repo = new IndexedDBRepository(dbName);
    await repo.init();
  });

  beforeEach(async () => {
    await repo.clearAllData();
  });

  afterAll(async () => {
    await closeDB(dbName);
  });

  it('seeds built-in categories once on initialization', async () => {
    const categories = await repo.getAllCategories(true);
    expect(categories.length).toBeGreaterThan(15);
    const foodCat = categories.find((c) => c.name === 'Food & Dining');
    expect(foodCat).toBeDefined();
    expect(foodCat?.isBuiltIn).toBe(true);
  });

  it('adds and retrieves transactions correctly', async () => {
    const today = getTodayLocalDateString();
    const created = await repo.addTransaction({
      type: 'expense',
      amountMinor: 1500,
      currency: 'INR',
      dateLocal: today,
      categoryId: 'cat_food',
      note: 'Lunch at cafe',
    });

    expect(created.id).toBeDefined();
    expect(created.amountMinor).toBe(1500);

    const fetched = await repo.getTransactionById(created.id);
    expect(fetched).not.toBeNull();
    expect(fetched?.note).toBe('Lunch at cafe');
  });

  it('edits an existing transaction without creating a duplicate', async () => {
    const today = getTodayLocalDateString();
    const original = await repo.addTransaction({
      type: 'expense',
      amountMinor: 2000,
      currency: 'INR',
      dateLocal: today,
      categoryId: 'cat_food',
      note: 'Original note',
    });

    const countBefore = await repo.getTransactionCount();
    expect(countBefore).toBe(1);

    const updated = await repo.updateTransaction(original.id, {
      amountMinor: 2500,
      note: 'Updated note',
    });

    expect(updated.id).toBe(original.id);
    expect(updated.amountMinor).toBe(2500);

    const countAfter = await repo.getTransactionCount();
    expect(countAfter).toBe(1); // No duplicate created!
  });

  it('deletes a transaction from storage', async () => {
    const today = getTodayLocalDateString();
    const tx = await repo.addTransaction({
      type: 'income',
      amountMinor: 50000,
      currency: 'INR',
      dateLocal: today,
      categoryId: 'cat_salary',
    });

    await repo.deleteTransaction(tx.id);
    const fetched = await repo.getTransactionById(tx.id);
    expect(fetched).toBeNull();
  });

  it('calculates dashboard totals accurately', async () => {
    const today = getTodayLocalDateString();
    // Income 50,000 minor
    await repo.addTransaction({
      type: 'income',
      amountMinor: 50000,
      currency: 'INR',
      dateLocal: today,
      categoryId: 'cat_salary',
    });

    // Expense 10,000 minor
    await repo.addTransaction({
      type: 'expense',
      amountMinor: 10000,
      currency: 'INR',
      dateLocal: today,
      categoryId: 'cat_food',
    });

    const totals = await repo.calculateTotals('INR');
    expect(totals.totalBalanceMinor).toBe(40000);
    expect(totals.monthlyIncomeMinor).toBe(50000);
    expect(totals.monthlyExpenseMinor).toBe(10000);
    expect(totals.savingsRatePercentage).toBe(80); // (40000 / 50000) * 100
  });

  it('filters transactions by search query, type, category, and date', async () => {
    const today = getTodayLocalDateString();
    await repo.addTransaction({
      type: 'expense',
      amountMinor: 1200,
      currency: 'INR',
      dateLocal: today,
      categoryId: 'cat_food',
      note: 'Dinner with team',
    });

    await repo.addTransaction({
      type: 'expense',
      amountMinor: 800,
      currency: 'INR',
      dateLocal: today,
      categoryId: 'cat_groceries',
      note: 'Supermarket shopping',
    });

    await repo.addTransaction({
      type: 'income',
      amountMinor: 30000,
      currency: 'INR',
      dateLocal: today,
      categoryId: 'cat_salary',
      note: 'Monthly salary',
    });

    // Test Search filter
    const searchResults = await repo.getAllTransactions({ searchQuery: 'Dinner' });
    expect(searchResults.length).toBe(1);
    expect(searchResults[0].note).toBe('Dinner with team');

    // Test Type filter
    const incomeResults = await repo.getAllTransactions({ type: 'income' });
    expect(incomeResults.length).toBe(1);
    expect(incomeResults[0].type).toBe('income');

    // Test Category filter
    const groceryResults = await repo.getAllTransactions({ categoryId: 'cat_groceries' });
    expect(groceryResults.length).toBe(1);
    expect(groceryResults[0].categoryId).toBe('cat_groceries');
  });

  it('handles category archival and reassignments', async () => {
    const customCat = await repo.addCategory({
      name: 'Old Gym Subscription',
      type: 'expense',
      icon: 'Heart',
      color: '#FF0000',
      isBuiltIn: false,
      isArchived: false,
    });

    const today = getTodayLocalDateString();
    await repo.addTransaction({
      type: 'expense',
      amountMinor: 2000,
      currency: 'INR',
      dateLocal: today,
      categoryId: customCat.id,
      note: 'Gym fee',
    });

    const count = await repo.checkCategoryTransactionCount(customCat.id);
    expect(count).toBe(1);

    // Reassign transactions to cat_health and archive customCat
    await repo.reassignCategoryTransactions(customCat.id, 'cat_health');
    await repo.archiveCategory(customCat.id);

    const oldCatCount = await repo.checkCategoryTransactionCount(customCat.id);
    expect(oldCatCount).toBe(0);

    const updatedCat = await repo.getCategoryById(customCat.id);
    expect(updatedCat?.isArchived).toBe(true);
  });

  it('saves, retrieves, and updates budgets enforcing upsert for period/category', async () => {
    // 1. Create overall budget
    const b1 = await repo.saveBudget({
      periodKey: '2026-10',
      limitMinor: 500000,
    });
    expect(b1.id).toBeDefined();
    expect(b1.limitMinor).toBe(500000);

    const budgetsOct = await repo.getAllBudgets('2026-10');
    expect(budgetsOct.length).toBe(1);

    // 2. Save budget with same periodKey and overall category (should upsert, NOT create duplicate)
    const b1Updated = await repo.saveBudget({
      periodKey: '2026-10',
      limitMinor: 600000,
    });
    expect(b1Updated.id).toBe(b1.id); // Same ID!
    expect(b1Updated.limitMinor).toBe(600000);

    const budgetsOctAfter = await repo.getAllBudgets('2026-10');
    expect(budgetsOctAfter.length).toBe(1);

    // 3. Category budget creation
    const bCategory = await repo.saveBudget({
      periodKey: '2026-10',
      categoryId: 'cat_food',
      limitMinor: 100000,
    });
    expect(bCategory.categoryId).toBe('cat_food');

    const budgetsOctAll = await repo.getAllBudgets('2026-10');
    expect(budgetsOctAll.length).toBe(2);

    // 4. Delete budget
    await repo.deleteBudget(bCategory.id);
    const budgetsRemaining = await repo.getAllBudgets('2026-10');
    expect(budgetsRemaining.length).toBe(1);
    expect(budgetsRemaining[0].id).toBe(b1.id);
  });

  it('saves, retrieves, and generates recurring templates with single occurrence keys', async () => {
    const tpl = await repo.saveRecurringTemplate({
      type: 'expense',
      amountMinor: 1500000,
      currency: 'INR',
      categoryId: 'cat_housing',
      frequency: 'monthly',
      startDateLocal: '2026-09-01',
      nextDueDateLocal: '2026-10-01',
      status: 'active',
      note: 'Monthly Apartment Rent',
    });

    expect(tpl.id).toBeDefined();
    expect(tpl.nextDueDateLocal).toBe('2026-10-01');

    const list = await repo.getAllRecurringTemplates();
    expect(list.length).toBe(1);

    // Generate occurrence for 2026-10-01
    const pending = [
      {
        template: tpl,
        dueDateLocal: '2026-10-01',
        occurrenceKey: `${tpl.id}_2026-10-01`,
      },
    ];

    const generatedTxs = await repo.generatePendingOccurrences(pending);
    expect(generatedTxs.length).toBe(1);
    expect(generatedTxs[0].amountMinor).toBe(1500000);

    // Verify occurrence key recorded
    const keys = await repo.getAllGeneratedOccurrenceKeys();
    expect(keys.has(`${tpl.id}_2026-10-01`)).toBe(true);

    // Verify template nextDueDateLocal advanced to 2026-11-01
    const updatedTpl = await repo.getRecurringTemplateById(tpl.id);
    expect(updatedTpl?.nextDueDateLocal).toBe('2026-11-01');
  });

  it('manages bill tracking and prevents duplicate transactions when marking paid', async () => {
    const bill = await repo.saveBill({
      name: 'Internet Bill',
      amountMinor: 120000,
      currency: 'INR',
      dueDateLocal: '2026-10-15',
      frequency: 'monthly',
      categoryId: 'cat_utilities',
      isPaid: false,
    });

    expect(bill.isPaid).toBe(false);

    // Mark paid with transaction creation
    const { bill: paidBill, transaction: tx1 } = await repo.markBillPaid(bill.id, true);
    expect(paidBill.isPaid).toBe(true);
    expect(tx1).toBeDefined();
    expect(tx1?.amountMinor).toBe(120000);

    const txCountBefore = await repo.getTransactionCount();

    // Mark paid AGAIN (duplicate call prevention check)
    const { bill: rePaidBill, transaction: tx2 } = await repo.markBillPaid(bill.id, true);
    expect(rePaidBill.isPaid).toBe(true);
    const txCountAfter = await repo.getTransactionCount();

    // No duplicate transaction created!
    expect(txCountAfter).toBe(txCountBefore);
    expect(tx2?.id).toBe(tx1?.id);
  });

  it('handles savings goals and contribution tracking', async () => {
    const goal = await repo.saveSavingsGoal({
      name: 'New Laptop Fund',
      targetMinor: 8000000,
      currentSavedMinor: 0,
      color: '#3B82F6',
      icon: 'Laptop',
    });

    expect(goal.currentSavedMinor).toBe(0);

    // Deposit 30,000 minor
    const { goal: updatedGoal, contribution } = await repo.addSavingsContribution(
      goal.id,
      3000000,
      'Initial deposit'
    );

    expect(updatedGoal.currentSavedMinor).toBe(3000000);
    expect(contribution.amountMinor).toBe(3000000);

    const fetchedGoal = await repo.getSavingsGoalById(goal.id);
    expect(fetchedGoal?.currentSavedMinor).toBe(3000000);
  });
});
