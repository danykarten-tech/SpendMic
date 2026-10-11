import React, { useState } from 'react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useApp } from '../../context/AppContext';
import { useToast } from '../ui/Toast';
import { formatMinorToMajor, formatDateLocalDisplay, getTransactionDisplayTime } from '../../domain/moneyAndDate';
import { resolveTransactionCategory } from '../../domain/categoriesData';
import { CategoryIcon } from '../ui/CategoryIcon';
import { Edit2, Trash2, Calendar, FileText, Clock, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

export const TransactionDetailsModal: React.FC = () => {
  const {
    viewingTransaction,
    closeTransactionDetails,
    openAddModal,
    deleteTransaction,
    categories,
    currentCurrency,
  } = useApp();
  const { showToast } = useToast();

  const [isConfirmingDelete, setIsConfirmingDelete] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  if (!viewingTransaction) return null;

  const category = resolveTransactionCategory(viewingTransaction.categoryId, categories, viewingTransaction.note, viewingTransaction.type);
  const formattedAmount = formatMinorToMajor(viewingTransaction.amountMinor, viewingTransaction.currency || currentCurrency.code);
  const isIncome = viewingTransaction.type === 'income';

  const handleEdit = () => {
    const txToEdit = viewingTransaction;
    closeTransactionDetails();
    openAddModal(txToEdit);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteTransaction(viewingTransaction.id);
      showToast({
        type: 'success',
        title: 'Transaction Deleted',
        description: 'The transaction record was removed from local storage.',
      });
      setIsConfirmingDelete(false);
      closeTransactionDetails();
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Delete Failed',
        description: err instanceof Error ? err.message : 'Could not delete transaction.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Dialog
        isOpen={!!viewingTransaction && !isConfirmingDelete}
        onClose={closeTransactionDetails}
        title="Transaction Details"
        subtitle={`Record ID: ${viewingTransaction.id.substring(0, 16)}...`}
        footer={
          <>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setIsConfirmingDelete(true)}
              leftIcon={<Trash2 size={16} />}
            >
              Delete
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleEdit}
              leftIcon={<Edit2 size={16} />}
            >
              Edit Transaction
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Main Amount Header Card */}
          <div
            style={{
              backgroundColor: isIncome ? 'var(--positive-bg)' : 'var(--negative-bg)',
              border: `1px solid ${isIncome ? 'var(--positive-border)' : 'var(--negative-border)'}`,
              borderRadius: 'var(--radius-md)',
              padding: '20px',
              textAlign: 'center',
            }}
          >
            <div style={{ marginBottom: '8px' }}>
              <Badge
                variant={isIncome ? 'income' : 'expense'}
                icon={isIncome ? <ArrowUpRight size={14} /> : <ArrowDownLeft size={14} />}
              >
                {isIncome ? 'Income' : 'Expense'}
              </Badge>
            </div>

            <div
              style={{
                fontSize: '2rem',
                fontWeight: 700,
                color: isIncome ? 'var(--positive-emerald)' : 'var(--negative-crimson)',
              }}
            >
              {isIncome ? '+' : '-'}{formattedAmount}
            </div>
          </div>

          {/* Metadata Grid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.9375rem' }}>
            {/* Category */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                backgroundColor: 'var(--surface-subtle)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <span style={{ color: 'var(--ink-muted)', fontSize: '0.875rem' }}>Category</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: 'var(--ink-primary)' }}>
                <CategoryIcon name={category?.icon || 'Tag'} color={category?.color} size={18} />
                <span>{category?.name || 'Uncategorized'}</span>
              </div>
            </div>

            {/* Date */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                backgroundColor: 'var(--surface-subtle)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <span style={{ color: 'var(--ink-muted)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar size={16} /> Date
              </span>
              <span style={{ fontWeight: 600, color: 'var(--ink-primary)' }}>
                {formatDateLocalDisplay(viewingTransaction.dateLocal, viewingTransaction.createdAt, viewingTransaction.timeLocal)} ({viewingTransaction.dateLocal})
              </span>
            </div>

            {/* Time (Recorded only for Today) */}
            {getTransactionDisplayTime(viewingTransaction) && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  backgroundColor: 'var(--surface-subtle)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <span style={{ color: 'var(--ink-muted)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={16} /> Time (Today)
                </span>
                <span style={{ fontWeight: 600, color: 'var(--brand-primary)' }}>
                  {getTransactionDisplayTime(viewingTransaction)}
                </span>
              </div>
            )}

            {/* Note */}
            {viewingTransaction.note && (
              <div
                style={{
                  padding: '12px 16px',
                  backgroundColor: 'var(--surface-subtle)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <div style={{ color: 'var(--ink-muted)', fontSize: '0.875rem', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FileText size={16} /> Note / Description
                </div>
                <p style={{ color: 'var(--ink-primary)', fontWeight: 500, whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                  {viewingTransaction.note}
                </p>
              </div>
            )}

            {/* Created Timestamp */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.75rem',
                color: 'var(--ink-subtle)',
                marginTop: '8px',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Clock size={12} /> Recorded: {new Date(viewingTransaction.createdAt).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        isOpen={isConfirmingDelete}
        onClose={() => setIsConfirmingDelete(false)}
        title="Delete Transaction?"
        subtitle="This action cannot be undone."
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsConfirmingDelete(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              isLoading={isDeleting}
              leftIcon={<Trash2 size={16} />}
            >
              Delete Permanently
            </Button>
          </>
        }
      >
        <p style={{ fontSize: '0.875rem', color: 'var(--ink-secondary)', lineHeight: '1.5' }}>
          Are you sure you want to delete this {viewingTransaction.type} record of <strong>{formattedAmount}</strong> ({category?.name})?
        </p>
      </Dialog>
    </>
  );
};
