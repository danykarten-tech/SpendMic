import React, { useState, useEffect, useCallback } from 'react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Input } from '../ui/Input';
import { EmptyState } from '../ui/EmptyState';
import { useApp } from '../../context/AppContext';
import { useToast } from '../ui/Toast';
import { SavingsGoal, SavingsContribution } from '../../domain/types';
import {
  formatMinorToMajor,
  formatDateLocalDisplay,
  parseAmountToMinor,
} from '../../domain/moneyAndDate';
import {
  PiggyBank,
  Plus,
  Edit3,
  Trash2,
  Calendar,
  CheckCircle2,
  Clock,
  TrendingUp,
  Receipt,
  AlertTriangle,
} from 'lucide-react';

interface SavingsGoalDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  goal: SavingsGoal | null;
  onOpenDeposit: (goal: SavingsGoal) => void;
  onOpenEditGoal: (goal: SavingsGoal) => void;
}

export const SavingsGoalDetailsModal: React.FC<SavingsGoalDetailsModalProps> = ({
  isOpen,
  onClose,
  goal,
  onOpenDeposit,
  onOpenEditGoal,
}) => {
  const {
    currentCurrency,
    currencySymbol,
    getSavingsContributions,
    deleteSavingsContribution,
    updateSavingsContribution,
    deleteSavingsGoal,
  } = useApp();
  const { showToast } = useToast();

  const [contributions, setContributions] = useState<SavingsContribution[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);

  // Correction / Edit deposit state
  const [editingContrib, setEditingContrib] = useState<SavingsContribution | null>(null);
  const [editAmountInput, setEditAmountInput] = useState<string>('');
  const [editNoteInput, setEditNoteInput] = useState<string>('');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState<boolean>(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Deletion confirmation state
  const [deletingContrib, setDeletingContrib] = useState<SavingsContribution | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const fetchHistory = useCallback(async () => {
    if (!goal) return;
    setIsLoadingHistory(true);
    try {
      const list = await getSavingsContributions(goal.id);
      setContributions(list);
    } catch (err) {
      console.error('Failed to load savings history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [goal, getSavingsContributions]);

  useEffect(() => {
    if (isOpen && goal) {
      fetchHistory();
      setEditingContrib(null);
      setDeletingContrib(null);
      setEditError(null);
    } else {
      setContributions([]);
    }
  }, [isOpen, goal?.id, goal?.currentSavedMinor, fetchHistory]);

  if (!goal) return null;

  const percentage = Math.min(
    100,
    Math.round((goal.currentSavedMinor / Math.max(1, goal.targetMinor)) * 100)
  );
  const isCompleted = goal.currentSavedMinor >= goal.targetMinor;
  const remainingMinor = Math.max(0, goal.targetMinor - goal.currentSavedMinor);

  const handleDeleteGoal = async () => {
    if (!window.confirm(`Are you sure you want to delete savings goal "${goal.name}" and all its deposit history?`)) {
      return;
    }
    try {
      await deleteSavingsGoal(goal.id);
      showToast({
        type: 'success',
        title: 'Goal Deleted',
        description: `Savings goal "${goal.name}" has been removed.`,
      });
      onClose();
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Error',
        description: 'Failed to delete savings goal.',
      });
    }
  };

  const handleStartEdit = (contrib: SavingsContribution) => {
    setEditingContrib(contrib);
    setEditAmountInput((contrib.amountMinor / 100).toFixed(2));
    setEditNoteInput(contrib.note || '');
    setEditError(null);
  };

  const handleCancelEdit = () => {
    setEditingContrib(null);
    setEditError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContrib) return;
    setEditError(null);

    let minor = 0;
    try {
      minor = parseAmountToMinor(editAmountInput, currentCurrency.code);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Invalid amount.');
      return;
    }

    if (minor <= 0) {
      setEditError('Contribution amount must be greater than zero.');
      return;
    }

    setIsSubmittingEdit(true);
    try {
      await updateSavingsContribution(
        editingContrib.id,
        minor,
        editNoteInput.trim() || undefined
      );
      showToast({
        type: 'success',
        title: 'Deposit Updated',
        description: `Corrected deposit amount to ${formatMinorToMajor(minor, currentCurrency.code)}.`,
      });
      setEditingContrib(null);
      await fetchHistory();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to update deposit.');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleConfirmDeleteContrib = async () => {
    if (!deletingContrib) return;
    setIsDeleting(true);
    try {
      await deleteSavingsContribution(deletingContrib.id);
      showToast({
        type: 'success',
        title: 'Deposit Removed',
        description: `Removed deposit of ${formatMinorToMajor(deletingContrib.amountMinor, currentCurrency.code)}.`,
      });
      setDeletingContrib(null);
      await fetchHistory();
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Error',
        description: 'Failed to remove deposit.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={goal.name}
      subtitle="Savings Goal Details & Deposit History"
      maxWidth="620px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Progress & Milestone Overview Card */}
        <div
          style={{
            backgroundColor: 'var(--bg-app)',
            borderRadius: 'var(--radius-md)',
            padding: '18px 20px',
            border: '1px solid var(--border-color)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--positive-subtle)',
                  color: 'var(--positive-emerald)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <PiggyBank size={22} />
              </div>
              <div>
                <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--ink-primary)' }}>
                  {goal.name}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--ink-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={12} /> Created: {formatDateLocalDisplay(goal.createdAt.substring(0, 10))}
                </div>
              </div>
            </div>

            {isCompleted ? (
              <Badge variant="income" icon={<CheckCircle2 size={12} />}>
                Goal Achieved!
              </Badge>
            ) : (
              <Badge variant="info">{percentage}% Completed</Badge>
            )}
          </div>

          {/* Amounts Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: '12px',
              margin: '12px 0',
            }}
          >
            <div style={{ backgroundColor: 'var(--surface-card)', padding: '12px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.6875rem', color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Saved So Far
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--positive-emerald)', marginTop: '2px' }}>
                {formatMinorToMajor(goal.currentSavedMinor, currentCurrency.code)}
              </div>
            </div>

            <div style={{ backgroundColor: 'var(--surface-card)', padding: '12px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.6875rem', color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Target Amount
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--ink-primary)', marginTop: '2px' }}>
                {formatMinorToMajor(goal.targetMinor, currentCurrency.code)}
              </div>
            </div>

            <div style={{ backgroundColor: 'var(--surface-card)', padding: '12px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.6875rem', color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Remaining
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: isCompleted ? 'var(--positive-emerald)' : 'var(--ink-secondary)', marginTop: '2px' }}>
                {isCompleted ? 'None' : formatMinorToMajor(remainingMinor, currentCurrency.code)}
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div
            style={{
              height: '10px',
              borderRadius: '5px',
              backgroundColor: 'rgba(0,0,0,0.06)',
              overflow: 'hidden',
              marginTop: '10px',
              marginBottom: '6px',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${percentage}%`,
                backgroundColor: isCompleted ? 'var(--positive-emerald)' : 'var(--primary-brand)',
                borderRadius: '5px',
                transition: 'width 0.4s ease',
              }}
            />
          </div>

          {goal.targetDateLocal && (
            <div style={{ fontSize: '0.75rem', color: 'var(--ink-muted)', display: 'flex', alignItems: 'center', gap: '5px', marginTop: '8px' }}>
              <Calendar size={13} /> Target Date: {formatDateLocalDisplay(goal.targetDateLocal)}
            </div>
          )}
        </div>

        {/* Primary Goal Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                onClose();
                onOpenDeposit(goal);
              }}
              leftIcon={<Plus size={15} />}
            >
              Deposit
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                onClose();
                onOpenEditGoal(goal);
              }}
              leftIcon={<Edit3 size={15} />}
            >
              Edit Goal
            </Button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleDeleteGoal}
            leftIcon={<Trash2 size={15} />}
            style={{ color: 'var(--negative-crimson)' }}
          >
            Delete Goal
          </Button>
        </div>

        {/* Edit / Correct Deposit Inline Form */}
        {editingContrib && (
          <form
            onSubmit={handleSaveEdit}
            style={{
              padding: '16px',
              backgroundColor: 'var(--surface-elevated)',
              borderRadius: 'var(--radius-md)',
              border: '2px solid var(--primary-brand)',
            }}
          >
            <div style={{ fontWeight: 600, fontSize: '0.9375rem', marginBottom: '12px', color: 'var(--ink-primary)' }}>
              Correct Deposit Entry
            </div>

            {editError && (
              <div
                style={{
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--negative-bg)',
                  color: 'var(--negative-crimson)',
                  fontSize: '0.8125rem',
                  marginBottom: '12px',
                }}
              >
                {editError}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Input
                id="edit-contrib-amount"
                label={`Deposit Amount (${currencySymbol})`}
                type="number"
                step="0.01"
                min="0.01"
                value={editAmountInput}
                onChange={(e) => setEditAmountInput(e.target.value)}
                required
                autoFocus
              />
              <Input
                id="edit-contrib-note"
                label="Note / Reference"
                placeholder="Deposit memo or reference"
                value={editNoteInput}
                onChange={(e) => setEditNoteInput(e.target.value)}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                <Button type="button" variant="ghost" size="sm" onClick={handleCancelEdit}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" disabled={isSubmittingEdit}>
                  {isSubmittingEdit ? 'Saving...' : 'Save Correction'}
                </Button>
              </div>
            </div>
          </form>
        )}

        {/* Delete Deposit Confirmation Box */}
        {deletingContrib && (
          <div
            style={{
              padding: '16px',
              backgroundColor: 'var(--negative-bg)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--negative-border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--negative-crimson)', fontWeight: 600 }}>
              <AlertTriangle size={18} />
              <span>Confirm Removing Deposit</span>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--ink-secondary)', margin: 0 }}>
              Are you sure you want to remove the deposit of{' '}
              <strong>{formatMinorToMajor(deletingContrib.amountMinor, currentCurrency.code)}</strong> made on{' '}
              {formatDateLocalDisplay(deletingContrib.dateLocal)}? The goal’s saved total will be automatically recalculated.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeletingContrib(null)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmDeleteContrib}
                disabled={isDeleting}
                style={{ backgroundColor: 'var(--negative-crimson)', borderColor: 'var(--negative-crimson)' }}
              >
                {isDeleting ? 'Removing...' : 'Remove Deposit'}
              </Button>
            </div>
          </div>
        )}

        {/* Complete Deposit History Section */}
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Receipt size={18} style={{ color: 'var(--ink-secondary)' }} />
              <span style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--ink-primary)' }}>
                Deposit History
              </span>
              <span
                style={{
                  fontSize: '0.75rem',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--bg-app)',
                  color: 'var(--ink-muted)',
                  fontWeight: 500,
                }}
              >
                {contributions.length}
              </span>
            </div>
          </div>

          {isLoadingHistory ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--ink-muted)', fontSize: '0.875rem' }}>
              Loading deposit records...
            </div>
          ) : contributions.length === 0 ? (
            <div
              style={{
                backgroundColor: 'var(--bg-app)',
                borderRadius: 'var(--radius-md)',
                padding: '24px',
                border: '1px dashed var(--border-color)',
                textAlign: 'center',
              }}
            >
              <EmptyState
                title="No Deposit History"
                description="No contributions have been recorded yet for this savings goal."
                icon={<TrendingUp size={28} />}
                action={
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      onClose();
                      onOpenDeposit(goal);
                    }}
                    leftIcon={<Plus size={14} />}
                  >
                    Make First Deposit
                  </Button>
                }
              />
            </div>
          ) : (
            <div
              style={{
                maxHeight: '260px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                paddingRight: '4px',
              }}
            >
              {contributions.map((c) => (
                <div
                  key={c.id}
                  style={{
                    backgroundColor: 'var(--surface-card)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '12px 14px',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--positive-emerald)' }}>
                        +{formatMinorToMajor(c.amountMinor, currentCurrency.code)}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--ink-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <Calendar size={11} /> {formatDateLocalDisplay(c.dateLocal)}
                      </span>
                    </div>
                    {c.note && (
                      <div
                        style={{
                          fontSize: '0.75rem',
                          color: 'var(--ink-secondary)',
                          marginTop: '2px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                        title={c.note}
                      >
                        {c.note}
                      </div>
                    )}
                  </div>

                  {/* Individual Deposit Action Controls */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleStartEdit(c)}
                      title="Correct this deposit"
                      style={{ padding: '6px' }}
                    >
                      <Edit3 size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeletingContrib(c)}
                      title="Remove this deposit"
                      style={{ padding: '6px', color: 'var(--negative-crimson)' }}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Close Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
