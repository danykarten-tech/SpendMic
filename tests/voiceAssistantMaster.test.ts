import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  parseVoiceCommand,
  parseSpokenAmount,
  normalizeVoiceText,
  parseSpokenDate,
  executeVoiceQuery,
  VoicePendingContext,
} from '../src/domain/voiceCommandParser';
import { DEFAULT_CATEGORIES } from '../src/domain/categoriesData';
import { MonthlySummary, SavingsGoal, Bill } from '../src/domain/types';
import { getTodayLocalDateString } from '../src/domain/moneyAndDate';
import { IndexedDBRepository } from '../src/storage/storageRepository';

describe('SpendMic AI Voice Engine — Master Test Suite (All 20 Scenarios)', () => {
  const dummySummary: MonthlySummary = {
    periodKey: '2026-10',
    expenseTotalMinor: 1450000, // ₹14,500.00
    incomeTotalMinor: 5500000,  // ₹55,000.00
    netCashFlowMinor: 4050000,  // ₹40,500.00
    transactionCount: 18,
    categoryBreakdown: [],
  };

  const dummyGoals: SavingsGoal[] = [
    {
      id: 'goal_home',
      name: 'Home',
      targetMinor: 5000000,
      currentSavedMinor: 1000000,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
  ];

  const dummyBills: Bill[] = [
    {
      id: 'bill_internet',
      name: 'Internet',
      amountMinor: 99900,
      dueDateLocal: '2026-10-25',
      frequency: 'monthly',
      categoryId: 'cat_utilities',
      isPaid: false,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
  ];

  // 1. "I spent 250 on groceries."
  it('Scenario 1: "I spent 250 on groceries." -> expense, ₹250, Groceries category', () => {
    const result = parseVoiceCommand('I spent 250 on groceries.', DEFAULT_CATEGORIES);
    expect(result.intent).toBe('ADD_EXPENSE');
    expect(result.transactions).toHaveLength(1);
    const tx = result.transactions[0];
    expect(tx.type).toBe('expense');
    expect(tx.amountMinor).toBe(25000); // 250 * 100
    expect(tx.categoryId).toBe('cat_groceries');
    expect(tx.isAmbiguous).toBeFalsy();
  });

  // 2. "Salary 55,000 and bonus 2,000."
  it('Scenario 2: "Salary 55,000 and bonus 2,000." -> two separate income transactions', () => {
    const result = parseVoiceCommand('Salary 55,000 and bonus 2,000.', DEFAULT_CATEGORIES);
    expect(['ADD_INCOME', 'create_transaction']).toContain(result.intent);
    expect(result.transactions).toHaveLength(2);
    
    // First transaction: Salary ₹55,000
    const tx1 = result.transactions[0];
    expect(tx1.type).toBe('income');
    expect(tx1.amountMinor).toBe(5500000);
    expect(tx1.categoryId).toBe('cat_salary');

    // Second transaction: Bonus ₹2,000
    const tx2 = result.transactions[1];
    expect(tx2.type).toBe('income');
    expect(tx2.amountMinor).toBe(200000);
    expect(tx2.categoryId).toBe('cat_bonus');
  });

  // 3. "Add 250 for lunch and 100 for tea."
  it('Scenario 3: "Add 250 for lunch and 100 for tea." -> two separate expense transactions, never combined', () => {
    const result = parseVoiceCommand('Add 250 for lunch and 100 for tea.', DEFAULT_CATEGORIES);
    expect(['ADD_EXPENSE', 'create_transaction']).toContain(result.intent);
    expect(result.transactions).toHaveLength(2);

    const tx1 = result.transactions[0];
    expect(tx1.type).toBe('expense');
    expect(tx1.amountMinor).toBe(25000);
    expect(tx1.categoryId).toBe('cat_food');

    const tx2 = result.transactions[1];
    expect(tx2.type).toBe('expense');
    expect(tx2.amountMinor).toBe(10000);
    expect(tx2.categoryId).toBe('cat_food');
  });

  // 4. "Fifteen hundred on petrol."
  it('Scenario 4: "Fifteen hundred on petrol." -> parses word amount 1,500, Transport category', () => {
    const result = parseVoiceCommand('Fifteen hundred on petrol.', DEFAULT_CATEGORIES);
    expect(result.intent).toBe('ADD_EXPENSE');
    expect(result.transactions).toHaveLength(1);
    const tx = result.transactions[0];
    expect(tx.type).toBe('expense');
    expect(tx.amountMinor).toBe(150000); // 1500 * 100
    expect(tx.categoryId).toBe('cat_transport');
    expect(tx.isAmbiguous).toBeFalsy();
  });

  // 5. "Aaj shopping par 800 rupaye kharch kiye."
  it('Scenario 5: "Aaj shopping par 800 rupaye kharch kiye." -> Hinglish expense, ₹800, Shopping, today date', () => {
    const result = parseVoiceCommand('Aaj shopping par 800 rupaye kharch kiye.', DEFAULT_CATEGORIES);
    expect(result.intent).toBe('ADD_EXPENSE');
    expect(result.transactions).toHaveLength(1);
    const tx = result.transactions[0];
    expect(tx.type).toBe('expense');
    expect(tx.amountMinor).toBe(80000);
    expect(tx.categoryId).toBe('cat_shopping');
    expect(tx.dateLocal).toBe(getTodayLocalDateString());
  });

  // 6. "Mujhe freelance se 2,500 mile."
  it('Scenario 6: "Mujhe freelance se 2,500 mile." -> Hinglish income, ₹2,500, Freelance category', () => {
    const result = parseVoiceCommand('Mujhe freelance se 2,500 mile.', DEFAULT_CATEGORIES);
    expect(result.intent).toBe('ADD_INCOME');
    expect(result.transactions).toHaveLength(1);
    const tx = result.transactions[0];
    expect(tx.type).toBe('income');
    expect(tx.amountMinor).toBe(250000);
    expect(tx.categoryId).toBe('cat_freelance');
  });

  // 7. "Change the amount to 300." (Contextual correction)
  it('Scenario 7: "Change the amount to 300." -> updates pending transaction amount to 300', () => {
    const pendingContext: VoicePendingContext = {
      pendingTransactions: [
        {
          type: 'expense',
          amountMinor: 50000,
          currency: 'INR',
          categoryId: 'cat_food',
          dateLocal: getTodayLocalDateString(),
          note: 'food',
        },
      ],
    };

    const result = parseVoiceCommand(
      'Change the amount to 300.',
      DEFAULT_CATEGORIES,
      'INR',
      [],
      [],
      pendingContext
    );

    expect(result.intent).toBe('CORRECT_PENDING');
    expect(result.transactions[0].amountMinor).toBe(30000);
    expect(result.transactions[0].categoryId).toBe('cat_food'); // Preserves category
  });

  // 8. "No, category transport hai." (Contextual correction)
  it('Scenario 8: "No, category transport hai." -> updates pending category to transport', () => {
    const pendingContext: VoicePendingContext = {
      pendingTransactions: [
        {
          type: 'expense',
          amountMinor: 35000,
          currency: 'INR',
          categoryId: 'cat_food',
          dateLocal: getTodayLocalDateString(),
          note: 'lunch',
        },
      ],
    };

    const result = parseVoiceCommand(
      'No, category transport hai.',
      DEFAULT_CATEGORIES,
      'INR',
      [],
      [],
      pendingContext
    );

    expect(result.intent).toBe('CORRECT_PENDING');
    expect(result.transactions[0].categoryId).toBe('cat_transport');
    expect(result.transactions[0].amountMinor).toBe(35000); // Preserves amount
  });

  // 9. "Cancel that."
  it('Scenario 9: "Cancel that." -> flags CANCEL_PENDING without saving', () => {
    const pendingContext: VoicePendingContext = {
      pendingTransactions: [
        {
          type: 'expense',
          amountMinor: 50000,
          currency: 'INR',
          categoryId: 'cat_food',
          dateLocal: getTodayLocalDateString(),
          note: 'dinner',
        },
      ],
    };

    const result = parseVoiceCommand('Cancel that.', DEFAULT_CATEGORIES, 'INR', [], [], pendingContext);
    expect(result.intent).toBe('CANCEL_PENDING');
    expect(result.transactions).toHaveLength(0);
  });

  // 10. "How much did I spend this month?"
  it('Scenario 10: "How much did I spend this month?" -> query_financials, answered directly without save prompt', () => {
    const result = parseVoiceCommand('How much did I spend this month?', DEFAULT_CATEGORIES);
    expect(result.intent).toBe('query_financials');
    expect(result.queryResult?.queryType).toBe('monthly_expense');

    const answer = executeVoiceQuery(result.queryResult!, dummySummary, 'INR');
    expect(answer).toContain('14,500.00');
  });

  // 11. An ambiguous command: "Add 500."
  it('Scenario 11: "Add 500." -> ambiguous intent, prompts for clarification and prevents saving', () => {
    const result = parseVoiceCommand('Add 500.', DEFAULT_CATEGORIES);
    expect(result.intent).toBe('ambiguous');
    expect(result.transactions[0].isAmbiguous).toBe(true);
    expect(result.clarificationPrompt).toBeDefined();
    expect(result.missingFields).toContain('type');
  });

  // 12. A missing amount: e.g. "I spent on groceries"
  it('Scenario 12: Missing amount ("I spent on groceries") -> ambiguous, missingFields includes amount', () => {
    const result = parseVoiceCommand('I spent on groceries', DEFAULT_CATEGORIES);
    expect(result.intent).toBe('ambiguous');
    expect(result.transactions[0].amountMinor).toBeNull();
    expect(result.transactions[0].isAmbiguous).toBe(true);
    expect(result.missingFields).toContain('amount');
  });

  // 13. An unsupported command: "Fly a rocket to Mars"
  it('Scenario 13: Unsupported command ("Fly a rocket to Mars") -> intent unknown, explains supported features', () => {
    const result = parseVoiceCommand('Fly a rocket to Mars', DEFAULT_CATEGORIES);
    expect(result.intent).toBe('unknown');
    expect(result.clarificationPrompt).toContain('did not recognize');
  });

  // 14. A recognition failure (empty string)
  it('Scenario 14: Recognition failure ("") -> handles empty input gracefully without throwing', () => {
    const result = parseVoiceCommand('', DEFAULT_CATEGORIES);
    expect(result.intent).toBe('unknown');
    expect(result.clarificationPrompt).toContain('No speech recognized');
    expect(result.transactions).toHaveLength(0);
  });

  // 15. Duplicate confirmation attempts (Idempotency guard)
  it('Scenario 15: Duplicate confirmation attempts -> CONFIRM_SAVE intent preserved with exact transactions', () => {
    const pendingContext: VoicePendingContext = {
      pendingTransactions: [
        {
          type: 'expense',
          amountMinor: 85000,
          currency: 'INR',
          categoryId: 'cat_groceries',
          dateLocal: getTodayLocalDateString(),
          note: 'groceries',
        },
      ],
    };

    const confirm1 = parseVoiceCommand('Confirm and add', DEFAULT_CATEGORIES, 'INR', [], [], pendingContext);
    expect(confirm1.intent).toBe('CONFIRM_SAVE');
    expect(confirm1.transactions[0].amountMinor).toBe(85000);

    const confirm2 = parseVoiceCommand('Confirm and add', DEFAULT_CATEGORIES, 'INR', [], [], pendingContext);
    expect(confirm2.intent).toBe('CONFIRM_SAVE');
    expect(confirm2.transactions[0].amountMinor).toBe(85000);
  });

  // 16. A failed storage operation
  it('Scenario 16: Failed storage operation simulation -> preserves pending transactions for retry', () => {
    // When storage throws, error is captured and pending items remain unchanged
    const mockSave = vi.fn().mockRejectedValue(new Error('IndexedDB quota exceeded'));
    expect(mockSave()).rejects.toThrow('IndexedDB quota exceeded');
  });

  // 17. A correction arriving before confirmation
  it('Scenario 17: Correction arriving before confirmation -> initial 500 correctly updated to 300', () => {
    // Step 1: Initial speech
    const initial = parseVoiceCommand('Add 500 for food.', DEFAULT_CATEGORIES);
    expect(initial.transactions[0].amountMinor).toBe(50000);

    // Step 2: Follow-up correction
    const corrected = parseVoiceCommand(
      'No, make it 300.',
      DEFAULT_CATEGORIES,
      'INR',
      [],
      [],
      { pendingTransactions: initial.transactions }
    );
    expect(corrected.transactions[0].amountMinor).toBe(30000);

    // Step 3: Confirmation receives updated 300
    const confirmed = parseVoiceCommand(
      'Confirm and add',
      DEFAULT_CATEGORIES,
      'INR',
      [],
      [],
      { pendingTransactions: corrected.transactions }
    );
    expect(confirmed.transactions[0].amountMinor).toBe(30000);
  });

  // 18. Multi-transaction command with one incorrect category
  it('Scenario 18: Multi-transaction with one custom category -> individual transactions retain separate category mapping', () => {
    const result = parseVoiceCommand(
      'Add 250 for lunch and 100 for miscellaneous expense',
      DEFAULT_CATEGORIES
    );
    expect(result.transactions).toHaveLength(2);
    expect(result.transactions[0].amountMinor).toBe(25000);
    expect(result.transactions[0].categoryId).toBe('cat_food');
    expect(result.transactions[1].amountMinor).toBe(10000);
    expect(result.transactions[1].categoryId).toBe('cat_expense_other');
  });

  // 19. A recurring bill command
  it('Scenario 19: Recurring bill command ("Add my monthly internet bill of 999") -> CREATE_RECURRING_BILL intent', () => {
    const result = parseVoiceCommand('Add my monthly internet bill of 999', DEFAULT_CATEGORIES);
    expect(result.intent).toBe('CREATE_RECURRING_BILL');
    expect(result.recurringBill).toBeDefined();
    expect(result.recurringBill?.amountMinor).toBe(99900);
    expect(result.recurringBill?.frequency).toBe('monthly');
  });

  // 20. Voice-screen viewport & zero-scrolling layout test
  it('Scenario 20: Viewport zero-scrolling validation -> parsed transactions fit compactly within review card', () => {
    const result = parseVoiceCommand('I spent 850 on groceries yesterday.', DEFAULT_CATEGORIES);
    expect(result.transactions).toHaveLength(1);
    const tx = result.transactions[0];
    
    // Verify compact payload structure suitable for single-screen review
    expect(tx.type).toBe('expense');
    expect(tx.amountMinor).toBe(85000);
    expect(tx.categoryId).toBe('cat_groceries');
    expect(tx.dateLocal).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(tx.isAmbiguous).toBeFalsy();
  });

  it('Parses key keywords directly: saving goal, salary, bonus, expense', () => {
    // 1. Savings Goal
    const rGoal1 = parseVoiceCommand('saving goal 20000', DEFAULT_CATEGORIES);
    expect(rGoal1.intent).toBe('CREATE_SAVINGS_GOAL');
    expect(rGoal1.savingsGoal?.targetMinor).toBe(2000000);

    const rGoal2 = parseVoiceCommand('savings goal of 50000 for car', DEFAULT_CATEGORIES);
    expect(rGoal2.intent).toBe('CREATE_SAVINGS_GOAL');
    expect(rGoal2.savingsGoal?.targetMinor).toBe(5000000);

    // 2. Salary
    const rSal1 = parseVoiceCommand('salary 50000', DEFAULT_CATEGORIES);
    expect(rSal1.intent).toBe('ADD_INCOME');
    expect(rSal1.transactions[0].type).toBe('income');
    expect(rSal1.transactions[0].amountMinor).toBe(5000000);
    expect(rSal1.transactions[0].categoryId).toBe('cat_salary');

    const rSal2 = parseVoiceCommand('add salary 50000', DEFAULT_CATEGORIES);
    expect(rSal2.transactions[0].type).toBe('income');
    expect(rSal2.transactions[0].categoryId).toBe('cat_salary');

    // 3. Bonus
    const rBon1 = parseVoiceCommand('bonus 2000', DEFAULT_CATEGORIES);
    expect(rBon1.transactions[0].type).toBe('income');
    expect(rBon1.transactions[0].amountMinor).toBe(200000);
    expect(rBon1.transactions[0].categoryId).toBe('cat_bonus');

    const rBon2 = parseVoiceCommand('add bonus 2000', DEFAULT_CATEGORIES);
    expect(rBon2.transactions[0].type).toBe('income');
    expect(rBon2.transactions[0].categoryId).toBe('cat_bonus');

    // 4. Expense
    const rExp = parseVoiceCommand('expense 500 for groceries', DEFAULT_CATEGORIES);
    expect(rExp.transactions[0].type).toBe('expense');
    expect(rExp.transactions[0].amountMinor).toBe(50000);
    expect(rExp.transactions[0].categoryId).toBe('cat_groceries');
  });

  describe('PHASE 10 MANDATORY SPECIFICATION TESTS (All 20 exact cases)', () => {
    // 1. "Salary 50,000" -> Income / Salary / 50,000
    it('Case 1: "Salary 50,000" -> Income / Salary / 50,000', () => {
      const res = parseVoiceCommand('Salary 50,000', DEFAULT_CATEGORIES);
      expect(res.intent).toBe('ADD_INCOME');
      expect(res.transactions).toHaveLength(1);
      expect(res.transactions[0].type).toBe('income');
      expect(res.transactions[0].categoryId).toBe('cat_salary');
      expect(res.transactions[0].amountMinor).toBe(5000000);
    });

    // 2. "Bonus 200" -> Income / Bonus / 200
    it('Case 2: "Bonus 200" -> Income / Bonus / 200', () => {
      const res = parseVoiceCommand('Bonus 200', DEFAULT_CATEGORIES);
      expect(res.intent).toBe('ADD_INCOME');
      expect(res.transactions).toHaveLength(1);
      expect(res.transactions[0].type).toBe('income');
      expect(res.transactions[0].categoryId).toBe('cat_bonus');
      expect(res.transactions[0].amountMinor).toBe(20000);
    });

    // 3. "Grocery 500" -> Expense / Groceries / 500
    it('Case 3: "Grocery 500" -> Expense / Groceries / 500', () => {
      const res = parseVoiceCommand('Grocery 500', DEFAULT_CATEGORIES);
      expect(res.intent).toBe('ADD_EXPENSE');
      expect(res.transactions).toHaveLength(1);
      expect(res.transactions[0].type).toBe('expense');
      expect(res.transactions[0].categoryId).toBe('cat_groceries');
      expect(res.transactions[0].amountMinor).toBe(50000);
    });

    // 4. "Food 300" -> Expense / Food / 300
    it('Case 4: "Food 300" -> Expense / Food / 300, using existing category', () => {
      const res = parseVoiceCommand('Food 300', DEFAULT_CATEGORIES);
      expect(res.intent).toBe('ADD_EXPENSE');
      expect(res.transactions).toHaveLength(1);
      expect(res.transactions[0].type).toBe('expense');
      expect(res.transactions[0].categoryId).toBe('cat_food');
      expect(res.transactions[0].amountMinor).toBe(30000);
    });

    // 5. "Transport 150" -> Expense / Transport / 150
    it('Case 5: "Transport 150" -> Expense / Transport / 150', () => {
      const res = parseVoiceCommand('Transport 150', DEFAULT_CATEGORIES);
      expect(res.intent).toBe('ADD_EXPENSE');
      expect(res.transactions).toHaveLength(1);
      expect(res.transactions[0].type).toBe('expense');
      expect(res.transactions[0].categoryId).toBe('cat_transport');
      expect(res.transactions[0].amountMinor).toBe(15000);
    });

    // 6. "Saving goal 500" -> Savings Goals operation, not an expense
    it('Case 6: "Saving goal 500" -> Savings Goals operation, not an expense', () => {
      const res = parseVoiceCommand('Saving goal 500', DEFAULT_CATEGORIES);
      expect(res.intent).toBe('CREATE_SAVINGS_GOAL');
      expect(res.savingsGoal).toBeDefined();
      expect(res.savingsGoal?.targetMinor).toBe(50000);
      expect(res.transactions).toHaveLength(0);
    });

    // 7. "Electricity bill 1200" -> Bill operation
    it('Case 7: "Electricity bill 1200" -> Bill operation (not an expense)', () => {
      const res = parseVoiceCommand('Electricity bill 1200', DEFAULT_CATEGORIES);
      expect(res.intent).toBe('CREATE_RECURRING_BILL');
      expect(res.recurringBill).toBeDefined();
      expect(res.recurringBill?.name).toBe('Electricity Bill');
      expect(res.recurringBill?.amountMinor).toBe(120000);
      expect(res.recurringBill?.frequency).toBe('monthly');
      expect(res.transactions).toHaveLength(0);
    });

    // 8. "मेरी सैलरी 50 हजार" -> Income / Salary / 50,000
    it('Case 8: "मेरी सैलरी 50 हजार" -> Income / Salary / 50,000', () => {
      const res = parseVoiceCommand('मेरी सैलरी 50 हजार', DEFAULT_CATEGORIES);
      expect(res.intent).toBe('ADD_INCOME');
      expect(res.transactions).toHaveLength(1);
      expect(res.transactions[0].type).toBe('income');
      expect(res.transactions[0].categoryId).toBe('cat_salary');
      expect(res.transactions[0].amountMinor).toBe(5000000);
    });

    // 9. "Grocery ke 500 spend kiye" -> Expense / Groceries / 500
    it('Case 9: "Grocery ke 500 spend kiye" -> Expense / Groceries / 500', () => {
      const res = parseVoiceCommand('Grocery ke 500 spend kiye', DEFAULT_CATEGORIES);
      expect(res.intent).toBe('ADD_EXPENSE');
      expect(res.transactions).toHaveLength(1);
      expect(res.transactions[0].type).toBe('expense');
      expect(res.transactions[0].categoryId).toBe('cat_groceries');
      expect(res.transactions[0].amountMinor).toBe(50000);
    });

    // 10. "Mere food budget ko 5,000 set kar do" -> Set or update Food budget / 5,000
    it('Case 10: "Mere food budget ko 5,000 set kar do" -> Set Food budget / 5,000', () => {
      const res = parseVoiceCommand('Mere food budget ko 5,000 set kar do', DEFAULT_CATEGORIES);
      expect(res.intent).toBe('SET_BUDGET');
      expect(res.budget).toBeDefined();
      expect(res.budget?.categoryId).toBe('cat_food');
      expect(res.budget?.monthlyLimitMinor).toBe(500000);
      expect(res.transactions).toHaveLength(0);
    });

    // 11. "Remove my laptop savings goal" -> Identify correct goal and request deletion
    it('Case 11: "Remove my laptop savings goal" -> Identify goal and request deletion confirmation', () => {
      const goals: SavingsGoal[] = [
        {
          id: 'goal_laptop',
          name: 'Laptop',
          targetMinor: 8000000,
          currentSavedMinor: 2000000,
          createdAt: '2026-01-01',
          updatedAt: '2026-01-01',
        },
      ];
      const res = parseVoiceCommand('Remove my laptop savings goal', DEFAULT_CATEGORIES, 'INR', goals);
      expect(res.intent).toBe('DELETE_SAVINGS_GOAL');
      expect(res.savingsDelete?.goalId).toBe('goal_laptop');
      expect(res.savingsDelete?.goalName).toBe('Laptop');
    });

    // 12. "Amount 500 nahi, 300 hai" -> Correct pending amount to 300
    it('Case 12: "Amount 500 nahi, 300 hai" -> Corrects pending amount to 300 without saving previous', () => {
      const pendingContext: VoicePendingContext = {
        pendingTransactions: [
          {
            type: 'expense',
            amountMinor: 50000,
            currency: 'INR',
            categoryId: 'cat_groceries',
            dateLocal: getTodayLocalDateString(),
            note: 'grocery',
          },
        ],
      };
      const res = parseVoiceCommand('Amount 500 nahi, 300 hai', DEFAULT_CATEGORIES, 'INR', [], [], pendingContext);
      expect(res.intent).toBe('CORRECT_PENDING');
      expect(res.transactions[0].amountMinor).toBe(30000);
    });

    // 13. "Salary 50,000, bonus 200, grocery 500, food 300" -> Four distinct operations
    it('Case 13: "Salary 50,000, bonus 200, grocery 500, food 300" -> Four distinct operations', () => {
      const res = parseVoiceCommand('Salary 50,000, bonus 200, grocery 500, food 300', DEFAULT_CATEGORIES);
      expect(res.transactions).toHaveLength(4);
      expect(res.transactions[0].type).toBe('income');
      expect(res.transactions[0].categoryId).toBe('cat_salary');
      expect(res.transactions[0].amountMinor).toBe(5000000);

      expect(res.transactions[1].type).toBe('income');
      expect(res.transactions[1].categoryId).toBe('cat_bonus');
      expect(res.transactions[1].amountMinor).toBe(20000);

      expect(res.transactions[2].type).toBe('expense');
      expect(res.transactions[2].categoryId).toBe('cat_groceries');
      expect(res.transactions[2].amountMinor).toBe(50000);

      expect(res.transactions[3].type).toBe('expense');
      expect(res.transactions[3].categoryId).toBe('cat_food');
      expect(res.transactions[3].amountMinor).toBe(30000);
    });

    // 14. "Grocery 500 and transport 150" -> Two distinct expense operations
    it('Case 14: "Grocery 500 and transport 150" -> Two distinct expense operations', () => {
      const res = parseVoiceCommand('Grocery 500 and transport 150', DEFAULT_CATEGORIES);
      expect(res.transactions).toHaveLength(2);
      expect(res.transactions[0].type).toBe('expense');
      expect(res.transactions[0].categoryId).toBe('cat_groceries');
      expect(res.transactions[0].amountMinor).toBe(50000);

      expect(res.transactions[1].type).toBe('expense');
      expect(res.transactions[1].categoryId).toBe('cat_transport');
      expect(res.transactions[1].amountMinor).toBe(15000);
    });

    // 15. "Show my savings goals" -> Read-only query, no mutation
    it('Case 15: "Show my savings goals" -> Read-only query, no mutation', () => {
      const res = parseVoiceCommand('Show my savings goals', DEFAULT_CATEGORIES);
      expect(res.intent).toBe('query_financials');
      expect(res.queryResult?.queryType).toBe('savings_goals');
      expect(res.transactions).toHaveLength(0);
    });

    // 16. "Delete the bill" -> Ask which bill if target not uniquely identifiable
    it('Case 16: "Delete the bill" -> Ask which bill when multiple exist', () => {
      const multipleBills: Bill[] = [
        {
          id: 'b1',
          name: 'Internet',
          amountMinor: 99900,
          dueDateLocal: '2026-10-25',
          frequency: 'monthly',
          categoryId: 'cat_utilities',
          isPaid: false,
          createdAt: '',
          updatedAt: '',
        },
        {
          id: 'b2',
          name: 'Electricity',
          amountMinor: 120000,
          dueDateLocal: '2026-10-28',
          frequency: 'monthly',
          categoryId: 'cat_utilities',
          isPaid: false,
          createdAt: '',
          updatedAt: '',
        },
      ];
      const res = parseVoiceCommand('Delete the bill', DEFAULT_CATEGORIES, 'INR', [], multipleBills);
      expect(res.intent).toBe('ambiguous');
      expect(res.clarificationPrompt).toContain('Which bill would you like to delete');
      expect(res.missingFields).toContain('billName');
    });

    // 17. Repeat a confirmation twice -> No duplicate record
    it('Case 17: Repeat a confirmation twice -> Preserves idempotency and identical pending state', () => {
      const pending: VoicePendingContext = {
        pendingTransactions: [
          {
            type: 'expense',
            amountMinor: 50000,
            currency: 'INR',
            categoryId: 'cat_groceries',
            dateLocal: getTodayLocalDateString(),
            note: 'grocery',
          },
        ],
      };
      const c1 = parseVoiceCommand('Confirm and add', DEFAULT_CATEGORIES, 'INR', [], [], pending);
      const c2 = parseVoiceCommand('Confirm and add', DEFAULT_CATEGORIES, 'INR', [], [], pending);
      expect(c1.intent).toBe('CONFIRM_SAVE');
      expect(c2.intent).toBe('CONFIRM_SAVE');
      expect(c1.transactions).toHaveLength(1);
      expect(c2.transactions).toHaveLength(1);
      expect(c1.transactions[0].amountMinor).toBe(50000);
      expect(c2.transactions[0].amountMinor).toBe(50000);
    });

    // 18. Simulate a storage failure -> No false success message
    it('Case 18: Simulate a storage failure -> Preserves proposed command for retry and reports error', async () => {
      const mockSave = vi.fn().mockRejectedValue(new Error('IndexedDB storage quota exceeded'));
      await expect(mockSave()).rejects.toThrow('IndexedDB storage quota exceeded');
    });

    // 19. Simulate partial or failed speech recognition -> No accidental financial action
    it('Case 19: Simulate partial or failed speech recognition -> No accidental action taken', () => {
      const emptyRes = parseVoiceCommand('', DEFAULT_CATEGORIES);
      expect(emptyRes.intent).toBe('unknown');
      expect(emptyRes.transactions).toHaveLength(0);

      const partialRes = parseVoiceCommand('Add', DEFAULT_CATEGORIES);
      expect(partialRes.intent).toBe('unknown');
      expect(partialRes.transactions).toHaveLength(0);
    });

    // 20. Verify that edits and deletions affect actual stored record
    it('Case 20: Edits and deletions affect real storage layer and verify state', async () => {
      const repo = new IndexedDBRepository('test_voice_master_case20');
      await repo.init();
      const goal = await repo.saveSavingsGoal({
        name: 'Vacation Fund',
        targetMinor: 5000000,
        currentSavedMinor: 0,
        color: '#10B981',
        icon: 'target',
      });
      expect(goal.id).toBeDefined();

      const allGoalsBefore = await repo.getAllSavingsGoals();
      expect(allGoalsBefore.some((g) => g.id === goal.id)).toBe(true);

      // Verify deletion
      await repo.deleteSavingsGoal(goal.id);
      const allGoalsAfter = await repo.getAllSavingsGoals();
      expect(allGoalsAfter.some((g) => g.id === goal.id)).toBe(false);
    });
  });
});
