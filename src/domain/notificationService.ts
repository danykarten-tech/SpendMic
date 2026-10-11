import { Bill } from './types';
import { calculateBillStatus } from './recurringAndBills';
import { formatMinorToMajor, getTodayLocalDateString } from './moneyAndDate';

export type NotificationType =
  | 'bill_due_today'
  | 'bill_overdue'
  | 'bill_paid'
  | 'recurring_posted'
  | 'recurring_due'
  | 'recurring_error';

export interface AppNotification {
  id: string; // Stable deterministic ID
  type: NotificationType;
  title: string;
  message: string;
  dateLocal: string; // YYYY-MM-DD
  createdAt: string; // ISO string
  isRead: boolean;
  entityId?: string; // bill.id or occurrenceKey
}

/**
 * Deterministic ID for a due-today bill notification
 */
export function generateBillDueTodayId(billId: string, dueDateLocal: string): string {
  return `bill_due_today_${billId}_${dueDateLocal}`;
}

/**
 * Deterministic ID for an overdue bill notification.
 * Per spec: "For overdue bills, one persistent notification per bill and due-date state is sufficient.
 * Do not create a new overdue notification on every app refresh."
 */
export function generateBillOverdueId(billId: string, dueDateLocal: string): string {
  return `bill_overdue_${billId}_${dueDateLocal}`;
}

/**
 * Deterministic ID for a bill paid notification
 */
export function generateBillPaidId(billId: string, paidDateLocal: string): string {
  return `bill_paid_${billId}_${paidDateLocal}`;
}

/**
 * Deterministic ID for a recurring posted notification
 */
export function generateRecurringPostedId(occurrenceKey: string): string {
  return `recurring_posted_${occurrenceKey}`;
}

/**
 * Pure generator that computes active notifications from current bills,
 * pending recurring occurrences, and recorded event notifications.
 */
export function generateAppNotifications(options: {
  bills: Bill[];
  eventNotifications: AppNotification[];
  readIds: Set<string>;
  currencyCode?: string;
  todayDateLocal?: string;
}): AppNotification[] {
  const {
    bills,
    eventNotifications,
    readIds,
    currencyCode = 'INR',
    todayDateLocal = getTodayLocalDateString(),
  } = options;

  const notificationsMap = new Map<string, AppNotification>();

  // 1. Process active bills:
  // Paid bills NEVER generate overdue or due-today notifications.
  // When a bill is marked as paid, any prior overdue or due-today notification is resolved.
  for (const bill of bills) {
    if (bill.isPaid) {
      continue;
    }

    const statusRes = calculateBillStatus(bill, todayDateLocal);
    const formattedAmount = formatMinorToMajor(bill.amountMinor, currencyCode);

    if (statusRes.daysDiff === 0) {
      // Due Today
      const id = generateBillDueTodayId(bill.id, bill.dueDateLocal);
      notificationsMap.set(id, {
        id,
        type: 'bill_due_today',
        title: `Bill Due Today: ${bill.name}`,
        message: `Your bill "${bill.name}" for ${formattedAmount} is due today.`,
        dateLocal: bill.dueDateLocal,
        createdAt: `${bill.dueDateLocal}T00:00:00.000Z`,
        isRead: readIds.has(id),
        entityId: bill.id,
      });
    } else if (statusRes.status === 'overdue') {
      // Overdue
      const overdueDays = Math.abs(statusRes.daysDiff);
      const id = generateBillOverdueId(bill.id, bill.dueDateLocal);
      notificationsMap.set(id, {
        id,
        type: 'bill_overdue',
        title: `Overdue Bill: ${bill.name}`,
        message: `Bill "${bill.name}" for ${formattedAmount} was due on ${bill.dueDateLocal} and remains unpaid (${overdueDays} day${overdueDays === 1 ? '' : 's'} overdue).`,
        dateLocal: bill.dueDateLocal,
        createdAt: `${bill.dueDateLocal}T23:59:59.000Z`,
        isRead: readIds.has(id),
        entityId: bill.id,
      });
    }
  }

  // 2. Add recorded event notifications (bill paid, recurring posted, etc.)
  for (const event of eventNotifications) {
    notificationsMap.set(event.id, {
      ...event,
      isRead: readIds.has(event.id) || event.isRead,
    });
  }

  // Convert to array and sort descending by createdAt
  const result = Array.from(notificationsMap.values());
  result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return result;
}
