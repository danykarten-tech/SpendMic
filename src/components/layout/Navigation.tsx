import React from 'react';
import { Home, Receipt, PieChart, BarChart3, Settings, Plus, WifiOff, HardDrive, Repeat, CalendarCheck, PiggyBank, LucideIcon, Mic, Sparkles } from 'lucide-react';
import { NavigationTab } from '../../domain/types';
import { useApp } from '../../context/AppContext';
import { Badge } from '../ui/Badge';
import { VoiceMicButton } from '../voice/VoiceMicButton';

export interface NavItemConfig {
  id: NavigationTab;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItemConfig[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'transactions', label: 'Transactions', icon: Receipt },
  { id: 'budgets', label: 'Budgets', icon: PieChart },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'recurring', label: 'Recurring', icon: Repeat },
  { id: 'bills', label: 'Bills', icon: CalendarCheck },
  { id: 'savings', label: 'Savings', icon: PiggyBank },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export const DesktopSidebar: React.FC = () => {
  const { activeTab, setActiveTab, openAddModal, openVoiceModal, currencySymbol, currentCurrency, isOffline, storageHealth } = useApp();

  return (
    <aside
      className="desktop-sidebar"
      style={{
        width: 'var(--sidebar-width)',
        backgroundColor: 'var(--surface-card)',
        borderRight: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        padding: '20px 16px',
      }}
    >
      {/* Brand Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0 8px 24px 8px', borderBottom: '1px solid var(--border-color)' }}>
        <img
          src="/logo-icon.png"
          alt="SpendMic"
          width={40}
          height={40}
          style={{
            width: '40px',
            height: '40px',
            objectFit: 'contain',
            flexShrink: 0,
          }}
        />
        <div>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--ink-primary)', lineHeight: '1.1' }}>
            SpendMic AI
          </h2>
          <span style={{ fontSize: '0.75rem', color: 'var(--ink-muted)', fontWeight: 500 }}>
            Offline & Private
          </span>
        </div>
      </div>

      {/* Primary Action Button */}
      <div style={{ padding: '20px 0 16px 0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <button
          onClick={() => openAddModal()}
          className="btn btn-primary btn-full btn-lg"
          style={{ gap: '8px', boxShadow: '0 4px 12px rgba(23, 107, 135, 0.25)' }}
        >
          <Plus size={20} />
          <span>Add Transaction</span>
        </button>

        <VoiceMicButton variant="sidebar" onClick={openVoiceModal} />
      </div>

      {/* Navigation Links */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', paddingTop: '8px' }}>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                color: isActive ? 'var(--primary-brand)' : 'var(--ink-secondary)',
                backgroundColor: isActive ? 'var(--primary-subtle)' : 'transparent',
                fontWeight: isActive ? 600 : 500,
                fontSize: '0.9375rem',
                transition: 'all 0.15s ease',
                width: '100%',
                textAlign: 'left',
                border: '1px solid',
                borderColor: isActive ? 'var(--primary-border)' : 'transparent',
              }}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div style={{ paddingTop: '16px', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
          <span style={{ color: 'var(--ink-muted)' }}>Currency:</span>
          <span style={{ fontWeight: 600, color: 'var(--ink-primary)' }}>
            {currencySymbol} ({currentCurrency.code})
          </span>
        </div>

        {isOffline ? (
          <Badge variant="expense" icon={<WifiOff size={12} />}>
            Offline Mode Active
          </Badge>
        ) : (
          <Badge variant="muted" icon={<HardDrive size={12} />}>
            IndexedDB {storageHealth?.indexedDBAvailable ? 'Ready' : 'Check'}
          </Badge>
        )}
      </div>
    </aside>
  );
};

export const MobileBottomNav: React.FC = () => {
  const { activeTab, setActiveTab, openAddModal, openVoiceModal } = useApp();
  const [isMoreOpen, setIsMoreOpen] = React.useState<boolean>(false);

  const isMoreActive = ['recurring', 'bills', 'savings', 'transactions', 'settings'].includes(activeTab);

  const handleSelectTab = (tab: NavigationTab) => {
    setActiveTab(tab);
    setIsMoreOpen(false);
  };

  return (
    <>
      <nav
        className="mobile-bottom-nav"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: 'calc(var(--bottom-nav-height) + env(safe-area-inset-bottom, 0px))',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          backgroundColor: 'var(--surface-card)',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          zIndex: 900,
          boxShadow: '0 -4px 20px rgba(91, 70, 229, 0.08)',
        }}
      >
        {/* Tab 1: Home */}
        <button
          onClick={() => handleSelectTab('home')}
          aria-label="Home"
          className="mobile-nav-btn"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '3px',
            minHeight: 'var(--min-touch-target)',
            minWidth: '54px',
            padding: '4px 0',
            color: activeTab === 'home' ? 'var(--primary-brand)' : 'var(--ink-muted)',
            fontSize: '0.75rem',
            fontWeight: activeTab === 'home' ? 700 : 500,
          }}
        >
          {activeTab === 'home' && <span className="mobile-nav-active-pill" />}
          <Home size={21} strokeWidth={activeTab === 'home' ? 2.5 : 2} />
          <span>Home</span>
        </button>

        {/* Tab 2: Insight / Reports */}
        <button
          onClick={() => handleSelectTab('reports')}
          aria-label="Insight Reports"
          className="mobile-nav-btn"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '3px',
            minHeight: 'var(--min-touch-target)',
            minWidth: '54px',
            padding: '4px 0',
            color: activeTab === 'reports' ? 'var(--primary-brand)' : 'var(--ink-muted)',
            fontSize: '0.75rem',
            fontWeight: activeTab === 'reports' ? 700 : 500,
          }}
        >
          {activeTab === 'reports' && <span className="mobile-nav-active-pill" />}
          <BarChart3 size={21} strokeWidth={activeTab === 'reports' ? 2.5 : 2} />
          <span>Insight</span>
        </button>

        {/* Center Prominent Floating Add Button */}
        <button
          onClick={() => openAddModal()}
          aria-label="Add transaction"
          className="mobile-nav-btn"
          style={{
            width: '54px',
            height: '54px',
            borderRadius: '50%',
            background: 'var(--primary-gradient)',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(91, 70, 229, 0.35)',
            transform: 'translateY(-12px)',
            border: '4px solid var(--surface-card)',
            cursor: 'pointer',
          }}
        >
          <Plus size={24} strokeWidth={2.6} />
        </button>

        {/* Tab 3: Budget */}
        <button
          onClick={() => handleSelectTab('budgets')}
          aria-label="Budgets"
          className="mobile-nav-btn"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '3px',
            minHeight: 'var(--min-touch-target)',
            minWidth: '54px',
            padding: '4px 0',
            color: activeTab === 'budgets' ? 'var(--primary-brand)' : 'var(--ink-muted)',
            fontSize: '0.75rem',
            fontWeight: activeTab === 'budgets' ? 700 : 500,
          }}
        >
          {activeTab === 'budgets' && <span className="mobile-nav-active-pill" />}
          <PieChart size={21} strokeWidth={activeTab === 'budgets' ? 2.5 : 2} />
          <span>Budget</span>
        </button>

        {/* Tab 4: More Menu */}
        <button
          onClick={() => setIsMoreOpen(true)}
          aria-label="More Options"
          className="mobile-nav-btn"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '3px',
            minHeight: 'var(--min-touch-target)',
            minWidth: '54px',
            padding: '4px 0',
            color: isMoreActive || isMoreOpen ? 'var(--primary-brand)' : 'var(--ink-muted)',
            fontSize: '0.75rem',
            fontWeight: isMoreActive || isMoreOpen ? 700 : 500,
          }}
        >
          {(isMoreActive || isMoreOpen) && <span className="mobile-nav-active-pill" />}
          <Settings size={21} strokeWidth={isMoreActive || isMoreOpen ? 2.5 : 2} />
          <span>More</span>
        </button>
      </nav>

      {/* Mobile More Tools Drawer / Modal Sheet */}
      {isMoreOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(24, 23, 37, 0.5)',
            backdropFilter: 'blur(6px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
          }}
          onClick={() => setIsMoreOpen(false)}
        >
          <div
            style={{
              backgroundColor: 'var(--surface-card)',
              width: '100%',
              maxWidth: '520px',
              borderTopLeftRadius: '24px',
              borderTopRightRadius: '24px',
              padding: '12px 18px calc(24px + env(safe-area-inset-bottom, 0px)) 18px',
              boxShadow: 'var(--shadow-lg)',
              animation: 'slideUpMobile 0.24s cubic-bezier(0.16, 1, 0.3, 1)',
              maxHeight: '85vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sheet Handle */}
            <div
              style={{
                width: '36px',
                height: '4px',
                borderRadius: '9999px',
                backgroundColor: 'var(--border-color)',
                margin: '0 auto 14px auto',
              }}
            />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--ink-primary)' }}>
                  Tools & Navigation
                </h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--ink-muted)' }}>
                  Access all features, schedules, and settings
                </p>
              </div>
              <button
                onClick={() => setIsMoreOpen(false)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--surface-subtle)',
                  color: 'var(--ink-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              {/* Voice Assistant */}
              <button
                onClick={() => {
                  setIsMoreOpen(false);
                  openVoiceModal();
                }}
                style={{
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: '#EEECFE',
                  border: '1px solid #C7D2FE',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  textAlign: 'left',
                  gridColumn: 'span 2',
                }}
              >
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#5B46E5', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Mic size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#4338CA', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>Voice Assistant</span>
                    <Sparkles size={14} className="text-amber-500" />
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#6366F1' }}>100% Offline voice command entry</div>
                </div>
              </button>

              {/* Recurring */}
              <button
                onClick={() => handleSelectTab('recurring')}
                style={{
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: activeTab === 'recurring' ? 'var(--primary-subtle)' : 'var(--surface-subtle)',
                  border: '1px solid',
                  borderColor: activeTab === 'recurring' ? 'var(--primary-border)' : 'var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  textAlign: 'left',
                }}
              >
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#EEECFE', color: '#5B46E5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Repeat size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--ink-primary)' }}>Recurring</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--ink-muted)' }}>Auto schedules</div>
                </div>
              </button>

              {/* Bills */}
              <button
                onClick={() => handleSelectTab('bills')}
                style={{
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: activeTab === 'bills' ? 'var(--primary-subtle)' : 'var(--surface-subtle)',
                  border: '1px solid',
                  borderColor: activeTab === 'bills' ? 'var(--primary-border)' : 'var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  textAlign: 'left',
                }}
              >
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CalendarCheck size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--ink-primary)' }}>Bill Tracker</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--ink-muted)' }}>Upcoming dues</div>
                </div>
              </button>

              {/* Savings Goals */}
              <button
                onClick={() => handleSelectTab('savings')}
                style={{
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: activeTab === 'savings' ? 'var(--primary-subtle)' : 'var(--surface-subtle)',
                  border: '1px solid',
                  borderColor: activeTab === 'savings' ? 'var(--primary-border)' : 'var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  textAlign: 'left',
                }}
              >
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#ECFDF5', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <PiggyBank size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--ink-primary)' }}>Savings Goals</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--ink-muted)' }}>Targets & progress</div>
                </div>
              </button>

              {/* All Transactions */}
              <button
                onClick={() => handleSelectTab('transactions')}
                style={{
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: activeTab === 'transactions' ? 'var(--primary-subtle)' : 'var(--surface-subtle)',
                  border: '1px solid',
                  borderColor: activeTab === 'transactions' ? 'var(--primary-border)' : 'var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  textAlign: 'left',
                }}
              >
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#E0F2FE', color: '#0284C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Receipt size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--ink-primary)' }}>Transactions</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--ink-muted)' }}>Full list & filters</div>
                </div>
              </button>

              {/* Settings */}
              <button
                onClick={() => handleSelectTab('settings')}
                style={{
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: activeTab === 'settings' ? 'var(--primary-subtle)' : 'var(--surface-subtle)',
                  border: '1px solid',
                  borderColor: activeTab === 'settings' ? 'var(--primary-border)' : 'var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  textAlign: 'left',
                  gridColumn: 'span 2',
                }}
              >
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#F3F4F6', color: '#4B5563', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Settings size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--ink-primary)' }}>Settings & Privacy</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--ink-muted)' }}>Currency, JSON backup, CSV export & privacy</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
