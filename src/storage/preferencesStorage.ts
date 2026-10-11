import { UserPreferences } from '../domain/types';

const PREFERENCES_KEY = 'pocket_tracker_user_prefs_v1';

export const DEFAULT_PREFERENCES: UserPreferences = {
  currency: 'INR',
  theme: 'light',
  onboardingCompleted: false,
  hasSeenOfflineNotice: false,
};

export class PreferencesStorage {
  static getPreferences(): UserPreferences {
    try {
      const stored = localStorage.getItem(PREFERENCES_KEY);
      if (!stored) {
        return DEFAULT_PREFERENCES;
      }
      const parsed = JSON.parse(stored);
      return {
        ...DEFAULT_PREFERENCES,
        ...parsed,
      };
    } catch (e) {
      console.warn('[PreferencesStorage] Failed to read from localStorage, using defaults', e);
      return DEFAULT_PREFERENCES;
    }
  }

  static savePreferences(prefs: Partial<UserPreferences>): UserPreferences {
    try {
      const current = this.getPreferences();
      const updated = { ...current, ...prefs };
      localStorage.setItem(PREFERENCES_KEY, JSON.stringify(updated));
      return updated;
    } catch (e) {
      console.error('[PreferencesStorage] Failed to save preferences to localStorage', e);
      return { ...DEFAULT_PREFERENCES, ...prefs };
    }
  }

  static resetPreferences(): UserPreferences {
    try {
      localStorage.removeItem(PREFERENCES_KEY);
    } catch (e) {
      console.error('[PreferencesStorage] Error removing preferences key', e);
    }
    return DEFAULT_PREFERENCES;
  }
}
