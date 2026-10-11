import { Category, TransactionType } from './types';

const INITIAL_TIMESTAMP = '2026-01-01T00:00:00.000Z';

export const BUILT_IN_CATEGORIES: Category[] = [
  // Built-in Expense Categories
  {
    id: 'cat_food',
    name: 'Food & Dining',
    type: 'expense',
    icon: 'Utensils',
    color: '#F97316',
    isBuiltIn: true,
    isArchived: false,
    createdAt: INITIAL_TIMESTAMP,
  },
  {
    id: 'cat_groceries',
    name: 'Groceries',
    type: 'expense',
    icon: 'ShoppingBag',
    color: '#FB923C',
    isBuiltIn: true,
    isArchived: false,
    createdAt: INITIAL_TIMESTAMP,
  },
  {
    id: 'cat_transport',
    name: 'Transport',
    type: 'expense',
    icon: 'Car',
    color: '#3B82F6',
    isBuiltIn: true,
    isArchived: false,
    createdAt: INITIAL_TIMESTAMP,
  },
  {
    id: 'cat_housing',
    name: 'Housing/Rent',
    type: 'expense',
    icon: 'Home',
    color: '#6366F1',
    isBuiltIn: true,
    isArchived: false,
    createdAt: INITIAL_TIMESTAMP,
  },
  {
    id: 'cat_utilities',
    name: 'Utilities',
    type: 'expense',
    icon: 'Zap',
    color: '#8B5CF6',
    isBuiltIn: true,
    isArchived: false,
    createdAt: INITIAL_TIMESTAMP,
  },
  {
    id: 'cat_shopping',
    name: 'Shopping',
    type: 'expense',
    icon: 'ShoppingBag',
    color: '#10B981',
    isBuiltIn: true,
    isArchived: false,
    createdAt: INITIAL_TIMESTAMP,
  },
  {
    id: 'cat_health',
    name: 'Health',
    type: 'expense',
    icon: 'HeartPulse',
    color: '#06B6D4',
    isBuiltIn: true,
    isArchived: false,
    createdAt: INITIAL_TIMESTAMP,
  },
  {
    id: 'cat_education',
    name: 'Education',
    type: 'expense',
    icon: 'GraduationCap',
    color: '#475569',
    isBuiltIn: true,
    isArchived: false,
    createdAt: INITIAL_TIMESTAMP,
  },
  {
    id: 'cat_entertainment',
    name: 'Entertainment',
    type: 'expense',
    icon: 'Film',
    color: '#EC4899',
    isBuiltIn: true,
    isArchived: false,
    createdAt: INITIAL_TIMESTAMP,
  },
  {
    id: 'cat_personal_care',
    name: 'Personal Care',
    type: 'expense',
    icon: 'Smile',
    color: '#A855F7',
    isBuiltIn: true,
    isArchived: false,
    createdAt: INITIAL_TIMESTAMP,
  },
  {
    id: 'cat_travel',
    name: 'Travel',
    type: 'expense',
    icon: 'Plane',
    color: '#3B82F6',
    isBuiltIn: true,
    isArchived: false,
    createdAt: INITIAL_TIMESTAMP,
  },
  {
    id: 'cat_gifts',
    name: 'Gifts/Donations',
    type: 'expense',
    icon: 'Heart',
    color: '#F43F5E',
    isBuiltIn: true,
    isArchived: false,
    createdAt: INITIAL_TIMESTAMP,
  },
  {
    id: 'cat_fees',
    name: 'Fees',
    type: 'expense',
    icon: 'CreditCard',
    color: '#64748B',
    isBuiltIn: true,
    isArchived: false,
    createdAt: INITIAL_TIMESTAMP,
  },
  {
    id: 'cat_expense_other',
    name: 'Other',
    type: 'expense',
    icon: 'MoreHorizontal',
    color: '#94A3B8',
    isBuiltIn: true,
    isArchived: false,
    createdAt: INITIAL_TIMESTAMP,
  },

  // Built-in Income Categories
  {
    id: 'cat_salary',
    name: 'Salary',
    type: 'income',
    icon: 'Briefcase',
    color: '#21845A',
    isBuiltIn: true,
    isArchived: false,
    createdAt: INITIAL_TIMESTAMP,
  },
  {
    id: 'cat_freelance',
    name: 'Freelance/Business',
    type: 'income',
    icon: 'Building',
    color: '#176B87',
    isBuiltIn: true,
    isArchived: false,
    createdAt: INITIAL_TIMESTAMP,
  },
  {
    id: 'cat_bonus',
    name: 'Bonus',
    type: 'income',
    icon: 'Award',
    color: '#D97706',
    isBuiltIn: true,
    isArchived: false,
    createdAt: INITIAL_TIMESTAMP,
  },
  {
    id: 'cat_interest',
    name: 'Interest',
    type: 'income',
    icon: 'TrendingUp',
    color: '#10B981',
    isBuiltIn: true,
    isArchived: false,
    createdAt: INITIAL_TIMESTAMP,
  },
  {
    id: 'cat_income_gift',
    name: 'Gift',
    type: 'income',
    icon: 'Gift',
    color: '#EC4899',
    isBuiltIn: true,
    isArchived: false,
    createdAt: INITIAL_TIMESTAMP,
  },
  {
    id: 'cat_refund',
    name: 'Refund',
    type: 'income',
    icon: 'RotateCcw',
    color: '#3B82F6',
    isBuiltIn: true,
    isArchived: false,
    createdAt: INITIAL_TIMESTAMP,
  },
  {
    id: 'cat_income_other',
    name: 'Other',
    type: 'income',
    icon: 'DollarSign',
    color: '#64748B',
    isBuiltIn: true,
    isArchived: false,
    createdAt: INITIAL_TIMESTAMP,
  },
];

export const DEFAULT_CATEGORIES: Category[] = BUILT_IN_CATEGORIES;

/**
 * Resolves a category given a categoryId (or legacy/voice ID), a list of categories,
 * an optional transaction note, and an optional transaction type.
 *
 * Handles:
 * - Direct ID matching (e.g. "cat_groceries", "cat_salary", "cat_bonus")
 * - Legacy / short voice IDs (e.g. "salary" -> "cat_salary", "groceries" -> "cat_groceries")
 * - Fallback keyword matching from the note (e.g. if note mentions "grocery", "bonus", "salary")
 * - Type-based fallback to "Other" or first available category of that type
 */
export function resolveTransactionCategory(
  categoryId: string | null | undefined,
  categories: Category[],
  note?: string,
  type?: TransactionType
): Category | undefined {
  const activeCats = categories && categories.length > 0 ? categories : BUILT_IN_CATEGORIES;

  // 1. Direct match by ID
  if (categoryId) {
    const directMatch = activeCats.find((c) => c.id === categoryId);
    if (directMatch) return directMatch;

    // 2. Try with 'cat_' prefix if missing (e.g. 'salary' -> 'cat_salary')
    const withPrefix = activeCats.find((c) => c.id === `cat_${categoryId}`);
    if (withPrefix) return withPrefix;

    // 3. Try removing 'cat_' prefix (e.g. 'cat_salary' -> 'salary')
    if (categoryId.startsWith('cat_')) {
      const withoutPrefix = activeCats.find((c) => c.id === categoryId.replace('cat_', ''));
      if (withoutPrefix) return withoutPrefix;
    }

    // 4. Handle known legacy mapping strings
    const legacyMap: Record<string, string> = {
      salary: 'cat_salary',
      bonus: 'cat_bonus',
      freelance: 'cat_freelance',
      groceries: 'cat_groceries',
      food: 'cat_food',
      transport: 'cat_transport',
      shopping: 'cat_shopping',
      bills: 'cat_utilities',
      health: 'cat_health',
      entertainment: 'cat_entertainment',
      'other-income': 'cat_bonus',
      'other-expense': 'cat_expense_other',
    };

    if (legacyMap[categoryId]) {
      const mapped = activeCats.find((c) => c.id === legacyMap[categoryId]);
      if (mapped) return mapped;
    }
  }

  // 5. If note contains explicit keywords (e.g. user said "grocery", "bonus", "salary", etc.)
  if (note) {
    const normNote = note.toLowerCase();
    if (normNote.includes('grocery') || normNote.includes('groceries') || normNote.includes('grosry') || normNote.includes('kirana') || normNote.includes('rashan')) {
      const grocCat = activeCats.find((c) => c.id === 'cat_groceries') || BUILT_IN_CATEGORIES.find((c) => c.id === 'cat_groceries');
      if (grocCat) return grocCat;
    }
    if (normNote.includes('bonus') || normNote.includes('bounus') || normNote.includes('incentive')) {
      const bonusCat = activeCats.find((c) => c.id === 'cat_bonus') || BUILT_IN_CATEGORIES.find((c) => c.id === 'cat_bonus');
      if (bonusCat) return bonusCat;
    }
    if (normNote.includes('salary') || normNote.includes('stipend') || normNote.includes('paycheck') || normNote.includes('tankha')) {
      const salaryCat = activeCats.find((c) => c.id === 'cat_salary') || BUILT_IN_CATEGORIES.find((c) => c.id === 'cat_salary');
      if (salaryCat) return salaryCat;
    }
    if (normNote.includes('petrol') || normNote.includes('fuel') || normNote.includes('diesel') || normNote.includes('transport') || normNote.includes('cab') || normNote.includes('uber')) {
      const transCat = activeCats.find((c) => c.id === 'cat_transport') || BUILT_IN_CATEGORIES.find((c) => c.id === 'cat_transport');
      if (transCat) return transCat;
    }
    if (normNote.includes('shopping') || normNote.includes('clothes') || normNote.includes('kapde')) {
      const shopCat = activeCats.find((c) => c.id === 'cat_shopping') || BUILT_IN_CATEGORIES.find((c) => c.id === 'cat_shopping');
      if (shopCat) return shopCat;
    }
    if (normNote.includes('food') || normNote.includes('dining') || normNote.includes('restaurant') || normNote.includes('lunch') || normNote.includes('dinner')) {
      const foodCat = activeCats.find((c) => c.id === 'cat_food') || BUILT_IN_CATEGORIES.find((c) => c.id === 'cat_food');
      if (foodCat) return foodCat;
    }
  }

  // 6. Check if categoryId itself matches in BUILT_IN_CATEGORIES directly
  if (categoryId) {
    const builtInMatch = BUILT_IN_CATEGORIES.find((c) => c.id === categoryId || c.id === `cat_${categoryId}`);
    if (builtInMatch) return builtInMatch;
  }

  // 7. If type is provided, fallback to matching "other" or first of that type
  if (type) {
    const otherCatId = type === 'income' ? 'cat_income_other' : 'cat_expense_other';
    const otherCat = activeCats.find((c) => c.id === otherCatId) || BUILT_IN_CATEGORIES.find((c) => c.id === otherCatId);
    if (otherCat) return otherCat;

    const firstOfType = activeCats.find((c) => c.type === type && !c.isArchived);
    if (firstOfType) return firstOfType;
  }

  return undefined;
}

