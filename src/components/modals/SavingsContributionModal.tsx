import React, { useState, useEffect } from 'react';
import { Dialog } from '../ui/Dialog';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useApp } from '../../context/AppContext';
import { useToast } from '../ui/Toast';
import { SavingsGoal } from '../../domain/types';
import { parseAmountToMinor } from '../../domain/moneyAndDate';
import { ShieldAlert, Plus } from 'lucide-react';

interface SavingsContributionModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetGoal: SavingsGoal | null;
}

export const SavingsContributionModal: React.FC<SavingsContributionModalProps> = ({
  isOpen,
  onClose,
  targetGoal,
}) => {
  const { currencySymbol, currentCurrency, addSavingsContribution } = useApp();
  const { showToast } = useToast();

  const [amountInput, setAmountInput] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setAmountInput('');
    setNote('');
    setErrorMessage(null);
  }, [targetGoal, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetGoal) return;

    setErrorMessage(null);

    let minor = 0;
    try {
      minor = parseAmountToMinor(amountInput, currentCurrency.code);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Invalid contribution amount.');
      return;
    }

    if (minor <= 0) {
      setErrorMessage('Contribution amount must be greater than zero.');
      return;
    }

    setIsSubmitting(true);
    try {
      await addSavingsContribution(targetGoal.id, minor, note.trim() || undefined);

      showToast({
        type: 'success',
        title: 'Contribution Recorded',
        description: `Added ${currencySymbol}${(minor / 100).toFixed(2)} to "${targetGoal.name}".`,
      });

      onClose();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to record contribution.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen && !!targetGoal}
      onClose={onClose}
      title={`Deposit Savings: ${targetGoal?.name || ''}`}
      subtitle="Record money saved towards this goal."
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

        {/* Deposit Amount Input */}
        <Input
          id="contrib-amount"
          label={`Deposit Amount (${currencySymbol})`}
          type="number"
          step="0.01"
          min="0.01"
          placeholder="0.00"
          value={amountInput}
          onChange={(e) => setAmountInput(e.target.value)}
          leftIcon={<span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{currencySymbol}</span>}
          required
          autoFocus
        />

        {/* Note */}
        <Input
          id="contrib-note"
          label="Note / Deposit Memo (Optional)"
          type="text"
          placeholder="e.g. Monthly transfer, Cashback bonus"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

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
          <Button type="submit" variant="primary" isLoading={isSubmitting} leftIcon={<Plus size={16} />}>
            Add Deposit
          </Button>
        </div>
      </form>
    </Dialog>
  );
};

