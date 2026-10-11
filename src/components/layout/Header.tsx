import React from 'react';
import { WifiOff, Settings, Bell } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Badge } from '../ui/Badge';
import { NAV_ITEMS } from './Navigation';

export const Header: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    currentCurrency,
    currencySymbol,
    isOffline,
    unreadNotificationCount,
    openNotificationCenter,
  } = useApp();

  const currentNav = NAV_ITEMS.find((item) => item.id === activeTab);

  return (
    <header
      className="app-topbar"
      style={{
        height: 'var(--topbar-height)',
        backgroundColor: 'var(--surface-card)',
        borderBottom: '1px solid var(--border-color)',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 90,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <h2 className="app-topbar-title" style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--ink-primary)' }}>
          {currentNav?.label || 'SpendMic AI'}
        </h2>
        <span className="btn-desktop-only">
          <Badge variant="muted">v1.0 Phase 1</Badge>
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {isOffline && (
          <Badge variant="expense" icon={<WifiOff size={12} />}>
            Offline
          </Badge>
        )}

        {/* Accessible Notification Center Button */}
        <button
          id="header-notification-btn"
          onClick={openNotificationCenter}
          aria-label={`Notifications${unreadNotificationCount > 0 ? ` (${unreadNotificationCount} unread)` : ''}`}
          title="Notifications"
          style={{
            position: 'relative',
            padding: '8px',
            color: unreadNotificationCount > 0 ? 'var(--primary-brand)' : 'var(--ink-muted)',
            backgroundColor: unreadNotificationCount > 0 ? 'var(--primary-subtle)' : 'transparent',
            border: '1px solid',
            borderColor: unreadNotificationCount > 0 ? 'var(--primary-border)' : 'transparent',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <Bell size={20} />
          {unreadNotificationCount > 0 && (
            <span
              id="notification-unread-badge"
              style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                backgroundColor: 'var(--negative-crimson)',
                color: '#ffffff',
                borderRadius: '9999px',
                fontSize: '0.6875rem',
                fontWeight: 700,
                minWidth: '18px',
                height: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 4px',
                lineHeight: 1,
                boxShadow: '0 0 0 2px var(--surface-card)',
              }}
            >
              {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'var(--surface-subtle)',
            border: '1px solid var(--border-color)',
            fontSize: '0.8125rem',
            fontWeight: 600,
            color: 'var(--ink-primary)',
            cursor: 'pointer',
          }}
          title="Change currency or settings"
        >
          <span>{currencySymbol}</span>
          <span>{currentCurrency.code}</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          aria-label="Settings"
          className="btn-desktop-only"
          style={{
            padding: '8px',
            color: 'var(--ink-muted)',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Settings size={20} />
        </button>
      </div>
    </header>
  );
};
