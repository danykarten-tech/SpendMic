import React, { useState, useEffect } from 'react';
import { Dialog } from '../ui/Dialog';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { useApp } from '../../context/AppContext';
import { useToast } from '../ui/Toast';
import { TransactionType } from '../../domain/types';
import { parseAmountToMinor, formatMinorToDecimalString, getTodayLocalDateString, getCurrentLocalTimeString } from '../../domain/moneyAndDate';
import { PlusCircle, Calendar, Clock, FileText, CheckCircle2, Trash2 } from 'lucide-react';

import { BUILT_IN_CATEGORIES } from '../../domain/categoriesData';

export const AddTransactionModal: React.FC = () => {
  const {
    isAddModalOpen,
    closeAddModal,
    editingTransaction,
    saveTransaction,
    deleteTransaction,
    categories,
    currentCurrency,
  } = useApp();
  const { showToast } = useToast();

  const [type, setType] = useState<TransactionType>('expense');
  const [amountInput, setAmountInput] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [dateLocal, setDateLocal] = useState<string>(getTodayLocalDateString());
  const [timeLocal, setTimeLocal] = useState<string>(getCurrentLocalTimeString());
  const [note, setNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState<boolean>(false);
  const [errors, setErrors] = useState<{ amount?: string; category?: string; form?: string }>({});

  // Active categories for current type (with fallback to BUILT_IN_CATEGORIES if empty)
  const allCategories = categories.length > 0 ? categories : BUILT_IN_CATEGORIES;
  const activeCategories = allCategories.filter((c) => c.type === type && !c.isArchived);

  // Initialize or populate form when modal opens / editingTransaction changes
  useEffect(() => {
    if (!isAddModalOpen) return;
    if (editingTransaction) {
      setType(editingTransaction.type);
      setAmountInput(formatMinorToDecimalString(editingTransaction.amountMinor, editingTransaction.currency));
      setCategoryId(editingTransaction.categoryId);
      setDateLocal(editingTransaction.dateLocal);
      setTimeLocal(editingTransaction.dateLocal === getTodayLocalDateString() ? (editingTransaction.timeLocal || getCurrentLocalTimeString()) : '');
      setNote(editingTransaction.note || '');
    } else {
      setType('expense');
      setAmountInput('');
      setDateLocal(getTodayLocalDateString());
      setTimeLocal(getCurrentLocalTimeString());
      setNote('');
      const defaultExpenseCat = allCategories.find((c) => c.type === 'expense' && !c.isArchived);
      setCategoryId(defaultExpenseCat ? defaultExpenseCat.id : '');
    }
    setErrors({});
  }, [editingTransaction, isAddModalOpen, allCategories]);

  // Ensure valid category is selected when active categories populate
  useEffect(() => {
    if (!categoryId && activeCategories.length > 0) {
      setCategoryId(activeCategories[0].id);
    }
  }, [categoryId, activeCategories]);

  // Update default category when type toggle changes (if current selection doesn't match new type)
  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    const validCategory = allCategories.find((c) => c.type === newType && !c.isArchived);
    if (validCategory) {
      setCategoryId(validCategory.id);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setErrors({});

    // Validate Amount
    let amountMinor: number;
    try {
      amountMinor = parseAmountToMinor(amountInput, currentCurrency.code);
    } catch (err) {
      setErrors({ amount: err instanceof Error ? err.message : 'Invalid amount entered.' });
      return;
    }

    // Validate Category
    const selectedCategoryId = categoryId || (activeCategories.length > 0 ? activeCategories[0].id : '');
    if (!selectedCategoryId) {
      setErrors({ category: 'Please select a category.' });
      return;
    }

    const isToday = dateLocal === getTodayLocalDateString();
    const finalTime = isToday ? (timeLocal || getCurrentLocalTimeString()) : undefined;

    setIsSubmitting(true);
    try {
      await saveTransaction(
        {
          type,
          amountMinor,
          currency: currentCurrency.code,
          dateLocal,
          timeLocal: finalTime,
          categoryId: selectedCategoryId,
          note: note.trim() || undefined,
        },
        editingTransaction ? editingTransaction.id : undefined
      );

      showToast({
        type: 'success',
        title: editingTransaction ? 'Transaction Updated' : 'Transaction Saved',
        description: `Successfully saved ${type} to local IndexedDB.`,
      });

      closeAddModal();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save transaction to storage.';
      setErrors({ form: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!editingTransaction) return;
    setIsDeleting(true);
    try {
      await deleteTransaction(editingTransaction.id);
      showToast({
        type: 'success',
        title: 'Transaction Deleted',
        description: 'Transaction record was permanently removed.',
      });
      setIsConfirmDeleteOpen(false);
      closeAddModal();
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Delete Error',
        description: err instanceof Error ? err.message : 'Failed to delete record.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const categoryOptions = activeCategories.map((c) => ({
    value: c.id,
    label: c.name,
  }));

  return (
    <>
      <Dialog
        isOpen={isAddModalOpen && !isConfirmDeleteOpen}
        onClose={closeAddModal}
        title={editingTransaction ? 'Edit Transaction' : 'Add Transaction'}
        subtitle={editingTransaction ? 'Update existing local transaction record.' : 'Record a new manual income or expense locally.'}
      >
        <form onSubmit={handleSubmit} noValidate>
          {errors.form && (
            <div
              style={{
                backgroundColor: 'var(--negative-bg)',
                color: 'var(--negative-crimson)',
                padding: '12px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.875rem',
                marginBottom: '16px',
                border: '1px solid var(--negative-border)',
              }}
              role="alert"
            >
              {errors.form}
            </div>
          )}

          {/* Transaction Type Selector */}
          <div style={{ marginBottom: '16px' }}>
            <label className="form-label" style={{ marginBottom: '8px' }}>
              Transaction Type <span style={{ color: 'var(--negative-crimson)' }}>*</span>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button
                type="button"
                onClick={() => handleTypeChange('expense')}
                className={`btn ${type === 'expense' ? 'btn-danger' : 'btn-secondary'}`}
                style={{ justifyContent: 'center' }}
              >
                Expense
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('income')}
                className={`btn ${type === 'income' ? 'btn-primary' : 'btn-secondary'}`}
                style={{
                  justifyContent: 'center',
                  backgroundColor: type === 'income' ? 'var(--positive-emerald)' : undefined,
                  borderColor: type === 'income' ? 'var(--positive-emerald)' : undefined,
                }}
              >
                Income
              </button>
            </div>
          </div>

          {/* Amount Input */}
          <Input
            id="tx-amount"
            label={`Amount (${currentCurrency.code})`}
            type="number"
            step="any"
            placeholder="0.00"
            value={amountInput}
            onChange={(e) => setAmountInput(e.target.value)}
            error={errors.amount}
            helperText="Enter positive numeric amount (e.g. 10.50)"
            leftIcon={<span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{currentCurrency.symbol}</span>}
            required
            autoFocus
          />

          {/* Category Select */}
          <Select
            id="tx-category"
            label="Category"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            options={categoryOptions}
            error={errors.category}
            required
          />

          {/* Local Date & Time (Side-by-side if Today) */}
          <div style={{ display: 'grid', gridTemplateColumns: dateLocal === getTodayLocalDateString() ? '1fr 1fr' : '1fr', gap: '12px' }}>
            <Input
              id="tx-date"
              label="Date"
              type="date"
              value={dateLocal}
              onChange={(e) => {
                const newDate = e.target.value;
                setDateLocal(newDate);
                if (newDate === getTodayLocalDateString() && !timeLocal) {
                  setTimeLocal(getCurrentLocalTimeString());
                }
              }}
              leftIcon={<Calendar size={16} />}
              helperText={dateLocal === getTodayLocalDateString() ? 'Today' : "Time is only recorded for today's entries"}
              required
            />
            {dateLocal === getTodayLocalDateString() && (
              <Input
                id="tx-time"
                label="Time (Today only)"
                type="time"
                value={timeLocal}
                onChange={(e) => setTimeLocal(e.target.value)}
                leftIcon={<Clock size={16} />}
                helperText="Recorded for today's entry"
              />
            )}
          </div>

          {/* Note Input */}
          <Input
            id="tx-note"
            label="Note / Description (Optional)"
            type="text"
            placeholder="e.g. Weekly grocery shopping"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            leftIcon={<FileText size={16} />}
          />

          {/* Form Actions Footer */}
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
            {editingTransaction && (
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={() => setIsConfirmDeleteOpen(true)}
                leftIcon={<Trash2 size={16} />}
                style={{ marginRight: 'auto' }}
              >
                Delete
              </Button>
            )}
            <Button type="button" variant="ghost" onClick={closeAddModal} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
              leftIcon={editingTransaction ? <CheckCircle2 size={16} /> : <PlusCircle size={16} />}
            >
              {editingTransaction ? 'Save Changes' : 'Save Transaction'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      {editingTransaction && (
        <Dialog
          isOpen={isConfirmDeleteOpen}
          onClose={() => setIsConfirmDeleteOpen(false)}
          title="Delete Transaction?"
          subtitle="Are you sure you want to delete this record?"
          footer={
            <>
              <Button variant="ghost" onClick={() => setIsConfirmDeleteOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleDelete}
                isLoading={isDeleting}
                leftIcon={<Trash2 size={16} />}
              >
                Delete
              </Button>
            </>
          }
        >
          <p style={{ fontSize: '0.875rem', color: 'var(--ink-secondary)', lineHeight: '1.5' }}>
            This will permanently remove the record from your device IndexedDB database.
          </p>
        </Dialog>
      )}
    </>
  );
};
