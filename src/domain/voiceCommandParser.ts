import { Category, TransactionType, MonthlySummary, SavingsGoal, BillFrequency, Bill } from './types';
import { formatMinorToMajor, getTodayLocalDateString, getCurrentLocalTimeString } from './moneyAndDate';
import { BUILT_IN_CATEGORIES } from './categoriesData';

export type VoiceIntent =
  | 'ADD_INCOME'
  | 'ADD_EXPENSE'
  | 'CREATE_SAVINGS_GOAL'
  | 'ADD_SAVINGS_CONTRIBUTION'
  | 'EDIT_SAVINGS_GOAL'
  | 'DELETE_SAVINGS_GOAL'
  | 'SHOW_SAVINGS_HISTORY'
  | 'CREATE_RECURRING_BILL'
  | 'RECORD_BILL_PAYMENT'
  | 'create_transaction'
  | 'query_financials'
  | 'ambiguous'
  | 'unknown';

export interface ParsedVoiceSavingsGoal {
  name: string;
  targetMinor: number | null;
  targetDateLocal?: string;
  color?: string;
  icon?: string;
  isAmbiguous?: boolean;
  ambiguityReason?: string;
  missingFields?: string[];
}

export interface ParsedVoiceSavingsContribution {
  goalNameOrId: string;
  matchedGoalId?: string;
  amountMinor: number | null;
  dateLocal: string;
  note?: string;
  isAmbiguous?: boolean;
  ambiguityReason?: string;
  missingFields?: string[];
}

export interface ParsedVoiceSavingsEdit {
  goalId?: string;
  goalName: string;
  newTargetMinor: number | null;
  isAmbiguous?: boolean;
  ambiguityReason?: string;
  missingFields?: string[];
}

export interface ParsedVoiceSavingsDelete {
  goalId?: string;
  goalName: string;
  currentSavedMinor?: number;
  targetMinor?: number;
  isAmbiguous?: boolean;
  ambiguityReason?: string;
}

export interface ParsedVoiceSavingsHistory {
  goalId?: string;
  goalName: string;
  isAmbiguous?: boolean;
  ambiguityReason?: string;
}

export interface ParsedVoiceBillPayment {
  billId?: string;
  billName: string;
  amountMinor?: number | null;
  isAmbiguous?: boolean;
  ambiguityReason?: string;
}

export interface ParsedVoiceRecurringBill {
  name: string;
  amountMinor: number | null;
  frequency: BillFrequency;
  categoryId: string;
  dueDateLocal: string;
  isAmbiguous?: boolean;
  ambiguityReason?: string;
  missingFields?: string[];
}

export interface ParsedVoiceTransaction {
  type: TransactionType;
  amountMinor: number | null;
  currency: string;
  categoryId: string | null;
  dateLocal: string; // YYYY-MM-DD
  timeLocal?: string; // HH:mm local time (only when added for today)
  note: string;
  isSalary?: boolean;
  salaryFrequencyUncertain?: boolean;
  isAmbiguous?: boolean;
  ambiguityReason?: string;
}

export interface VoiceQueryResult {
  queryType: 'monthly_expense' | 'monthly_income' | 'category_expense' | 'remaining_budget' | 'recent_transactions';
  answerText: string;
  data?: any;
}

export interface VoiceParseResult {
  rawTranscript: string;
  normalizedTranscript: string;
  intent: VoiceIntent;
  explicitIntent?: VoiceIntent;
  transactions: ParsedVoiceTransaction[];
  savingsGoal?: ParsedVoiceSavingsGoal;
  savingsContribution?: ParsedVoiceSavingsContribution;
  savingsEdit?: ParsedVoiceSavingsEdit;
  savingsDelete?: ParsedVoiceSavingsDelete;
  savingsHistory?: ParsedVoiceSavingsHistory;
  billPayment?: ParsedVoiceBillPayment;
  recurringBill?: ParsedVoiceRecurringBill;
  queryResult?: VoiceQueryResult;
  clarificationPrompt?: string;
  missingFields?: string[];
}

export interface VoiceCommandHelpCategory {
  title: string;
  intent: VoiceIntent;
  allowedIntents?: VoiceIntent[];
  examples: string[];
}

export const VOICE_HELP_COMMANDS: VoiceCommandHelpCategory[] = [
  {
    title: 'Salary & Other Income',
    intent: 'ADD_INCOME',
    examples: [
      'My salary is 55000',
      'I received a 200 bonus',
      'Earned 5000 freelance income',
    ],
  },
  {
    title: 'Expenses',
    intent: 'ADD_EXPENSE',
    examples: [
      'I spent 350 on petrol yesterday',
      'Shopping par 1200 kharch kiye',
      'Paid 450 for grocery',
    ],
  },
  {
    title: 'Create a Savings Goal',
    intent: 'CREATE_SAVINGS_GOAL',
    examples: [
      'Create a Home savings goal of 50000',
      'Save for a new phone, target 20000 rupees',
      'Save for vacation target 50000',
    ],
  },
  {
    title: 'Deposit into Savings',
    intent: 'ADD_SAVINGS_CONTRIBUTION',
    examples: [
      'Add 500 to my Home savings goal',
      'Deposit 500 into Home',
      'Contribute 1000 to Emergency Fund',
    ],
  },
  {
    title: 'Edit or Delete a Goal',
    intent: 'EDIT_SAVINGS_GOAL',
    allowedIntents: ['EDIT_SAVINGS_GOAL', 'DELETE_SAVINGS_GOAL'],
    examples: [
      'Change my Home goal to 60000',
      'Update Home goal target to 60000',
      'Delete my Home savings goal',
    ],
  },
  {
    title: 'View Goal History',
    intent: 'SHOW_SAVINGS_HISTORY',
    examples: [
      'Show savings history for Home',
      'View deposit history for Emergency Fund',
    ],
  },
  {
    title: 'Create a Recurring Bill',
    intent: 'CREATE_RECURRING_BILL',
    examples: [
      'Add a monthly internet bill of 999',
      'My rent is 10000 every month',
      'Add yearly insurance of 12000',
    ],
  },
  {
    title: 'Record a Bill Payment',
    intent: 'RECORD_BILL_PAYMENT',
    examples: [
      'Record bill payment for rent',
      'Mark internet bill as paid',
    ],
  },
];

// Map Hindi / Hinglish and English number words to numeric values
const NUMBER_WORDS: Record<string, number> = {
  zero: 0,
  one: 1, ek: 1,
  two: 2, do: 2,
  three: 3, teen: 3,
  four: 4, char: 4, chaar: 4,
  five: 5, paanch: 5, panch: 5,
  six: 6, chhe: 6, che: 6,
  seven: 7, saat: 7,
  eight: 8, aath: 8, ath: 8,
  nine: 9, nau: 9,
  ten: 10, das: 10,
  eleven: 11, gyaarah: 11,
  twelve: 12, baarah: 12,
  fifteen: 15, pandrah: 15,
  twenty: 20, bees: 20,
  thirty: 30, tees: 30,
  forty: 40, chalees: 40,
  fifty: 50, pachaas: 50,
  hundred: 100, sau: 100,
  thousand: 1000, hazaar: 1000, hazar: 1000, k: 1000,
  lakh: 100000, lac: 100000, lacs: 100000, lakhs: 100000,
};

/**
 * Normalizes input speech text by lowercasing, expanding Hinglish/English number terms,
 * and replacing common currency symbols.
 */
export function normalizeVoiceText(text: string): string {
  let normalized = text.toLowerCase().trim();
  
  // Replace currency symbols & common currency words
  normalized = normalized.replace(/₹|rs\.?|rupees|rupee|inr/gi, ' rupees ');
  normalized = normalized.replace(/[$€£¥]/g, ' ');
  normalized = normalized.replace(/\b(dollars?|bucks?|euros?|pounds?|yen)\b/gi, ' ');
  
  // Replace symbols like commas or extra spaces
  normalized = normalized.replace(/[,;!]/g, ' ');
  
  // Expand terms like "55k" -> "55000"
  normalized = normalized.replace(/(\d+)\s*k\b/gi, '$1000');
  
  // Clean up whitespace
  return normalized.replace(/\s+/g, ' ').trim();
}

/**
 * Parses Indian currency amounts and numeric words from spoken text.
 * e.g., "five hundred", "55 thousand", "2 lakh", "10 hazaar", "teen sau", "₹1,200", "350"
 */
export function parseSpokenAmount(text: string): { amountMinor: number | null; rawAmountText: string } {
  const norm = normalizeVoiceText(text);

  // Check for explicit digit amounts e.g., "1200", "55000", "350"
  const digitsMatch = norm.match(/(\d+(?:\.\d{1,2})?)\s*(thousand|hazaar|hazar|lakh|lac|lakhs|sau|hundred)?/i);
  if (digitsMatch) {
    let baseNum = parseFloat(digitsMatch[1]);
    const multiplierWord = digitsMatch[2]?.toLowerCase();
    
    if (multiplierWord) {
      if (['thousand', 'hazaar', 'hazar'].includes(multiplierWord)) baseNum *= 1000;
      else if (['lakh', 'lac', 'lakhs'].includes(multiplierWord)) baseNum *= 100000;
      else if (['sau', 'hundred'].includes(multiplierWord)) baseNum *= 100;
    }
    
    return {
      amountMinor: Math.round(baseNum * 100),
      rawAmountText: digitsMatch[0],
    };
  }

  // Check for written word patterns e.g. "fifty five thousand", "five hundred", "do sau", "das hazaar"
  const wordTokens = norm.split(' ');
  let total = 0;
  let currentWordVal = 0;
  let foundNumber = false;

  for (let i = 0; i < wordTokens.length; i++) {
    const token = wordTokens[i];
    const val = NUMBER_WORDS[token];

    if (val !== undefined) {
      foundNumber = true;
      if (val === 100) {
        currentWordVal = currentWordVal === 0 ? 100 : currentWordVal * 100;
      } else if (val === 1000 || val === 100000) {
        currentWordVal = currentWordVal === 0 ? val : currentWordVal * val;
        total += currentWordVal;
        currentWordVal = 0;
      } else {
        currentWordVal += val;
      }
    } else if (foundNumber && !['rupees', 'on', 'for', 'par', 'ka', 'ki', 'se'].includes(token)) {
      // Stop sequence when encountering non-number words
      break;
    }
  }

  total += currentWordVal;

  if (foundNumber && total > 0) {
    return {
      amountMinor: total * 100,
      rawAmountText: total.toString(),
    };
  }

  return { amountMinor: null, rawAmountText: '' };
}

/**
 * Detects relative date references such as "yesterday" / "kal", "today" / "aaj"
 */
export function parseSpokenDate(text: string): string {
  const norm = text.toLowerCase();
  const todayStr = getTodayLocalDateString();
  
  if (norm.includes('yesterday') || norm.includes('kal kharch') || norm.includes('kal spent') || norm.includes('kal ')) {
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const y = yesterdayDate.getFullYear();
    const m = String(yesterdayDate.getMonth() + 1).padStart(2, '0');
    const d = String(yesterdayDate.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  
  // Default to today (local YYYY-MM-DD)
  return todayStr;
}

function capitalizeWords(str: string): string {
  return str
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function findMatchingSavingsGoals(
  rawPhrase: string,
  existingGoals: SavingsGoal[]
): SavingsGoal[] {
  if (!rawPhrase || !existingGoals || existingGoals.length === 0) return [];
  const phrase = rawPhrase
    .toLowerCase()
    .trim()
    .replace(/\b(my|the|a|an)\b/gi, '')
    .replace(/\b(savings\s+goal|saving\s+goal|goal|savings|saving|bachat)\b/gi, '')
    .trim();

  if (!phrase) return [];

  // 1. Exact matches by name or id
  const exact = existingGoals.filter(
    (g) => g.name.toLowerCase().trim() === phrase || g.id.toLowerCase() === phrase
  );
  if (exact.length > 0) return exact;

  // 2. Substring / inclusion matches
  const subMatches = existingGoals.filter((g) => {
    const gn = g.name.toLowerCase().trim();
    return gn.includes(phrase) || phrase.includes(gn);
  });
  return subMatches;
}

function parseSavingsGoalOrContribution(
  norm: string,
  transcript: string,
  existingSavingsGoals: SavingsGoal[] = []
): VoiceParseResult | null {
  // 1. SHOW_SAVINGS_HISTORY
  // Examples:
  // "Show savings history for Home"
  // "View deposit history for Emergency Fund"
  // "Show deposits for Home goal"
  // "Show Home savings history"
  const isHistoryCommand =
    (norm.includes('history') || norm.includes('contributions') || norm.includes('deposits')) &&
    (norm.includes('show') ||
      norm.includes('view') ||
      norm.includes('see') ||
      norm.includes('display') ||
      norm.includes('history for') ||
      norm.includes('history of'));

  if (isHistoryCommand) {
    let goalPhrase = '';
    const forMatch = norm.match(/(?:for|of)\s+(?:my\s+|the\s+)?([a-z0-9\s]+?)(?:\s+savings\s+goal|\s+saving\s+goal|\s+goal|\s+savings|$)/i);
    if (forMatch && forMatch[1]) {
      goalPhrase = forMatch[1].trim();
    } else {
      const showMatch = norm.match(/(?:show|view|see|display)\s+(?:my\s+|the\s+)?([a-z0-9\s]+?)(?:\s+savings\s+history|\s+deposit\s+history|\s+goal\s+history|\s+deposits|\s+history)/i);
      if (showMatch && showMatch[1]) {
        goalPhrase = showMatch[1].trim();
      }
    }

    const matches = findMatchingSavingsGoals(goalPhrase, existingSavingsGoals);

    if (goalPhrase && matches.length === 0) {
      return {
        rawTranscript: transcript,
        normalizedTranscript: norm,
        intent: 'ambiguous',
        explicitIntent: 'SHOW_SAVINGS_HISTORY',
        transactions: [],
        clarificationPrompt: `Savings goal "${capitalizeWords(goalPhrase)}" does not exist. Would you like to create one?`,
        missingFields: ['goalName'],
      };
    }

    if (matches.length > 1) {
      return {
        rawTranscript: transcript,
        normalizedTranscript: norm,
        intent: 'ambiguous',
        explicitIntent: 'SHOW_SAVINGS_HISTORY',
        transactions: [],
        clarificationPrompt: `Multiple savings goals match "${capitalizeWords(goalPhrase)}". Please specify which goal you would like to view: ${matches.map((m) => m.name).join(', ')}.`,
        missingFields: ['goalName'],
      };
    }

    const matchedGoal = matches.length === 1 ? matches[0] : (existingSavingsGoals.length === 1 ? existingSavingsGoals[0] : undefined);

    if (!matchedGoal) {
      return {
        rawTranscript: transcript,
        normalizedTranscript: norm,
        intent: 'ambiguous',
        explicitIntent: 'SHOW_SAVINGS_HISTORY',
        transactions: [],
        clarificationPrompt: existingSavingsGoals.length === 0
          ? 'You do not have any savings goals yet. Would you like to create one?'
          : `Which savings goal would you like to view history for? Available goals: ${existingSavingsGoals.map((m) => m.name).join(', ')}.`,
        missingFields: ['goalName'],
      };
    }

    return {
      rawTranscript: transcript,
      normalizedTranscript: norm,
      intent: 'SHOW_SAVINGS_HISTORY',
      explicitIntent: 'SHOW_SAVINGS_HISTORY',
      transactions: [],
      savingsHistory: {
        goalId: matchedGoal.id,
        goalName: matchedGoal.name,
      },
    };
  }

  // 2. DELETE_SAVINGS_GOAL
  // Examples:
  // "Delete my Home savings goal"
  // "Remove Home savings goal"
  // "Delete Home goal"
  const isDeleteCommand =
    (norm.startsWith('delete') || norm.startsWith('remove') || norm.startsWith('cancel') || norm.includes('delete') || norm.includes('remove')) &&
    (norm.includes('savings goal') || norm.includes('saving goal') || (norm.includes('goal') && !norm.includes('contribution') && !norm.includes('deposit'))) &&
    !norm.includes('transaction');

  if (isDeleteCommand) {
    let goalPhrase = '';
    const match = norm.match(/(?:delete|remove|cancel)\s+(?:my\s+|the\s+)?([a-z0-9\s]+?)(?:\s+savings\s+goal|\s+saving\s+goal|\s+goal|$)/i);
    if (match && match[1]) {
      goalPhrase = match[1].replace(/\b(my|the|a|an)\b/gi, '').trim();
    }

    const matches = findMatchingSavingsGoals(goalPhrase, existingSavingsGoals);

    if (goalPhrase && matches.length === 0) {
      return {
        rawTranscript: transcript,
        normalizedTranscript: norm,
        intent: 'ambiguous',
        explicitIntent: 'DELETE_SAVINGS_GOAL',
        transactions: [],
        clarificationPrompt: `Savings goal "${capitalizeWords(goalPhrase)}" does not exist.`,
        missingFields: ['goalName'],
      };
    }

    if (matches.length > 1) {
      return {
        rawTranscript: transcript,
        normalizedTranscript: norm,
        intent: 'ambiguous',
        explicitIntent: 'DELETE_SAVINGS_GOAL',
        transactions: [],
        clarificationPrompt: `Multiple savings goals match "${capitalizeWords(goalPhrase)}". Please specify which goal you want to delete: ${matches.map((m) => m.name).join(', ')}.`,
        missingFields: ['goalName'],
      };
    }

    const matchedGoal = matches.length === 1 ? matches[0] : undefined;

    if (!matchedGoal) {
      return {
        rawTranscript: transcript,
        normalizedTranscript: norm,
        intent: 'ambiguous',
        explicitIntent: 'DELETE_SAVINGS_GOAL',
        transactions: [],
        clarificationPrompt: 'Which savings goal would you like to delete?',
        missingFields: ['goalName'],
      };
    }

    return {
      rawTranscript: transcript,
      normalizedTranscript: norm,
      intent: 'DELETE_SAVINGS_GOAL',
      explicitIntent: 'DELETE_SAVINGS_GOAL',
      transactions: [],
      savingsDelete: {
        goalId: matchedGoal.id,
        goalName: matchedGoal.name,
        currentSavedMinor: matchedGoal.currentSavedMinor,
        targetMinor: matchedGoal.targetMinor,
      },
    };
  }

  // 3. EDIT_SAVINGS_GOAL
  // Examples:
  // "Change my Home goal to 60000"
  // "Update Home goal target to 60000"
  // "Edit my Home goal target to 60000"
  const isEditCommand =
    (norm.includes('change') || norm.includes('update') || norm.includes('edit') || norm.includes('modify')) &&
    (norm.includes('goal') || norm.includes('savings')) &&
    !norm.includes('recurring') &&
    !norm.includes('bill');

  if (isEditCommand) {
    const { amountMinor } = parseSpokenAmount(norm);
    let goalPhrase = '';
    const match = norm.match(/(?:change|update|edit|modify)\s+(?:target\s+(?:for|of)\s+)?(?:my\s+|the\s+)?([a-z0-9\s]+?)(?:\s+target|\s+goal|\s+savings\s+goal|\s+savings)?\s+(?:target\s+)?to\s+/i);
    if (match && match[1]) {
      goalPhrase = match[1].replace(/\b(my|the|a|an)\b/gi, '').trim();
    }

    const matches = findMatchingSavingsGoals(goalPhrase, existingSavingsGoals);

    if (goalPhrase && matches.length === 0) {
      return {
        rawTranscript: transcript,
        normalizedTranscript: norm,
        intent: 'ambiguous',
        explicitIntent: 'EDIT_SAVINGS_GOAL',
        transactions: [],
        clarificationPrompt: `Savings goal "${capitalizeWords(goalPhrase)}" does not exist. Would you like to create one?`,
        missingFields: ['goalName'],
      };
    }

    if (matches.length > 1) {
      return {
        rawTranscript: transcript,
        normalizedTranscript: norm,
        intent: 'ambiguous',
        explicitIntent: 'EDIT_SAVINGS_GOAL',
        transactions: [],
        clarificationPrompt: `Multiple savings goals match "${capitalizeWords(goalPhrase)}". Please specify which goal you want to update: ${matches.map((m) => m.name).join(', ')}.`,
        missingFields: ['goalName'],
      };
    }

    const matchedGoal = matches.length === 1 ? matches[0] : (existingSavingsGoals.length === 1 ? existingSavingsGoals[0] : undefined);

    const missingFields: string[] = [];
    if (!amountMinor || amountMinor <= 0) missingFields.push('targetAmount');
    if (!matchedGoal) missingFields.push('goalName');

    const isAmbiguous = missingFields.length > 0;
    let clarificationPrompt: string | undefined = undefined;
    if (missingFields.includes('goalName')) {
      clarificationPrompt = 'Which savings goal would you like to update?';
    } else if (missingFields.includes('targetAmount')) {
      clarificationPrompt = `What should be the new target amount for "${matchedGoal?.name}"?`;
    }

    return {
      rawTranscript: transcript,
      normalizedTranscript: norm,
      intent: isAmbiguous ? 'ambiguous' : 'EDIT_SAVINGS_GOAL',
      explicitIntent: 'EDIT_SAVINGS_GOAL',
      transactions: [],
      savingsEdit: {
        goalId: matchedGoal?.id,
        goalName: matchedGoal ? matchedGoal.name : (goalPhrase ? capitalizeWords(goalPhrase) : 'Savings Goal'),
        newTargetMinor: amountMinor,
        isAmbiguous,
        ambiguityReason: clarificationPrompt,
        missingFields,
      },
      clarificationPrompt,
      missingFields,
    };
  }

  // 4. CREATE_SAVINGS_GOAL vs ADD_SAVINGS_CONTRIBUTION
  // Note: Check CREATE first if command explicitly says create/start/save for/new savings goal
  const isExplicitCreate =
    (norm.startsWith('create') ||
      norm.startsWith('new') ||
      norm.startsWith('start') ||
      norm.startsWith('set up') ||
      norm.startsWith('save for') ||
      norm.includes('create a') ||
      norm.includes('create new') ||
      norm.includes('save for')) &&
    (norm.includes('savings goal') || norm.includes('saving goal') || norm.includes('save for')) &&
    !norm.includes('deposit') &&
    !norm.includes('contribute');

  if (isExplicitCreate) {
    const { amountMinor } = parseSpokenAmount(norm);

    let goalName = '';
    const createWithNameMatch = norm.match(
      /(?:create|new|start|set up)\s+(?:a\s+|an\s+)?([a-z0-9\s]+?)\s+(?:savings\s+goal|saving\s+goal|goal)\s+(?:of|with|target|\d)/i
    );
    if (createWithNameMatch && createWithNameMatch[1]) {
      const extracted = createWithNameMatch[1].replace(/\b(a|an|the)\b/gi, '').trim();
      if (extracted && extracted.toLowerCase() !== 'savings' && extracted.toLowerCase() !== 'saving') {
        goalName = extracted;
      }
    } else {
      const saveForMatch = norm.match(
        /save\s+for\s+(?:a\s+|an\s+|the\s+)?([a-z0-9\s]+?)(?:,|target|of|with|\d|rupees|rs|$)/i
      );
      if (saveForMatch && saveForMatch[1]) {
        goalName = saveForMatch[1].replace(/\b(a|an|the)\b/gi, '').trim();
      } else {
        const goalForMatch = norm.match(
          /(?:savings\s+goal|saving\s+goal)\s+for\s+(?:a\s+|an\s+|the\s+)?([a-z0-9\s]+?)(?:,|target|of|with|\d|rupees|rs|$)/i
        );
        if (goalForMatch && goalForMatch[1]) {
          goalName = goalForMatch[1].replace(/\b(a|an|the)\b/gi, '').trim();
        }
      }
    }

    if (!goalName) {
      goalName = 'Savings Goal';
    } else {
      goalName = capitalizeWords(goalName);
    }

    const missingFields: string[] = [];
    if (!amountMinor || amountMinor <= 0) {
      missingFields.push('targetAmount');
    }

    let clarificationPrompt: string | undefined = undefined;
    if (missingFields.includes('targetAmount')) {
      clarificationPrompt = 'What is the target amount for this savings goal?';
    }

    const isAmbiguous = missingFields.length > 0;

    return {
      rawTranscript: transcript,
      normalizedTranscript: norm,
      intent: isAmbiguous ? 'ambiguous' : 'CREATE_SAVINGS_GOAL',
      explicitIntent: 'CREATE_SAVINGS_GOAL',
      transactions: [],
      savingsGoal: {
        name: goalName,
        targetMinor: amountMinor,
        color: '#10B981',
        icon: 'target',
        isAmbiguous,
        ambiguityReason: clarificationPrompt,
        missingFields,
      },
      clarificationPrompt,
      missingFields,
    };
  }

  // 5. ADD_SAVINGS_CONTRIBUTION
  // Examples:
  // "Add 500 to my Home savings goal"
  // "Deposit 500 into Home"
  // "Deposit 500 into Home savings goal"
  // "Contribute 1000 to Emergency Fund"
  // "Put 2000 into vacation goal"
  // "Deposit 500 in Home"
  const isContributionAction =
    (norm.includes('deposit') ||
      norm.includes('contribute') ||
      norm.includes('jama') ||
      ((norm.includes('add') || norm.includes('put')) &&
        /\b(to|into|towards|in)\b/i.test(norm) &&
        !norm.includes('bill') &&
        !norm.includes('monthly') &&
        !norm.includes('weekly') &&
        !norm.includes('yearly') &&
        !norm.includes('annual') &&
        !norm.includes('every month') &&
        !norm.includes('every week') &&
        !norm.includes('every year'))) &&
    !norm.includes('spent') &&
    !norm.includes('yesterday') &&
    !norm.includes('grocery');

  if (isContributionAction) {
    const { amountMinor } = parseSpokenAmount(norm);

    let goalPhrase = '';
    const toMatch = norm.match(
      /(?:to\s+(?:my\s+|the\s+)?|into\s+(?:my\s+|the\s+)?|towards\s+(?:my\s+|the\s+)?|in\s+(?:my\s+|the\s+)?)([a-z0-9\s]+?)(?:\s+savings\s+goal|\s+saving\s+goal|\s+goal|\s+savings|$)/i
    );
    if (toMatch && toMatch[1]) {
      goalPhrase = toMatch[1].replace(/\b(my|the|a|an)\b/gi, '').trim();
    }

    const matches = findMatchingSavingsGoals(goalPhrase, existingSavingsGoals);

    // If a referenced goal was stated but does NOT exist in the database:
    if (goalPhrase && matches.length === 0) {
      return {
        rawTranscript: transcript,
        normalizedTranscript: norm,
        intent: 'ambiguous',
        explicitIntent: 'ADD_SAVINGS_CONTRIBUTION',
        transactions: [],
        clarificationPrompt: `Savings goal "${capitalizeWords(goalPhrase)}" does not exist. Would you like to create one?`,
        missingFields: ['goalName'],
      };
    }

    // If multiple goals match:
    if (matches.length > 1) {
      return {
        rawTranscript: transcript,
        normalizedTranscript: norm,
        intent: 'ambiguous',
        explicitIntent: 'ADD_SAVINGS_CONTRIBUTION',
        transactions: [],
        clarificationPrompt: `Multiple savings goals match "${capitalizeWords(goalPhrase)}". Please select the correct goal: ${matches.map((m) => m.name).join(', ')}.`,
        missingFields: ['goalName'],
      };
    }

    let matchedGoalId: string | undefined = undefined;
    let resolvedGoalName = '';

    if (matches.length === 1) {
      matchedGoalId = matches[0].id;
      resolvedGoalName = matches[0].name;
    } else if (!goalPhrase && existingSavingsGoals.length === 1) {
      matchedGoalId = existingSavingsGoals[0].id;
      resolvedGoalName = existingSavingsGoals[0].name;
    }

    const missingFields: string[] = [];
    if (!amountMinor || amountMinor <= 0) missingFields.push('amount');
    if (!matchedGoalId) missingFields.push('goalName');

    let clarificationPrompt: string | undefined = undefined;
    if (missingFields.includes('goalName')) {
      if (existingSavingsGoals.length === 0) {
        clarificationPrompt = 'You do not have any savings goals yet. Would you like to create one?';
      } else {
        clarificationPrompt = `Which savings goal would you like to add this contribution to? Available goals: ${existingSavingsGoals.map((g) => g.name).join(', ')}.`;
      }
    } else if (missingFields.includes('amount')) {
      clarificationPrompt = `How much would you like to contribute to "${resolvedGoalName}"?`;
    }

    const isAmbiguous = missingFields.length > 0;

    return {
      rawTranscript: transcript,
      normalizedTranscript: norm,
      intent: isAmbiguous ? 'ambiguous' : 'ADD_SAVINGS_CONTRIBUTION',
      explicitIntent: 'ADD_SAVINGS_CONTRIBUTION',
      transactions: [],
      savingsContribution: {
        goalNameOrId: resolvedGoalName || 'Savings Goal',
        matchedGoalId,
        amountMinor,
        dateLocal: getTodayLocalDateString(),
        note: `Voice Contribution: ${transcript}`,
        isAmbiguous,
        ambiguityReason: clarificationPrompt,
        missingFields,
      },
      clarificationPrompt,
      missingFields,
    };
  }

  // 6. Generic create savings goal fallback if keywords match
  const isGenericCreate =
    norm.includes('savings goal') ||
    norm.includes('saving goal') ||
    (norm.includes('target') && (norm.includes('save') || norm.includes('goal') || norm.includes('bachat')));

  if (isGenericCreate) {
    const { amountMinor } = parseSpokenAmount(norm);
    let goalName = 'Savings Goal';

    const goalForMatch = norm.match(
      /(?:savings\s+goal|saving\s+goal)\s+(?:for\s+|named\s+)?(?:a\s+|an\s+|the\s+)?([a-z0-9\s]+?)(?:,|target|of|with|\d|rupees|rs|$)/i
    );
    if (goalForMatch && goalForMatch[1]) {
      goalName = capitalizeWords(goalForMatch[1].replace(/\b(a|an|the)\b/gi, '').trim());
    }

    const missingFields: string[] = [];
    if (!amountMinor || amountMinor <= 0) {
      missingFields.push('targetAmount');
    }

    let clarificationPrompt: string | undefined = undefined;
    if (missingFields.includes('targetAmount')) {
      clarificationPrompt = 'What is the target amount for this savings goal?';
    }

    const isAmbiguous = missingFields.length > 0;

    return {
      rawTranscript: transcript,
      normalizedTranscript: norm,
      intent: isAmbiguous ? 'ambiguous' : 'CREATE_SAVINGS_GOAL',
      explicitIntent: 'CREATE_SAVINGS_GOAL',
      transactions: [],
      savingsGoal: {
        name: goalName,
        targetMinor: amountMinor,
        color: '#10B981',
        icon: 'target',
        isAmbiguous,
        ambiguityReason: clarificationPrompt,
        missingFields,
      },
      clarificationPrompt,
      missingFields,
    };
  }

  return null;
}

function parseBillPaymentCommand(
  norm: string,
  transcript: string,
  existingBills: Bill[] = []
): VoiceParseResult | null {
  const isPaymentAction =
    (norm.includes('bill') || norm.includes('rent') || norm.includes('electricity') || norm.includes('internet')) &&
    (norm.includes('record payment') ||
      norm.includes('record bill payment') ||
      norm.includes('bill payment') ||
      (norm.includes('mark') && norm.includes('paid')) ||
      norm.startsWith('paid') ||
      norm.includes(' paid ') ||
      norm.includes('pay my') ||
      norm.includes('pay the')) &&
    !norm.includes('yesterday') &&
    !norm.includes('every') &&
    !norm.includes('monthly') &&
    !norm.includes('yearly') &&
    !norm.includes('weekly');

  if (!isPaymentAction) return null;

  let billPhrase = '';
  const forMatch = norm.match(/(?:for|of)\s+(?:my\s+|the\s+)?([a-z0-9\s]+?)(?:\s+bill|$)/i);
  if (forMatch && forMatch[1]) {
    billPhrase = forMatch[1].trim();
  } else {
    const markMatch = norm.match(/(?:mark|pay|paid)\s+(?:my\s+|the\s+)?([a-z0-9\s]+?)(?:\s+bill|$)/i);
    if (markMatch && markMatch[1]) {
      billPhrase = markMatch[1].trim();
    }
  }

  let matchedBill: Bill | undefined;
  if (existingBills && existingBills.length > 0) {
    if (billPhrase) {
      const clean = billPhrase.toLowerCase().trim();
      const matches = existingBills.filter(
        (b) => b.name.toLowerCase().includes(clean) || clean.includes(b.name.toLowerCase())
      );
      if (matches.length === 1) {
        matchedBill = matches[0];
      } else if (matches.length > 1) {
        return {
          rawTranscript: transcript,
          normalizedTranscript: norm,
          intent: 'ambiguous',
          explicitIntent: 'RECORD_BILL_PAYMENT',
          transactions: [],
          clarificationPrompt: `Multiple bills match "${billPhrase}". Please specify which bill: ${matches.map((b) => b.name).join(', ')}.`,
          missingFields: ['billName'],
        };
      }
    } else if (existingBills.length === 1) {
      matchedBill = existingBills[0];
    }
  }

  const { amountMinor } = parseSpokenAmount(norm);

  return {
    rawTranscript: transcript,
    normalizedTranscript: norm,
    intent: 'RECORD_BILL_PAYMENT',
    explicitIntent: 'RECORD_BILL_PAYMENT',
    transactions: [],
    billPayment: {
      billId: matchedBill?.id,
      billName: matchedBill ? matchedBill.name : (billPhrase ? capitalizeWords(billPhrase) : 'Bill'),
      amountMinor: amountMinor || matchedBill?.amountMinor || null,
    },
  };
}

function parseRecurringBillCommand(
  norm: string,
  transcript: string,
  categories: Category[] = []
): VoiceParseResult | null {
  // Check recurrence keywords
  const hasRecurrence =
    norm.includes('monthly') ||
    norm.includes('every month') ||
    norm.includes('har mahine') ||
    norm.includes('per month') ||
    norm.includes('each month') ||
    norm.includes('weekly') ||
    norm.includes('every week') ||
    norm.includes('har hafte') ||
    norm.includes('per week') ||
    norm.includes('each week') ||
    norm.includes('yearly') ||
    norm.includes('annual') ||
    norm.includes('annually') ||
    norm.includes('every year') ||
    norm.includes('har saal') ||
    norm.includes('per year');

  // Check bill keywords
  const hasBillContext =
    norm.includes('bill') ||
    norm.includes('rent') ||
    norm.includes('insurance') ||
    norm.includes('subscription') ||
    norm.includes('internet') ||
    norm.includes('wifi') ||
    norm.includes('broadband') ||
    norm.includes('electricity') ||
    norm.includes('bijli') ||
    norm.includes('recharge') ||
    norm.includes('membership') ||
    norm.includes('gym') ||
    norm.includes('emi') ||
    norm.includes('loan') ||
    norm.includes('recurring');

  // Guard: if user said "paid ... bill yesterday" or "spent ... bill", that's a one-off paid expense, NOT a recurring rule!
  if (!hasRecurrence && (norm.includes('paid') || norm.includes('spent') || norm.includes('yesterday'))) {
    return null;
  }

  if (hasRecurrence && hasBillContext) {
    const { amountMinor } = parseSpokenAmount(norm);

    let frequency: BillFrequency = 'monthly';
    if (
      norm.includes('weekly') ||
      norm.includes('every week') ||
      norm.includes('har hafte') ||
      norm.includes('per week') ||
      norm.includes('each week')
    ) {
      frequency = 'weekly';
    } else if (
      norm.includes('yearly') ||
      norm.includes('annual') ||
      norm.includes('annually') ||
      norm.includes('every year') ||
      norm.includes('har saal') ||
      norm.includes('per year')
    ) {
      frequency = 'yearly';
    }

    const cats = categories.length > 0 ? categories : BUILT_IN_CATEGORIES;
    let billName = 'Recurring Bill';
    let categoryId = 'cat_utilities';

    if (norm.includes('rent') || norm.includes('kiraya')) {
      billName = 'Rent';
      categoryId = cats.find((c) => c.id === 'cat_housing')?.id || 'cat_housing';
    } else if (norm.includes('internet') || norm.includes('wifi') || norm.includes('broadband')) {
      billName = 'Internet Bill';
      categoryId = cats.find((c) => c.id === 'cat_utilities')?.id || 'cat_utilities';
    } else if (norm.includes('electricity') || norm.includes('bijli') || norm.includes('power')) {
      billName = 'Electricity Bill';
      categoryId = cats.find((c) => c.id === 'cat_utilities')?.id || 'cat_utilities';
    } else if (norm.includes('insurance') || norm.includes('bima')) {
      billName = 'Insurance';
      categoryId =
        cats.find((c) => c.id === 'cat_health')?.id ||
        cats.find((c) => c.id === 'cat_expense_other')?.id ||
        'cat_utilities';
    } else if (norm.includes('gym') || norm.includes('fitness')) {
      billName = 'Gym Membership';
      categoryId = cats.find((c) => c.id === 'cat_health')?.id || 'cat_health';
    } else if (norm.includes('netflix') || norm.includes('spotify') || norm.includes('subscription')) {
      billName = 'Subscription';
      categoryId = cats.find((c) => c.id === 'cat_entertainment')?.id || 'cat_entertainment';
    } else if (norm.includes('recharge') || norm.includes('mobile')) {
      billName = 'Mobile Recharge';
      categoryId = cats.find((c) => c.id === 'cat_utilities')?.id || 'cat_utilities';
    } else {
      const match = norm.match(
        /(?:add\s+(?:a\s+)?)?(?:monthly\s+|weekly\s+|yearly\s+)?([a-z0-9\s]+?)(?:\s+bill|\s+payment|\s+of|\s+\d|$)/i
      );
      if (match && match[1]) {
        billName = `${capitalizeWords(match[1].trim())} Bill`;
      }
    }

    const missingFields: string[] = [];
    if (!amountMinor || amountMinor <= 0) {
      missingFields.push('amount');
    }

    let clarificationPrompt: string | undefined = undefined;
    if (missingFields.includes('amount')) {
      clarificationPrompt = 'What is the amount for this recurring bill?';
    }

    const isAmbiguous = missingFields.length > 0;

    return {
      rawTranscript: transcript,
      normalizedTranscript: norm,
      intent: isAmbiguous ? 'ambiguous' : 'CREATE_RECURRING_BILL',
      explicitIntent: 'CREATE_RECURRING_BILL',
      transactions: [],
      recurringBill: {
        name: billName,
        amountMinor,
        frequency,
        categoryId,
        dueDateLocal: getTodayLocalDateString(),
        isAmbiguous,
        ambiguityReason: clarificationPrompt,
        missingFields,
      },
      clarificationPrompt,
      missingFields,
    };
  }

  return null;
}

/**
 * Main parser function to convert spoken transcript into structured transaction intent, savings goal, recurring bill, or Q&A query.
 */
export function parseVoiceCommand(
  transcript: string,
  categories: Category[] = BUILT_IN_CATEGORIES,
  userCurrency: string = 'INR',
  existingSavingsGoals: SavingsGoal[] = [],
  existingBills: Bill[] = []
): VoiceParseResult {
  const norm = normalizeVoiceText(transcript);

  // 1. Check for Local Q&A Query intent
  if (
    norm.includes('how much did i spend') ||
    norm.includes('kitna kharcha hua') ||
    norm.includes('total spend') ||
    norm.includes('total expense')
  ) {
    if (norm.includes('shopping')) {
      return {
        rawTranscript: transcript,
        normalizedTranscript: norm,
        intent: 'query_financials',
        transactions: [],
        queryResult: {
          queryType: 'category_expense',
          answerText: 'Checking spending on Shopping...',
          data: { categoryId: 'shopping' },
        },
      };
    }
    return {
      rawTranscript: transcript,
      normalizedTranscript: norm,
      intent: 'query_financials',
      transactions: [],
      queryResult: {
        queryType: 'monthly_expense',
        answerText: 'Checking total monthly expenses...',
      },
    };
  }

  if (
    norm.includes('total income') ||
    norm.includes('how much earned') ||
    norm.includes('kitna kamaya')
  ) {
    return {
      rawTranscript: transcript,
      normalizedTranscript: norm,
      intent: 'query_financials',
      transactions: [],
      queryResult: {
        queryType: 'monthly_income',
        answerText: 'Checking total monthly income...',
      },
    };
  }

  if (
    norm.includes('money left') ||
    norm.includes('money is left') ||
    norm.includes('left this month') ||
    norm.includes('remaining budget') ||
    norm.includes('kitna bacha')
  ) {
    return {
      rawTranscript: transcript,
      normalizedTranscript: norm,
      intent: 'query_financials',
      transactions: [],
      queryResult: {
        queryType: 'remaining_budget',
        answerText: 'Checking remaining balance for this month...',
      },
    };
  }

  if (
    norm.includes('recent transactions') ||
    norm.includes('last transactions') ||
    norm.includes('recent entries')
  ) {
    return {
      rawTranscript: transcript,
      normalizedTranscript: norm,
      intent: 'query_financials',
      transactions: [],
      queryResult: {
        queryType: 'recent_transactions',
        answerText: 'Showing recent transactions...',
      },
    };
  }

  // 2. Check for Savings Goal / Contribution, Bill Payment, & Recurring Bill commands
  const savingsResult = parseSavingsGoalOrContribution(norm, transcript, existingSavingsGoals);
  const billPaymentResult = parseBillPaymentCommand(norm, transcript, existingBills);
  const recurringResult = parseRecurringBillCommand(norm, transcript, categories);

  // If both savings and recurring match with conflicting intent, ask user to clarify
  if (savingsResult && recurringResult) {
    return {
      rawTranscript: transcript,
      normalizedTranscript: norm,
      intent: 'ambiguous',
      explicitIntent: 'ambiguous',
      transactions: [],
      clarificationPrompt:
        'Multiple conflicting actions detected (savings goal and recurring bill). Please specify which one you would like to perform.',
      missingFields: ['intent'],
    };
  }

  if (savingsResult) return savingsResult;
  if (billPaymentResult) return billPaymentResult;
  if (recurringResult) return recurringResult;

  // 3. Multi-clause transactions (e.g. "My salary is 55000 and I received a 200 bonus")
  if (norm.includes(' and ') && (norm.includes('salary') || norm.includes('bonus'))) {
    const parts = norm.split(' and ');
    const transactions: ParsedVoiceTransaction[] = [];

    for (const part of parts) {
      const subResult = parseSingleTransactionClause(part, categories, userCurrency);
      if (subResult) {
        transactions.push(subResult);
      }
    }

    if (transactions.length > 0) {
      const isAllIncome = transactions.every((t) => t.type === 'income');
      const isAllExpense = transactions.every((t) => t.type === 'expense');
      const intent: VoiceIntent = isAllIncome ? 'ADD_INCOME' : isAllExpense ? 'ADD_EXPENSE' : 'create_transaction';
      return {
        rawTranscript: transcript,
        normalizedTranscript: norm,
        intent,
        explicitIntent: intent,
        transactions,
      };
    }
  }

  // 4. Single Clause Transaction Parsing
  const tx = parseSingleTransactionClause(norm, categories, userCurrency);
  
  if (tx.isAmbiguous) {
    return {
      rawTranscript: transcript,
      normalizedTranscript: norm,
      intent: 'ambiguous',
      explicitIntent: 'ambiguous',
      transactions: [tx],
      clarificationPrompt: tx.ambiguityReason || 'Please clarify transaction type and category.',
      missingFields: ['amount', 'type'],
    };
  }

  const explicitIntent: VoiceIntent = tx.type === 'income' ? 'ADD_INCOME' : 'ADD_EXPENSE';

  return {
    rawTranscript: transcript,
    normalizedTranscript: norm,
    intent: explicitIntent,
    explicitIntent,
    transactions: [tx],
  };
}

function parseSingleTransactionClause(
  norm: string,
  categories: Category[],
  userCurrency: string
): ParsedVoiceTransaction {
  const { amountMinor } = parseSpokenAmount(norm);
  const dateLocal = parseSpokenDate(norm);

  // Detect Income vs Expense
  const isIncomeKeyword =
    norm.includes('salary') ||
    norm.includes('bonus') ||
    norm.includes('bounus') ||
    norm.includes('freelance') ||
    norm.includes('earned') ||
    norm.includes('received') ||
    norm.includes('mila') ||
    norm.includes('kamaye') ||
    norm.includes('kamai') ||
    norm.includes('got paid') ||
    norm.includes('cash in') ||
    norm.includes('dividend') ||
    norm.includes('stipend') ||
    norm.includes('interest');

  const isExpenseKeyword =
    norm.includes('spent') ||
    norm.includes('kharch') ||
    norm.includes('kharcha') ||
    norm.includes('paid') ||
    norm.includes('bought') ||
    norm.includes('petrol') ||
    norm.includes('shopping') ||
    norm.includes('food') ||
    norm.includes('grocery') ||
    norm.includes('groceries') ||
    norm.includes('grosry') ||
    norm.includes('expense') ||
    norm.includes('expenses') ||
    norm.includes('bill') ||
    norm.includes('recharge');

  // Determine type
  let type: TransactionType = 'expense';
  if (isIncomeKeyword && !isExpenseKeyword) {
    type = 'income';
  } else if (!isIncomeKeyword && isExpenseKeyword) {
    type = 'expense';
  } else if (!isIncomeKeyword && !isExpenseKeyword) {
    // If command is like "Add 500", it's ambiguous
    return {
      type: 'expense',
      amountMinor,
      currency: userCurrency,
      categoryId: null,
      dateLocal,
      note: norm,
      isAmbiguous: true,
      ambiguityReason: 'Transaction type (income/expense) and category are unclear. Please specify.',
    };
  }

  // Match Category ID
  const cats = (categories && categories.length > 0) ? categories : BUILT_IN_CATEGORIES;
  let categoryId: string | null = null;
  let isSalary = false;
  let salaryFrequencyUncertain = false;

  const pickCategoryId = (preferredIds: string[], fallbackType: TransactionType): string => {
    for (const pid of preferredIds) {
      const match = cats.find((c) => c.id === pid && !c.isArchived);
      if (match) return match.id;
    }
    for (const pid of preferredIds) {
      const clean = pid.replace('cat_', '');
      const match = cats.find((c) => c.id === clean && !c.isArchived);
      if (match) return match.id;
    }
    const typeFallback = cats.find((c) => c.type === fallbackType && !c.isArchived);
    return typeFallback ? typeFallback.id : preferredIds[0];
  };

  if (norm.includes('salary') || norm.includes('stipend') || norm.includes('paycheck') || norm.includes('tankha') || norm.includes('kamai')) {
    categoryId = pickCategoryId(['cat_salary', 'salary'], 'income');
    isSalary = true;
    if (!norm.includes('monthly') && !norm.includes('month')) {
      salaryFrequencyUncertain = true;
    }
  } else if (norm.includes('grocery') || norm.includes('groceries') || norm.includes('grosry') || norm.includes('kirana') || norm.includes('rashan') || norm.includes('supermarket') || norm.includes('sabji') || norm.includes('vegetables') || norm.includes('fruits') || norm.includes('milk')) {
    categoryId = pickCategoryId(['cat_groceries', 'groceries', 'cat_food', 'food'], 'expense');
  } else if (norm.includes('bonus') || norm.includes('bounus') || norm.includes('incentive') || norm.includes('reward') || norm.includes('prize') || norm.includes('tips') || norm.includes('tip')) {
    categoryId = pickCategoryId(['cat_bonus', 'bonus', 'cat_income_other', 'other-income'], 'income');
  } else if (norm.includes('freelance') || norm.includes('side project') || norm.includes('client') || norm.includes('consulting') || norm.includes('business')) {
    categoryId = pickCategoryId(['cat_freelance', 'freelance'], 'income');
  } else if (norm.includes('petrol') || norm.includes('fuel') || norm.includes('diesel') || norm.includes('transport') || norm.includes('cab') || norm.includes('uber') || norm.includes('ola') || norm.includes('auto') || norm.includes('taxi') || norm.includes('bus') || norm.includes('metro')) {
    categoryId = pickCategoryId(['cat_transport', 'transport'], 'expense');
  } else if (norm.includes('shopping') || norm.includes('clothes') || norm.includes('kapde') || norm.includes('amazon') || norm.includes('flipkart') || norm.includes('myntra') || norm.includes('shoes') || norm.includes('dress')) {
    categoryId = pickCategoryId(['cat_shopping', 'shopping'], 'expense');
  } else if (norm.includes('food') || norm.includes('khana') || norm.includes('dining') || norm.includes('restaurant') || norm.includes('dinner') || norm.includes('lunch') || norm.includes('swiggy') || norm.includes('zomato') || norm.includes('cafe') || norm.includes('snack') || norm.includes('tea') || norm.includes('coffee') || norm.includes('chai')) {
    categoryId = pickCategoryId(['cat_food', 'food'], 'expense');
  } else if (norm.includes('rent') || norm.includes('housing') || norm.includes('kiraya') || norm.includes('flat')) {
    categoryId = pickCategoryId(['cat_housing', 'housing'], 'expense');
  } else if (norm.includes('bill') || norm.includes('electricity') || norm.includes('wifi') || norm.includes('recharge') || norm.includes('utilities') || norm.includes('utility') || norm.includes('bijli') || norm.includes('water') || norm.includes('gas') || norm.includes('cylinder')) {
    categoryId = pickCategoryId(['cat_utilities', 'utilities', 'bills'], 'expense');
  } else if (norm.includes('doctor') || norm.includes('medicine') || norm.includes('health') || norm.includes('dawa') || norm.includes('pharmacy') || norm.includes('hospital')) {
    categoryId = pickCategoryId(['cat_health', 'health'], 'expense');
  } else if (norm.includes('movie') || norm.includes('entertainment') || norm.includes('game') || norm.includes('gaming') || norm.includes('cinema') || norm.includes('netflix')) {
    categoryId = pickCategoryId(['cat_entertainment', 'entertainment'], 'expense');
  } else {
    // Try matching any category by its custom name in the user's categories
    const foundByName = cats.find((c) => c.type === type && !c.isArchived && norm.includes(c.name.toLowerCase()));
    if (foundByName) {
      categoryId = foundByName.id;
    } else {
      // Fallback to default built-in category
      const defaultCat = cats.find((c) => c.type === type && !c.isArchived);
      categoryId = defaultCat ? defaultCat.id : (type === 'income' ? 'cat_income_other' : 'cat_expense_other');
    }
  }

  const isToday = dateLocal === getTodayLocalDateString();
  const timeLocal = isToday ? getCurrentLocalTimeString() : undefined;

  return {
    type,
    amountMinor,
    currency: userCurrency,
    categoryId,
    dateLocal,
    timeLocal,
    note: norm,
    isSalary,
    salaryFrequencyUncertain,
    isAmbiguous: amountMinor === null,
    ambiguityReason: amountMinor === null ? 'Amount could not be detected.' : undefined,
  };
}

/**
 * Calculates answers for local financial queries using database summaries.
 */
export function executeVoiceQuery(
  query: VoiceQueryResult,
  summary: MonthlySummary | null,
  currencyCode: string = 'INR'
): string {
  if (!summary) {
    return 'No financial data is available for this period yet.';
  }

  switch (query.queryType) {
    case 'monthly_expense':
      return `Your total expenses for this month are ${formatMinorToMajor(summary.expenseTotalMinor, currencyCode)}.`;
    case 'monthly_income':
      return `Your total income for this month is ${formatMinorToMajor(summary.incomeTotalMinor, currencyCode)}.`;
    case 'remaining_budget':
      const net = summary.netCashFlowMinor;
      if (net >= 0) {
        return `You have ${formatMinorToMajor(net, currencyCode)} remaining in net cash flow this month.`;
      } else {
        return `You are over your monthly income by ${formatMinorToMajor(Math.abs(net), currencyCode)}.`;
      }
    case 'category_expense':
      return `Category spending details can be viewed in the Reports section.`;
    case 'recent_transactions':
      return `You have ${summary.transactionCount} transactions recorded this month.`;
    default:
      return 'Command processed successfully.';
  }
}
