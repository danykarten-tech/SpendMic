import React from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { CategoryIcon } from '../components/ui/CategoryIcon';
import { MonthSelector } from '../components/ui/MonthSelector';
import { EmptyState } from '../components/ui/EmptyState';
import { useApp } from '../context/AppContext';
import { formatMinorToMajor } from '../domain/moneyAndDate';
import { formatPeriodKeyDisplay } from '../domain/budgetAndReport';
import { BarChart3, TrendingUp, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

export const ReportsView: React.FC = () => {
  const {
    currentCurrency,
    selectedPeriodKey,
    monthlySummary,
    categoryBreakdown,
    sixMonthTrend,
    navigateToTransactionsWithFilters,
  } = useApp();

  const hasTransactionsInMonth = monthlySummary.transactionCount > 0;
  const maxTrendAmount = Math.max(
    1,
    ...sixMonthTrend.flatMap((t) => [t.incomeMinor, t.expenseMinor])
  );

  return (
    <div>
      {/* Page Header */}
      <PageHeader
        title="Reports & Analytics"
        subtitle="Visual analytics and category breakdowns calculated 100% locally from your records."
        action={
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <MonthSelector />
          </div>
        }
      />

      {/* 1. Income vs Expense Comparison Section */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--ink-primary)', marginBottom: '12px' }}>
          Monthly Cash Flow Overview ({formatPeriodKeyDisplay(selectedPeriodKey)})
        </h2>

        <Card>
          <CardContent style={{ paddingTop: '20px' }}>
            {!hasTransactionsInMonth ? (
              <EmptyState
                icon={<BarChart3 size={28} />}
                title={`No records for ${formatPeriodKeyDisplay(selectedPeriodKey)}`}
                description="Add income or expense transactions in this month to view visual cash flow reports."
              />
            ) : (
              <div>
                <div
                  className="stats-grid-responsive"
                  style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}
                >
                  {/* Income Card */}
                  <div
                    onClick={() => navigateToTransactionsWithFilters({ type: 'income', month: selectedPeriodKey })}
                    className="card-interactive"
                    style={{
                      padding: '16px',
                      backgroundColor: 'var(--surface-subtle)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--positive-emerald)', fontWeight: 600, fontSize: '0.875rem' }}>
                      <ArrowUpRight size={18} />
                      Total Income
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--positive-emerald)', marginTop: '6px' }}>
                      {formatMinorToMajor(monthlySummary.incomeTotalMinor, currentCurrency.code)}
                    </div>
                  </div>

                  {/* Expense Card */}
                  <div
                    onClick={() => navigateToTransactionsWithFilters({ type: 'expense', month: selectedPeriodKey })}
                    className="card-interactive"
                    style={{
                      padding: '16px',
                      backgroundColor: 'var(--surface-subtle)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--negative-crimson)', fontWeight: 600, fontSize: '0.875rem' }}>
                      <ArrowDownLeft size={18} />
                      Total Expenses
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--negative-crimson)', marginTop: '6px' }}>
                      {formatMinorToMajor(monthlySummary.expenseTotalMinor, currentCurrency.code)}
                    </div>
                  </div>

                  {/* Net Cash Flow Card */}
                  <div
                    onClick={() => navigateToTransactionsWithFilters({ month: selectedPeriodKey })}
                    className="card-interactive stats-grid-span2"
                    style={{
                      padding: '16px',
                      backgroundColor: 'var(--surface-subtle)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary-brand)', fontWeight: 600, fontSize: '0.875rem' }}>
                      <TrendingUp size={18} />
                      Net Cash Flow
                    </div>
                    <div
                      style={{
                        fontSize: '1.5rem',
                        fontWeight: 700,
                        marginTop: '6px',
                        color: monthlySummary.netCashFlowMinor >= 0 ? 'var(--positive-emerald)' : 'var(--negative-crimson)',
                      }}
                    >
                      {monthlySummary.netCashFlowMinor >= 0 ? '+' : ''}
                      {formatMinorToMajor(monthlySummary.netCashFlowMinor, currentCurrency.code)}
                    </div>
                  </div>
                </div>

                {/* Accessible Bar Visual Comparison */}
                <div style={{ padding: '16px', backgroundColor: 'var(--surface-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--ink-primary)', marginBottom: '12px' }}>
                    Income vs Expense Balance Bar
                  </div>
                  {(() => {
                    const totalVolume = monthlySummary.incomeTotalMinor + monthlySummary.expenseTotalMinor;
                    const incPct = totalVolume > 0 ? Math.round((monthlySummary.incomeTotalMinor / totalVolume) * 100) : 50;
                    const expPct = totalVolume > 0 ? 100 - incPct : 50;
                    return (
                      <div>
                        <div
                          style={{
                            display: 'flex',
                            height: '16px',
                            borderRadius: 'var(--radius-full)',
                            overflow: 'hidden',
                            backgroundColor: 'var(--surface-subtle)',
                            marginBottom: '8px',
                          }}
                          role="img"
                          aria-label={`Income ${incPct}% vs Expenses ${expPct}%`}
                        >
                          <div
                            style={{
                              width: `${incPct}%`,
                              backgroundColor: 'var(--positive-emerald)',
                              transition: 'width 0.3s ease',
                            }}
                            title={`Income: ${incPct}%`}
                          />
                          <div
                            style={{
                              width: `${expPct}%`,
                              backgroundColor: 'var(--negative-crimson)',
                              transition: 'width 0.3s ease',
                            }}
                            title={`Expenses: ${expPct}%`}
                          />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', color: 'var(--ink-muted)' }}>
                          <span style={{ color: 'var(--positive-emerald)', fontWeight: 600 }}>
                            Income: {incPct}% ({formatMinorToMajor(monthlySummary.incomeTotalMinor, currentCurrency.code)})
                          </span>
                          <span style={{ color: 'var(--negative-crimson)', fontWeight: 600 }}>
                            Expenses: {expPct}% ({formatMinorToMajor(monthlySummary.expenseTotalMinor, currentCurrency.code)})
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 2. Category Spending Breakdown Section */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--ink-primary)', marginBottom: '12px' }}>
          Category Spending Breakdown ({formatPeriodKeyDisplay(selectedPeriodKey)})
        </h2>

        {categoryBreakdown.length === 0 ? (
          <Card style={{ backgroundColor: 'var(--surface-subtle)', borderStyle: 'dashed', padding: '24px', textAlign: 'center' }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--ink-muted)' }}>
              No expense transactions recorded for {formatPeriodKeyDisplay(selectedPeriodKey)}.
            </p>
          </Card>
        ) : (
          <Card>
            <CardContent style={{ paddingTop: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                {categoryBreakdown.map((item) => (
                  <div
                    key={item.category.id}
                    onClick={() => navigateToTransactionsWithFilters({ categoryId: item.category.id, month: selectedPeriodKey })}
                    className="card-interactive"
                    style={{ cursor: 'pointer', padding: '8px', borderRadius: 'var(--radius-sm)' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <CategoryIcon name={item.category.icon} color={item.category.color} size={18} />
                        <span style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--ink-primary)' }}>
                          {item.category.name}
                        </span>
                        <Badge variant="muted">{item.transactionCount} records</Badge>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--ink-primary)' }}>
                          {formatMinorToMajor(item.totalMinor, currentCurrency.code)}
                        </span>
                        <span style={{ fontSize: '0.8125rem', color: 'var(--ink-muted)', marginLeft: '8px' }}>
                          ({item.percentageOfExpense}%)
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar for Category */}
                    <div
                      style={{
                        width: '100%',
                        height: '8px',
                        borderRadius: 'var(--radius-full)',
                        backgroundColor: 'var(--surface-subtle)',
                        overflow: 'hidden',
                      }}
                      role="progressbar"
                      aria-valuenow={item.percentageOfExpense}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${item.category.name} percentage of monthly expenses`}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${item.percentageOfExpense}%`,
                          backgroundColor: item.category.color || 'var(--primary-brand)',
                          borderRadius: 'var(--radius-full)',
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Accessible Data Table Alternative */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--ink-primary)', marginBottom: '8px' }}>
                  Category Breakdown Data Table
                </h4>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--ink-muted)' }}>
                        <th style={{ padding: '8px 12px' }}>Category</th>
                        <th style={{ padding: '8px 12px' }}>Type</th>
                        <th style={{ padding: '8px 12px' }}>Total Spent</th>
                        <th style={{ padding: '8px 12px' }}>% of Expenses</th>
                        <th style={{ padding: '8px 12px' }}>Transactions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categoryBreakdown.map((item) => (
                        <tr key={item.category.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '8px 12px', fontWeight: 500 }}>{item.category.name}</td>
                          <td style={{ padding: '8px 12px' }}>Expense</td>
                          <td style={{ padding: '8px 12px', fontWeight: 600 }}>{formatMinorToMajor(item.totalMinor, currentCurrency.code)}</td>
                          <td style={{ padding: '8px 12px' }}>{item.percentageOfExpense}%</td>
                          <td style={{ padding: '8px 12px' }}>{item.transactionCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 3. Six-Month Trend Section */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--ink-primary)', marginBottom: '12px' }}>
          6-Month Cash Flow Trend (Ending {formatPeriodKeyDisplay(selectedPeriodKey, true)})
        </h2>

        <Card>
          <CardContent style={{ paddingTop: '20px' }}>
            {/* Visual SVG/CSS Bar Chart */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', marginBottom: '16px', fontSize: '0.8125rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '2px', backgroundColor: 'var(--positive-emerald)' }} />
                  <span>Income</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '2px', backgroundColor: 'var(--negative-crimson)' }} />
                  <span>Expenses</span>
                </div>
              </div>

              {/* Bar Columns Container */}
              <div
                className="chart-bars-container"
                style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', height: '160px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}
              >
                {sixMonthTrend.map((pt) => {
                  const incHeight = Math.round((pt.incomeMinor / maxTrendAmount) * 130);
                  const expHeight = Math.round((pt.expenseMinor / maxTrendAmount) * 130);
                  const isCurrent = pt.periodKey === selectedPeriodKey;

                  return (
                    <div
                      key={pt.periodKey}
                      onClick={() => navigateToTransactionsWithFilters({ month: pt.periodKey })}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        padding: '0 4px',
                      }}
                      title={`${pt.monthLabel}: Income ${formatMinorToMajor(pt.incomeMinor, currentCurrency.code)}, Expenses ${formatMinorToMajor(pt.expenseMinor, currentCurrency.code)}`}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '130px' }}>
                        {/* Income Bar */}
                        <div
                          style={{
                            width: '14px',
                            height: `${Math.max(incHeight, 4)}px`,
                            backgroundColor: 'var(--positive-emerald)',
                            borderRadius: '3px 3px 0 0',
                            transition: 'height 0.3s ease',
                          }}
                        />
                        {/* Expense Bar */}
                        <div
                          style={{
                            width: '14px',
                            height: `${Math.max(expHeight, 4)}px`,
                            backgroundColor: 'var(--negative-crimson)',
                            borderRadius: '3px 3px 0 0',
                            transition: 'height 0.3s ease',
                          }}
                        />
                      </div>
                      <span style={{ fontSize: '0.75rem', fontWeight: isCurrent ? 700 : 500, color: isCurrent ? 'var(--primary-brand)' : 'var(--ink-muted)' }}>
                        {pt.monthLabel}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Accessible Data Table Alternative for 6-Month Trend */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--ink-primary)', marginBottom: '8px' }}>
                6-Month Trend Data Table
              </h4>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--ink-muted)' }}>
                      <th style={{ padding: '8px 12px' }}>Month</th>
                      <th style={{ padding: '8px 12px' }}>Income</th>
                      <th style={{ padding: '8px 12px' }}>Expenses</th>
                      <th style={{ padding: '8px 12px' }}>Net Cash Flow</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sixMonthTrend.map((pt) => (
                      <tr key={pt.periodKey} style={{ borderBottom: '1px solid var(--border-color)', fontWeight: pt.periodKey === selectedPeriodKey ? 600 : 400 }}>
                        <td style={{ padding: '8px 12px' }}>{pt.monthLabel}</td>
                        <td style={{ padding: '8px 12px', color: 'var(--positive-emerald)' }}>{formatMinorToMajor(pt.incomeMinor, currentCurrency.code)}</td>
                        <td style={{ padding: '8px 12px', color: 'var(--negative-crimson)' }}>{formatMinorToMajor(pt.expenseMinor, currentCurrency.code)}</td>
                        <td style={{ padding: '8px 12px' }}>
                          {pt.netCashFlowMinor >= 0 ? '+' : ''}
                          {formatMinorToMajor(pt.netCashFlowMinor, currentCurrency.code)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
