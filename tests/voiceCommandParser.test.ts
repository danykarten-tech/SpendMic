import { describe, it, expect } from 'vitest';
import {
  parseVoiceCommand,
  parseSpokenAmount,
  normalizeVoiceText,
  parseSpokenDate,
  executeVoiceQuery,
} from '../src/domain/voiceCommandParser';
import { DEFAULT_CATEGORIES } from '../src/domain/categoriesData';
import { SavingsGoal } from '../src/domain/types';
import { getTodayLocalDateString } from '../src/domain/moneyAndDate';

describe('Voice Command Parser Unit Tests', () => {
  describe('Number & Currency Extraction', () => {
    it('parses digit amounts with rupees symbol and words', () => {
      expect(parseSpokenAmount('500 rupees').amountMinor).toBe(50000);
      expect(parseSpokenAmount('₹1200').amountMinor).toBe(120000);
      expect(parseSpokenAmount('350').amountMinor).toBe(35000);
    });

    it('parses Indian number terms like thousand, hazaar, lakh, and k', () => {
      expect(parseSpokenAmount('55 thousand rupees').amountMinor).toBe(5500000);
      expect(parseSpokenAmount('10 hazaar').amountMinor).toBe(1000000);
      expect(parseSpokenAmount('2 lakh').amountMinor).toBe(20000000);
      expect(parseSpokenAmount('55k').amountMinor).toBe(5500000);
    });

    it('parses spoken English and Hinglish word numbers', () => {
      expect(parseSpokenAmount('five hundred rupees').amountMinor).toBe(50000);
      expect(parseSpokenAmount('teen sau rupaye').amountMinor).toBe(30000);
      expect(parseSpokenAmount('paanch sau').amountMinor).toBe(50000);
    });
  });

  describe('Relative Date Parsing', () => {
    it('parses yesterday and today relative dates', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const y = yesterday.getFullYear();
      const m = String(yesterday.getMonth() + 1).padStart(2, '0');
      const d = String(yesterday.getDate()).padStart(2, '0');
      const expectedYesterday = `${y}-${m}-${d}`;

      expect(parseSpokenDate('I spent 350 on petrol yesterday')).toBe(expectedYesterday);
      expect(parseSpokenDate('kal petrol par 300 kharch hua')).toBe(expectedYesterday);
      expect(parseSpokenDate('today shopping 500')).toBe(getTodayLocalDateString());
    });
  });

  describe('Intent: ADD_INCOME & ADD_EXPENSE', () => {
    it('recognizes Salary income entries and flags frequency uncertainty', () => {
      const result = parseVoiceCommand('My salary is 55000 rupees', DEFAULT_CATEGORIES);
      expect(['ADD_INCOME', 'create_transaction']).toContain(result.intent);
      expect(result.explicitIntent).toBe('ADD_INCOME');
      expect(result.transactions[0].type).toBe('income');
      expect(result.transactions[0].categoryId).toBe('cat_salary');
      expect(result.transactions[0].amountMinor).toBe(5500000);
      expect(result.transactions[0].isSalary).toBe(true);
      expect(result.transactions[0].salaryFrequencyUncertain).toBe(true);
    });

    it('recognizes Bonus as one-time income', () => {
      const result = parseVoiceCommand('I received a 200 bonus', DEFAULT_CATEGORIES);
      expect(['ADD_INCOME', 'create_transaction']).toContain(result.intent);
      expect(result.explicitIntent).toBe('ADD_INCOME');
      expect(result.transactions[0].type).toBe('income');
      expect(result.transactions[0].amountMinor).toBe(20000);
      expect(result.transactions[0].categoryId).toBe('cat_bonus');
    });

    it('recognizes grocery expenses with various phrases', () => {
      const result1 = parseVoiceCommand('300 4 grocery expenses', DEFAULT_CATEGORIES);
      expect(['ADD_EXPENSE', 'create_transaction']).toContain(result1.intent);
      expect(result1.explicitIntent).toBe('ADD_EXPENSE');
      expect(result1.transactions[0].type).toBe('expense');
      expect(result1.transactions[0].categoryId).toBe('cat_groceries');
      expect(result1.transactions[0].amountMinor).toBe(30000);

      const result2 = parseVoiceCommand('grosry shopping 500', DEFAULT_CATEGORIES);
      expect(result2.transactions[0].categoryId).toBe('cat_groceries');
    });

    it('recognizes bonus with colloquial phrases', () => {
      const result1 = parseVoiceCommand('please add 2000 bonus on account', DEFAULT_CATEGORIES);
      expect(result1.transactions[0].type).toBe('income');
      expect(result1.transactions[0].categoryId).toBe('cat_bonus');
      expect(result1.transactions[0].amountMinor).toBe(200000);

      const result2 = parseVoiceCommand('2000 bonus act', DEFAULT_CATEGORIES);
      expect(result2.transactions[0].type).toBe('income');
      expect(result2.transactions[0].categoryId).toBe('cat_bonus');
      expect(result2.transactions[0].amountMinor).toBe(200000);
    });

    it('recognizes Freelance income entries', () => {
      const result = parseVoiceCommand('Maine freelance project se das hazaar kamaye', DEFAULT_CATEGORIES);
      expect(['ADD_INCOME', 'create_transaction']).toContain(result.intent);
      expect(result.explicitIntent).toBe('ADD_INCOME');
      expect(result.transactions[0].type).toBe('income');
      expect(result.transactions[0].amountMinor).toBe(1000000);
      expect(result.transactions[0].categoryId).toBe('cat_freelance');
    });

    it('recognizes Expense in Shopping category', () => {
      const result = parseVoiceCommand('Shopping par 1200 kharch kiye', DEFAULT_CATEGORIES);
      expect(['ADD_EXPENSE', 'create_transaction']).toContain(result.intent);
      expect(result.explicitIntent).toBe('ADD_EXPENSE');
      expect(result.transactions[0].type).toBe('expense');
      expect(result.transactions[0].amountMinor).toBe(120000);
      expect(result.transactions[0].categoryId).toBe('cat_shopping');
    });

    it('recognizes Expense in Transport/Petrol category with yesterday date', () => {
      const result = parseVoiceCommand('I spent 350 on petrol yesterday', DEFAULT_CATEGORIES);
      expect(['ADD_EXPENSE', 'create_transaction']).toContain(result.intent);
      expect(result.explicitIntent).toBe('ADD_EXPENSE');
      expect(result.transactions[0].type).toBe('expense');
      expect(result.transactions[0].amountMinor).toBe(35000);
      expect(result.transactions[0].categoryId).toBe('cat_transport');
    });

    it('flags ambiguous input like "Add 500"', () => {
      const result = parseVoiceCommand('Add 500', DEFAULT_CATEGORIES);
      expect(result.intent).toBe('ambiguous');
      expect(result.transactions[0].isAmbiguous).toBe(true);
      expect(result.clarificationPrompt).toBeDefined();
    });

    it('flags command with missing or invalid amount as ambiguous', () => {
      const result = parseVoiceCommand('I bought groceries', DEFAULT_CATEGORIES);
      expect(result.intent).toBe('ambiguous');
      expect(result.transactions[0].amountMinor).toBeNull();
      expect(result.transactions[0].isAmbiguous).toBe(true);
      expect(result.clarificationPrompt).toContain('Amount could not be detected');
    });

    it('parses multi-clause commands e.g. salary and bonus combined', () => {
      const result = parseVoiceCommand('My salary is 55000 and I received a 200 bonus', DEFAULT_CATEGORIES);
      expect(['ADD_INCOME', 'create_transaction']).toContain(result.intent);
      expect(result.transactions.length).toBe(2);
      expect(result.transactions[0].categoryId).toBe('cat_salary');
      expect(result.transactions[0].amountMinor).toBe(5500000);
      expect(result.transactions[1].categoryId).toBe('cat_bonus');
      expect(result.transactions[1].amountMinor).toBe(20000);
    });

    it('treats explicitly paid bills as ADD_EXPENSE, not recurring bill rules', () => {
      const result = parseVoiceCommand('I paid 500 for electric bill yesterday', DEFAULT_CATEGORIES);
      expect(result.intent).toBe('ADD_EXPENSE');
      expect(result.transactions[0].type).toBe('expense');
      expect(result.transactions[0].amountMinor).toBe(50000);
    });
  });

  describe('Intent: CREATE_SAVINGS_GOAL', () => {
    it('parses "Create a savings goal of 2000 rupees."', () => {
      const result = parseVoiceCommand('Create a savings goal of 2000 rupees.', DEFAULT_CATEGORIES);
      expect(result.intent).toBe('CREATE_SAVINGS_GOAL');
      expect(result.explicitIntent).toBe('CREATE_SAVINGS_GOAL');
      expect(result.savingsGoal).toBeDefined();
      expect(result.savingsGoal?.targetMinor).toBe(200000);
      expect(result.savingsGoal?.name).toBe('Savings Goal');
      expect(result.savingsGoal?.isAmbiguous).toBe(false);
    });

    it('parses "Save for a new phone, target 20000 rupees."', () => {
      const result = parseVoiceCommand('Save for a new phone, target 20000 rupees.', DEFAULT_CATEGORIES);
      expect(result.intent).toBe('CREATE_SAVINGS_GOAL');
      expect(result.savingsGoal).toBeDefined();
      expect(result.savingsGoal?.name).toBe('New Phone');
      expect(result.savingsGoal?.targetMinor).toBe(2000000);
      expect(result.savingsGoal?.isAmbiguous).toBe(false);
    });

    it('parses "Save for vacation target 50000"', () => {
      const result = parseVoiceCommand('Save for vacation target 50000', DEFAULT_CATEGORIES);
      expect(result.intent).toBe('CREATE_SAVINGS_GOAL');
      expect(result.savingsGoal?.name).toBe('Vacation');
      expect(result.savingsGoal?.targetMinor).toBe(5000000);
    });

    it('asks follow-up question when target amount is missing in savings goal', () => {
      const result = parseVoiceCommand('Save for a new laptop', DEFAULT_CATEGORIES);
      expect(result.intent).toBe('ambiguous');
      expect(result.savingsGoal?.isAmbiguous).toBe(true);
      expect(result.missingFields).toContain('targetAmount');
      expect(result.clarificationPrompt).toContain('What is the target amount for this savings goal?');
    });
  });

  describe('Intent: ADD_SAVINGS_CONTRIBUTION', () => {
    const mockGoals: SavingsGoal[] = [
      {
        id: 'goal_phone_1',
        name: 'New Phone',
        targetMinor: 2000000,
        currentSavedMinor: 500000,
        color: '#10B981',
        icon: 'target',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'goal_vacation_2',
        name: 'Vacation',
        targetMinor: 5000000,
        currentSavedMinor: 1000000,
        color: '#3B82F6',
        icon: 'target',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    it('parses "Add 500 rupees to my phone savings goal."', () => {
      const result = parseVoiceCommand(
        'Add 500 rupees to my phone savings goal.',
        DEFAULT_CATEGORIES,
        'INR',
        mockGoals
      );
      expect(result.intent).toBe('ADD_SAVINGS_CONTRIBUTION');
      expect(result.savingsContribution).toBeDefined();
      expect(result.savingsContribution?.amountMinor).toBe(50000);
      expect(result.savingsContribution?.matchedGoalId).toBe('goal_phone_1');
      expect(result.savingsContribution?.goalNameOrId).toBe('New Phone');
      expect(result.savingsContribution?.isAmbiguous).toBe(false);
    });

    it('parses "Contribute 1000 rupees to vacation goal"', () => {
      const result = parseVoiceCommand(
        'Contribute 1000 rupees to vacation goal',
        DEFAULT_CATEGORIES,
        'INR',
        mockGoals
      );
      expect(result.intent).toBe('ADD_SAVINGS_CONTRIBUTION');
      expect(result.savingsContribution?.amountMinor).toBe(100000);
      expect(result.savingsContribution?.matchedGoalId).toBe('goal_vacation_2');
    });

    it('asks follow-up question when contribution amount is missing', () => {
      const result = parseVoiceCommand(
        'Add to my phone savings goal',
        DEFAULT_CATEGORIES,
        'INR',
        mockGoals
      );
      expect(result.intent).toBe('ambiguous');
      expect(result.missingFields).toContain('amount');
      expect(result.clarificationPrompt).toContain('How much would you like to contribute');
    });
  });

  describe('Intent: CREATE_RECURRING_BILL', () => {
    it('parses "Add a monthly internet bill of 999 rupees."', () => {
      const result = parseVoiceCommand('Add a monthly internet bill of 999 rupees.', DEFAULT_CATEGORIES);
      expect(result.intent).toBe('CREATE_RECURRING_BILL');
      expect(result.explicitIntent).toBe('CREATE_RECURRING_BILL');
      expect(result.recurringBill).toBeDefined();
      expect(result.recurringBill?.name).toBe('Internet Bill');
      expect(result.recurringBill?.amountMinor).toBe(99900);
      expect(result.recurringBill?.frequency).toBe('monthly');
      expect(result.recurringBill?.categoryId).toBe('cat_utilities');
      expect(result.recurringBill?.isAmbiguous).toBe(false);
    });

    it('parses "My rent is 10000 rupees every month."', () => {
      const result = parseVoiceCommand('My rent is 10000 rupees every month.', DEFAULT_CATEGORIES);
      expect(result.intent).toBe('CREATE_RECURRING_BILL');
      expect(result.recurringBill?.name).toBe('Rent');
      expect(result.recurringBill?.amountMinor).toBe(1000000);
      expect(result.recurringBill?.frequency).toBe('monthly');
      expect(result.recurringBill?.categoryId).toBe('cat_housing');
    });

    it('parses "Add yearly insurance of 12000 rupees."', () => {
      const result = parseVoiceCommand('Add yearly insurance of 12000 rupees.', DEFAULT_CATEGORIES);
      expect(result.intent).toBe('CREATE_RECURRING_BILL');
      expect(result.recurringBill?.name).toBe('Insurance');
      expect(result.recurringBill?.amountMinor).toBe(1200000);
      expect(result.recurringBill?.frequency).toBe('yearly');
    });

    it('asks follow-up question when recurring bill amount is missing', () => {
      const result = parseVoiceCommand('Add a monthly internet bill', DEFAULT_CATEGORIES);
      expect(result.intent).toBe('ambiguous');
      expect(result.missingFields).toContain('amount');
      expect(result.clarificationPrompt).toContain('What is the amount for this recurring bill?');
    });
  });

  describe('Ambiguous & Conflicting Multi-Intent Guard', () => {
    it('flags conflicting command combining savings goal and recurring bill', () => {
      const result = parseVoiceCommand('Save for a new phone and monthly rent is 10000', DEFAULT_CATEGORIES);
      expect(result.intent).toBe('ambiguous');
      expect(result.clarificationPrompt).toContain('Multiple conflicting actions detected');
    });
  });

  describe('Local Financial Q&A Queries', () => {
    it('detects monthly expense query intent', () => {
      const result = parseVoiceCommand('How much did I spend this month?', DEFAULT_CATEGORIES);
      expect(result.intent).toBe('query_financials');
      expect(result.queryResult?.queryType).toBe('monthly_expense');
    });

    it('detects total income query intent', () => {
      const result = parseVoiceCommand('What is my total income?', DEFAULT_CATEGORIES);
      expect(result.intent).toBe('query_financials');
      expect(result.queryResult?.queryType).toBe('monthly_income');
    });

    it('detects remaining budget query intent', () => {
      const result = parseVoiceCommand('How much money is left this month?', DEFAULT_CATEGORIES);
      expect(result.intent).toBe('query_financials');
      expect(result.queryResult?.queryType).toBe('remaining_budget');
    });

    it('executes financial queries against monthly summary object', () => {
      const summary = {
        periodKey: '2026-10',
        incomeTotalMinor: 5000000,
        expenseTotalMinor: 1500000,
        netCashFlowMinor: 3500000,
        transactionCount: 12,
      };

      const expenseAnswer = executeVoiceQuery(
        { queryType: 'monthly_expense', answerText: '' },
        summary
      );
      expect(expenseAnswer).toContain('₹15,000.00');

      const remainingAnswer = executeVoiceQuery(
        { queryType: 'remaining_budget', answerText: '' },
        summary
      );
      expect(remainingAnswer).toContain('₹35,000.00');
    });
  });
});
