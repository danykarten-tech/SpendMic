import React, { useState, useEffect } from 'react';
import { Dialog } from '../ui/Dialog';
import { Input } from '../ui/Input';
import { Select, SelectOption } from '../ui/Select';
import { Button } from '../ui/Button';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../components/ui/Toast';
import { Bill, BillFrequency } from '../../domain/types';
import { parseAmountToMinor, getTodayLocalDateString } from '../../domain/moneyAndDate';
import { Calendar, ShieldAlert } from 'lucide-react';

interface BillModalProps {
  isOpen: boolean;
  onClose: () => void;
  billToEdit?: Bill | null;
}

export const BillModal: React.FC<BillModalProps> = ({
  isOpen,
  onClose,
  billToEdit,
}) => {
  const { categories, currencySymbol, currentCurrency, saveBill } = useApp();
  const { showToast } = useToast();

  const [name, setName] = useState<string>('');
  const [amountInput, setAmountInput] = useState<string>('');
  const [dueDateLocal, setDueDateLocal] = useState<string>(() => getTodayLocalDateString());
  const [frequency, setFrequency] = useState<BillFrequency>('monthly');
  const [categoryId, setCategoryId] = useState<string>('');
  const [note, setNote] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const expenseCategories = categories.filter((c) => c.type === 'expense' && !c.isArchived);
  const categoryOptions: SelectOption[] = expenseCategories.map((c) => ({
    value: c.id,
    label: c.name,
  }));

  const frequencyOptions: SelectOption[] = [
    { value: 'one_off', label: 'One-off (Single Due Date)' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'yearly', label: 'Yearly' },
  ];

  useEffect(() => {
    if (billToEdit) {
      setName(billToEdit.name);
      setAmountInput((billToEdit.amountMinor / 100).toFixed(2));
      setDueDateLocal(billToEdit.dueDateLocal);
      setFrequency(billToEdit.frequency);
      setCategoryId(billToEdit.categoryId);
      setNote(billToEdit.note || '');
    } else {
      setName('');
      setAmountInput('');
      setDueDateLocal(getTodayLocalDateString());
      setFrequency('monthly');
      setCategoryId(expenseCategories.length > 0 ? expenseCategories[0].id : '');
      setNote('');
    }
    setErrorMessage(null);
  }, [billToEdit, isOpen]);

  useEffect(() => {
    if (!categoryId && expenseCategories.length > 0) {
      setCategoryId(expenseCategories[0].id);
    }
  }, [expenseCategories, categoryId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage('Bill name is required.');
      return;
    }

    let minor = 0;
    try {
      minor = parseAmountToMinor(amountInput, currentCurrency.code);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Invalid amount.');
      return;
    }

    if (minor <= 0) {
      setErrorMessage('Please enter an amount greater than zero.');
      return;
    }

    if (!categoryId) {
      setErrorMessage('Please select a category for this bill.');
      return;
    }

    if (!dueDateLocal) {
      setErrorMessage('Due date is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      await saveBill(
        {
          name: name.trim(),
          amountMinor: minor,
          currency: currentCurrency.code,
          dueDateLocal,
          frequency,
          categoryId,
          note: note.trim() || undefined,
          isPaid: billToEdit ? billToEdit.isPaid : false,
          paidDateLocal: billToEdit?.paidDateLocal,
          paidTransactionId: billToEdit?.paidTransactionId,
        },
        billToEdit?.id
      );

      showToast({
        type: 'success',
        title: billToEdit ? 'Bill Updated' : 'Bill Saved',
        description: `Successfully saved "${name}" due ${dueDateLocal}.`,
      });

      onClose();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to save bill.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={billToEdit ? 'Edit Bill' : 'Track New Bill'}
      subtitle="Track upcoming dues and mark them paid to prevent duplicate expenses."
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

        {/* Bill Name */}
        <Input
          id="bill-name"
          label="Bill Name"
          type="text"
          placeholder="e.g. Electric Utility, WiFi Internet"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
        />

        {/* Amount Input */}
        <Input
          id="bill-amount"
          label={`Amount Due (${currencySymbol})`}
          type="number"
          step="0.01"
          min="0.01"
          placeholder="0.00"
          value={amountInput}
          onChange={(e) => setAmountInput(e.target.value)}
          leftIcon={<span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{currencySymbol}</span>}
          required
        />

        {/* Due Date & Frequency Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <Input
            id="bill-due-date"
            label="Due Date"
            type="date"
            value={dueDateLocal}
            onChange={(e) => setDueDateLocal(e.target.value)}
            leftIcon={<Calendar size={16} />}
            required
          />

          <Select
            id="bill-frequency"
            label="Recurrence Frequency"
            value={frequency}
            options={frequencyOptions}
            onChange={(e) => setFrequency(e.target.value as BillFrequency)}
          />
        </div>

        {/* Category */}
        <Select
          id="bill-category"
          label="Category"
          value={categoryId}
          options={categoryOptions}
          onChange={(e) => setCategoryId(e.target.value)}
          required
        />

        {/* Note */}
        <Input
          id="bill-note"
          label="Note (Optional)"
          type="text"
          placeholder="e.g. Invoice #9842"
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
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            {billToEdit ? 'Save Changes' : 'Add Bill'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};

