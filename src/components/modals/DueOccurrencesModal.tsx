import React, { useState } from 'react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useApp } from '../../context/AppContext';
import { useToast } from '../ui/Toast';
import { PendingOccurrence } from '../../domain/recurringAndBills';
import { Calendar, Repeat } from 'lucide-react';

interface DueOccurrencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  pendingOccurrences: PendingOccurrence[];
  onConfirmGenerated: () => Promise<void>;
}

export const DueOccurrencesModal: React.FC<DueOccurrencesModalProps> = ({
  isOpen,
  onClose,
  pendingOccurrences,
  onConfirmGenerated,
}) => {
  const { categories, currencySymbol } = useApp();
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const getCategoryName = (catId: string) => {
    const cat = categories.find((c) => c.id === catId);
    return cat ? cat.name : 'General';
  };

  const handleGenerateAll = async () => {
    if (pendingOccurrences.length === 0) return;
    setIsSubmitting(true);
    try {
      await onConfirmGenerated();
      showToast({
        type: 'success',
        title: 'Transactions Created',
        description: `Successfully generated ${pendingOccurrences.length} due recurring item(s).`,
      });
      onClose();
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Generation Failed',
        description: err instanceof Error ? err.message : 'Could not create recurring transactions.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Due Recurring Occurrences"
      subtitle="The following scheduled payments/incomes are now due based on your recurring templates."
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* PWA Notice Banner */}
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
            lineHeight: '1.5',
          }}
        >
          <Repeat size={18} style={{ color: 'var(--primary-brand)', flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong style={{ display: 'block', color: 'var(--ink-primary)', marginBottom: '4px', fontWeight: 600 }}>
              PWA Background Execution Disclaimer
            </strong>
            Background reminders do not run automatically when the app is closed due to PWA environment limitations. Due items are checked whenever you open the app, and created only upon your explicit confirmation.
          </div>
        </div>

        {/* Due Items List */}
        <div style={{ maxHeight: '240px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {pendingOccurrences.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--ink-muted)', fontSize: '0.875rem' }}>
              No due recurring occurrences found at this time.
            </div>
          ) : (
            pendingOccurrences.map((item) => (
              <div
                key={item.occurrenceKey}
                style={{
                  padding: '12px',
                  backgroundColor: 'var(--surface-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <Badge variant={item.template.type === 'income' ? 'income' : 'expense'}>
                      {item.template.type.toUpperCase()}
                    </Badge>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--ink-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.template.note || getCategoryName(item.template.categoryId)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.75rem', color: 'var(--ink-muted)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={12} style={{ color: 'var(--ink-subtle)' }} />
                      Due: {item.dueDateLocal}
                    </span>
                    <span style={{ textTransform: 'capitalize' }}>• {item.template.frequency}</span>
                  </div>
                </div>

                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <span
                    style={{
                      fontSize: '0.9375rem',
                      fontWeight: 700,
                      color: item.template.type === 'income' ? 'var(--positive-emerald)' : 'var(--ink-primary)',
                    }}
                  >
                    {item.template.type === 'income' ? '+' : '-'}
                    {currencySymbol}
                    {(item.template.amountMinor / 100).toFixed(2)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Actions Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '12px',
            marginTop: '16px',
            paddingTop: '16px',
            borderTop: '1px solid var(--border-color)',
          }}
        >
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Review Later
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleGenerateAll}
            isLoading={isSubmitting}
            disabled={pendingOccurrences.length === 0}
          >
            Create {pendingOccurrences.length} Due Transaction(s)
          </Button>
        </div>
      </div>
    </Dialog>
  );
};

