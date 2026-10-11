import React, { useState } from 'react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { EmptyState } from '../ui/EmptyState';
import { useApp } from '../../context/AppContext';
import { AppNotification } from '../../domain/notificationService';
import { formatDateLocalDisplay } from '../../domain/moneyAndDate';
import {
  Bell,
  CheckCheck,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Repeat,
  AlertCircle,
  Check,
} from 'lucide-react';

interface NotificationCenterModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen: propIsOpen,
  onClose: propOnClose,
}) => {
  const {
    isNotificationCenterOpen,
    closeNotificationCenter,
    notifications,
    unreadNotificationCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
  } = useApp();

  const isOpen = propIsOpen !== undefined ? propIsOpen : isNotificationCenterOpen;
  const onClose = propOnClose !== undefined ? propOnClose : closeNotificationCenter;

  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');

  const displayedNotifications =
    activeTab === 'unread'
      ? notifications.filter((n) => !n.isRead)
      : notifications;

  const getNotificationIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'bill_overdue':
        return <AlertTriangle size={18} style={{ color: 'var(--negative-crimson)' }} />;
      case 'bill_due_today':
        return <Calendar size={18} style={{ color: 'var(--warning-amber)' }} />;
      case 'bill_paid':
        return <CheckCircle2 size={18} style={{ color: 'var(--positive-emerald)' }} />;
      case 'recurring_posted':
        return <Repeat size={18} style={{ color: 'var(--positive-emerald)' }} />;
      case 'recurring_error':
        return <AlertCircle size={18} style={{ color: 'var(--negative-crimson)' }} />;
      default:
        return <Bell size={18} style={{ color: 'var(--primary-brand)' }} />;
    }
  };

  const getNotificationBadge = (type: AppNotification['type']) => {
    switch (type) {
      case 'bill_overdue':
        return <Badge variant="expense">Overdue</Badge>;
      case 'bill_due_today':
        return <Badge variant="warning">Due Today</Badge>;
      case 'bill_paid':
        return <Badge variant="income">Paid</Badge>;
      case 'recurring_posted':
        return <Badge variant="income">Posted</Badge>;
      case 'recurring_error':
        return <Badge variant="expense">Error</Badge>;
      default:
        return <Badge variant="muted">Notice</Badge>;
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="In-App Notification Center"
      subtitle="Offline-first reminders for scheduled recurring payments, due bills, and financial updates."
    >
      <div id="notification-center-content" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Controls Header: Tabs and Mark All Read */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            borderBottom: '1px solid var(--border-color)',
            paddingBottom: '12px',
          }}
        >
          {/* Tab Filter */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              id="filter-notifications-all"
              onClick={() => setActiveTab('all')}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8125rem',
                fontWeight: 600,
                border: '1px solid',
                cursor: 'pointer',
                borderColor: activeTab === 'all' ? 'var(--primary-brand)' : 'var(--border-color)',
                backgroundColor: activeTab === 'all' ? 'var(--primary-subtle)' : 'var(--surface-card)',
                color: activeTab === 'all' ? 'var(--primary-brand)' : 'var(--ink-secondary)',
              }}
            >
              All ({notifications.length})
            </button>
            <button
              id="filter-notifications-unread"
              onClick={() => setActiveTab('unread')}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8125rem',
                fontWeight: 600,
                border: '1px solid',
                cursor: 'pointer',
                borderColor: activeTab === 'unread' ? 'var(--primary-brand)' : 'var(--border-color)',
                backgroundColor: activeTab === 'unread' ? 'var(--primary-subtle)' : 'var(--surface-card)',
                color: activeTab === 'unread' ? 'var(--primary-brand)' : 'var(--ink-secondary)',
              }}
            >
              Unread ({unreadNotificationCount})
            </button>
          </div>

          {/* Mark All Read Button */}
          {unreadNotificationCount > 0 && (
            <Button
              id="mark-all-read-btn"
              variant="secondary"
              size="sm"
              onClick={markAllNotificationsAsRead}
              leftIcon={<CheckCheck size={14} />}
            >
              Mark All Read
            </Button>
          )}
        </div>

        {/* Notifications List */}
        <div
          id="notification-items-list"
          style={{
            maxHeight: '360px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          {displayedNotifications.length === 0 ? (
            <EmptyState
              title={activeTab === 'unread' ? 'No Unread Notifications' : 'No Notifications'}
              description={
                activeTab === 'unread'
                  ? 'All caught up! You have marked all current reminders as read.'
                  : 'You have no scheduled bill reminders or recent transaction notifications.'
              }
              icon={<Bell size={32} />}
            />
          ) : (
            displayedNotifications.map((item) => (
              <div
                key={item.id}
                id={`notification-item-${item.id}`}
                style={{
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: item.isRead ? 'var(--surface-card)' : 'var(--surface-subtle)',
                  border: '1px solid',
                  borderColor: item.isRead ? 'var(--border-color)' : 'var(--primary-border)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '12px',
                  transition: 'background-color 0.2s ease',
                }}
              >
                {/* Left: Icon & Text */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: 'var(--surface-card)',
                      border: '1px solid var(--border-color)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: '2px',
                    }}
                  >
                    {getNotificationIcon(item.type)}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                      <span
                        style={{
                          fontWeight: item.isRead ? 600 : 700,
                          fontSize: '0.875rem',
                          color: 'var(--ink-primary)',
                        }}
                      >
                        {item.title}
                      </span>
                      {getNotificationBadge(item.type)}
                      {!item.isRead && (
                        <span
                          title="Unread"
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: 'var(--primary-brand)',
                            display: 'inline-block',
                          }}
                        />
                      )}
                    </div>

                    <p
                      style={{
                        margin: 0,
                        fontSize: '0.8125rem',
                        color: 'var(--ink-secondary)',
                        lineHeight: '1.4',
                        wordBreak: 'break-word',
                      }}
                    >
                      {item.message}
                    </p>

                    <div
                      style={{
                        fontSize: '0.75rem',
                        color: 'var(--ink-muted)',
                        marginTop: '6px',
                      }}
                    >
                      {formatDateLocalDisplay(item.dateLocal)}
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', alignSelf: 'center' }}>
                  {!item.isRead ? (
                    <Button
                      id={`notification-mark-read-${item.id}`}
                      variant="ghost"
                      size="sm"
                      onClick={() => markNotificationAsRead(item.id)}
                      title="Mark as read"
                      leftIcon={<Check size={14} />}
                    >
                      Read
                    </Button>
                  ) : (
                    <span
                      style={{
                        fontSize: '0.75rem',
                        color: 'var(--ink-subtle)',
                        fontStyle: 'italic',
                      }}
                    >
                      Read
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '12px',
            marginTop: '8px',
            paddingTop: '12px',
            borderTop: '1px solid var(--border-color)',
          }}
        >
          <Button variant="primary" onClick={closeNotificationCenter}>
            Close
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
