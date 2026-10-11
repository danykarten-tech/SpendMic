import React from 'react';
import { WelcomeBanner } from '../components/onboarding/WelcomeBanner';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { Badge } from '../components/ui/Badge';
import { CategoryIcon } from '../components/ui/CategoryIcon';
import { MonthSelector } from '../components/ui/MonthSelector';
import { VoiceMicButton } from '../components/voice/VoiceMicButton';
import { useApp } from '../context/AppContext';
import { formatMinorToMajor, formatDateLocalDisplay } from '../domain/moneyAndDate';
import { formatPeriodKeyDisplay } from '../domain/budgetAndReport';
import { resolveTransactionCategory } from '../domain/categoriesData';
import {
  PlusCircle,
  Receipt,
  Target,
  Mic,
  Sparkles,
  ChevronRight,
} from 'lucide-react';

export const HomeView: React.FC = () => {
  const {
    currentCurrency,
    openAddModal,
    openVoiceModal,
    openTransactionDetails,
    openSetBudgetModal,
    transactions,
    categories,
    selectedPeriodKey,
    monthlySummary,
    overallBudgetProgress,
    categoryBreakdown,
    storageHealth,
    navigateToTransactionsWithFilters,
  } = useApp();

  // Transactions for selected month (newest first)
  const monthTransactions = transactions.filter((t) => t.dateLocal.startsWith(selectedPeriodKey));
  const recentTransactions = monthTransactions.slice(0, 5);

  // Top spending categories highlights (up to 3)
  const topCategories = categoryBreakdown.slice(0, 3);

  // Status badge styling helper
  const getStatusBadge = (status: 'on_track' | 'near_limit' | 'over_budget', label: string) => {
    if (status === 'over_budget') return <Badge variant="expense">{label}</Badge>;
    if (status === 'near_limit') return <Badge variant="warning">{label}</Badge>;
    return <Badge variant="income">{label}</Badge>;
  };

  return (
    <div>
      {/* Onboarding / Privacy Welcome Banner */}
      <WelcomeBanner />

      {/* Hero Header Card */}
      <div
        className="home-hero-card"
        style={{
          background: 'linear-gradient(135deg, #4338CA 0%, #6366F1 50%, #818CF8 100%)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px 20px',
          color: '#FFFFFF',
          marginBottom: '24px',
          boxShadow: 'var(--shadow-lg)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Subtle Decorative Background Circles */}
        <div
          style={{
            position: 'absolute',
            top: '-40px',
            right: '-40px',
            width: '160px',
            height: '160px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.08)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-50px',
            left: '-20px',
            width: '140px',
            height: '140px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.06)',
            pointerEvents: 'none',
          }}
        />

        {/* Top Header Controls Row */}
        <div className="home-hero-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <span style={{ fontSize: '0.8125rem', color: 'rgba(255, 255, 255, 0.8)', fontWeight: 500 }}>
              Financial Overview
            </span>
            <h1 className="home-hero-period-title" style={{ fontSize: '1.25rem', fontWeight: 700, color: '#FFFFFF', lineHeight: 1.2 }}>
              {formatPeriodKeyDisplay(selectedPeriodKey)}
            </h1>
          </div>
          <div className="home-hero-header-controls" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <MonthSelector />
            <VoiceMicButton onClick={openVoiceModal} />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => openAddModal()}
              leftIcon={<PlusCircle size={14} />}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                color: '#FFFFFF',
                borderColor: 'rgba(255, 255, 255, 0.3)',
                backdropFilter: 'blur(8px)',
              }}
            >
              Add
            </Button>
          </div>
        </div>

        {/* Main Monthly Expense Metric */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <span style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.8)', fontWeight: 500, display: 'block', marginBottom: '4px' }}>
            Spent this month
          </span>
          <div className="home-hero-metric" style={{ fontSize: '2.5rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
            {formatMinorToMajor(monthlySummary.expenseTotalMinor, currentCurrency.code)}
          </div>
          {overallBudgetProgress ? (
            <div style={{ fontSize: '0.8125rem', color: 'rgba(255, 255, 255, 0.85)', marginTop: '6px' }}>
              of {formatMinorToMajor(overallBudgetProgress.budget.limitMinor, currentCurrency.code)} budget • {overallBudgetProgress.percentageUsed}% used
            </div>
          ) : (
            <div style={{ fontSize: '0.8125rem', color: 'rgba(255, 255, 255, 0.85)', marginTop: '6px' }}>
              Income: +{formatMinorToMajor(monthlySummary.incomeTotalMinor, currentCurrency.code)}
            </div>
          )}
        </div>

        {/* 3 Frosted Stat Cards Row */}
        <div
          className="home-hero-stats-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '10px',
          }}
        >
          {/* Stat 1: Daily Average */}
          <div
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.14)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: 'var(--radius-sm)',
              padding: '12px 8px',
              textAlign: 'center',
            }}
          >
            <span style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.8)', display: 'block', marginBottom: '2px' }}>
              Daily Average
            </span>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#FFFFFF' }}>
              {formatMinorToMajor(Math.round(monthlySummary.expenseTotalMinor / 30), currentCurrency.code)}
            </div>
            <span style={{ fontSize: '0.6875rem', color: 'rgba(255, 255, 255, 0.75)', marginTop: '2px', display: 'block' }}>
              Per day
            </span>
          </div>

          {/* Stat 2: Transactions */}
          <div
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.14)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: 'var(--radius-sm)',
              padding: '12px 8px',
              textAlign: 'center',
            }}
          >
            <span style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.8)', display: 'block', marginBottom: '2px' }}>
              Transactions
            </span>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#FFFFFF' }}>
              {monthlySummary.transactionCount}
            </div>
            <span style={{ fontSize: '0.6875rem', color: 'rgba(255, 255, 255, 0.75)', marginTop: '2px', display: 'block' }}>
              Records
            </span>
          </div>

          {/* Stat 3: Net Flow */}
          <div
            className="home-hero-stat-card-span2"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.14)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: 'var(--radius-sm)',
              padding: '12px 8px',
              textAlign: 'center',
            }}
          >
            <span style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.8)', display: 'block', marginBottom: '2px' }}>
              Net Cash Flow
            </span>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#FFFFFF' }}>
              {monthlySummary.netCashFlowMinor >= 0 ? '+' : ''}
              {formatMinorToMajor(monthlySummary.netCashFlowMinor, currentCurrency.code)}
            </div>
            <span style={{ fontSize: '0.6875rem', color: 'rgba(255, 255, 255, 0.75)', marginTop: '2px', display: 'block' }}>
              Saved
            </span>
          </div>
        </div>
      </div>

      {/* Mobile Flagship Voice AI Hero Button & Quick Actions */}
      <div className="mobile-actions-wrapper">
        {/* Prominently Highlighted Flagship Voice AI Button — Main Focus */}
        <button
          type="button"
          onClick={openVoiceModal}
          className="mobile-voice-ai-hero-card"
          aria-label="Launch Voice Assistant"
          title="Tap to speak with Voice AI Assistant"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="voice-mic-badge-pulse">
              <Mic size={18} color="#7928CA" strokeWidth={2.6} />
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#FFFFFF', letterSpacing: '0.01em', lineHeight: 1.2 }}>
                Voice AI Assistant
              </div>
              <span style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.88)', fontWeight: 500, display: 'block', marginTop: '2px' }}>
                Tap to speak expense, income, bills or savings
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={18} color="#FDE047" className="voice-sparkle-anim" />
            <ChevronRight size={18} color="rgba(255, 255, 255, 0.75)" />
          </div>
        </button>

        {/* 3 Secondary Quick Action Pills */}
        <div className="mobile-quick-actions-bar">
          <button
            type="button"
            onClick={() => openAddModal()}
            className="mobile-quick-action-pill"
            aria-label="Add Expense"
          >
            <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: 'var(--negative-bg)', color: 'var(--negative-crimson)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <PlusCircle size={14} />
            </div>
            <span>+ Expense</span>
          </button>
          <button
            type="button"
            onClick={() => openAddModal()}
            className="mobile-quick-action-pill"
            aria-label="Add Income"
          >
            <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: 'var(--positive-bg)', color: 'var(--positive-emerald)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <PlusCircle size={14} />
            </div>
            <span>+ Income</span>
          </button>
          <button
            type="button"
            onClick={() => openSetBudgetModal(overallBudgetProgress?.budget || null)}
            className="mobile-quick-action-pill"
            aria-label="Set Budget"
          >
            <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Target size={14} />
            </div>
            <span>Budget</span>
          </button>
        </div>
      </div>

      {/* Overall Budget Progress Card */}
      <div style={{ marginBottom: '32px' }}>
        {overallBudgetProgress ? (
          <Card style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--border-color)' }}>
            <CardHeader>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Target size={20} style={{ color: 'var(--primary-brand)' }} />
                  <span style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--ink-primary)' }}>
                    Overall Monthly Budget ({formatPeriodKeyDisplay(selectedPeriodKey, true)})
                  </span>
                </div>
                {getStatusBadge(overallBudgetProgress.status, overallBudgetProgress.statusLabel)}
              </div>
            </CardHeader>
            <CardContent>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div>
                  <div style={{ fontSize: '1.625rem', fontWeight: 700, color: 'var(--ink-primary)', lineHeight: 1.15 }}>
                    {formatMinorToMajor(overallBudgetProgress.spentMinor, currentCurrency.code)}
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--ink-muted)', marginTop: '4px' }}>
                    Limit: {formatMinorToMajor(overallBudgetProgress.budget.limitMinor, currentCurrency.code)}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    color: overallBudgetProgress.status === 'over_budget' ? 'var(--negative-crimson)' : 'var(--ink-primary)',
                    lineHeight: 1.15,
                  }}>
                    {overallBudgetProgress.percentageUsed}%
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--ink-muted)', marginTop: '4px' }}>
                    used
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div
                style={{
                  width: '100%',
                  height: '10px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'var(--surface-subtle)',
                  overflow: 'hidden',
                  marginBottom: '12px',
                }}
                role="progressbar"
                aria-valuenow={Math.min(overallBudgetProgress.percentageUsed, 100)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Overall budget progress"
              >
                <div
                  style={{
                    height: '100%',
                    width: `${Math.min(overallBudgetProgress.percentageUsed, 100)}%`,
                    backgroundColor:
                      overallBudgetProgress.status === 'over_budget'
                        ? 'var(--negative-crimson)'
                        : overallBudgetProgress.status === 'near_limit'
                        ? '#D97706'
                        : 'var(--positive-emerald)',
                    borderRadius: 'var(--radius-full)',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8125rem', color: 'var(--ink-muted)' }}>
                  {overallBudgetProgress.remainingMinor >= 0
                    ? `${formatMinorToMajor(overallBudgetProgress.remainingMinor, currentCurrency.code)} remaining`
                    : `${formatMinorToMajor(Math.abs(overallBudgetProgress.remainingMinor), currentCurrency.code)} over budget limit`}
                </span>
                <Button variant="ghost" size="sm" onClick={() => openSetBudgetModal(overallBudgetProgress.budget)}>
                  Edit Budget
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card style={{ backgroundColor: 'var(--surface-subtle)', borderStyle: 'dashed' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', padding: '8px 4px' }}>
              <div>
                <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--ink-primary)' }}>
                  No overall budget set for {formatPeriodKeyDisplay(selectedPeriodKey)}
                </h4>
                <p style={{ fontSize: '0.8125rem', color: 'var(--ink-muted)', marginTop: '2px' }}>
                  Set a monthly spending threshold to maintain financial control and receive status warnings.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => openSetBudgetModal(null)} leftIcon={<Target size={14} />}>
                Set Monthly Budget
              </Button>
            </div>
          </Card>
        )}
      </div>

      {/* Category Spending Highlights */}
      {topCategories.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--ink-primary)' }}>
              Top Spending Highlights ({formatPeriodKeyDisplay(selectedPeriodKey, true)})
            </h2>
            <Button variant="ghost" size="sm" onClick={() => navigateToTransactionsWithFilters({ month: selectedPeriodKey })}>
              View All Breakdown
            </Button>
          </div>

          <div className="home-top-categories-container">
            {topCategories.map((item) => (
              <div
                key={item.category.id}
                onClick={() => navigateToTransactionsWithFilters({ categoryId: item.category.id, month: selectedPeriodKey })}
                className="card-interactive home-top-category-item"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      backgroundColor: `${item.category.color || '#176B87'}15`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <CategoryIcon name={item.category.icon} color={item.category.color} size={18} />
                  </div>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--ink-primary)', display: 'block' }}>
                      {item.category.name}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--ink-muted)' }}>
                      {item.percentageOfExpense}% of monthly expenses
                    </span>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.0625rem', fontWeight: 700, color: 'var(--ink-primary)' }}>
                    {formatMinorToMajor(item.totalMinor, currentCurrency.code)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity Section */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--ink-primary)' }}>
            Recent Activity ({formatPeriodKeyDisplay(selectedPeriodKey, true)})
          </h2>
          {monthTransactions.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => navigateToTransactionsWithFilters({ month: selectedPeriodKey })}>
              View All ({monthTransactions.length})
            </Button>
          )}
        </div>

        {recentTransactions.length === 0 ? (
          <EmptyState
            icon={<Receipt size={28} />}
            title={`No records for ${formatPeriodKeyDisplay(selectedPeriodKey)}`}
            description="Start by adding income or expense transactions for this month."
            badgeText="IndexedDB Ready"
            action={
              <Button variant="primary" onClick={() => openAddModal()} leftIcon={<PlusCircle size={16} />}>
                Add Transaction
              </Button>
            }
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {recentTransactions.map((tx) => {
              const cat = resolveTransactionCategory(tx.categoryId, categories, tx.note, tx.type);
              const isIncome = tx.type === 'income';
              return (
                <div
                  key={tx.id}
                  onClick={() => openTransactionDetails(tx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 16px',
                    backgroundColor: 'var(--surface-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                  }}
                  className="card-interactive tx-item-mobile"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: isIncome ? 'var(--positive-bg)' : `${cat?.color || '#176B87'}15`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <CategoryIcon name={cat?.icon || 'Tag'} color={isIncome ? 'var(--positive-emerald)' : cat?.color} size={20} />
                    </div>

                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--ink-primary)' }}>
                        {cat?.name || 'Uncategorized'}
                      </div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--ink-muted)', marginTop: '2px' }}>
                        {tx.note || (isIncome ? 'Income record' : 'Expense record')}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: '1rem',
                        color: isIncome ? 'var(--positive-emerald)' : 'var(--ink-primary)',
                      }}
                    >
                      {isIncome ? '+' : '-'}{formatMinorToMajor(tx.amountMinor, tx.currency || currentCurrency.code)}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--ink-muted)', marginTop: '2px' }}>
                      {formatDateLocalDisplay(tx.dateLocal, tx.createdAt, tx.timeLocal)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Storage Health Indicator */}
      <Card style={{ backgroundColor: 'var(--surface-subtle)', borderStyle: 'dashed' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--ink-primary)' }}>
              IndexedDB Storage Operational
            </h4>
            <p style={{ fontSize: '0.8125rem', color: 'var(--ink-muted)', marginTop: '2px' }}>
              Database: {storageHealth?.databaseName || 'pocket_expense_tracker_db'} (v{storageHealth?.databaseVersion || 1}) • Status: Active
            </p>
          </div>
          <Badge variant="info">
            {storageHealth?.transactionCount ?? transactions.length} Local Records
          </Badge>
        </div>
      </Card>
    </div>
  );
};
