import React from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { CategoryIcon } from '../components/ui/CategoryIcon';
import { MonthSelector } from '../components/ui/MonthSelector';
import { EmptyState } from '../components/ui/EmptyState';
import { useApp } from '../context/AppContext';
import { formatMinorToMajor } from '../domain/moneyAndDate';
import { formatPeriodKeyDisplay } from '../domain/budgetAndReport';
import { Target, PlusCircle } from 'lucide-react';

export const BudgetsView: React.FC = () => {
  const {
    currentCurrency,
    selectedPeriodKey,
    overallBudgetProgress,
    categoryBudgetsProgress,
    categories,
    openSetBudgetModal,
    navigateToTransactionsWithFilters,
  } = useApp();

  const availableCategoriesForBudget = categories.filter(
    (c) => c.type === 'expense' && !c.isArchived && !categoryBudgetsProgress.some((bp) => bp.budget.categoryId === c.id)
  );

  const getStatusBadge = (status: 'on_track' | 'near_limit' | 'over_budget', label: string) => {
    if (status === 'over_budget') return <Badge variant="expense">{label}</Badge>;
    if (status === 'near_limit') return <Badge variant="warning">{label}</Badge>;
    return <Badge variant="income">{label}</Badge>;
  };

  const hasAnyBudget = overallBudgetProgress !== null || categoryBudgetsProgress.length > 0;

  return (
    <div>
      {/* Page Header */}
      <PageHeader
        title="Monthly Budgets & Limits"
        subtitle={`Set spending thresholds per month and category to maintain financial discipline.`}
        action={
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <MonthSelector />
            <Button variant="primary" onClick={() => openSetBudgetModal(null)} leftIcon={<PlusCircle size={16} />}>
              Set Budget
            </Button>
          </div>
        }
      />

      {/* Overall Monthly Budget Section */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--ink-primary)', marginBottom: '12px' }}>
          Overall Monthly Budget
        </h2>

        {overallBudgetProgress ? (
          <Card style={{ backgroundColor: 'var(--surface-card)' }}>
            <CardHeader>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--primary-subtle)',
                      color: 'var(--primary-brand)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Target size={20} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--ink-primary)' }}>
                      Total Monthly Expense Limit
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--ink-muted)' }}>
                      {formatPeriodKeyDisplay(selectedPeriodKey)}
                    </div>
                  </div>
                </div>
                {getStatusBadge(overallBudgetProgress.status, overallBudgetProgress.statusLabel)}
              </div>
            </CardHeader>
            <CardContent>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--ink-primary)', lineHeight: 1.15 }}>
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
                aria-label="Overall monthly budget progress"
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
                  Edit Limit
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <EmptyState
            icon={<Target size={28} />}
            title={`No overall budget set for ${formatPeriodKeyDisplay(selectedPeriodKey)}`}
            description="Establish a total monthly spending budget to keep overall expenses under control."
            action={
              <Button variant="primary" onClick={() => openSetBudgetModal(null)} leftIcon={<PlusCircle size={16} />}>
                Set Overall Budget
              </Button>
            }
          />
        )}
      </div>

      {/* Category Budgets Section */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--ink-primary)' }}>
            Category Budgets ({formatPeriodKeyDisplay(selectedPeriodKey, true)})
          </h2>
          {availableCategoriesForBudget.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => openSetBudgetModal(null, availableCategoriesForBudget[0].id)} leftIcon={<PlusCircle size={14} />}>
              Add Category Budget
            </Button>
          )}
        </div>

        {categoryBudgetsProgress.length === 0 ? (
          <Card style={{ backgroundColor: 'var(--surface-subtle)', borderStyle: 'dashed', padding: '24px', textAlign: 'center' }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--ink-muted)', marginBottom: '12px' }}>
              No category-specific budgets defined for this month.
            </p>
            <Button variant="secondary" size="sm" onClick={() => openSetBudgetModal(null, availableCategoriesForBudget[0]?.id || categories.filter(c => c.type === 'expense')[0]?.id)} leftIcon={<PlusCircle size={14} />}>
              Create Category Budget
            </Button>
          </Card>
        ) : (
          <div
            className="budgets-grid-responsive"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}
          >
            {categoryBudgetsProgress.map((bp) => {
              const cat = bp.category;
              return (
                <Card key={bp.budget.id} style={{ backgroundColor: 'var(--surface-card)' }}>
                  <CardHeader>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <CategoryIcon name={cat?.icon || 'Tag'} color={cat?.color || '#176B87'} size={20} />
                        <span style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--ink-primary)' }}>
                          {cat?.name || 'Category'}
                        </span>
                      </div>
                      {getStatusBadge(bp.status, bp.statusLabel)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
                      <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--ink-primary)' }}>
                        {formatMinorToMajor(bp.spentMinor, currentCurrency.code)}
                      </span>
                      <span style={{ fontSize: '0.8125rem', color: 'var(--ink-muted)' }}>
                        of {formatMinorToMajor(bp.budget.limitMinor, currentCurrency.code)} ({bp.percentageUsed}%)
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div
                      style={{
                        width: '100%',
                        height: '8px',
                        borderRadius: 'var(--radius-full)',
                        backgroundColor: 'var(--surface-subtle)',
                        overflow: 'hidden',
                        marginBottom: '10px',
                      }}
                      role="progressbar"
                      aria-valuenow={Math.min(bp.percentageUsed, 100)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${cat?.name || 'Category'} budget progress`}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${Math.min(bp.percentageUsed, 100)}%`,
                          backgroundColor:
                            bp.status === 'over_budget'
                              ? 'var(--negative-crimson)'
                              : bp.status === 'near_limit'
                              ? '#D97706'
                              : 'var(--positive-emerald)',
                          borderRadius: 'var(--radius-full)',
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--ink-muted)' }}>
                        {bp.remainingMinor >= 0
                          ? `${formatMinorToMajor(bp.remainingMinor, currentCurrency.code)} left`
                          : `${formatMinorToMajor(Math.abs(bp.remainingMinor), currentCurrency.code)} over`
                        }
                      </span>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <Button variant="ghost" size="sm" onClick={() => navigateToTransactionsWithFilters({ categoryId: bp.budget.categoryId, month: selectedPeriodKey })}>
                          Transactions
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openSetBudgetModal(bp.budget)}>
                          Edit
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Accessible Table Alternative for Screen Readers & Summary View */}
      {hasAnyBudget && (
        <Card style={{ marginTop: '32px' }}>
          <CardHeader>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--ink-primary)' }}>
              Budget Overview Table ({formatPeriodKeyDisplay(selectedPeriodKey)})
            </h3>
          </CardHeader>
          <CardContent>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--ink-muted)' }}>
                    <th style={{ padding: '8px 12px' }}>Scope</th>
                    <th style={{ padding: '8px 12px' }}>Limit</th>
                    <th style={{ padding: '8px 12px' }}>Spent</th>
                    <th style={{ padding: '8px 12px' }}>Remaining</th>
                    <th style={{ padding: '8px 12px' }}>Used %</th>
                    <th style={{ padding: '8px 12px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {overallBudgetProgress && (
                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 600 }}>Overall Monthly</td>
                      <td style={{ padding: '10px 12px' }}>{formatMinorToMajor(overallBudgetProgress.budget.limitMinor, currentCurrency.code)}</td>
                      <td style={{ padding: '10px 12px' }}>{formatMinorToMajor(overallBudgetProgress.spentMinor, currentCurrency.code)}</td>
                      <td style={{ padding: '10px 12px' }}>{formatMinorToMajor(overallBudgetProgress.remainingMinor, currentCurrency.code)}</td>
                      <td style={{ padding: '10px 12px' }}>{overallBudgetProgress.percentageUsed}%</td>
                      <td style={{ padding: '10px 12px' }}>{getStatusBadge(overallBudgetProgress.status, overallBudgetProgress.statusLabel)}</td>
                    </tr>
                  )}
                  {categoryBudgetsProgress.map((bp) => (
                    <tr key={bp.budget.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 500 }}>{bp.category?.name || 'Category'}</td>
                      <td style={{ padding: '10px 12px' }}>{formatMinorToMajor(bp.budget.limitMinor, currentCurrency.code)}</td>
                      <td style={{ padding: '10px 12px' }}>{formatMinorToMajor(bp.spentMinor, currentCurrency.code)}</td>
                      <td style={{ padding: '10px 12px' }}>{formatMinorToMajor(bp.remainingMinor, currentCurrency.code)}</td>
                      <td style={{ padding: '10px 12px' }}>{bp.percentageUsed}%</td>
                      <td style={{ padding: '10px 12px' }}>{getStatusBadge(bp.status, bp.statusLabel)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
