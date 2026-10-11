import React, { useState, useEffect } from 'react';
import { Dialog } from '../ui/Dialog';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { useApp } from '../../context/AppContext';
import { useToast } from '../ui/Toast';
import { parseAmountToMinor, formatMinorToDecimalString } from '../../domain/moneyAndDate';
import { formatPeriodKeyDisplay } from '../../domain/budgetAndReport';
import { Target, CheckCircle2, Trash2 } from 'lucide-react';

export const SetBudgetModal: React.FC = () => {
  const {
    isSetBudgetModalOpen,
    closeSetBudgetModal,
    editingBudget,
    budgetPreselectedCategoryId,
    selectedPeriodKey,
    saveBudget,
    deleteBudget,
    categories,
    currentCurrency,
  } = useApp();

  const { showToast } = useToast();

  const [periodKey, setPeriodKey] = useState<string>(selectedPeriodKey);
  const [categoryId, setCategoryId] = useState<string>('');
  const [limitInput, setLimitInput] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState<boolean>(false);
  const [errors, setErrors] = useState<{ limit?: string; form?: string }>({});

  const expenseCategories = categories.filter((c) => c.type === 'expense' && !c.isArchived);

  useEffect(() => {
    if (!isSetBudgetModalOpen) return;

    if (editingBudget) {
      setPeriodKey(editingBudget.periodKey);
      setCategoryId(editingBudget.categoryId || '');
      setLimitInput(formatMinorToDecimalString(editingBudget.limitMinor, currentCurrency.code));
    } else {
      setPeriodKey(selectedPeriodKey);
      setCategoryId(budgetPreselectedCategoryId || '');
      setLimitInput('');
    }
    setErrors({});
  }, [editingBudget, budgetPreselectedCategoryId, isSetBudgetModalOpen, selectedPeriodKey, currentCurrency.code]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setErrors({});

    let limitMinor: number;
    try {
      limitMinor = parseAmountToMinor(limitInput, currentCurrency.code);
    } catch (err) {
      setErrors({ limit: err instanceof Error ? err.message : 'Invalid budget limit amount.' });
      return;
    }

    setIsSubmitting(true);
    try {
      await saveBudget(
        {
          periodKey,
          limitMinor,
          categoryId: categoryId || undefined,
        },
        editingBudget ? editingBudget.id : undefined
      );

      const catName = categoryId
        ? expenseCategories.find((c) => c.id === categoryId)?.name || 'Category'
        : 'Overall Monthly';

      showToast({
        type: 'success',
        title: 'Budget Saved',
        description: `Set limit of ${currentCurrency.symbol}${limitInput} for ${catName} (${formatPeriodKeyDisplay(periodKey, true)}).`,
      });

      closeSetBudgetModal();
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : 'Failed to save budget record.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!editingBudget) return;
    setIsDeleting(true);
    try {
      await deleteBudget(editingBudget.id);
      showToast({
        type: 'success',
        title: 'Budget Removed',
        description: 'Budget limit record was deleted.',
      });
      setIsConfirmDeleteOpen(false);
      closeSetBudgetModal();
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Delete Failed',
        description: err instanceof Error ? err.message : 'Failed to delete budget.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const categoryOptions = [
    { value: '', label: 'Overall Monthly Budget (All Expenses)' },
    ...expenseCategories.map((c) => ({ value: c.id, label: `${c.name} (Category Budget)` })),
  ];

  return (
    <>
      <Dialog
        isOpen={isSetBudgetModalOpen}
        onClose={closeSetBudgetModal}
        title={editingBudget ? 'Edit Monthly Budget' : 'Set Monthly Budget'}
        subtitle={`Set a spending threshold for ${formatPeriodKeyDisplay(periodKey)}.`}
      >
        <form onSubmit={handleSubmit} noValidate>
          {errors.form && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--negative-bg)',
                color: 'var(--negative-crimson)',
                fontSize: '0.875rem',
                marginBottom: '16px',
              }}
            >
              {errors.form}
            </div>
          )}

          {/* Budget Scope (Overall vs Category) */}
          <Select
            id="bgt-category"
            label="Budget Scope"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            options={categoryOptions}
            helperText="Choose whether this limit applies to total expenses or a specific category."
          />

          {/* Amount Limit Input */}
          <div style={{ marginTop: '16px' }}>
            <Input
              id="bgt-limit"
              label={`Monthly Limit Amount (${currentCurrency.symbol})`}
              type="number"
              step="any"
              placeholder="0.00"
              value={limitInput}
              onChange={(e) => setLimitInput(e.target.value)}
              error={errors.limit}
              leftIcon={<Target size={16} />}
              required
            />
          </div>

          {/* Form Footer */}
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
            {editingBudget && (
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={() => setIsConfirmDeleteOpen(true)}
                leftIcon={<Trash2 size={16} />}
                style={{ marginRight: 'auto' }}
              >
                Remove
              </Button>
            )}
            <Button type="button" variant="ghost" onClick={closeSetBudgetModal} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting} leftIcon={<CheckCircle2 size={16} />}>
              Save Budget Limit
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Delete Confirmation Modal */}
      {editingBudget && (
        <Dialog
          isOpen={isConfirmDeleteOpen}
          onClose={() => setIsConfirmDeleteOpen(false)}
          title="Remove Budget Limit?"
          subtitle="Are you sure you want to delete this budget limit?"
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
                Remove Budget
              </Button>
            </>
          }
        >
          <p style={{ fontSize: '0.875rem', color: 'var(--ink-secondary)', lineHeight: '1.5' }}>
            This will remove the spending target for {formatPeriodKeyDisplay(periodKey)}. Your transactions will remain intact.
          </p>
        </Dialog>
      )}
    </>
  );
};
