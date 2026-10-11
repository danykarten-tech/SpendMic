import React, { useState, useRef } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Dialog } from '../components/ui/Dialog';
import { RestoreBackupModal } from '../components/modals/RestoreBackupModal';
import { useApp } from '../context/AppContext';
import { SUPPORTED_CURRENCIES } from '../domain/types';
import { BackupDataPayload } from '../domain/backupAndExport';
import {
  ShieldCheck,
  HardDrive,
  Trash2,
  RotateCcw,
  DollarSign,
  Moon,
  Info,
  Tag,
  Download,
  Upload,
  FileSpreadsheet,
  AlertOctagon,
  Lock,
} from 'lucide-react';
import { useToast } from '../components/ui/Toast';

export const SettingsView: React.FC = () => {
  const {
    preferences,
    updatePreferences,
    currentCurrency,
    currencySymbol,
    storageHealth,
    refreshStorageHealth,
    openCategoryManager,
    clearAllData,
    exportJSONBackup,
    exportCSV,
    restoreBackup,
  } = useApp();
  const { showToast } = useToast();

  const [isClearDialogOpen, setIsClearDialogOpen] = useState<boolean>(false);
  const [isClearing, setIsClearing] = useState<boolean>(false);
  const [isExportingJSON, setIsExportingJSON] = useState<boolean>(false);
  const [isExportingCSV, setIsExportingCSV] = useState<boolean>(false);

  // Restore Modal State
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState<boolean>(false);
  const [restoreFileContent, setRestoreFileContent] = useState<string | null>(null);
  const [restoreFileName, setRestoreFileName] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCode = e.target.value;
    updatePreferences({ currency: newCode });
    const selected = SUPPORTED_CURRENCIES.find((c) => c.code === newCode);
    showToast({
      type: 'success',
      title: 'Currency Updated',
      description: `Primary currency changed to ${selected?.name || newCode} (${selected?.symbol || ''}). All metrics updated!`,
    });
  };

  const handleResetOnboarding = () => {
    updatePreferences({ onboardingCompleted: false });
    showToast({
      type: 'info',
      title: 'Welcome Banner Reset',
      description: 'The onboarding privacy banner will now appear on your Home Dashboard.',
    });
  };

  const handleExportJSON = async () => {
    setIsExportingJSON(true);
    try {
      await exportJSONBackup();
      showToast({
        type: 'success',
        title: 'JSON Backup Created',
        description: 'Exported complete versioned backup file. Store it safely!',
      });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Backup Failed',
        description: err instanceof Error ? err.message : 'Could not generate backup file.',
      });
    } finally {
      setIsExportingJSON(false);
    }
  };

  const handleExportCSV = async () => {
    setIsExportingCSV(true);
    try {
      await exportCSV();
      showToast({
        type: 'success',
        title: 'CSV File Exported',
        description: 'Transaction records formatted with UTF-8 encoding for Excel & Sheets.',
      });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'CSV Export Failed',
        description: err instanceof Error ? err.message : 'Could not generate CSV file.',
      });
    } finally {
      setIsExportingCSV(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRestoreFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setRestoreFileContent(text);
      setIsRestoreModalOpen(true);
    };
    reader.onerror = () => {
      showToast({
        type: 'error',
        title: 'File Read Error',
        description: 'Could not read the selected file.',
      });
    };
    reader.readAsText(file);

    // Reset file input so re-selecting same file triggers onChange
    e.target.value = '';
  };

  const handleConfirmRestore = async (backupData: BackupDataPayload, createAutoBackup: boolean) => {
    try {
      if (createAutoBackup) {
        await exportJSONBackup();
      }
      await restoreBackup(backupData);
      await refreshStorageHealth();
      showToast({
        type: 'success',
        title: 'Backup Restored Successfully',
        description: `Restored ${backupData.transactions?.length || 0} transactions and ${backupData.categories?.length || 0} categories.`,
      });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Restore Failed',
        description: err instanceof Error ? err.message : 'Failed to replace data in IndexedDB.',
      });
      throw err;
    }
  };

  const handleClearAllData = async () => {
    setIsClearing(true);
    try {
      await clearAllData();
      await refreshStorageHealth();
      showToast({
        type: 'success',
        title: 'Data Cleared',
        description: 'All local IndexedDB tables cleared successfully.',
      });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Error Clearing Data',
        description: 'Failed to clear IndexedDB tables.',
      });
    } finally {
      setIsClearing(false);
      setIsClearDialogOpen(false);
    }
  };

  const currencyOptions = SUPPORTED_CURRENCIES.map((c) => ({
    value: c.code,
    label: `${c.name} (${c.symbol} ${c.code})`,
  }));

  return (
    <div>
      <PageHeader
        title="Settings & Privacy Controls"
        subtitle="Manage backup files, data export, privacy controls, and local device preferences."
        badgeText="100% Offline & Private"
      />

      {/* Hidden file input for restore trigger */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept=".json,application/json"
        style={{ display: 'none' }}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Currency Preference Section */}
        <Card>
          <CardHeader>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--primary-subtle)',
                  color: 'var(--primary-brand)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <DollarSign size={18} />
              </div>
              <div>
                <CardTitle>Currency & Regional Format</CardTitle>
                <CardDescription>Select your primary accounting currency. Defaults to Indian Rupee (INR ₹).</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Select
              label="Primary Currency"
              value={preferences.currency}
              onChange={handleCurrencyChange}
              options={currencyOptions}
              helperText={`All transactions, budgets, reports, and voice entries format in ${currentCurrency.name} (${currencySymbol})`}
            />
          </CardContent>
        </Card>

        {/* JSON Backup & Restore Section */}
        <Card>
          <CardHeader>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--positive-bg)',
                  color: 'var(--positive-emerald)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Download size={18} />
              </div>
              <div>
                <CardTitle>JSON Backup & Safe Restore</CardTitle>
                <CardDescription>
                  Export or restore full versioned JSON backups containing all transactions, categories, budgets, and schedules.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p style={{ fontSize: '0.875rem', color: 'var(--ink-secondary)', marginBottom: '16px', lineHeight: '1.5' }}>
              Backups are stored as versioned <code style={{ fontSize: '0.8125rem', backgroundColor: 'var(--surface-subtle)', padding: '2px 6px', borderRadius: '4px' }}>pocket-expense-backup-YYYY-MM-DD.json</code> files. Restoring inspects and validates record integrity before replacing current device storage.
            </p>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <Button
                variant="primary"
                size="sm"
                onClick={handleExportJSON}
                isLoading={isExportingJSON}
                leftIcon={<Download size={14} />}
              >
                Export JSON Backup
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                leftIcon={<Upload size={14} />}
              >
                Restore from JSON Backup
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* CSV Export Section */}
        <Card>
          <CardHeader>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--primary-subtle)',
                  color: 'var(--primary-brand)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FileSpreadsheet size={18} />
              </div>
              <div>
                <CardTitle>CSV Spreadsheet Export</CardTitle>
                <CardDescription>Export transactions as a UTF-8 encoded CSV file for Excel or Google Sheets.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p style={{ fontSize: '0.875rem', color: 'var(--ink-secondary)', marginBottom: '12px', lineHeight: '1.5' }}>
              CSV files include stable column headers (<code style={{ fontSize: '0.75rem' }}>id, date, type, amount, currency, category, note, accountId</code>).
            </p>

            <div
              style={{
                backgroundColor: 'var(--primary-subtle)',
                border: '1px solid var(--primary-border)',
                borderRadius: 'var(--radius-sm)',
                padding: '12px',
                fontSize: '0.75rem',
                color: 'var(--ink-secondary)',
                marginBottom: '16px',
                lineHeight: '1.4',
              }}
            >
              <strong style={{ color: 'var(--primary-brand)', display: 'block', marginBottom: '2px' }}>
                Note on CSV vs JSON Backup:
              </strong>
              CSV export is formatted for reading & spreadsheet reporting. It is NOT a full restorable database backup. To restore your data later, use the JSON Backup option above.
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              isLoading={isExportingCSV}
              leftIcon={<FileSpreadsheet size={14} />}
            >
              Export Transactions CSV
            </Button>
          </CardContent>
        </Card>

        {/* Privacy & Data Controls Section */}
        <Card>
          <CardHeader>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--positive-bg)',
                  color: 'var(--positive-emerald)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ShieldCheck size={18} />
              </div>
              <div>
                <CardTitle>Privacy & Device Storage</CardTitle>
                <CardDescription>
                  100% Local IndexedDB storage. No cloud servers, tracking scripts, or ad SDKs.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Storage Health Status */}
            <div
              style={{
                backgroundColor: 'var(--surface-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '16px',
                marginBottom: '16px',
                border: '1px solid var(--border-color)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <HardDrive size={16} style={{ color: 'var(--primary-brand)' }} />
                <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--ink-primary)' }}>
                  IndexedDB Storage Engine
                </h4>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', fontSize: '0.8125rem' }}>
                <div>
                  <span style={{ color: 'var(--ink-muted)' }}>Database Name:</span>
                  <div style={{ fontWeight: 600, color: 'var(--ink-primary)' }}>{storageHealth?.databaseName || 'pocket_expense_tracker_db'}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--ink-muted)' }}>Status:</span>
                  <div>
                    <Badge variant={storageHealth?.indexedDBAvailable ? 'income' : 'expense'}>
                      {storageHealth?.indexedDBAvailable ? 'IndexedDB Active' : 'Unavailable'}
                    </Badge>
                  </div>
                </div>
                <div>
                  <span style={{ color: 'var(--ink-muted)' }}>DB Version:</span>
                  <div style={{ fontWeight: 600, color: 'var(--ink-primary)' }}>v{storageHealth?.databaseVersion || 1}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--ink-muted)' }}>Transactions Stored:</span>
                  <div style={{ fontWeight: 600, color: 'var(--ink-primary)' }}>{storageHealth?.transactionCount ?? 0} records</div>
                </div>
              </div>
            </div>

            {/* Plain Language Privacy Guarantee */}
            <div
              style={{
                backgroundColor: 'var(--surface-subtle)',
                padding: '12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-color)',
                fontSize: '0.8125rem',
                color: 'var(--ink-secondary)',
                marginBottom: '16px',
                lineHeight: '1.5',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: 'var(--ink-primary)', marginBottom: '4px' }}>
                <Lock size={14} style={{ color: 'var(--positive-emerald)' }} />
                <span>Plain Language Privacy Guarantee</span>
              </div>
              All financial data stays strictly on your browser/device. SpendMic AI includes zero telemetry, zero analytics SDKs, zero remote API connections, and zero bank access code.
              <br />
              <em style={{ color: 'var(--ink-muted)', display: 'block', marginTop: '4px' }}>
                Warning: Clearing your browser site data or uninstalling your browser will delete local records unless you maintain JSON backups.
              </em>
            </div>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <Button
                variant="primary"
                size="sm"
                onClick={openCategoryManager}
                leftIcon={<Tag size={14} />}
              >
                Manage Categories
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetOnboarding}
                leftIcon={<RotateCcw size={14} />}
              >
                Re-show Privacy Banner
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => setIsClearDialogOpen(true)}
                leftIcon={<Trash2 size={14} />}
              >
                Delete All Data
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Appearance Section */}
        <Card>
          <CardHeader>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--surface-subtle)',
                  color: 'var(--ink-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Moon size={18} />
              </div>
              <div>
                <CardTitle>Appearance & Theme</CardTitle>
                <CardDescription>Customizable light/dark finance theme settings.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--ink-primary)' }}>Theme Mode</span>
                <p style={{ fontSize: '0.8125rem', color: 'var(--ink-muted)' }}>
                  Currently active: Calm Finance Light (#F7F9FC)
                </p>
              </div>
              <Badge variant="muted">System Default</Badge>
            </div>
          </CardContent>
        </Card>

        {/* App Info Card */}
        <Card style={{ backgroundColor: 'var(--surface-card)' }}>
          <CardHeader>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Info size={16} style={{ color: 'var(--primary-brand)' }} />
              <CardTitle>About SpendMic AI</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div style={{ fontSize: '0.875rem', color: 'var(--ink-secondary)', lineHeight: '1.6' }}>
              <p style={{ marginBottom: '8px' }}>
                SpendMic AI is an installable Progressive Web App (PWA) designed for modern Android, iOS, and desktop browsers.
              </p>
              <p style={{ fontSize: '0.8125rem', color: 'var(--ink-muted)' }}>
                • Built with React 18, TypeScript, Vite & IndexedDB<br />
                • 100% Offline capable with Service Worker caching<br />
                • App Version: v1.0.0 (Release Ready)
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Restore Backup Confirmation Modal */}
      <RestoreBackupModal
        isOpen={isRestoreModalOpen}
        onClose={() => setIsRestoreModalOpen(false)}
        fileContent={restoreFileContent}
        fileName={restoreFileName}
        onConfirmRestore={handleConfirmRestore}
      />

      {/* Clear Data Confirmation Dialog */}
      <Dialog
        isOpen={isClearDialogOpen}
        onClose={() => setIsClearDialogOpen(false)}
        title="Delete All Local Data?"
        subtitle="This action is permanent and irreversible."
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsClearDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleClearAllData}
              isLoading={isClearing}
              leftIcon={<Trash2 size={16} />}
            >
              Permanently Wipe Data
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div
            style={{
              padding: '12px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--negative-bg)',
              border: '1px solid var(--negative-border)',
              fontSize: '0.8125rem',
              color: 'var(--negative-crimson)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              lineHeight: '1.4',
            }}
          >
            <AlertOctagon size={18} style={{ flexShrink: 0, marginTop: '1px' }} />
            <div>
              <strong>Irreversible Warning:</strong> This will delete all transactions, categories, budgets, recurring schedules, bills, and savings goals stored in your local browser IndexedDB database.
            </div>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--ink-secondary)' }}>
            Before wiping your device, make sure you have exported a JSON backup if you wish to keep your data.
          </p>
        </div>
      </Dialog>
    </div>
  );
};
