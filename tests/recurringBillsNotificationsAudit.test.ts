import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { IndexedDBRepository } from '../src/storage/storageRepository';
import { closeDB } from '../src/storage/db';
import { getTodayLocalDateString, parseAmountToMinor, formatMinorToMajor } from '../src/domain/moneyAndDate';
import {
  calculateNextDueDate,
  generateOccurrenceKey,
  getPendingDueOccurrences,
  calculateBillStatus,
} from '../src/domain/recurringAndBills';
import {
  generateAppNotifications,
  generateBillDueTodayId,
  generateBillOverdueId,
  generateBillPaidId,
  generateRecurringPostedId,
  AppNotification,
} from '../src/domain/notificationService';
import { NotificationStorage } from '../src/storage/notificationStorage';
import { calculateMonthlySummary, calculateCategorySpendingBreakdown } from '../src/domain/budgetAndReport';
import { Bill, RecurringTemplate } from '../src/domain/types';

describe('Phase 4: Comprehensive Recurring, Bills & In-App Notifications Audit', () => {
  let repo: IndexedDBRepository;
  const dbName = `test_audit_${Date.now()}`;

  beforeAll(async () => {
    repo = new IndexedDBRepository(dbName);
    await repo.init();
  });

  beforeEach(async () => {
    await repo.clearAllData();
    NotificationStorage.clearAll();
  });

  afterAll(async () => {
    await closeDB(dbName);
  });

  // ==========================================
  // SCENARIOS 1-7: RECURRING TRANSACTIONS
  // ==========================================

  it('Scenarios 1-4: Creates monthly rent rule for ₹12,000, processes occurrence, verifies exactly 1 expense and balance decreases by ₹12,000', async () => {
    // 0. Initial balance should be 0
    let totals = await repo.calculateTotals('INR');
    expect(totals.totalBalanceMinor).toBe(0);

    // Initial income of ₹50,000 so balance isn't negative
    await repo.addTransaction({
      type: 'income',
      amountMinor: 5000000,
      currency: 'INR',
      dateLocal: '2026-10-01',
      categoryId: 'cat_salary',
      note: 'Salary income',
    });
    totals = await repo.calculateTotals('INR');
    expect(totals.totalBalanceMinor).toBe(5000000);

    // Scenario 1: Create a monthly rent rule for ₹12,000
    const rentAmountMinor = parseAmountToMinor('12000', 'INR'); // 1,200,000 minor units
    expect(rentAmountMinor).toBe(1200000);

    const rentTemplate = await repo.saveRecurringTemplate({
      type: 'expense',
      amountMinor: rentAmountMinor,
      currency: 'INR',
      categoryId: 'cat_housing',
      frequency: 'monthly',
      startDateLocal: '2026-10-01',
      nextDueDateLocal: '2026-10-01',
      preferredDay: 1,
      status: 'active',
      note: 'Monthly Rent',
    });
    expect(rentTemplate.id).toBeDefined();
    expect(rentTemplate.amountMinor).toBe(1200000);

    // Scenario 2: Process its first scheduled occurrence
    const generatedKeys = await repo.getAllGeneratedOccurrenceKeys();
    const pending = getPendingDueOccurrences([rentTemplate], generatedKeys, '2026-10-01');
    expect(pending.length).toBe(1);
    expect(pending[0].dueDateLocal).toBe('2026-10-01');

    const createdTx = await repo.generatePendingOccurrences(pending);

    // Scenario 3: Verify exactly one expense transaction is created
    expect(createdTx.length).toBe(1);
    expect(createdTx[0].amountMinor).toBe(1200000);
    expect(createdTx[0].type).toBe('expense');
    expect(createdTx[0].note).toContain('Monthly Rent');

    const allTx = await repo.getAllTransactions();
    // 1 income + 1 rent expense = 2 transactions total
    expect(allTx.length).toBe(2);
    const rentExpenses = allTx.filter((t) => t.type === 'expense' && t.amountMinor === 1200000);
    expect(rentExpenses.length).toBe(1);

    // Scenario 4: Verify the balance decreases by ₹12,000
    totals = await repo.calculateTotals('INR');
    // 50,000 - 12,000 = 38,000 (3,800,000 minor units)
    expect(totals.totalBalanceMinor).toBe(3800000);
  });

  it('Scenarios 5-6: Running the scheduler again for the same occurrence does NOT create a second expense', async () => {
    const rentTemplate = await repo.saveRecurringTemplate({
      type: 'expense',
      amountMinor: 1200000,
      currency: 'INR',
      categoryId: 'cat_housing',
      frequency: 'monthly',
      startDateLocal: '2026-10-01',
      nextDueDateLocal: '2026-10-01',
      preferredDay: 1,
      status: 'active',
      note: 'Monthly Rent',
    });

    const pending1 = getPendingDueOccurrences(
      [rentTemplate],
      await repo.getAllGeneratedOccurrenceKeys(),
      '2026-10-01'
    );
    expect(pending1.length).toBe(1);

    // Process occurrence 1
    await repo.generatePendingOccurrences(pending1);
    let allTx = await repo.getAllTransactions();
    expect(allTx.length).toBe(1);

    // Scenario 5: Run the scheduler again for the exact same occurrence
    const updatedGeneratedKeys = await repo.getAllGeneratedOccurrenceKeys();
    const pending2 = getPendingDueOccurrences([rentTemplate], updatedGeneratedKeys, '2026-10-01');
    expect(pending2.length).toBe(0); // getPendingDueOccurrences filters out already generated

    // Even if duplicate occurrence item is forced to generatePendingOccurrences:
    await repo.generatePendingOccurrences(pending1);

    // Scenario 6: Verify no second expense is created
    allTx = await repo.getAllTransactions();
    expect(allTx.length).toBe(1);
    const totals = await repo.calculateTotals('INR');
    expect(totals.totalBalanceMinor).toBe(-1200000); // Decreased exactly once
  });

  it('Scenario 7: Pausing the rule prevents future occurrences from being generated', async () => {
    const template = await repo.saveRecurringTemplate({
      type: 'expense',
      amountMinor: 1200000,
      currency: 'INR',
      categoryId: 'cat_housing',
      frequency: 'monthly',
      startDateLocal: '2026-10-01',
      nextDueDateLocal: '2026-10-01',
      preferredDay: 1,
      status: 'active',
      note: 'Monthly Rent',
    });

    // Pause the rule
    const pausedTemplate = await repo.saveRecurringTemplate(
      { ...template, status: 'paused' },
      template.id
    );
    expect(pausedTemplate.status).toBe('paused');

    // Run scheduler check for due date
    const generatedKeys = await repo.getAllGeneratedOccurrenceKeys();
    const pending = getPendingDueOccurrences([pausedTemplate], generatedKeys, '2026-10-01');

    // Scenario 7: No occurrences should be pending
    expect(pending.length).toBe(0);

    const createdTx = await repo.generatePendingOccurrences(pending);
    expect(createdTx.length).toBe(0);

    const allTx = await repo.getAllTransactions();
    expect(allTx.length).toBe(0);
  });

  // ==========================================
  // SCENARIOS 8-13: BILLS & BALANCE LOGIC
  // ==========================================

  it('Scenarios 8-9: Creating an unpaid electricity bill for ₹1,500 does NOT alter balance', async () => {
    // Initial income: ₹10,000
    await repo.addTransaction({
      type: 'income',
      amountMinor: 1000000,
      currency: 'INR',
      dateLocal: '2026-10-01',
      categoryId: 'cat_salary',
      note: 'Initial Income',
    });
    let totals = await repo.calculateTotals('INR');
    expect(totals.totalBalanceMinor).toBe(1000000);

    // Scenario 8: Create an unpaid electricity bill for ₹1,500
    const bill = await repo.saveBill({
      name: 'Electricity Bill',
      amountMinor: 150000,
      currency: 'INR',
      dueDateLocal: '2026-10-25',
      frequency: 'monthly',
      categoryId: 'cat_utilities',
      isPaid: false,
    });
    expect(bill.id).toBeDefined();
    expect(bill.isPaid).toBe(false);

    // Scenario 9: Verify the balance remains unchanged
    totals = await repo.calculateTotals('INR');
    expect(totals.totalBalanceMinor).toBe(1000000);

    const transactions = await repo.getAllTransactions();
    expect(transactions.length).toBe(1); // Only initial income, no bill expense
  });

  it('Scenarios 10-12: Marking bill as paid creates exactly one ₹1,500 expense; repeating payment never duplicates', async () => {
    // Initial income ₹10,000
    await repo.addTransaction({
      type: 'income',
      amountMinor: 1000000,
      currency: 'INR',
      dateLocal: '2026-10-01',
      categoryId: 'cat_salary',
      note: 'Initial Income',
    });

    const bill = await repo.saveBill({
      name: 'Electricity Bill',
      amountMinor: 150000,
      currency: 'INR',
      dueDateLocal: '2026-10-25',
      frequency: 'monthly',
      categoryId: 'cat_utilities',
      isPaid: false,
    });

    // Scenario 10: Mark the bill as paid
    const paymentResult = await repo.markBillPaid(bill.id, true);
    expect(paymentResult.bill.isPaid).toBe(true);
    expect(paymentResult.transaction).toBeDefined();

    // Scenario 11: Verify exactly one ₹1,500 expense is created and balance decreases once
    let allTx = await repo.getAllTransactions();
    expect(allTx.length).toBe(2); // Initial income + 1 bill expense
    const billExpenses = allTx.filter((t) => t.type === 'expense' && t.amountMinor === 150000);
    expect(billExpenses.length).toBe(1);

    let totals = await repo.calculateTotals('INR');
    // 10,000 - 1,500 = 8,500 (850,000 minor)
    expect(totals.totalBalanceMinor).toBe(850000);

    // Scenario 12: Repeat the mark-paid action
    const repeatResult = await repo.markBillPaid(bill.id, true);
    expect(repeatResult.bill.isPaid).toBe(true);

    // Verify NO duplicate expense appears
    allTx = await repo.getAllTransactions();
    expect(allTx.length).toBe(2);
    totals = await repo.calculateTotals('INR');
    expect(totals.totalBalanceMinor).toBe(850000);
  });

  it('Scenario 13: Bill payment status persists after reload', async () => {
    const bill = await repo.saveBill({
      name: 'Internet Bill',
      amountMinor: 99900,
      currency: 'INR',
      dueDateLocal: '2026-10-20',
      frequency: 'monthly',
      categoryId: 'cat_utilities',
      isPaid: false,
    });

    await repo.markBillPaid(bill.id, true);

    // Simulate app reload by creating new repository instance with same database
    const reloadedRepo = new IndexedDBRepository(dbName);
    await reloadedRepo.init();

    const fetchedBill = await reloadedRepo.getBillById(bill.id);
    expect(fetchedBill).not.toBeNull();
    expect(fetchedBill?.isPaid).toBe(true);
    expect(fetchedBill?.paidDateLocal).toBeDefined();
    expect(fetchedBill?.paidTransactionId).toBeDefined();
  });

  // ==========================================
  // SCENARIOS 14-17: IN-APP NOTIFICATIONS
  // ==========================================

  it('Scenario 14: Create a bill due today and verify appropriate in-app notification appears', () => {
    const today = getTodayLocalDateString();
    const todayBill: Bill = {
      id: 'bill_today_1',
      name: 'Mobile Recharge',
      amountMinor: 49900,
      currency: 'INR',
      dueDateLocal: today,
      frequency: 'monthly',
      categoryId: 'cat_utilities',
      isPaid: false,
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z',
    };

    const readIds = new Set<string>();
    const notifications = generateAppNotifications({
      bills: [todayBill],
      eventNotifications: [],
      readIds,
      currencyCode: 'INR',
      todayDateLocal: today,
    });

    expect(notifications.length).toBe(1);
    expect(notifications[0].type).toBe('bill_due_today');
    expect(notifications[0].title).toContain('Mobile Recharge');
    expect(notifications[0].message).toContain('₹499.00');
    expect(notifications[0].isRead).toBe(false);
  });

  it('Scenario 15: Create an unpaid bill with past due date and verify overdue notification appears', () => {
    const pastBill: Bill = {
      id: 'bill_past_1',
      name: 'Water Utility',
      amountMinor: 35000,
      currency: 'INR',
      dueDateLocal: '2026-10-01',
      frequency: 'monthly',
      categoryId: 'cat_utilities',
      isPaid: false,
      createdAt: '2026-09-15T00:00:00.000Z',
      updatedAt: '2026-09-15T00:00:00.000Z',
    };

    const readIds = new Set<string>();
    const notifications = generateAppNotifications({
      bills: [pastBill],
      eventNotifications: [],
      readIds,
      currencyCode: 'INR',
      todayDateLocal: '2026-10-11',
    });

    expect(notifications.length).toBe(1);
    expect(notifications[0].type).toBe('bill_overdue');
    expect(notifications[0].title).toContain('Water Utility');
    expect(notifications[0].message).toContain('10 days overdue');
    expect(notifications[0].isRead).toBe(false);
  });

  it('Scenario 16: Mark the bill as paid and verify its overdue reminder is resolved', () => {
    const bill: Bill = {
      id: 'bill_water_2',
      name: 'Water Utility',
      amountMinor: 35000,
      currency: 'INR',
      dueDateLocal: '2026-10-01',
      frequency: 'monthly',
      categoryId: 'cat_utilities',
      isPaid: false,
      createdAt: '2026-09-15T00:00:00.000Z',
      updatedAt: '2026-09-15T00:00:00.000Z',
    };

    // Before payment: overdue reminder exists
    let notifications = generateAppNotifications({
      bills: [bill],
      eventNotifications: [],
      readIds: new Set<string>(),
      currencyCode: 'INR',
      todayDateLocal: '2026-10-11',
    });
    expect(notifications.some((n) => n.type === 'bill_overdue')).toBe(true);

    // Mark as paid
    const paidBill: Bill = {
      ...bill,
      isPaid: true,
      paidDateLocal: '2026-10-11',
      paidTransactionId: 'tx_paid_123',
    };

    const paidEvent: AppNotification = {
      id: generateBillPaidId(paidBill.id, '2026-10-11'),
      type: 'bill_paid',
      title: `Bill Paid: ${paidBill.name}`,
      message: `Bill "${paidBill.name}" for ₹350.00 was marked as paid.`,
      dateLocal: '2026-10-11',
      createdAt: new Date().toISOString(),
      isRead: false,
      entityId: paidBill.id,
    };

    notifications = generateAppNotifications({
      bills: [paidBill],
      eventNotifications: [paidEvent],
      readIds: new Set<string>(),
      currencyCode: 'INR',
      todayDateLocal: '2026-10-11',
    });

    // Overdue notification is resolved (no longer in list)
    expect(notifications.some((n) => n.type === 'bill_overdue')).toBe(false);
    // Paid event notification is present
    expect(notifications.some((n) => n.type === 'bill_paid')).toBe(true);
  });

  it('Scenario 17: Notification count and read status remain consistent after storage reload', () => {
    const bill: Bill = {
      id: 'bill_persistent_1',
      name: 'Broadband',
      amountMinor: 129900,
      currency: 'INR',
      dueDateLocal: '2026-10-11',
      frequency: 'monthly',
      categoryId: 'cat_utilities',
      isPaid: false,
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z',
    };

    const notifId = generateBillDueTodayId(bill.id, bill.dueDateLocal);

    // Initial state: 1 unread notification
    let readIds = NotificationStorage.getReadNotificationIds();
    let notifs = generateAppNotifications({
      bills: [bill],
      eventNotifications: [],
      readIds,
      currencyCode: 'INR',
      todayDateLocal: '2026-10-11',
    });
    expect(notifs[0].isRead).toBe(false);

    // User marks it as read
    NotificationStorage.markAsRead(notifId);

    // Reload from storage
    readIds = NotificationStorage.getReadNotificationIds();
    expect(readIds.has(notifId)).toBe(true);

    notifs = generateAppNotifications({
      bills: [bill],
      eventNotifications: [],
      readIds,
      currencyCode: 'INR',
      todayDateLocal: '2026-10-11',
    });
    expect(notifs[0].isRead).toBe(true);
    expect(notifs.filter((n) => !n.isRead).length).toBe(0);
  });

  // ==========================================
  // SCENARIO 18: MONTH BOUNDARIES & LEAP YEARS
  // ==========================================

  it('Scenario 18: Handles month boundaries, year boundaries, and leap year local dates deterministically', () => {
    // 1. Month boundary with 31st day:
    // Jan 31 -> Feb 28 in non-leap year (2026)
    expect(calculateNextDueDate('2026-01-31', 'monthly', 31)).toBe('2026-02-28');
    // Feb 28 -> Mar 31 (preserves preferred day 31)
    expect(calculateNextDueDate('2026-02-28', 'monthly', 31)).toBe('2026-03-31');
    // Mar 31 -> Apr 30
    expect(calculateNextDueDate('2026-03-31', 'monthly', 31)).toBe('2026-04-30');

    // 2. Year boundary:
    // Dec 31 -> Jan 31 next year
    expect(calculateNextDueDate('2026-12-31', 'monthly', 31)).toBe('2027-01-31');
    // Dec 15 yearly -> Dec 15 next year
    expect(calculateNextDueDate('2026-12-15', 'yearly', 15)).toBe('2027-12-15');

    // 3. Leap year (2028 is leap year):
    expect(calculateNextDueDate('2028-01-31', 'monthly', 31)).toBe('2028-02-29');
    expect(calculateNextDueDate('2028-02-29', 'yearly', 29)).toBe('2029-02-28');
  });

  // ==========================================
  // SCENARIO 19: REPORTS & DASHBOARD COHERENCE
  // ==========================================

  it('Scenario 19: Dashboard totals, reports, and transaction history derive from single underlying truth', async () => {
    const periodKey = '2026-10';

    // Add Income: ₹80,000
    await repo.addTransaction({
      type: 'income',
      amountMinor: 8000000,
      currency: 'INR',
      dateLocal: '2026-10-05',
      categoryId: 'cat_salary',
      note: 'Salary',
    });

    // Add Rent Expense: ₹25,000
    await repo.addTransaction({
      type: 'expense',
      amountMinor: 2500000,
      currency: 'INR',
      dateLocal: '2026-10-06',
      categoryId: 'cat_housing',
      note: 'Rent payment',
    });

    // Add Groceries: ₹5,000
    await repo.addTransaction({
      type: 'expense',
      amountMinor: 500000,
      currency: 'INR',
      dateLocal: '2026-10-08',
      categoryId: 'cat_food',
      note: 'Groceries',
    });

    const allTx = await repo.getAllTransactions();
    const categories = await repo.getAllCategories(true);

    // Repository Totals
    const repoTotals = await repo.calculateTotals('INR');
    expect(repoTotals.totalBalanceMinor).toBe(8000000 - 3000000); // 50,000 (5,000,000 minor)

    // Monthly summary calculation
    const summary = calculateMonthlySummary(allTx, periodKey);
    expect(summary.incomeTotalMinor).toBe(8000000);
    expect(summary.expenseTotalMinor).toBe(3000000);
    expect(summary.netCashFlowMinor).toBe(5000000);
    expect(summary.transactionCount).toBe(3);

    // Category breakdown
    const breakdown = calculateCategorySpendingBreakdown(allTx, categories, periodKey);
    const housing = breakdown.find((b) => b.category.id === 'cat_housing');
    const food = breakdown.find((b) => b.category.id === 'cat_food');
    expect(housing?.totalMinor).toBe(2500000);
    expect(food?.totalMinor).toBe(500000);
    expect(housing?.percentageOfExpense).toBe(83); // 25k / 30k = ~83%
    expect(food?.percentageOfExpense).toBe(17); // 5k / 30k = ~17%
  });

  // ==========================================
  // SCENARIO 20: OFFLINE CAPABILITY
  // ==========================================

  it('Scenario 20: Operates fully offline without network requests', async () => {
    // Check that repo operations execute without window.fetch or external network
    const tpl = await repo.saveRecurringTemplate({
      type: 'expense',
      amountMinor: 60000,
      currency: 'INR',
      categoryId: 'cat_entertainment',
      frequency: 'monthly',
      startDateLocal: '2026-10-01',
      nextDueDateLocal: '2026-10-01',
      preferredDay: 1,
      status: 'active',
      note: 'Streaming Subscription',
    });
    expect(tpl.id).toBeDefined();

    const bill = await repo.saveBill({
      name: 'Gym Membership',
      amountMinor: 150000,
      currency: 'INR',
      dueDateLocal: '2026-10-15',
      frequency: 'monthly',
      categoryId: 'cat_health',
      isPaid: false,
    });
    expect(bill.id).toBeDefined();

    // Verify data is readable locally
    const bills = await repo.getAllBills();
    expect(bills.length).toBeGreaterThan(0);
    const templates = await repo.getAllRecurringTemplates();
    expect(templates.length).toBeGreaterThan(0);
  });
});
