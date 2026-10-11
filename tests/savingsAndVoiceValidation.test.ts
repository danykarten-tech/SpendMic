import { describe, it, expect, beforeEach } from 'vitest';
import { IndexedDBRepository } from '../src/storage/storageRepository';
import {
  parseVoiceCommand,
  VOICE_HELP_COMMANDS,
} from '../src/domain/voiceCommandParser';
import { DEFAULT_CATEGORIES } from '../src/domain/categoriesData';
import { SavingsGoal, Bill } from '../src/domain/types';

describe('Savings Goals, Deposit History, Data Integrity & Voice Intent Validation', () => {
  let repo: IndexedDBRepository;
  const testDbName = `test_savings_voice_${Date.now()}`;

  beforeEach(async () => {
    repo = new IndexedDBRepository(testDbName);
    await repo.init();
    await repo.clearAllData();
  });

  describe('Priority 1 & 3: Savings Goals Details, Deposit History & Data Integrity', () => {
    it('creates a savings goal, records deposits, and retrieves complete deposit history', async () => {
      // 1. Create a goal
      const goal = await repo.saveSavingsGoal({
        name: 'Home',
        targetMinor: 5000000, // 50,000
        currentSavedMinor: 0,
        color: '#10B981',
        icon: 'target',
      });

      expect(goal.id).toBeDefined();
      expect(goal.name).toBe('Home');
      expect(goal.targetMinor).toBe(5000000);
      expect(goal.currentSavedMinor).toBe(0);

      // 2. Add first deposit of 10,000
      const deposit1 = await repo.addSavingsContribution(goal.id, 1000000, 'Initial deposit');
      expect(deposit1.goal.currentSavedMinor).toBe(1000000);
      expect(deposit1.contribution.amountMinor).toBe(1000000);
      expect(deposit1.contribution.note).toBe('Initial deposit');

      // 3. Add second deposit of 15,000
      const deposit2 = await repo.addSavingsContribution(goal.id, 1500000, 'Monthly savings');
      expect(deposit2.goal.currentSavedMinor).toBe(2500000);

      // 4. Retrieve complete history
      const history = await repo.getSavingsContributionsByGoalId(goal.id);
      expect(history.length).toBe(2);
      // History should contain both deposits
      const amounts = history.map((h) => h.amountMinor);
      expect(amounts).toContain(1000000);
      expect(amounts).toContain(1500000);

      // 5. Data integrity check: Savings deposits must NOT create ordinary transactions in income or expenses
      const allTx = await repo.getAllTransactions();
      expect(allTx.length).toBe(0); // Zero transactions created in income/expense ledger
    });

    it('corrects an individual deposit and recalculates goal progress consistently', async () => {
      const goal = await repo.saveSavingsGoal({
        name: 'Emergency Fund',
        targetMinor: 10000000, // 100,000
        currentSavedMinor: 0,
      });

      const { contribution } = await repo.addSavingsContribution(goal.id, 2000000, 'Deposit to correct');
      expect((await repo.getSavingsGoalById(goal.id))?.currentSavedMinor).toBe(2000000);

      // Correct the deposit to 25,000
      const updated = await repo.updateSavingsContribution(
        contribution.id,
        2500000,
        'Corrected deposit memo'
      );

      expect(updated.goal.currentSavedMinor).toBe(2500000);
      expect(updated.contribution.amountMinor).toBe(2500000);
      expect(updated.contribution.note).toBe('Corrected deposit memo');

      // Verify persistence in DB
      const freshGoal = await repo.getSavingsGoalById(goal.id);
      expect(freshGoal?.currentSavedMinor).toBe(2500000);
    });

    it('removes an individual deposit with confirmation and updates remaining balance accurately', async () => {
      const goal = await repo.saveSavingsGoal({
        name: 'Vacation',
        targetMinor: 5000000, // 50,000
        currentSavedMinor: 0,
      });

      const dep1 = await repo.addSavingsContribution(goal.id, 1000000, 'First');
      const dep2 = await repo.addSavingsContribution(goal.id, 2000000, 'Second');

      expect((await repo.getSavingsGoalById(goal.id))?.currentSavedMinor).toBe(3000000);

      // Remove the second deposit
      const updatedGoal = await repo.deleteSavingsContribution(dep2.contribution.id);
      expect(updatedGoal.currentSavedMinor).toBe(1000000);

      // Verify remaining history
      const history = await repo.getSavingsContributionsByGoalId(goal.id);
      expect(history.length).toBe(1);
      expect(history[0].id).toBe(dep1.contribution.id);
    });

    it('deleting a savings goal cascades and removes its contribution history', async () => {
      const goal = await repo.saveSavingsGoal({
        name: 'Car',
        targetMinor: 30000000,
        currentSavedMinor: 0,
      });

      await repo.addSavingsContribution(goal.id, 5000000, 'Deposit 1');
      await repo.addSavingsContribution(goal.id, 5000000, 'Deposit 2');

      const historyBefore = await repo.getSavingsContributionsByGoalId(goal.id);
      expect(historyBefore.length).toBe(2);

      // Delete the goal
      await repo.deleteSavingsGoal(goal.id);

      // Goal is deleted
      expect(await repo.getSavingsGoalById(goal.id)).toBeNull();

      // Associated contributions are cleaned up
      const historyAfter = await repo.getSavingsContributionsByGoalId(goal.id);
      expect(historyAfter.length).toBe(0);
    });

    it('persists goals, deposits, and history across repo reload', async () => {
      const goal = await repo.saveSavingsGoal({
        name: 'Retirement Seed',
        targetMinor: 100000000,
        currentSavedMinor: 0,
      });

      await repo.addSavingsContribution(goal.id, 15000000, 'Q1 Savings');

      // Simulate app restart with a new repository instance pointing to same DB
      const reloadedRepo = new IndexedDBRepository(testDbName);
      await reloadedRepo.init();

      const reloadedGoal = await reloadedRepo.getSavingsGoalById(goal.id);
      expect(reloadedGoal).not.toBeNull();
      expect(reloadedGoal?.name).toBe('Retirement Seed');
      expect(reloadedGoal?.currentSavedMinor).toBe(15000000);

      const reloadedHistory = await reloadedRepo.getSavingsContributionsByGoalId(goal.id);
      expect(reloadedHistory.length).toBe(1);
      expect(reloadedHistory[0].amountMinor).toBe(15000000);
      expect(reloadedHistory[0].note).toBe('Q1 Savings');
    });
  });

  describe('Priority 2: Voice Intent Matching & Disambiguation', () => {
    const existingGoals: SavingsGoal[] = [
      {
        id: 'goal_home_99',
        name: 'Home',
        targetMinor: 5000000,
        currentSavedMinor: 1000000,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 'goal_phone_88',
        name: 'New Phone',
        targetMinor: 2000000,
        currentSavedMinor: 500000,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    ];

    it('"Create a Home savings goal of 50000" creates a new goal only when requested', () => {
      const result = parseVoiceCommand(
        'Create a Home savings goal of 50000',
        DEFAULT_CATEGORIES,
        'INR',
        existingGoals
      );

      expect(result.intent).toBe('CREATE_SAVINGS_GOAL');
      expect(result.explicitIntent).toBe('CREATE_SAVINGS_GOAL');
      expect(result.savingsGoal?.name).toBe('Home');
      expect(result.savingsGoal?.targetMinor).toBe(5000000); // 50,000 * 100
      expect(result.savingsContribution).toBeUndefined();
    });

    it('"Add 500 to my Home savings goal" finds the existing Home goal and records a contribution', () => {
      const result = parseVoiceCommand(
        'Add 500 to my Home savings goal',
        DEFAULT_CATEGORIES,
        'INR',
        existingGoals
      );

      expect(result.intent).toBe('ADD_SAVINGS_CONTRIBUTION');
      expect(result.explicitIntent).toBe('ADD_SAVINGS_CONTRIBUTION');
      expect(result.savingsContribution).toBeDefined();
      expect(result.savingsContribution?.matchedGoalId).toBe('goal_home_99');
      expect(result.savingsContribution?.goalNameOrId).toBe('Home');
      expect(result.savingsContribution?.amountMinor).toBe(50000); // 500 * 100
      expect(result.savingsGoal).toBeUndefined(); // Does NOT create a new goal!
    });

    it('"Deposit 500 into Home" matches existing goal and asks for confirmation', () => {
      const result = parseVoiceCommand(
        'Deposit 500 into Home',
        DEFAULT_CATEGORIES,
        'INR',
        existingGoals
      );

      expect(result.intent).toBe('ADD_SAVINGS_CONTRIBUTION');
      expect(result.explicitIntent).toBe('ADD_SAVINGS_CONTRIBUTION');
      expect(result.savingsContribution?.matchedGoalId).toBe('goal_home_99');
      expect(result.savingsContribution?.goalNameOrId).toBe('Home');
      expect(result.savingsContribution?.amountMinor).toBe(50000);
      expect(result.savingsGoal).toBeUndefined(); // Never creates a duplicate goal!
    });

    it('"Change my Home goal to 60000" edits the existing goal target', () => {
      const result = parseVoiceCommand(
        'Change my Home goal to 60000',
        DEFAULT_CATEGORIES,
        'INR',
        existingGoals
      );

      expect(result.intent).toBe('EDIT_SAVINGS_GOAL');
      expect(result.explicitIntent).toBe('EDIT_SAVINGS_GOAL');
      expect(result.savingsEdit).toBeDefined();
      expect(result.savingsEdit?.goalId).toBe('goal_home_99');
      expect(result.savingsEdit?.goalName).toBe('Home');
      expect(result.savingsEdit?.newTargetMinor).toBe(6000000); // 60,000 * 100
    });

    it('"Delete my Home savings goal" requests confirmation before deletion', () => {
      const result = parseVoiceCommand(
        'Delete my Home savings goal',
        DEFAULT_CATEGORIES,
        'INR',
        existingGoals
      );

      expect(result.intent).toBe('DELETE_SAVINGS_GOAL');
      expect(result.explicitIntent).toBe('DELETE_SAVINGS_GOAL');
      expect(result.savingsDelete).toBeDefined();
      expect(result.savingsDelete?.goalId).toBe('goal_home_99');
      expect(result.savingsDelete?.goalName).toBe('Home');
    });

    it('"Show savings history for Home" detects SHOW_SAVINGS_HISTORY intent', () => {
      const result = parseVoiceCommand(
        'Show savings history for Home',
        DEFAULT_CATEGORIES,
        'INR',
        existingGoals
      );

      expect(result.intent).toBe('SHOW_SAVINGS_HISTORY');
      expect(result.explicitIntent).toBe('SHOW_SAVINGS_HISTORY');
      expect(result.savingsHistory?.goalId).toBe('goal_home_99');
      expect(result.savingsHistory?.goalName).toBe('Home');
    });

    it('if referenced goal does not exist, explains that and asks whether the user wants to create one', () => {
      const result = parseVoiceCommand(
        'Deposit 500 into Tesla',
        DEFAULT_CATEGORIES,
        'INR',
        existingGoals
      );

      expect(result.intent).toBe('ambiguous');
      expect(result.savingsContribution?.matchedGoalId).toBeUndefined();
      expect(result.clarificationPrompt).toContain('Savings goal "Tesla" does not exist. Would you like to create one?');
      expect(result.savingsGoal).toBeUndefined(); // Never silently create a duplicate goal!
    });

    it('if multiple goals match, asks the user to select the correct goal', () => {
      const multiGoals: SavingsGoal[] = [
        {
          id: 'goal_home_reno',
          name: 'Home Renovation',
          targetMinor: 5000000,
          currentSavedMinor: 0,
          createdAt: '',
          updatedAt: '',
        },
        {
          id: 'goal_home_down',
          name: 'Home Downpayment',
          targetMinor: 20000000,
          currentSavedMinor: 0,
          createdAt: '',
          updatedAt: '',
        },
      ];

      const result = parseVoiceCommand(
        'Deposit 500 into Home',
        DEFAULT_CATEGORIES,
        'INR',
        multiGoals
      );

      expect(result.intent).toBe('ambiguous');
      expect(result.clarificationPrompt).toContain('Multiple savings goals match "Home"');
      expect(result.clarificationPrompt).toContain('Home Renovation');
      expect(result.clarificationPrompt).toContain('Home Downpayment');
    });
  });

  describe('Priority 4 & 5: Recurring Bills, Bill Payments & Help Catalog', () => {
    const existingBills: Bill[] = [
      {
        id: 'bill_rent_1',
        name: 'Rent',
        amountMinor: 1000000,
        currency: 'INR',
        dueDateLocal: '2026-10-15',
        frequency: 'monthly',
        categoryId: 'cat_housing',
        isPaid: false,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    ];

    it('creates recurring bill with correct amount and frequency', () => {
      const result = parseVoiceCommand(
        'Add a monthly internet bill of 999 rupees',
        DEFAULT_CATEGORIES
      );

      expect(result.intent).toBe('CREATE_RECURRING_BILL');
      expect(result.recurringBill?.frequency).toBe('monthly');
      expect(result.recurringBill?.amountMinor).toBe(99900);
    });

    it('records a bill payment matching existing bill without duplicating rule', () => {
      const result = parseVoiceCommand(
        'Record bill payment for rent',
        DEFAULT_CATEGORIES,
        'INR',
        [],
        existingBills
      );

      expect(result.intent).toBe('RECORD_BILL_PAYMENT');
      expect(result.billPayment?.billId).toBe('bill_rent_1');
      expect(result.billPayment?.billName).toBe('Rent');
    });

    it('validates that every example in the shared VOICE_HELP_COMMANDS catalog parses correctly', () => {
      expect(VOICE_HELP_COMMANDS.length).toBeGreaterThanOrEqual(8);

      const mockGoals: SavingsGoal[] = [
        {
          id: 'g_home',
          name: 'Home',
          targetMinor: 5000000,
          currentSavedMinor: 0,
          createdAt: '',
          updatedAt: '',
        },
        {
          id: 'g_emerg',
          name: 'Emergency Fund',
          targetMinor: 10000000,
          currentSavedMinor: 0,
          createdAt: '',
          updatedAt: '',
        },
      ];

      const mockBills: Bill[] = [
        {
          id: 'b_rent',
          name: 'Rent',
          amountMinor: 1000000,
          currency: 'INR',
          dueDateLocal: '2026-10-15',
          frequency: 'monthly',
          categoryId: 'cat_housing',
          isPaid: false,
          createdAt: '',
          updatedAt: '',
        },
        {
          id: 'b_internet',
          name: 'Internet',
          amountMinor: 99900,
          currency: 'INR',
          dueDateLocal: '2026-10-15',
          frequency: 'monthly',
          categoryId: 'cat_utilities',
          isPaid: false,
          createdAt: '',
          updatedAt: '',
        },
      ];

      for (const cat of VOICE_HELP_COMMANDS) {
        for (const example of cat.examples) {
          const parsed = parseVoiceCommand(
            example,
            DEFAULT_CATEGORIES,
            'INR',
            mockGoals,
            mockBills
          );
          const allowed = cat.allowedIntents || [cat.intent];
          expect(allowed).toContain(parsed.explicitIntent || parsed.intent);
        }
      }
    });

    it('repeated bill payment does not duplicate payment transaction', async () => {
      const bill = await repo.saveBill({
        name: 'Electricity',
        amountMinor: 150000,
        currency: 'INR',
        dueDateLocal: '2026-10-20',
        frequency: 'monthly',
        categoryId: 'cat_utilities',
        isPaid: false,
      });

      // Mark paid first time
      const payment1 = await repo.markBillPaid(bill.id, true);
      expect(payment1.bill.isPaid).toBe(true);
      expect(payment1.transaction).toBeDefined();

      const txList1 = await repo.getAllTransactions();
      expect(txList1.length).toBe(1);

      // Repeated submission for the same bill
      const payment2 = await repo.markBillPaid(bill.id, true);
      expect(payment2.bill.isPaid).toBe(true);
      expect(payment2.transaction?.id).toBe(payment1.transaction?.id);

      const txList2 = await repo.getAllTransactions();
      expect(txList2.length).toBe(1); // Never duplicates!
    });
  });
});
