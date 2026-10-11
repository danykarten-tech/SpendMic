import React, { useState, useEffect } from 'react';
import { Dialog } from '../ui/Dialog';
import { Input } from '../ui/Input';
import { Select, SelectOption } from '../ui/Select';
import { Button } from '../ui/Button';
import { useApp } from '../../context/AppContext';
import { useToast } from '../ui/Toast';
import { RecurringTemplate, RecurrenceFrequency, RecurringTemplateStatus, TransactionType } from '../../domain/types';
import { parseAmountToMinor, getTodayLocalDateString } from '../../domain/moneyAndDate';
import { Repeat, ShieldAlert, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

interface RecurringTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  templateToEdit?: RecurringTemplate | null;
}

export const RecurringTemplateModal: React.FC<RecurringTemplateModalProps> = ({
  isOpen,
  onClose,
  templateToEdit,
}) => {
  const { categories, currencySymbol, currentCurrency, saveRecurringTemplate } = useApp();
  const { showToast } = useToast();

  const [type, setType] = useState<TransactionType>('expense');
  const [amountInput, setAmountInput] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [frequency, setFrequency] = useState<RecurrenceFrequency>('monthly');
  const [startDateLocal, setStartDateLocal] = useState<string>(() => getTodayLocalDateString());
  const [endDateLocal, setEndDateLocal] = useState<string>('');
  const [status, setStatus] = useState<RecurringTemplateStatus>('active');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const activeCategories = categories.filter((c) => c.type === type && !c.isArchived);

  const frequencyOptions: SelectOption[] = [
    { value: 'weekly', label: 'Weekly (+7 days)' },
    { value: 'monthly', label: 'Monthly (Clamped 31st)' },
    { value: 'yearly', label: 'Yearly (Annual)' },
  ];

  const categoryOptions: SelectOption[] = activeCategories.map((c) => ({
    value: c.id,
    label: c.name,
  }));

  const statusOptions: SelectOption[] = [
    { value: 'active', label: 'Active (Generates Due Reminders)' },
    { value: 'paused', label: 'Paused (Temporarily On Hold)' },
    { value: 'archived', label: 'Archived (Hidden from active list)' },
  ];

  useEffect(() => {
    if (templateToEdit) {
      setType(templateToEdit.type);
      setAmountInput((templateToEdit.amountMinor / 100).toFixed(2));
      setCategoryId(templateToEdit.categoryId);
      setNote(templateToEdit.note || '');
      setFrequency(templateToEdit.frequency);
      setStartDateLocal(templateToEdit.startDateLocal);
      setEndDateLocal(templateToEdit.endDateLocal || '');
      setStatus(templateToEdit.status);
    } else {
      setType('expense');
      setAmountInput('');
      setCategoryId('');
      setNote('');
      setFrequency('monthly');
      setStartDateLocal(getTodayLocalDateString());
      setEndDateLocal('');
      setStatus('active');
    }
    setErrorMessage(null);
  }, [templateToEdit, isOpen]);

  useEffect(() => {
    if (!categoryId && activeCategories.length > 0) {
      setCategoryId(activeCategories[0].id);
    }
  }, [type, activeCategories, categoryId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    let minor = 0;
    try {
      minor = parseAmountToMinor(amountInput, currentCurrency.code);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Invalid amount.');
      return;
    }

    if (minor <= 0) {
      setErrorMessage('Please enter a valid amount greater than zero.');
      return;
    }

    if (!categoryId) {
      setErrorMessage('Please select a category for this recurring schedule.');
      return;
    }

    if (!startDateLocal) {
      setErrorMessage('Please specify a start date.');
      return;
    }

    if (endDateLocal && endDateLocal < startDateLocal) {
      setErrorMessage('End date cannot be earlier than start date.');
      return;
    }

    setIsSubmitting(true);
    try {
      const preferredDay = frequency === 'monthly' ? parseInt(startDateLocal.split('-')[2], 10) : undefined;
      const nextDueDateLocal = templateToEdit ? templateToEdit.nextDueDateLocal : startDateLocal;

      await saveRecurringTemplate(
        {
          type,
          amountMinor: minor,
          currency: currentCurrency.code,
          categoryId,
          note: note.trim() || undefined,
          frequency,
          startDateLocal,
          endDateLocal: endDateLocal || undefined,
          nextDueDateLocal,
          preferredDay,
          status,
        },
        templateToEdit?.id
      );

      showToast({
        type: 'success',
        title: templateToEdit ? 'Template Updated' : 'Recurring Template Created',
        description: `Scheduled ${frequency} ${type} for ${currencySymbol}${(minor / 100).toFixed(2)}.`,
      });

      onClose();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to save recurring template.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={templateToEdit ? 'Edit Recurring Template' : 'New Recurring Template'}
      subtitle="Set up automatic reminders and schedule due transactions for weekly, monthly, or annual payments."
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

        {/* Schedule Type Switcher */}
        <div style={{ marginBottom: '16px' }}>
          <label className="form-label" style={{ marginBottom: '8px' }}>
            Schedule Type <span style={{ color: 'var(--negative-crimson)' }}>*</span>
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setType('expense')}
              className={`btn ${type === 'expense' ? 'btn-danger' : 'btn-secondary'}`}
              style={{ justifyContent: 'center' }}
            >
              <ArrowDownLeft size={16} />
              Expense Schedule
            </button>
            <button
              type="button"
              onClick={() => setType('income')}
              className={`btn ${type === 'income' ? 'btn-primary' : 'btn-secondary'}`}
              style={{
                justifyContent: 'center',
                backgroundColor: type === 'income' ? 'var(--positive-emerald)' : undefined,
                borderColor: type === 'income' ? 'var(--positive-emerald)' : undefined,
              }}
            >
              <ArrowUpRight size={16} />
              Income Schedule
            </button>
          </div>
        </div>

        {/* Amount Input */}
        <Input
          id="tpl-amount"
          label={`Scheduled Amount (${currencySymbol})`}
          type="number"
          step="0.01"
          min="0.01"
          placeholder="0.00"
          value={amountInput}
          onChange={(e) => setAmountInput(e.target.value)}
          leftIcon={<span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{currencySymbol}</span>}
          required
        />

        {/* Frequency & Category Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <Select
            id="tpl-frequency"
            label="Frequency"
            value={frequency}
            options={frequencyOptions}
            onChange={(e) => setFrequency(e.target.value as RecurrenceFrequency)}
          />

          <Select
            id="tpl-category"
            label="Category"
            value={categoryId}
            options={categoryOptions}
            onChange={(e) => setCategoryId(e.target.value)}
            required
          />
        </div>

        {/* Dates Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '16px' }}>
          <Input
            id="tpl-start-date"
            label="Start Date"
            type="date"
            value={startDateLocal}
            onChange={(e) => setStartDateLocal(e.target.value)}
            required
          />

          <Input
            id="tpl-end-date"
            label="End Date (Optional)"
            type="date"
            value={endDateLocal}
            onChange={(e) => setEndDateLocal(e.target.value)}
          />
        </div>

        {/* Note Input */}
        <Input
          id="tpl-note"
          label="Note / Purpose (Optional)"
          type="text"
          placeholder="e.g. Broadband internet, Gym membership, Rent"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        {/* Status Toggle (if editing) */}
        {templateToEdit && (
          <Select
            id="tpl-status"
            label="Schedule Status"
            value={status}
            options={statusOptions}
            onChange={(e) => setStatus(e.target.value as RecurringTemplateStatus)}
          />
        )}

        {/* PWA Limitation Notice */}
        <div
          style={{
            padding: '12px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--primary-subtle)',
            border: '1px solid var(--primary-border)',
            fontSize: '0.75rem',
            color: 'var(--ink-secondary)',
            marginTop: '16px',
            lineHeight: '1.5',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: 'var(--primary-brand)', marginBottom: '4px' }}>
            <Repeat size={14} />
            <span>PWA Reminder Notice</span>
          </div>
          Background reminders may not run reliably in every PWA environment due to mobile OS background execution limits. Occurrences are verified when you open the app.
        </div>

        {/* Modal Controls */}
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
            {templateToEdit ? 'Update Template' : 'Save Template'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};

