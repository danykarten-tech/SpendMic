import React, { useState, useEffect } from 'react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import {
  validateBackupJSON,
  BackupValidationResult,
  BackupDataPayload,
} from '../../domain/backupAndExport';
import { ShieldAlert, AlertTriangle, FileCheck, CheckCircle2, Download } from 'lucide-react';

interface RestoreBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileContent: string | null;
  fileName: string | null;
  onConfirmRestore: (backupData: BackupDataPayload, createAutoBackup: boolean) => Promise<void>;
}

export const RestoreBackupModal: React.FC<RestoreBackupModalProps> = ({
  isOpen,
  onClose,
  fileContent,
  fileName,
  onConfirmRestore,
}) => {
  const [validationResult, setValidationResult] = useState<BackupValidationResult | null>(null);
  const [createAutoBackup, setCreateAutoBackup] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && fileContent) {
      const res = validateBackupJSON(fileContent);
      setValidationResult(res);
      setCreateAutoBackup(true);
      setIsSubmitting(false);
    } else {
      setValidationResult(null);
    }
  }, [isOpen, fileContent]);

  const handleRestore = async () => {
    if (!validationResult || !validationResult.isValid || !validationResult.parsedData) return;
    setIsSubmitting(true);
    try {
      await onConfirmRestore(validationResult.parsedData, createAutoBackup);
      onClose();
    } catch (err) {
      console.error('[RestoreBackupModal] Restore failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Restore JSON Backup"
      subtitle={fileName ? `File: ${fileName}` : 'Review backup metadata before restoring.'}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Invalid File Alert */}
        {validationResult && !validationResult.isValid && (
          <div
            style={{
              padding: '14px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--negative-bg)',
              color: 'var(--negative-crimson)',
              fontSize: '0.875rem',
              border: '1px solid var(--negative-border)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              lineHeight: '1.5',
            }}
            role="alert"
          >
            <ShieldAlert size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong style={{ display: 'block', marginBottom: '4px', fontWeight: 600 }}>
                Backup File Validation Failed
              </strong>
              {validationResult.error}
              <p style={{ marginTop: '6px', fontSize: '0.75rem', opacity: 0.9 }}>
                No existing records were modified. Please select a valid versioned JSON backup file.
              </p>
            </div>
          </div>
        )}

        {/* Valid File Summary Preview */}
        {validationResult && validationResult.isValid && validationResult.counts && validationResult.parsedData && (
          <>
            <div
              style={{
                padding: '16px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--surface-subtle)',
                border: '1px solid var(--border-color)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileCheck size={18} style={{ color: 'var(--positive-emerald)' }} />
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--ink-primary)' }}>
                    Backup Inspection Passed
                  </span>
                </div>
                <Badge variant="income">v{validationResult.parsedData.schemaVersion}</Badge>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', fontSize: '0.8125rem' }}>
                <div>
                  <span style={{ color: 'var(--ink-muted)' }}>Transactions:</span>{' '}
                  <strong style={{ color: 'var(--ink-primary)' }}>{validationResult.counts.transactions}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--ink-muted)' }}>Categories:</span>{' '}
                  <strong style={{ color: 'var(--ink-primary)' }}>{validationResult.counts.categories}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--ink-muted)' }}>Budgets:</span>{' '}
                  <strong style={{ color: 'var(--ink-primary)' }}>{validationResult.counts.budgets}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--ink-muted)' }}>Recurring Schedules:</span>{' '}
                  <strong style={{ color: 'var(--ink-primary)' }}>{validationResult.counts.recurringTemplates}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--ink-muted)' }}>Bills:</span>{' '}
                  <strong style={{ color: 'var(--ink-primary)' }}>{validationResult.counts.bills}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--ink-muted)' }}>Savings Goals:</span>{' '}
                  <strong style={{ color: 'var(--ink-primary)' }}>{validationResult.counts.savingsGoals}</strong>
                </div>
              </div>

              <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--border-color)', fontSize: '0.75rem', color: 'var(--ink-muted)' }}>
                Exported At: {new Date(validationResult.parsedData.exportedAt).toLocaleString()}
              </div>
            </div>

            {/* Auto-backup Checkbox */}
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '0.8125rem',
                color: 'var(--ink-primary)',
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              <input
                type="checkbox"
                checked={createAutoBackup}
                onChange={(e) => setCreateAutoBackup(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: 'var(--primary-brand)' }}
              />
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Download size={14} style={{ color: 'var(--primary-brand)' }} />
                Create automatic JSON backup of current data before replacing
              </span>
            </label>

            {/* Irreversible Replace Warning */}
            <div
              style={{
                padding: '12px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--warning-bg)',
                border: '1px solid var(--warning-border)',
                fontSize: '0.75rem',
                color: '#92400E',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                lineHeight: '1.4',
              }}
            >
              <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
              <div>
                <strong>Warning:</strong> Restoring will replace all existing transactions, categories, budgets, and schedules on this device with the imported backup records.
              </div>
            </div>
          </>
        )}

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
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleRestore}
            isLoading={isSubmitting}
            disabled={!validationResult || !validationResult.isValid}
            leftIcon={<CheckCircle2 size={16} />}
          >
            Confirm & Restore Data
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
