import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  NavigationTab,
  UserPreferences,
  StorageHealth,
  SUPPORTED_CURRENCIES,
  Currency,
  Transaction,
  Category,
  Budget,
  BudgetProgress,
  MonthlySummary,
  CategorySpendingBreakdown,
  MonthlyTrendPoint,
  TransactionFilterOptions,
  RecurringTemplate,
  Bill,
  SavingsGoal,
  SavingsContribution,
} from '../domain/types';
import { PreferencesStorage } from '../storage/preferencesStorage';
import { transactionRepository, ITransactionRepository, DashboardTotals } from '../storage/storageRepository';
import {
  getCurrentPeriodKey,
  getShiftedPeriodKey,
  calculateMonthlySummary,
  calculateBudgetProgress,
  calculateCategorySpendingBreakdown,
  calculateSixMonthTrend,
} from '../domain/budgetAndReport';
import {
  getPendingDueOccurrences,
  PendingOccurrence,
} from '../domain/recurringAndBills';
import { getTodayLocalDateString } from '../domain/moneyAndDate';

import { BUILT_IN_CATEGORIES } from '../domain/categoriesData';
import {
  buildJSONBackupPayload,
  generateTransactionsCSV,
  triggerFileDownload,
  getBackupFilenameDateString,
  BackupDataPayload,
} from '../domain/backupAndExport';
import {
  AppNotification,
  generateAppNotifications,
  generateBillPaidId,
  generateRecurringPostedId,
} from '../domain/notificationService';
import { NotificationStorage } from '../storage/notificationStorage';
import { formatMinorToMajor } from '../domain/moneyAndDate';


interface AppContextType {
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;
  preferences: UserPreferences;
  currencySymbol: string;
  currentCurrency: Currency;
  updatePreferences: (newPrefs: Partial<UserPreferences>) => void;
  
  // Month Selection & Navigation
  selectedPeriodKey: string;
  setSelectedPeriodKey: (periodKey: string) => void;
  shiftPeriodKey: (deltaMonths: number) => void;

  // Storage & Health
  isOffline: boolean;
  storageHealth: StorageHealth | null;
  refreshStorageHealth: () => Promise<void>;

  // Data & State
  transactions: Transaction[];
  categories: Category[];
  budgets: Budget[];
  dashboardTotals: DashboardTotals;
  monthlySummary: MonthlySummary;
  categoryBreakdown: CategorySpendingBreakdown[];
  sixMonthTrend: MonthlyTrendPoint[];
  overallBudgetProgress: BudgetProgress | null;
  categoryBudgetsProgress: BudgetProgress[];
  isLoading: boolean;
  dataError: string | null;

  // Phase 4 Data
  recurringTemplates: RecurringTemplate[];
  bills: Bill[];
  savingsGoals: SavingsGoal[];
  pendingOccurrences: PendingOccurrence[];

  // Actions
  refreshAllData: (filters?: TransactionFilterOptions) => Promise<void>;
  saveTransaction: (data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>, editId?: string) => Promise<Transaction>;
  deleteTransaction: (id: string) => Promise<void>;
  
  // Category Actions
  saveCategory: (data: Omit<Category, 'id' | 'createdAt'>, editId?: string) => Promise<Category>;
  archiveCategory: (id: string, reassignToCategoryId?: string) => Promise<Category>;
  checkCategoryTransactionCount: (categoryId: string) => Promise<number>;

  // System & Data Backup Actions
  exportJSONBackup: () => Promise<void>;
  exportCSV: () => Promise<void>;
  restoreBackup: (backupData: any) => Promise<void>;
  clearAllData: () => Promise<void>;

  // Budget Actions
  saveBudget: (data: { periodKey: string; limitMinor: number; categoryId?: string }, editId?: string) => Promise<Budget>;
  deleteBudget: (id: string) => Promise<void>;

  // Recurring Actions
  saveRecurringTemplate: (
    data: Omit<RecurringTemplate, 'id' | 'createdAt' | 'updatedAt'>,
    editId?: string
  ) => Promise<RecurringTemplate>;
  deleteRecurringTemplate: (id: string) => Promise<void>;
  processPendingOccurrences: (selectedKeys: string[]) => Promise<void>;
  dismissPendingOccurrences: (selectedKeys: string[]) => Promise<void>;

  // Bill Actions
  saveBill: (
    data: Omit<Bill, 'id' | 'createdAt' | 'updatedAt'>,
    editId?: string
  ) => Promise<Bill>;
  deleteBill: (id: string) => Promise<void>;
  markBillPaid: (billId: string, createExpenseTransaction?: boolean) => Promise<{ bill: Bill; transaction?: Transaction }>;

  // Savings Goal Actions
  saveSavingsGoal: (
    data: Omit<SavingsGoal, 'id' | 'createdAt' | 'updatedAt'>,
    editId?: string
  ) => Promise<SavingsGoal>;
  deleteSavingsGoal: (id: string) => Promise<void>;
  addSavingsContribution: (
    goalId: string,
    amountMinor: number,
    note?: string
  ) => Promise<{ goal: SavingsGoal; contribution: SavingsContribution }>;
  getSavingsContributions: (goalId: string) => Promise<SavingsContribution[]>;
  deleteSavingsContribution: (contributionId: string) => Promise<SavingsGoal>;
  updateSavingsContribution: (
    contributionId: string,
    amountMinor: number,
    note?: string,
    dateLocal?: string
  ) => Promise<{ goal: SavingsGoal; contribution: SavingsContribution }>;

  isSavingsDetailsModalOpen: boolean;
  selectedSavingsGoalForDetails: SavingsGoal | null;
  openSavingsDetailsModal: (goal: SavingsGoal) => void;
  closeSavingsDetailsModal: () => void;

  isSavingsContributionModalOpen: boolean;
  targetGoalForContribution: SavingsGoal | null;
  openSavingsContributionModal: (goal: SavingsGoal) => void;
  closeSavingsContributionModal: () => void;

  // Filter & Navigation Actions
  transactionFilters: TransactionFilterOptions;
  setTransactionFilters: (filters: TransactionFilterOptions) => void;
  navigateToTransactionsWithFilters: (filters: TransactionFilterOptions) => void;

  // Modals & Active Selections
  isAddModalOpen: boolean;
  editingTransaction: Transaction | null;
  openAddModal: (txToEdit?: Transaction | null) => void;
  closeAddModal: () => void;

  viewingTransaction: Transaction | null;
  openTransactionDetails: (tx: Transaction) => void;
  closeTransactionDetails: () => void;

  isCategoryManagerOpen: boolean;
  openCategoryManager: () => void;
  closeCategoryManager: () => void;

  isSetBudgetModalOpen: boolean;
  editingBudget: Budget | null;
  budgetPreselectedCategoryId: string | undefined;
  openSetBudgetModal: (budgetToEdit?: Budget | null, preselectedCategoryId?: string) => void;
  closeSetBudgetModal: () => void;

  // Phase 4 Modals
  isRecurringModalOpen: boolean;
  editingRecurringTemplate: RecurringTemplate | null;
  openRecurringModal: (templateToEdit?: RecurringTemplate | null) => void;
  closeRecurringModal: () => void;

  isDueOccurrencesModalOpen: boolean;
  openDueOccurrencesModal: () => void;
  closeDueOccurrencesModal: () => void;

  isBillModalOpen: boolean;
  editingBill: Bill | null;
  openBillModal: (billToEdit?: Bill | null) => void;
  closeBillModal: () => void;

  isSavingsModalOpen: boolean;
  editingSavingsGoal: SavingsGoal | null;
  openSavingsModal: (goalToEdit?: SavingsGoal | null) => void;
  closeSavingsModal: () => void;

  isVoiceModalOpen: boolean;
  openVoiceModal: () => void;
  closeVoiceModal: () => void;

  // In-App Notification Center
  notifications: AppNotification[];
  unreadNotificationCount: number;
  isNotificationCenterOpen: boolean;
  openNotificationCenter: () => void;
  closeNotificationCenter: () => void;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;

  dismissOnboarding: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode; repository?: ITransactionRepository }> = ({
  children,
  repository,
}) => {
  const repo = repository || transactionRepository;
  const [activeTab, setActiveTab] = useState<NavigationTab>('home');
  const [preferences, setPreferences] = useState<UserPreferences>(() => PreferencesStorage.getPreferences());
  
  // Month selector
  const [selectedPeriodKey, setSelectedPeriodKey] = useState<string>(() => getCurrentPeriodKey());

  // Filter state for transactions view
  const [transactionFilters, setTransactionFilters] = useState<TransactionFilterOptions>({});

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const [viewingTransaction, setViewingTransaction] = useState<Transaction | null>(null);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState<boolean>(false);

  const [isSetBudgetModalOpen, setIsSetBudgetModalOpen] = useState<boolean>(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [budgetPreselectedCategoryId, setBudgetPreselectedCategoryId] = useState<string | undefined>(undefined);

  // Phase 4 Modal States
  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState<boolean>(false);
  const [editingRecurringTemplate, setEditingRecurringTemplate] = useState<RecurringTemplate | null>(null);

  const [isDueOccurrencesModalOpen, setIsDueOccurrencesModalOpen] = useState<boolean>(false);

  const [isBillModalOpen, setIsBillModalOpen] = useState<boolean>(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);

  const [isSavingsModalOpen, setIsSavingsModalOpen] = useState<boolean>(false);
  const [editingSavingsGoal, setEditingSavingsGoal] = useState<SavingsGoal | null>(null);

  const [isSavingsDetailsModalOpen, setIsSavingsDetailsModalOpen] = useState<boolean>(false);
  const [selectedSavingsGoalForDetails, setSelectedSavingsGoalForDetails] = useState<SavingsGoal | null>(null);

  const openSavingsDetailsModal = useCallback((goal: SavingsGoal) => {
    setSelectedSavingsGoalForDetails(goal);
    setIsSavingsDetailsModalOpen(true);
  }, []);

  const closeSavingsDetailsModal = useCallback(() => {
    setIsSavingsDetailsModalOpen(false);
    setSelectedSavingsGoalForDetails(null);
  }, []);

  const [isSavingsContributionModalOpen, setIsSavingsContributionModalOpen] = useState<boolean>(false);
  const [targetGoalForContribution, setTargetGoalForContribution] = useState<SavingsGoal | null>(null);

  const openSavingsContributionModal = useCallback((goal: SavingsGoal) => {
    setTargetGoalForContribution(goal);
    setIsSavingsContributionModalOpen(true);
  }, []);

  const closeSavingsContributionModal = useCallback(() => {
    setIsSavingsContributionModalOpen(false);
    setTargetGoalForContribution(null);
  }, []);

  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState<boolean>(false);

  const openVoiceModal = useCallback(() => setIsVoiceModalOpen(true), []);
  const closeVoiceModal = useCallback(() => setIsVoiceModalOpen(false), []);

  // Notification Center State
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState<number>(0);

  const openNotificationCenter = useCallback(() => setIsNotificationCenterOpen(true), []);
  const closeNotificationCenter = useCallback(() => setIsNotificationCenterOpen(false), []);

  const markNotificationAsRead = useCallback((id: string) => {
    NotificationStorage.markAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    setUnreadNotificationCount((prev) => Math.max(0, prev - 1));
  }, []);

  const markAllNotificationsAsRead = useCallback(() => {
    setNotifications((prev) => {
      NotificationStorage.markAllAsRead(prev.map((n) => n.id));
      return prev.map((n) => ({ ...n, isRead: true }));
    });
    setUnreadNotificationCount(0);
  }, []);

  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);
  const [storageHealth, setStorageHealth] = useState<StorageHealth | null>(null);

  // Loaded Data
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>(BUILT_IN_CATEGORIES);
  const [budgets, setBudgets] = useState<Budget[]>([]);

  // Phase 4 Data
  const [recurringTemplates, setRecurringTemplates] = useState<RecurringTemplate[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [pendingOccurrences, setPendingOccurrences] = useState<PendingOccurrence[]>([]);

  const [dashboardTotals, setDashboardTotals] = useState<DashboardTotals>({
    totalBalanceMinor: 0,
    monthlyIncomeMinor: 0,
    monthlyExpenseMinor: 0,
    savingsRatePercentage: 0,
  });

  const [monthlySummary, setMonthlySummary] = useState<MonthlySummary>(() => ({
    periodKey: getCurrentPeriodKey(),
    incomeTotalMinor: 0,
    expenseTotalMinor: 0,
    netCashFlowMinor: 0,
    transactionCount: 0,
  }));

  const [categoryBreakdown, setCategoryBreakdown] = useState<CategorySpendingBreakdown[]>([]);
  const [sixMonthTrend, setSixMonthTrend] = useState<MonthlyTrendPoint[]>([]);

  const [overallBudgetProgress, setOverallBudgetProgress] = useState<BudgetProgress | null>(null);
  const [categoryBudgetsProgress, setCategoryBudgetsProgress] = useState<BudgetProgress[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [dataError, setDataError] = useState<string | null>(null);

  // Network listener
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Shift selected month
  const shiftPeriodKey = useCallback((deltaMonths: number) => {
    setSelectedPeriodKey((prev) => getShiftedPeriodKey(prev, deltaMonths));
  }, []);

  // Refresh health & database
  const refreshStorageHealth = useCallback(async () => {
    await repo.init();
    const health = await repo.getHealth();
    setStorageHealth(health);
  }, [repo]);

  const refreshAllData = useCallback(async (filters?: TransactionFilterOptions) => {
    setIsLoading(true);
    setDataError(null);
    try {
      await repo.init();
      const fetchedCats = await repo.getAllCategories(true);
      const fetchedTx = await repo.getAllTransactions(filters);
      const fetchedBudgets = await repo.getAllBudgets();
      const fetchedTemplates = await repo.getAllRecurringTemplates();
      const fetchedBills = await repo.getAllBills();
      const fetchedSavings = await repo.getAllSavingsGoals();
      const generatedKeys = await repo.getAllGeneratedOccurrenceKeys();
      const totals = await repo.calculateTotals(preferences.currency);

      const duePending = getPendingDueOccurrences(
        fetchedTemplates,
        generatedKeys,
        getTodayLocalDateString()
      );

      setTransactions(fetchedTx);
      setCategories(fetchedCats);
      setBudgets(fetchedBudgets);
      setRecurringTemplates(fetchedTemplates);
      setBills(fetchedBills);
      setSavingsGoals(fetchedSavings);
      setPendingOccurrences(duePending);
      setDashboardTotals(totals);

      // Perform pure domain calculations for selected period
      const summary = calculateMonthlySummary(fetchedTx, selectedPeriodKey);
      const breakdown = calculateCategorySpendingBreakdown(fetchedTx, fetchedCats, selectedPeriodKey);
      const trend = calculateSixMonthTrend(fetchedTx, selectedPeriodKey);

      // Find overall budget for selectedPeriodKey
      const overallBudgetObj = fetchedBudgets.find((b) => b.periodKey === selectedPeriodKey && !b.categoryId);
      const overallProgress = overallBudgetObj
        ? calculateBudgetProgress(overallBudgetObj, fetchedTx)
        : null;

      // Find category budgets for selectedPeriodKey
      const catBudgetsList = fetchedBudgets.filter((b) => b.periodKey === selectedPeriodKey && b.categoryId);
      const catProgresses = catBudgetsList.map((b) => {
        const cat = fetchedCats.find((c) => c.id === b.categoryId);
        return calculateBudgetProgress(b, fetchedTx, cat);
      });

      setMonthlySummary(summary);
      setCategoryBreakdown(breakdown);
      setSixMonthTrend(trend);
      setOverallBudgetProgress(overallProgress);
      setCategoryBudgetsProgress(catProgresses);

      // In-app notifications recalculation from real local data
      const readIds = NotificationStorage.getReadNotificationIds();
      const eventNotifications = NotificationStorage.getEventNotifications();
      const computedNotifications = generateAppNotifications({
        bills: fetchedBills,
        eventNotifications,
        readIds,
        currencyCode: preferences.currency,
        todayDateLocal: getTodayLocalDateString(),
      });
      setNotifications(computedNotifications);
      setUnreadNotificationCount(computedNotifications.filter((n) => !n.isRead).length);

      const health = await repo.getHealth();
      setStorageHealth(health);
    } catch (err) {
      console.error('[AppContext] Error loading repository data:', err);
      setDataError(err instanceof Error ? err.message : 'Database error while loading records.');
    } finally {
      setIsLoading(false);
    }
  }, [repo, preferences.currency, selectedPeriodKey]);

  useEffect(() => {
    refreshAllData();
  }, [refreshAllData]);

  const updatePreferences = (newPrefs: Partial<UserPreferences>) => {
    const updated = PreferencesStorage.savePreferences(newPrefs);
    setPreferences(updated);
  };

  const dismissOnboarding = () => {
    updatePreferences({ onboardingCompleted: true });
  };

  // Transaction Actions
  const saveTransaction = async (
    data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>,
    editId?: string
  ): Promise<Transaction> => {
    let saved: Transaction;
    if (editId) {
      saved = await repo.updateTransaction(editId, data);
    } else {
      saved = await repo.addTransaction(data);
    }
    await refreshAllData();
    return saved;
  };

  const deleteTransaction = async (id: string): Promise<void> => {
    await repo.deleteTransaction(id);
    if (viewingTransaction?.id === id) {
      setViewingTransaction(null);
    }
    await refreshAllData();
  };

  // Category Actions
  const saveCategory = async (
    data: Omit<Category, 'id' | 'createdAt'>,
    editId?: string
  ): Promise<Category> => {
    let saved: Category;
    if (editId) {
      saved = await repo.updateCategory(editId, data);
    } else {
      saved = await repo.addCategory(data);
    }
    await refreshAllData();
    return saved;
  };

  const archiveCategory = async (id: string, reassignToCategoryId?: string): Promise<Category> => {
    if (reassignToCategoryId) {
      await repo.reassignCategoryTransactions(id, reassignToCategoryId);
    }
    const archived = await repo.archiveCategory(id);
    await refreshAllData();
    return archived;
  };

  const checkCategoryTransactionCount = async (categoryId: string): Promise<number> => {
    return await repo.checkCategoryTransactionCount(categoryId);
  };

  const exportJSONBackup = async (): Promise<void> => {
    const data = await repo.getAllDataForExport();
    const payload = buildJSONBackupPayload({ ...data, preferences });
    const jsonString = JSON.stringify(payload, null, 2);
    const filename = `pocket-expense-backup-${getBackupFilenameDateString()}.json`;
    triggerFileDownload(filename, jsonString, 'application/json');
  };

  const exportCSV = async (): Promise<void> => {
    const fetchedTx = await repo.getAllTransactions();
    const fetchedCats = await repo.getAllCategories(true);
    const csvContent = generateTransactionsCSV(fetchedTx, fetchedCats);
    const filename = `pocket-expense-transactions-${getBackupFilenameDateString()}.csv`;
    triggerFileDownload(filename, csvContent, 'text/csv');
  };

  const restoreBackup = async (backupData: BackupDataPayload): Promise<void> => {
    await repo.restoreFullBackup(backupData);
    if (backupData.preferences) {
      updatePreferences(backupData.preferences);
    }
    await refreshAllData();
  };

  const clearAllData = async (): Promise<void> => {
    await repo.clearAllData();
    NotificationStorage.clearAll();
    await refreshAllData();
  };

  // Budget Actions
  const saveBudget = async (
    data: { periodKey: string; limitMinor: number; categoryId?: string },
    editId?: string
  ): Promise<Budget> => {
    const saved = await repo.saveBudget(data, editId);
    await refreshAllData();
    return saved;
  };

  const deleteBudget = async (id: string): Promise<void> => {
    await repo.deleteBudget(id);
    await refreshAllData();
  };

  // Recurring Template Actions
  const saveRecurringTemplate = async (
    data: Omit<RecurringTemplate, 'id' | 'createdAt' | 'updatedAt'>,
    editId?: string
  ): Promise<RecurringTemplate> => {
    const saved = await repo.saveRecurringTemplate(data, editId);
    await refreshAllData();
    return saved;
  };

  const deleteRecurringTemplate = async (id: string): Promise<void> => {
    await repo.deleteRecurringTemplate(id);
    await refreshAllData();
  };

  const processPendingOccurrences = async (selectedKeys: string[]): Promise<void> => {
    const matches = pendingOccurrences.filter((p) => selectedKeys.includes(p.occurrenceKey));
    if (matches.length > 0) {
      try {
        await repo.generatePendingOccurrences(matches);
        for (const m of matches) {
          const postedNotification: AppNotification = {
            id: generateRecurringPostedId(m.occurrenceKey),
            type: 'recurring_posted',
            title: `Recurring Posted: ${m.template.note || 'Scheduled Item'}`,
            message: `Scheduled ${m.template.type} for ${formatMinorToMajor(m.template.amountMinor, preferences.currency)} was posted successfully.`,
            dateLocal: m.dueDateLocal,
            createdAt: new Date().toISOString(),
            isRead: false,
            entityId: m.occurrenceKey,
          };
          NotificationStorage.addEventNotification(postedNotification);
        }
      } catch (err) {
        const errorNotification: AppNotification = {
          id: `recurring_err_${Date.now()}`,
          type: 'recurring_error',
          title: 'Recurring Processing Failed',
          message: err instanceof Error ? err.message : 'Could not process recurring transaction.',
          dateLocal: getTodayLocalDateString(),
          createdAt: new Date().toISOString(),
          isRead: false,
        };
        NotificationStorage.addEventNotification(errorNotification);
        throw err;
      }
    }
    await refreshAllData();
  };

  const dismissPendingOccurrences = async (selectedKeys: string[]): Promise<void> => {
    const matches = pendingOccurrences.filter((p) => selectedKeys.includes(p.occurrenceKey));
    for (const m of matches) {
      await repo.recordOccurrenceGenerated(m.occurrenceKey, m.template.id, m.dueDateLocal);
    }
    await refreshAllData();
  };

  // Bill Actions
  const saveBill = async (
    data: Omit<Bill, 'id' | 'createdAt' | 'updatedAt'>,
    editId?: string
  ): Promise<Bill> => {
    const saved = await repo.saveBill(data, editId);
    await refreshAllData();
    return saved;
  };

  const deleteBill = async (id: string): Promise<void> => {
    await repo.deleteBill(id);
    await refreshAllData();
  };

  const markBillPaid = async (
    billId: string,
    createExpenseTransaction: boolean = true
  ): Promise<{ bill: Bill; transaction?: Transaction }> => {
    const result = await repo.markBillPaid(billId, createExpenseTransaction);
    if (result.bill.isPaid) {
      const today = getTodayLocalDateString();
      const paidNotification: AppNotification = {
        id: generateBillPaidId(result.bill.id, result.bill.paidDateLocal || today),
        type: 'bill_paid',
        title: `Bill Paid: ${result.bill.name}`,
        message: `Payment for "${result.bill.name}" (${formatMinorToMajor(result.bill.amountMinor, preferences.currency)}) was recorded successfully.`,
        dateLocal: result.bill.paidDateLocal || today,
        createdAt: new Date().toISOString(),
        isRead: false,
        entityId: result.bill.id,
      };
      NotificationStorage.addEventNotification(paidNotification);
    }
    await refreshAllData();
    return result;
  };

  // Savings Goal Actions
  const saveSavingsGoal = async (
    data: Omit<SavingsGoal, 'id' | 'createdAt' | 'updatedAt'>,
    editId?: string
  ): Promise<SavingsGoal> => {
    const saved = await repo.saveSavingsGoal(data, editId);
    await refreshAllData();
    setSelectedSavingsGoalForDetails((prev) => (prev && prev.id === saved.id ? saved : prev));
    return saved;
  };

  const deleteSavingsGoal = async (id: string): Promise<void> => {
    await repo.deleteSavingsGoal(id);
    setSelectedSavingsGoalForDetails((prev) => (prev && prev.id === id ? null : prev));
    await refreshAllData();
  };

  const addSavingsContribution = async (
    goalId: string,
    amountMinor: number,
    note?: string
  ): Promise<{ goal: SavingsGoal; contribution: SavingsContribution }> => {
    const result = await repo.addSavingsContribution(goalId, amountMinor, note);
    await refreshAllData();
    setSelectedSavingsGoalForDetails((prev) => (prev && prev.id === result.goal.id ? result.goal : prev));
    return result;
  };

  const getSavingsContributions = useCallback(async (goalId: string): Promise<SavingsContribution[]> => {
    return repo.getSavingsContributionsByGoalId(goalId);
  }, [repo]);

  const deleteSavingsContribution = useCallback(async (contributionId: string): Promise<SavingsGoal> => {
    const updatedGoal = await repo.deleteSavingsContribution(contributionId);
    await refreshAllData();
    setSelectedSavingsGoalForDetails((prev) => (prev && prev.id === updatedGoal.id ? updatedGoal : prev));
    return updatedGoal;
  }, [repo, refreshAllData]);

  const updateSavingsContribution = useCallback(async (
    contributionId: string,
    amountMinor: number,
    note?: string,
    dateLocal?: string
  ): Promise<{ goal: SavingsGoal; contribution: SavingsContribution }> => {
    const res = await repo.updateSavingsContribution(contributionId, amountMinor, note, dateLocal);
    await refreshAllData();
    setSelectedSavingsGoalForDetails((prev) => (prev && prev.id === res.goal.id ? res.goal : prev));
    return res;
  }, [repo, refreshAllData]);

  // Filtered Navigation Action
  const navigateToTransactionsWithFilters = (filters: TransactionFilterOptions) => {
    setTransactionFilters(filters);
    setActiveTab('transactions');
  };

  // Modal Handlers
  const openAddModal = (txToEdit?: Transaction | null) => {
    const validTx =
      txToEdit && typeof txToEdit === 'object' && 'id' in txToEdit && typeof (txToEdit as any).id === 'string'
        ? txToEdit
        : null;
    setEditingTransaction(validTx);
    setIsAddModalOpen(true);
  };

  const closeAddModal = () => {
    setIsAddModalOpen(false);
    setEditingTransaction(null);
  };

  const openTransactionDetails = (tx: Transaction) => {
    setViewingTransaction(tx);
  };

  const closeTransactionDetails = () => {
    setViewingTransaction(null);
  };

  const openCategoryManager = () => setIsCategoryManagerOpen(true);
  const closeCategoryManager = () => setIsCategoryManagerOpen(false);

  const openSetBudgetModal = (budgetToEdit?: Budget | null, preselectedCategoryId?: string) => {
    setEditingBudget(budgetToEdit || null);
    setBudgetPreselectedCategoryId(preselectedCategoryId);
    setIsSetBudgetModalOpen(true);
  };

  const closeSetBudgetModal = () => {
    setIsSetBudgetModalOpen(false);
    setEditingBudget(null);
    setBudgetPreselectedCategoryId(undefined);
  };

  // Phase 4 Modal Handlers
  const openRecurringModal = (templateToEdit?: RecurringTemplate | null) => {
    setEditingRecurringTemplate(templateToEdit || null);
    setIsRecurringModalOpen(true);
  };

  const closeRecurringModal = () => {
    setIsRecurringModalOpen(false);
    setEditingRecurringTemplate(null);
  };

  const openDueOccurrencesModal = () => setIsDueOccurrencesModalOpen(true);
  const closeDueOccurrencesModal = () => setIsDueOccurrencesModalOpen(false);

  const openBillModal = (billToEdit?: Bill | null) => {
    setEditingBill(billToEdit || null);
    setIsBillModalOpen(true);
  };

  const closeBillModal = () => {
    setIsBillModalOpen(false);
    setEditingBill(null);
  };

  const openSavingsModal = (goalToEdit?: SavingsGoal | null) => {
    setEditingSavingsGoal(goalToEdit || null);
    setIsSavingsModalOpen(true);
  };

  const closeSavingsModal = () => {
    setIsSavingsModalOpen(false);
    setEditingSavingsGoal(null);
  };

  const currentCurrency =
    SUPPORTED_CURRENCIES.find((c) => c.code === preferences.currency) || SUPPORTED_CURRENCIES[0];

  return (
    <AppContext.Provider
      value={{
        activeTab,
        setActiveTab,
        preferences,
        currencySymbol: currentCurrency.symbol,
        currentCurrency,
        updatePreferences,
        selectedPeriodKey,
        setSelectedPeriodKey,
        shiftPeriodKey,
        isOffline,
        storageHealth,
        refreshStorageHealth,
        transactions,
        categories,
        budgets,
        dashboardTotals,
        monthlySummary,
        categoryBreakdown,
        sixMonthTrend,
        overallBudgetProgress,
        categoryBudgetsProgress,
        isLoading,
        dataError,
        recurringTemplates,
        bills,
        savingsGoals,
        pendingOccurrences,
        refreshAllData,
        saveTransaction,
        deleteTransaction,
        saveCategory,
        archiveCategory,
        checkCategoryTransactionCount,
        exportJSONBackup,
        exportCSV,
        restoreBackup,
        clearAllData,
        saveBudget,
        deleteBudget,
        saveRecurringTemplate,
        deleteRecurringTemplate,
        processPendingOccurrences,
        dismissPendingOccurrences,
        saveBill,
        deleteBill,
        markBillPaid,
        saveSavingsGoal,
        deleteSavingsGoal,
        addSavingsContribution,
        transactionFilters,
        setTransactionFilters,
        navigateToTransactionsWithFilters,
        isAddModalOpen,
        editingTransaction,
        openAddModal,
        closeAddModal,
        viewingTransaction,
        openTransactionDetails,
        closeTransactionDetails,
        isCategoryManagerOpen,
        openCategoryManager,
        closeCategoryManager,
        isSetBudgetModalOpen,
        editingBudget,
        budgetPreselectedCategoryId,
        openSetBudgetModal,
        closeSetBudgetModal,
        isRecurringModalOpen,
        editingRecurringTemplate,
        openRecurringModal,
        closeRecurringModal,
        isDueOccurrencesModalOpen,
        openDueOccurrencesModal,
        closeDueOccurrencesModal,
        isBillModalOpen,
        editingBill,
        openBillModal,
        closeBillModal,
        isSavingsModalOpen,
        editingSavingsGoal,
        openSavingsModal,
        closeSavingsModal,
        isSavingsDetailsModalOpen,
        selectedSavingsGoalForDetails,
        openSavingsDetailsModal,
        closeSavingsDetailsModal,
        isSavingsContributionModalOpen,
        targetGoalForContribution,
        openSavingsContributionModal,
        closeSavingsContributionModal,
        getSavingsContributions,
        deleteSavingsContribution,
        updateSavingsContribution,
        isVoiceModalOpen,
        openVoiceModal,
        closeVoiceModal,
        notifications,
        unreadNotificationCount,
        isNotificationCenterOpen,
        openNotificationCenter,
        closeNotificationCenter,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        dismissOnboarding,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
