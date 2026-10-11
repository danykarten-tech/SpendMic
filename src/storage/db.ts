import { openDB, DBSchema, IDBPDatabase } from 'idb';
import {
  Transaction,
  Category,
  Budget,
  RecurringTemplate,
  RecurringOccurrence,
  Bill,
  SavingsGoal,
  SavingsContribution,
} from '../domain/types';

export const defaultDBName = 'pocket_expense_tracker_db';
export const DB_VERSION = 1;

export interface PocketTrackerDBSchema extends DBSchema {
  transactions: {
    key: string;
    value: Transaction;
    indexes: {
      by_dateLocal: string;
      by_type: string;
      by_categoryId: string;
    };
  };
  categories: {
    key: string;
    value: Category;
    indexes: {
      by_type: string;
    };
  };
  budgets: {
    key: string;
    value: Budget;
  };
  recurring_templates: {
    key: string;
    value: RecurringTemplate;
  };
  recurring_occurrences: {
    key: string;
    value: RecurringOccurrence;
  };
  bills: {
    key: string;
    value: Bill;
  };
  savings_goals: {
    key: string;
    value: SavingsGoal;
  };
  savings_contributions: {
    key: string;
    value: SavingsContribution;
    indexes: {
      by_goalId: string;
    };
  };
}

const dbMap = new Map<string, Promise<IDBPDatabase<PocketTrackerDBSchema>>>();

function createDBOpenOptions() {
  return {
    upgrade(db: IDBPDatabase<PocketTrackerDBSchema>, _oldVersion: number, _newVersion: number | null) {
      try {
        if (!db.objectStoreNames.contains('transactions')) {
          const txStore = db.createObjectStore('transactions', { keyPath: 'id' });
          txStore.createIndex('by_dateLocal', 'dateLocal');
          txStore.createIndex('by_type', 'type');
          txStore.createIndex('by_categoryId', 'categoryId');
        }

        if (!db.objectStoreNames.contains('categories')) {
          const catStore = db.createObjectStore('categories', { keyPath: 'id' });
          catStore.createIndex('by_type', 'type');
        }

        if (!db.objectStoreNames.contains('budgets')) {
          db.createObjectStore('budgets', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('recurring_templates')) {
          db.createObjectStore('recurring_templates', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('recurring_occurrences')) {
          db.createObjectStore('recurring_occurrences', { keyPath: 'occurrenceKey' });
        }

        if (!db.objectStoreNames.contains('bills')) {
          db.createObjectStore('bills', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('savings_goals')) {
          db.createObjectStore('savings_goals', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('savings_contributions')) {
          const scStore = db.createObjectStore('savings_contributions', { keyPath: 'id' });
          scStore.createIndex('by_goalId', 'goalId');
        }
      } catch (err) {
        console.error('[DB upgrade error]:', err);
        throw err;
      }
    },
  };
}

export async function getDB(name: string = defaultDBName): Promise<IDBPDatabase<PocketTrackerDBSchema>> {
  let promise = dbMap.get(name);
  if (!promise) {
    promise = openDB<PocketTrackerDBSchema>(name, DB_VERSION, createDBOpenOptions());
    dbMap.set(name, promise);
  }
  try {
    return await promise;
  } catch (err) {
    dbMap.delete(name);
    throw err;
  }
}

export async function closeDB(name: string = defaultDBName): Promise<void> {
  const p = dbMap.get(name);
  if (p) {
    dbMap.delete(name);
    try {
      const db = await p;
      db.close();
    } catch (e) {
      /* ignore close errors */
    }
  }
}

export async function closeAllDBs(): Promise<void> {
  const promises = Array.from(dbMap.values());
  dbMap.clear();
  for (const p of promises) {
    try {
      const db = await p;
      db.close();
    } catch (e) {}
  }
}

export async function checkStorageHealth(name: string = defaultDBName) {
  try {
    if (!('indexedDB' in window)) {
      return {
        indexedDBAvailable: false,
        databaseName: name,
        databaseVersion: DB_VERSION,
        transactionCount: 0,
        categoryCount: 0,
        isStoragePersisted: false,
        error: 'IndexedDB is not supported by this browser.',
      };
    }

    const db = await getDB(name);
    const txCount = await db.count('transactions');
    const catCount = await db.count('categories');

    let isStoragePersisted = false;
    if (navigator.storage && navigator.storage.persisted) {
      isStoragePersisted = await navigator.storage.persisted();
    }

    return {
      indexedDBAvailable: true,
      databaseName: name,
      databaseVersion: DB_VERSION,
      transactionCount: txCount,
      categoryCount: catCount,
      isStoragePersisted,
    };
  } catch (err) {
    return {
      indexedDBAvailable: false,
      databaseName: name,
      databaseVersion: DB_VERSION,
      transactionCount: 0,
      categoryCount: 0,
      isStoragePersisted: false,
      error: err instanceof Error ? err.message : 'Unknown IndexedDB error',
    };
  }
}
