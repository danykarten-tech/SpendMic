import React, { useState, useEffect } from 'react';
import { Dialog } from '../ui/Dialog';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useApp } from '../../context/AppContext';
import { useToast } from '../ui/Toast';
import { SavingsGoal } from '../../domain/types';
import { parseAmountToMinor } from '../../domain/moneyAndDate';
import { ShieldAlert, PiggyBank } from 'lucide-react';

interface SavingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  goalToEdit?: SavingsGoal | null;
}

export const SavingsModal: React.FC<SavingsModalProps> = ({
  isOpen,
  onClose,
  goalToEdit,
}) => {
  const { currencySymbol, currentCurrency, saveSavingsGoal } = useApp();
  const { showToast } = useToast();

  const [name, setName] = useState<string>('');
  const [targetInput, setTargetInput] = useState<string>('');
  const [targetDateLocal, setTargetDateLocal] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (goalToEdit) {
      setName(goalToEdit.name);
      setTargetInput((goalToEdit.targetMinor / 100).toFixed(2));
      setTargetDateLocal(goalToEdit.targetDateLocal || '');
    } else {
      setName('');
      setTargetInput('');
      setTargetDateLocal('');
    }
    setErrorMessage(null);
  }, [goalToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage('Goal name is required.');
      return;
    }

    let targetMinor = 0;
    try {
      targetMinor = parseAmountToMinor(targetInput, currentCurrency.code);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Invalid target amount.');
      return;
    }

    if (targetMinor <= 0) {
      setErrorMessage('Target amount must be greater than zero.');
      return;
    }

    setIsSubmitting(true);
    try {
      await saveSavingsGoal(
        {
          name: name.trim(),
          targetMinor,
          currentSavedMinor: goalToEdit ? goalToEdit.currentSavedMinor : 0,
          targetDateLocal: targetDateLocal || undefined,
          color: goalToEdit?.color || '#10B981',
          icon: goalToEdit?.icon || 'PiggyBank',
        },
        goalToEdit?.id
      );

      showToast({
        type: 'success',
        title: goalToEdit ? 'Savings Goal Updated' : 'Savings Goal Created',
        description: `Set target of ${currencySymbol}${(targetMinor / 100).toFixed(2)} for "${name}".`,
      });

      onClose();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to save savings goal.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={goalToEdit ? 'Edit Savings Goal' : 'Create Savings Goal'}
      subtitle="Track progress towards your target savings without receiving automated financial advice."
    >
      <form onSubmit={handleSubmit} noValidate>
        {errorMessage && (
          <div
            style={{
              padding: '12px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--negative-bg)',
              color: 'var(--negative-crimson)',
              fontSize: '0.875rem',
              marginBottom: '16px',
              border: '1px solid var(--negative-border)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
            role="alert"
          >
            <ShieldAlert size={16} style={{ flexShrink: 0 }} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Goal Name */}
        <Input
          id="goal-name"
          label="Goal Name"
          type="text"
          placeholder="e.g. Emergency Fund, New Laptop, Vacation"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
        />

        {/* Target Amount Input */}
        <Input
          id="goal-target"
          label={`Target Amount (${currencySymbol})`}
          type="number"
          step="0.01"
          min="0.01"
          placeholder="0.00"
          value={targetInput}
          onChange={(e) => setTargetInput(e.target.value)}
          leftIcon={<span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{currencySymbol}</span>}
          required
        />

        {/* Target Date */}
        <Input
          id="goal-date"
          label="Target Date (Optional)"
          type="date"
          value={targetDateLocal}
          onChange={(e) => setTargetDateLocal(e.target.value)}
        />

        {/* Disclaimer Notice */}
        <div
          style={{
            padding: '12px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--primary-subtle)',
            border: '1px solid var(--primary-border)',
            fontSize: '0.75rem',
            color: 'var(--ink-secondary)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            marginTop: '16px',
            lineHeight: '1.5',
          }}
        >
          <PiggyBank size={18} style={{ color: 'var(--primary-brand)', flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong style={{ display: 'block', color: 'var(--ink-primary)', marginBottom: '4px', fontWeight: 600 }}>
              Track Your Personal Milestones
            </strong>
            This tool records your target savings progress. It does not evaluate investment suitability or offer personalized financial advice.
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '12px',
            marginTop: '24px',
            paddingTop: '16px',
            borderTop: '1px solid var(--border-color)',
          }}
        >
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            {goalToEdit ? 'Save Goal' : 'Create Goal'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};

