import React from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { useApp } from '../context/AppContext';
import { useToast } from '../components/ui/Toast';
import { formatMinorToMajor, formatDateLocalDisplay } from '../domain/moneyAndDate';
import { calculateSavingsProgress } from '../domain/recurringAndBills';
import { PiggyBank, Plus, CheckCircle2, Calendar, Trash2, Edit3, ShieldAlert } from 'lucide-react';

export const SavingsView: React.FC = () => {
  const {
    savingsGoals,
    currentCurrency,
    openSavingsModal,
    deleteSavingsGoal,
    openSavingsDetailsModal,
    openSavingsContributionModal,
  } = useApp();
  const { showToast } = useToast();

  const handleDeleteGoal = async (goalId: string, goalName: string) => {
    if (!window.confirm(`Are you sure you want to delete savings goal "${goalName}"?`)) return;
    try {
      await deleteSavingsGoal(goalId);
      showToast({
        type: 'success',
        title: 'Goal Removed',
        description: `Savings goal "${goalName}" deleted.`,
      });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Delete Error',
        description: 'Could not delete savings goal.',
      });
    }
  };

  const totalSavedMinor = savingsGoals.reduce((sum, g) => sum + g.currentSavedMinor, 0);
  const totalTargetMinor = savingsGoals.reduce((sum, g) => sum + g.targetMinor, 0);

  return (
    <div>
      <PageHeader
        title="Savings Goals"
        subtitle="Set financial targets for major milestones and track your accumulated contributions."
        action={
          <Button variant="primary" onClick={() => openSavingsModal(null)} leftIcon={<Plus size={16} />}>
            New Savings Goal
          </Button>
        }
      />

      {/* Non-financial advice disclaimer banner */}
      <div
        style={{
          backgroundColor: 'var(--surface-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          padding: '14px 16px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          fontSize: '0.8125rem',
          color: 'var(--ink-secondary)',
          lineHeight: '1.5',
        }}
      >
        <ShieldAlert size={20} style={{ color: 'var(--primary-brand)', flexShrink: 0, marginTop: '2px' }} />
        <div>
          <span style={{ fontWeight: 600, color: 'var(--ink-primary)', display: 'block', marginBottom: '2px' }}>
            No Financial Advice Disclaimer
          </span>
          SpendMic AI tracks milestone targets and self-reported deposits for organizing your savings goals. It does not provide financial or investment recommendations.
        </div>
      </div>

      {/* Overview Card */}
      {savingsGoals.length > 0 && (
        <Card style={{ backgroundColor: 'var(--surface-card)', marginBottom: '24px' }}>
          <CardContent style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Total Savings Accumulated
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--positive-emerald)', marginTop: '4px' }}>
                  {formatMinorToMajor(totalSavedMinor, currentCurrency.code)}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.8125rem', color: 'var(--ink-muted)' }}>Combined Goals Target</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--ink-primary)', marginTop: '4px' }}>
                  {formatMinorToMajor(totalTargetMinor, currentCurrency.code)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Savings Goals Grid */}
      {savingsGoals.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              title="No Savings Goals Yet"
              description="Create a savings goal for emergency funds, tech purchases, or travel milestones to start tracking deposits."
              icon={<PiggyBank size={32} />}
              action={
                <Button variant="primary" onClick={() => openSavingsModal(null)} leftIcon={<Plus size={16} />}>
                  Create Your First Goal
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div
          className="savings-grid-responsive"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}
        >
          {savingsGoals.map((goal) => {
            const progress = calculateSavingsProgress(goal);

            return (
              <Card
                key={goal.id}
                role="button"
                tabIndex={0}
                onClick={() => openSavingsDetailsModal(goal)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openSavingsDetailsModal(goal);
                  }
                }}
                style={{
                  backgroundColor: 'var(--surface-card)',
                  display: 'flex',
                  flexDirection: 'column',
                  cursor: 'pointer',
                  position: 'relative',
                  border: '1px solid var(--border-color)',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease',
                }}
              >
                <CardContent style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  {/* Top Bar */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: 'var(--positive-subtle)',
                          color: 'var(--positive-emerald)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <PiggyBank size={20} />
                      </div>
                      <span style={{ fontWeight: 600, fontSize: '1.0625rem', color: 'var(--ink-primary)' }}>
                        {goal.name}
                      </span>
                    </div>

                    {progress.isCompleted ? (
                      <Badge variant="income" icon={<CheckCircle2 size={12} />}>
                        Target Achieved!
                      </Badge>
                    ) : (
                      <Badge variant="info">{progress.percentage}% Saved</Badge>
                    )}
                  </div>

                  {/* Amounts */}
                  <div style={{ margin: '12px 0 8px 0' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--ink-primary)' }}>
                      {formatMinorToMajor(goal.currentSavedMinor, currentCurrency.code)}
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--ink-muted)', marginTop: '2px' }}>
                      Target: {formatMinorToMajor(goal.targetMinor, currentCurrency.code)}
                      {!progress.isCompleted && (
                        <span> ({formatMinorToMajor(progress.remainingMinor, currentCurrency.code)} needed)</span>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div
                    style={{
                      height: '8px',
                      borderRadius: '4px',
                      backgroundColor: 'var(--bg-app)',
                      overflow: 'hidden',
                      margin: '12px 0',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${progress.percentage}%`,
                        backgroundColor: progress.isCompleted ? 'var(--positive-emerald)' : 'var(--primary-brand)',
                        borderRadius: '4px',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>

                  {goal.targetDateLocal && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--ink-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '16px' }}>
                      <Calendar size={12} /> Target Date: {formatDateLocalDisplay(goal.targetDateLocal)}
                    </div>
                  )}

                  {/* Actions Footer */}
                  <div
                    style={{
                      marginTop: 'auto',
                      paddingTop: '16px',
                      borderTop: '1px solid var(--border-color)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        openSavingsContributionModal(goal);
                      }}
                      leftIcon={<Plus size={14} />}
                    >
                      Deposit
                    </Button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          openSavingsModal(goal);
                        }}
                        title="Edit goal"
                      >
                        <Edit3 size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteGoal(goal.id, goal.name);
                        }}
                        title="Delete goal"
                        style={{ color: 'var(--negative-crimson)' }}
                      >
                        <Trash2 size={16} />
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
  );
};
