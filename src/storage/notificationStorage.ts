import { AppNotification } from '../domain/notificationService';

const READ_NOTIFICATION_IDS_KEY = 'pocket_tracker_read_notification_ids_v1';
const EVENT_NOTIFICATIONS_KEY = 'pocket_tracker_event_notifications_v1';
const MAX_SAVED_EVENT_NOTIFICATIONS = 50;

export class NotificationStorage {
  /**
   * Retrieves the set of notification IDs that the user has marked as read.
   */
  static getReadNotificationIds(): Set<string> {
    try {
      const stored = localStorage.getItem(READ_NOTIFICATION_IDS_KEY);
      if (!stored) return new Set();
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return new Set(parsed);
      }
      return new Set();
    } catch (e) {
      console.warn('[NotificationStorage] Failed to read read notification IDs:', e);
      return new Set();
    }
  }

  /**
   * Marks a specific notification ID as read and persists it.
   */
  static markAsRead(id: string): Set<string> {
    try {
      const current = this.getReadNotificationIds();
      current.add(id);
      localStorage.setItem(READ_NOTIFICATION_IDS_KEY, JSON.stringify(Array.from(current)));
      return current;
    } catch (e) {
      console.error('[NotificationStorage] Failed to save read notification ID:', e);
      return this.getReadNotificationIds();
    }
  }

  /**
   * Marks multiple notification IDs as read and persists them.
   */
  static markAllAsRead(ids: string[]): Set<string> {
    try {
      const current = this.getReadNotificationIds();
      ids.forEach((id) => current.add(id));
      localStorage.setItem(READ_NOTIFICATION_IDS_KEY, JSON.stringify(Array.from(current)));
      return current;
    } catch (e) {
      console.error('[NotificationStorage] Failed to save read notification IDs:', e);
      return this.getReadNotificationIds();
    }
  }

  /**
   * Retrieves saved event notifications (bill payments, recurring transactions posted).
   */
  static getEventNotifications(): AppNotification[] {
    try {
      const stored = localStorage.getItem(EVENT_NOTIFICATIONS_KEY);
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed;
      }
      return [];
    } catch (e) {
      console.warn('[NotificationStorage] Failed to read event notifications:', e);
      return [];
    }
  }

  /**
   * Adds an event notification, maintaining a cap of the most recent entries.
   */
  static addEventNotification(notification: AppNotification): AppNotification[] {
    try {
      const current = this.getEventNotifications();
      // Deduplicate by ID
      const filtered = current.filter((n) => n.id !== notification.id);
      filtered.unshift(notification);
      const capped = filtered.slice(0, MAX_SAVED_EVENT_NOTIFICATIONS);
      localStorage.setItem(EVENT_NOTIFICATIONS_KEY, JSON.stringify(capped));
      return capped;
    } catch (e) {
      console.error('[NotificationStorage] Failed to save event notification:', e);
      return this.getEventNotifications();
    }
  }

  /**
   * Clears all notification data (used during factory reset or full restore).
   */
  static clearAll(): void {
    try {
      localStorage.removeItem(READ_NOTIFICATION_IDS_KEY);
      localStorage.removeItem(EVENT_NOTIFICATIONS_KEY);
    } catch (e) {
      console.error('[NotificationStorage] Failed to clear notifications:', e);
    }
  }
}
