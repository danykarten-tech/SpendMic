import React, { useState, useEffect } from 'react';
import {
  Mic,
  Square,
  X,
  Volume2,
  VolumeX,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Save,
  Target,
  PiggyBank,
  Repeat,
  Edit3,
  Trash2,
  History,
  CreditCard,
  Copy,
  Check,
  HelpCircle,
  Loader2,
} from 'lucide-react';
import { speechEngine, SpeechEngineState } from '../../services/voice/speechEngine';
import {
  parseVoiceCommand,
  executeVoiceQuery,
  VoiceParseResult,
  VoiceIntent,
  ParsedVoiceTransaction,
  ParsedVoiceSavingsGoal,
  ParsedVoiceSavingsContribution,
  ParsedVoiceSavingsEdit,
  ParsedVoiceSavingsDelete,
  ParsedVoiceSavingsHistory,
  ParsedVoiceBillPayment,
  ParsedVoiceRecurringBill,
  VOICE_HELP_COMMANDS,
} from '../../domain/voiceCommandParser';
import { Category, TransactionType, MonthlySummary, BillFrequency } from '../../domain/types';
import { useApp } from '../../context/AppContext';
import { getTodayLocalDateString, getCurrentLocalTimeString } from '../../domain/moneyAndDate';
import { resolveTransactionCategory } from '../../domain/categoriesData';
import { Button } from '../ui/Button';

interface VoiceAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  monthlySummary: MonthlySummary | null;
  onTransactionSaved: () => void;
}

export const VoiceAssistantModal: React.FC<VoiceAssistantModalProps> = ({
  isOpen,
  onClose,
  categories,
  monthlySummary,
  onTransactionSaved,
}) => {
  const {
    currentCurrency,
    currencySymbol,
    saveTransaction,
    saveSavingsGoal,
    deleteSavingsGoal,
    addSavingsContribution,
    openSavingsDetailsModal,
    saveBill,
    markBillPaid,
    savingsGoals,
    bills,
    refreshAllData,
  } = useApp();

  const [engineState, setEngineState] = useState<SpeechEngineState>(speechEngine.getState());
  const [manualTranscript, setManualTranscript] = useState<string>('');
  const [activeIntent, setActiveIntent] = useState<VoiceIntent | null>(null);
  const [previewTransactions, setPreviewTransactions] = useState<ParsedVoiceTransaction[]>([]);
  const [previewSavingsGoal, setPreviewSavingsGoal] = useState<ParsedVoiceSavingsGoal | null>(null);
  const [previewSavingsContribution, setPreviewSavingsContribution] = useState<ParsedVoiceSavingsContribution | null>(null);
  const [previewSavingsEdit, setPreviewSavingsEdit] = useState<ParsedVoiceSavingsEdit | null>(null);
  const [previewSavingsDelete, setPreviewSavingsDelete] = useState<ParsedVoiceSavingsDelete | null>(null);
  const [previewSavingsHistory, setPreviewSavingsHistory] = useState<ParsedVoiceSavingsHistory | null>(null);
  const [previewBillPayment, setPreviewBillPayment] = useState<ParsedVoiceBillPayment | null>(null);
  const [previewRecurringBill, setPreviewRecurringBill] = useState<ParsedVoiceRecurringBill | null>(null);
  const [clarificationPrompt, setClarificationPrompt] = useState<string | null>(null);
  const [queryResponse, setQueryResponse] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeHelpCategory, setActiveHelpCategory] = useState<number>(0);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = speechEngine.subscribe((state) => {
      setEngineState(state);
      if (state.transcript) {
        setManualTranscript(state.transcript);
      }
    });
    return () => unsubscribe();
  }, []);

  // Parse command whenever transcript changes
  useEffect(() => {
    if (manualTranscript.trim()) {
      const result: VoiceParseResult = parseVoiceCommand(
        manualTranscript,
        categories,
        currentCurrency.code,
        savingsGoals,
        bills
      );
      setActiveIntent(result.intent);
      setPreviewTransactions(result.transactions || []);
      setPreviewSavingsGoal(result.savingsGoal || null);
      setPreviewSavingsContribution(result.savingsContribution || null);
      setPreviewSavingsEdit(result.savingsEdit || null);
      setPreviewSavingsDelete(result.savingsDelete || null);
      setPreviewSavingsHistory(result.savingsHistory || null);
      setPreviewBillPayment(result.billPayment || null);
      setPreviewRecurringBill(result.recurringBill || null);
      setClarificationPrompt(result.clarificationPrompt || null);

      if (result.intent === 'query_financials' && result.queryResult) {
        const text = executeVoiceQuery(result.queryResult, monthlySummary, currentCurrency.code);
        setQueryResponse(text);
        speechEngine.speak(text);
      } else {
        setQueryResponse(null);
      }
    } else {
      setActiveIntent(null);
      setPreviewTransactions([]);
      setPreviewSavingsGoal(null);
      setPreviewSavingsContribution(null);
      setPreviewSavingsEdit(null);
      setPreviewSavingsDelete(null);
      setPreviewSavingsHistory(null);
      setPreviewBillPayment(null);
      setPreviewRecurringBill(null);
      setClarificationPrompt(null);
      setQueryResponse(null);
    }
  }, [manualTranscript, categories, monthlySummary, currentCurrency.code, savingsGoals, bills]);

  if (!isOpen) return null;

  const handleStartListening = async () => {
    setSuccessMessage(null);
    await speechEngine.startListening();
  };

  const handleStopListening = () => {
    speechEngine.stopListening();
  };

  const handleCancel = () => {
    speechEngine.cancelListening();
    setManualTranscript('');
    setPreviewTransactions([]);
    setPreviewSavingsGoal(null);
    setPreviewSavingsContribution(null);
    setPreviewSavingsEdit(null);
    setPreviewSavingsDelete(null);
    setPreviewSavingsHistory(null);
    setPreviewBillPayment(null);
    setPreviewRecurringBill(null);
    setClarificationPrompt(null);
    setSuccessMessage(null);
    onClose();
  };

  const handleSampleClick = (sample: string) => {
    setManualTranscript(sample);
  };

  // 1. Transaction Saver (Income & Expense)
  const handleSaveTransactions = async () => {
    if (previewTransactions.length === 0) return;

    try {
      setIsSaving(true);
      let savedCount = 0;

      for (const tx of previewTransactions) {
        if (!tx.amountMinor || tx.amountMinor <= 0) continue;

        const resolved = resolveTransactionCategory(tx.categoryId, categories, tx.note || manualTranscript, tx.type);
        const categoryId = resolved ? resolved.id : tx.type === 'income' ? 'cat_income_other' : 'cat_expense_other';

        const txDate = tx.dateLocal || getTodayLocalDateString();
        const isToday = txDate === getTodayLocalDateString();
        const txTime = isToday ? tx.timeLocal || getCurrentLocalTimeString() : undefined;

        await saveTransaction({
          type: tx.type,
          amountMinor: tx.amountMinor,
          currency: currentCurrency.code,
          dateLocal: txDate,
          timeLocal: txTime,
          categoryId,
          note: `Voice Entry: ${tx.note || manualTranscript}`,
        });
        savedCount++;
      }

      await refreshAllData();
      setIsSaving(false);
      const msg = `Saved ${savedCount} transaction${savedCount > 1 ? 's' : ''} to your account!`;
      setSuccessMessage(msg);
      speechEngine.speak(msg);
      onTransactionSaved();

      setTimeout(() => {
        handleCancel();
      }, 1500);
    } catch (err: any) {
      setIsSaving(false);
      alert(`Failed to save transaction: ${err.message}`);
    }
  };

  // 2. Savings Goal Creator
  const handleSaveSavingsGoal = async () => {
    if (!previewSavingsGoal) return;
    if (!previewSavingsGoal.targetMinor || previewSavingsGoal.targetMinor <= 0) {
      alert('Please enter a valid target amount.');
      return;
    }

    try {
      setIsSaving(true);
      await saveSavingsGoal({
        name: previewSavingsGoal.name || 'Savings Goal',
        targetMinor: previewSavingsGoal.targetMinor,
        currentSavedMinor: 0,
        targetDateLocal: previewSavingsGoal.targetDateLocal,
        color: previewSavingsGoal.color || '#10B981',
        icon: previewSavingsGoal.icon || 'target',
      });

      await refreshAllData();
      setIsSaving(false);
      const targetStr = (previewSavingsGoal.targetMinor / 100).toLocaleString();
      const msg = `Created savings goal "${previewSavingsGoal.name}" with target ${currencySymbol}${targetStr}!`;
      setSuccessMessage(msg);
      speechEngine.speak(msg);
      onTransactionSaved();

      setTimeout(() => {
        handleCancel();
      }, 1500);
    } catch (err: any) {
      setIsSaving(false);
      alert(`Failed to create savings goal: ${err.message}`);
    }
  };

  // 3. Savings Contribution Adder
  const handleSaveSavingsContribution = async () => {
    if (!previewSavingsContribution) return;
    if (!previewSavingsContribution.amountMinor || previewSavingsContribution.amountMinor <= 0) {
      alert('Please enter a valid contribution amount.');
      return;
    }

    const targetGoalId =
      previewSavingsContribution.matchedGoalId ||
      (savingsGoals.length > 0 ? savingsGoals[0].id : null);

    if (!targetGoalId) {
      alert('Please select a target savings goal.');
      return;
    }

    try {
      setIsSaving(true);
      const { goal } = await addSavingsContribution(
        targetGoalId,
        previewSavingsContribution.amountMinor,
        previewSavingsContribution.note || `Voice contribution: ${manualTranscript}`
      );

      await refreshAllData();
      setIsSaving(false);
      const contribStr = (previewSavingsContribution.amountMinor / 100).toLocaleString();
      const msg = `Added ${currencySymbol}${contribStr} to "${goal.name}"!`;
      setSuccessMessage(msg);
      speechEngine.speak(msg);
      onTransactionSaved();

      setTimeout(() => {
        handleCancel();
      }, 1500);
    } catch (err: any) {
      setIsSaving(false);
      alert(`Failed to add contribution: ${err.message}`);
    }
  };

  // 4. Recurring Bill Creator
  const handleSaveRecurringBill = async () => {
    if (!previewRecurringBill) return;
    if (!previewRecurringBill.amountMinor || previewRecurringBill.amountMinor <= 0) {
      alert('Please enter a valid amount for this recurring bill.');
      return;
    }

    try {
      setIsSaving(true);
      await saveBill({
        name: previewRecurringBill.name || 'Recurring Bill',
        amountMinor: previewRecurringBill.amountMinor,
        currency: currentCurrency.code,
        dueDateLocal: previewRecurringBill.dueDateLocal || getTodayLocalDateString(),
        frequency: previewRecurringBill.frequency || 'monthly',
        categoryId:
          previewRecurringBill.categoryId ||
          (categories.find((c) => c.type === 'expense')?.id || 'cat_utilities'),
        isPaid: false,
        note: `Voice Recurring Bill: ${manualTranscript}`,
      });

      await refreshAllData();
      setIsSaving(false);
      const billAmountStr = (previewRecurringBill.amountMinor / 100).toLocaleString();
      const msg = `Saved recurring ${previewRecurringBill.frequency} bill "${previewRecurringBill.name}" of ${currencySymbol}${billAmountStr}!`;
      setSuccessMessage(msg);
      speechEngine.speak(msg);
      onTransactionSaved();

      setTimeout(() => {
        handleCancel();
      }, 1500);
    } catch (err: any) {
      setIsSaving(false);
      alert(`Failed to save recurring bill: ${err.message}`);
    }
  };

  // 5. Savings Goal Editor
  const handleSaveSavingsEdit = async () => {
    if (!previewSavingsEdit) return;
    if (!previewSavingsEdit.newTargetMinor || previewSavingsEdit.newTargetMinor <= 0) {
      alert('Please enter a valid target amount.');
      return;
    }
    const targetGoalId = previewSavingsEdit.goalId || (savingsGoals.length > 0 ? savingsGoals[0].id : null);
    if (!targetGoalId) {
      alert('Please select a target goal to edit.');
      return;
    }
    const goal = savingsGoals.find((g) => g.id === targetGoalId);
    if (!goal) {
      alert('Goal not found.');
      return;
    }

    try {
      setIsSaving(true);
      await saveSavingsGoal(
        {
          ...goal,
          targetMinor: previewSavingsEdit.newTargetMinor,
        },
        goal.id
      );

      await refreshAllData();
      setIsSaving(false);
      const targetStr = (previewSavingsEdit.newTargetMinor / 100).toLocaleString();
      const msg = `Updated target for "${goal.name}" to ${currencySymbol}${targetStr}!`;
      setSuccessMessage(msg);
      speechEngine.speak(msg);
      onTransactionSaved();

      setTimeout(() => {
        handleCancel();
      }, 1500);
    } catch (err: any) {
      setIsSaving(false);
      alert(`Failed to update goal: ${err.message}`);
    }
  };

  // 6. Savings Goal Deleter (with confirmation)
  const handleConfirmDeleteSavingsGoal = async () => {
    if (!previewSavingsDelete) return;
    const targetGoalId = previewSavingsDelete.goalId || (savingsGoals.length > 0 ? savingsGoals[0].id : null);
    if (!targetGoalId) {
      alert('Please select a target goal to delete.');
      return;
    }
    const goal = savingsGoals.find((g) => g.id === targetGoalId);
    if (!goal) {
      alert('Goal not found.');
      return;
    }

    try {
      setIsSaving(true);
      await deleteSavingsGoal(goal.id);
      await refreshAllData();
      setIsSaving(false);
      const msg = `Deleted savings goal "${goal.name}".`;
      setSuccessMessage(msg);
      speechEngine.speak(msg);
      onTransactionSaved();

      setTimeout(() => {
        handleCancel();
      }, 1500);
    } catch (err: any) {
      setIsSaving(false);
      alert(`Failed to delete goal: ${err.message}`);
    }
  };

  // 7. Show Savings History
  const handleShowSavingsHistory = () => {
    if (!previewSavingsHistory) return;
    const targetGoalId = previewSavingsHistory.goalId || (savingsGoals.length > 0 ? savingsGoals[0].id : null);
    if (!targetGoalId) {
      alert('Goal not found.');
      return;
    }
    const goal = savingsGoals.find((g) => g.id === targetGoalId);
    if (!goal) {
      alert('Goal not found.');
      return;
    }
    handleCancel();
    openSavingsDetailsModal(goal);
  };

  // 8. Record Bill Payment
  const handleSaveBillPayment = async () => {
    if (!previewBillPayment) return;
    const targetBillId = previewBillPayment.billId || (bills.length > 0 ? bills[0].id : null);
    if (!targetBillId) {
      alert('Please select a bill to record payment for.');
      return;
    }
    const bill = bills.find((b) => b.id === targetBillId);
    if (!bill) {
      alert('Bill not found.');
      return;
    }

    try {
      setIsSaving(true);
      await markBillPaid(bill.id, true);
      await refreshAllData();
      setIsSaving(false);
      const msg = `Recorded bill payment for "${bill.name}"!`;
      setSuccessMessage(msg);
      speechEngine.speak(msg);
      onTransactionSaved();

      setTimeout(() => {
        handleCancel();
      }, 1500);
    } catch (err: any) {
      setIsSaving(false);
      alert(`Failed to record bill payment: ${err.message}`);
    }
  };

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && handleCancel()}>
      <div
        className="modal-content"
        style={{
          maxWidth: '580px',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#FFFFFF',
          borderRadius: '24px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          border: '1px solid var(--border-color)',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #4338CA 0%, #5B46E5 50%, #6366F1 100%)',
            padding: '20px 24px',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                padding: '10px',
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                borderRadius: '16px',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Sparkles size={22} color="#C7D2FE" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#FFFFFF', margin: 0, lineHeight: 1.2 }}>
                Offline Voice Assistant
              </h2>
              <p style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.85)', margin: 0, fontWeight: 500 }}>
                100% On-Device Neural Speech Recognition
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => speechEngine.toggleMute()}
              style={{
                padding: '8px',
                color: '#FFFFFF',
                borderRadius: '10px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                cursor: 'pointer',
              }}
              title={engineState.isMuted ? 'Unmute Audio Response' : 'Mute Audio Response'}
            >
              {engineState.isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <button
              onClick={handleCancel}
              style={{
                padding: '8px',
                color: '#FFFFFF',
                borderRadius: '10px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                cursor: 'pointer',
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Automatic Model Status Banner (No separate Download button) */}
          <div
            style={{
              padding: '16px',
              backgroundColor: 'var(--surface-subtle)',
              borderRadius: '16px',
              border: '1px solid var(--border-color)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {engineState.status === 'ready' ? (
                  <CheckCircle size={20} color="#10B981" />
                ) : engineState.status === 'preparing' || engineState.status === 'downloading' ? (
                  <Sparkles size={20} color="#5B46E5" className="voice-sparkle-anim" />
                ) : (
                  <AlertCircle size={20} color="#EF4444" />
                )}
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--ink-primary)' }}>
                    {engineState.status === 'ready'
                      ? 'Offline voice ready'
                      : engineState.status === 'preparing' || engineState.status === 'downloading'
                      ? 'Preparing offline voice...'
                      : 'Setup incomplete'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--ink-secondary)', fontWeight: 500 }}>
                    {engineState.status === 'ready'
                      ? 'Whisper Neural Model Loaded • 100% On-Device & Private'
                      : engineState.statusMessage}
                  </div>
                </div>
              </div>

              {engineState.status === 'error' && (
                <Button variant="secondary" size="sm" onClick={() => speechEngine.retrySetup()}>
                  Retry Setup
                </Button>
              )}
            </div>

            {/* Preparation / Loading Progress Bar */}
            {(engineState.status === 'preparing' || engineState.status === 'downloading') && (
              <div style={{ marginTop: '12px', width: '100%', backgroundColor: '#E2E8F0', borderRadius: '999px', height: '6px', overflow: 'hidden' }}>
                <div
                  style={{
                    backgroundColor: 'var(--primary-brand)',
                    height: '100%',
                    width: `${Math.max(10, engineState.downloadProgress)}%`,
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            )}
          </div>

          {/* Microphone Recording Control */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '12px 0' }}>
            {engineState.status === 'listening' ? (
              <button
                onClick={handleStopListening}
                style={{
                  width: '84px',
                  height: '84px',
                  borderRadius: '50%',
                  backgroundColor: '#EF4444',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 8px 26px rgba(239, 68, 68, 0.45)',
                  animation: 'pulse 1.5s infinite',
                  cursor: 'pointer',
                  border: '3px solid #FCA5A5',
                }}
                title="Listening... Tap to stop"
              >
                <Square size={30} style={{ fill: '#FFFFFF' }} />
              </button>
            ) : engineState.status === 'processing' ? (
              <div
                style={{
                  width: '84px',
                  height: '84px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #7928CA 0%, #4F46E5 100%)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 8px 26px rgba(79, 70, 229, 0.45)',
                  border: '3px solid rgba(255, 255, 255, 0.8)',
                }}
                title="Processing speech on-device..."
              >
                <Loader2 size={36} style={{ animation: 'spin 1s linear infinite' }} />
              </div>
            ) : (
              <button
                onClick={handleStartListening}
                disabled={engineState.status !== 'ready'}
                style={{
                  width: '84px',
                  height: '84px',
                  borderRadius: '50%',
                  background:
                    engineState.status === 'ready'
                      ? 'linear-gradient(135deg, #FF2E93 0%, #7928CA 50%, #4F46E5 100%)'
                      : 'var(--border-color)',
                  color: engineState.status === 'ready' ? '#FFFFFF' : 'var(--ink-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow:
                    engineState.status === 'ready'
                      ? '0 8px 26px rgba(124, 58, 237, 0.45)'
                      : 'none',
                  transition: 'all 0.2s ease',
                  cursor: engineState.status === 'ready' ? 'pointer' : 'not-allowed',
                  opacity: engineState.status === 'ready' ? 1 : 0.65,
                  border:
                    engineState.status === 'ready'
                      ? '3px solid rgba(255, 255, 255, 0.8)'
                      : '3px solid var(--border-color)',
                }}
                title={engineState.status === 'ready' ? 'Tap Microphone to Speak' : 'Preparing offline speech engine...'}
              >
                <Mic size={34} />
              </button>
            )}

            <div style={{ textAlign: 'center', marginTop: '12px' }}>
              <div
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color:
                    engineState.status === 'listening'
                      ? '#EF4444'
                      : engineState.status === 'processing'
                      ? 'var(--primary-brand)'
                      : engineState.status === 'ready'
                      ? 'var(--primary-brand)'
                      : 'var(--ink-muted)',
                }}
              >
                {engineState.status === 'listening'
                  ? '🔴 Recording... Tap red button when finished'
                  : engineState.status === 'processing'
                  ? '⚡ Processing speech on-device...'
                  : engineState.status === 'ready'
                  ? 'Tap Microphone to Speak'
                  : 'Preparing Offline Voice Engine...'}
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--ink-secondary)', marginTop: '4px' }}>
                Supports Income, Expenses, Savings Goals, & Recurring Bills
              </p>
            </div>
          </div>


          {/* "What can I say?" Section */}
          <div
            style={{
              backgroundColor: 'var(--surface-subtle)',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              padding: '14px 16px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--ink-primary)' }}>
                <HelpCircle size={15} color="#5B46E5" />
                <span>What can I say?</span>
              </div>
              <span style={{ fontSize: '0.6875rem', color: 'var(--ink-muted)' }}>Tap example to test</span>
            </div>

            {/* Category Pills */}
            <div
              style={{
                display: 'flex',
                gap: '6px',
                overflowX: 'auto',
                paddingBottom: '8px',
                marginBottom: '10px',
              }}
            >
              {VOICE_HELP_COMMANDS.map((cat, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveHelpCategory(idx)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '20px',
                    fontSize: '0.6875rem',
                    fontWeight: activeHelpCategory === idx ? 700 : 500,
                    backgroundColor: activeHelpCategory === idx ? '#4F46E5' : 'var(--surface-card)',
                    color: activeHelpCategory === idx ? '#FFFFFF' : 'var(--ink-secondary)',
                    border: '1px solid ' + (activeHelpCategory === idx ? '#4F46E5' : 'var(--border-color)'),
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                  }}
                >
                  {cat.title}
                </button>
              ))}
            </div>

            {/* Examples for active category */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {VOICE_HELP_COMMANDS[activeHelpCategory]?.examples.map((ex, exIdx) => {
                const uniqueKey = `${activeHelpCategory}-${exIdx}`;
                return (
                  <div
                    key={exIdx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: 'var(--surface-card)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      padding: '6px 10px',
                      fontSize: '0.75rem',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => handleSampleClick(ex)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--ink-primary)',
                        textAlign: 'left',
                        cursor: 'pointer',
                        padding: 0,
                        flex: 1,
                        fontWeight: 500,
                      }}
                    >
                      "{ex}"
                    </button>
                    <button
                      type="button"
                      title="Copy example"
                      onClick={() => {
                        navigator.clipboard?.writeText(ex);
                        setCopiedKey(uniqueKey);
                        setTimeout(() => setCopiedKey(null), 1500);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: copiedKey === uniqueKey ? 'var(--positive-emerald)' : 'var(--ink-muted)',
                        cursor: 'pointer',
                        padding: '2px 4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2px',
                        fontSize: '0.6875rem',
                      }}
                    >
                      {copiedKey === uniqueKey ? <Check size={12} /> : <Copy size={12} />}
                      <span>{copiedKey === uniqueKey ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Editable Transcript Input Field */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: '6px' }}>
              Spoken Transcript (Editable)
            </label>
            <input
              type="text"
              value={manualTranscript}
              onChange={(e) => setManualTranscript(e.target.value)}
              placeholder={`e.g. "My salary is ${currencySymbol}55000" or "Save for a new phone target ${currencySymbol}20000"`}
              className="form-input"
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '14px',
                fontSize: '0.875rem',
                fontWeight: 500,
              }}
            />
          </div>

          {/* Success Banner */}
          {successMessage && (
            <div
              style={{
                padding: '14px 16px',
                backgroundColor: 'var(--positive-bg)',
                border: '1px solid var(--positive-border)',
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                color: 'var(--positive-emerald)',
                fontSize: '0.875rem',
                fontWeight: 600,
              }}
            >
              <CheckCircle size={18} color="#10B981" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Clarification / Follow-up Question Card */}
          {clarificationPrompt && (
            <div
              style={{
                padding: '16px',
                backgroundColor: 'var(--warning-bg)',
                border: '1px solid var(--warning-border)',
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
              }}
            >
              <AlertCircle size={20} color="#D97706" style={{ marginTop: '2px', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#D97706', marginBottom: '4px' }}>
                  Clarification Needed
                </div>
                <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--ink-primary)' }}>
                  {clarificationPrompt}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--ink-secondary)', marginTop: '4px' }}>
                  You can specify the missing detail in the preview inputs below or update your spoken command above.
                </div>
              </div>
            </div>
          )}

          {/* Financial Q&A Answer Card */}
          {queryResponse && (
            <div
              style={{
                padding: '16px',
                backgroundColor: 'var(--primary-subtle)',
                border: '1px solid var(--primary-border)',
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
              }}
            >
              <Sparkles size={20} color="#5B46E5" style={{ marginTop: '2px', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#5B46E5', marginBottom: '4px' }}>
                  Local Financial Answer
                </div>
                <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--ink-primary)' }}>{queryResponse}</div>
              </div>
            </div>
          )}

          {/* Active Intent Indicator */}
          {activeIntent && !queryResponse && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--ink-muted)' }}>
                Detected Intent:
              </span>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  backgroundColor: 'var(--primary-subtle)',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  color: 'var(--primary-brand)',
                  border: '1px solid var(--primary-border)',
                }}
              >
                {activeIntent}
              </span>
            </div>
          )}

          {/* 1. PREVIEW: Create Savings Goal */}
          {previewSavingsGoal && !queryResponse && (
            <div
              style={{
                padding: '16px',
                backgroundColor: 'var(--surface-subtle)',
                border: '1px solid var(--border-color)',
                borderRadius: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Target size={18} color="#10B981" />
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#10B981', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Action Detected: Create Savings Goal
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--ink-secondary)', marginBottom: '4px' }}>
                    Goal Name
                  </label>
                  <input
                    type="text"
                    value={previewSavingsGoal.name}
                    onChange={(e) => setPreviewSavingsGoal({ ...previewSavingsGoal, name: e.target.value })}
                    className="form-input"
                    style={{ padding: '8px 12px', fontWeight: 600 }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--ink-secondary)', marginBottom: '4px' }}>
                    Target Amount ({currencySymbol})
                  </label>
                  <input
                    type="number"
                    value={previewSavingsGoal.targetMinor ? previewSavingsGoal.targetMinor / 100 : ''}
                    placeholder="e.g. 20000"
                    onChange={(e) =>
                      setPreviewSavingsGoal({
                        ...previewSavingsGoal,
                        targetMinor: Math.round(parseFloat(e.target.value || '0') * 100),
                      })
                    }
                    className="form-input"
                    style={{ padding: '8px 12px', fontWeight: 700 }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--ink-secondary)', marginBottom: '4px' }}>
                    Target Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={previewSavingsGoal.targetDateLocal || ''}
                    onChange={(e) => setPreviewSavingsGoal({ ...previewSavingsGoal, targetDateLocal: e.target.value })}
                    className="form-input"
                    style={{ padding: '8px 12px' }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* 2. PREVIEW: Add Savings Contribution */}
          {previewSavingsContribution && !queryResponse && (
            <div
              style={{
                padding: '16px',
                backgroundColor: 'var(--surface-subtle)',
                border: '1px solid var(--border-color)',
                borderRadius: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <PiggyBank size={18} color="#3B82F6" />
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#3B82F6', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Action Detected: Add Savings Contribution
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--ink-secondary)', marginBottom: '4px' }}>
                    Target Savings Goal
                  </label>
                  {savingsGoals.length > 0 ? (
                    <select
                      value={previewSavingsContribution.matchedGoalId || savingsGoals[0].id}
                      onChange={(e) =>
                        setPreviewSavingsContribution({
                          ...previewSavingsContribution,
                          matchedGoalId: e.target.value,
                        })
                      }
                      className="form-select"
                      style={{ padding: '8px 12px', fontWeight: 600 }}
                    >
                      {savingsGoals.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name} (Saved: {currencySymbol}{(g.currentSavedMinor / 100).toLocaleString()})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={previewSavingsContribution.goalNameOrId}
                      readOnly
                      placeholder="No existing goal found"
                      className="form-input"
                      style={{ padding: '8px 12px', opacity: 0.7 }}
                    />
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--ink-secondary)', marginBottom: '4px' }}>
                    Contribution Amount ({currencySymbol})
                  </label>
                  <input
                    type="number"
                    value={previewSavingsContribution.amountMinor ? previewSavingsContribution.amountMinor / 100 : ''}
                    placeholder="e.g. 500"
                    onChange={(e) =>
                      setPreviewSavingsContribution({
                        ...previewSavingsContribution,
                        amountMinor: Math.round(parseFloat(e.target.value || '0') * 100),
                      })
                    }
                    className="form-input"
                    style={{ padding: '8px 12px', fontWeight: 700 }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--ink-secondary)', marginBottom: '4px' }}>
                    Date
                  </label>
                  <input
                    type="date"
                    value={previewSavingsContribution.dateLocal}
                    onChange={(e) => setPreviewSavingsContribution({ ...previewSavingsContribution, dateLocal: e.target.value })}
                    className="form-input"
                    style={{ padding: '8px 12px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--ink-secondary)', marginBottom: '4px' }}>
                    Note (Optional)
                  </label>
                  <input
                    type="text"
                    value={previewSavingsContribution.note || ''}
                    placeholder="e.g. Monthly deposit"
                    onChange={(e) => setPreviewSavingsContribution({ ...previewSavingsContribution, note: e.target.value })}
                    className="form-input"
                    style={{ padding: '8px 12px' }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* 3. PREVIEW: Create Recurring Bill */}
          {previewRecurringBill && !queryResponse && (
            <div
              style={{
                padding: '16px',
                backgroundColor: 'var(--surface-subtle)',
                border: '1px solid var(--border-color)',
                borderRadius: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Repeat size={18} color="#8B5CF6" />
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#8B5CF6', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Action Detected: Create Recurring Bill
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--ink-secondary)', marginBottom: '4px' }}>
                    Bill Name
                  </label>
                  <input
                    type="text"
                    value={previewRecurringBill.name}
                    onChange={(e) => setPreviewRecurringBill({ ...previewRecurringBill, name: e.target.value })}
                    className="form-input"
                    style={{ padding: '8px 12px', fontWeight: 600 }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--ink-secondary)', marginBottom: '4px' }}>
                    Amount ({currencySymbol})
                  </label>
                  <input
                    type="number"
                    value={previewRecurringBill.amountMinor ? previewRecurringBill.amountMinor / 100 : ''}
                    placeholder="e.g. 999"
                    onChange={(e) =>
                      setPreviewRecurringBill({
                        ...previewRecurringBill,
                        amountMinor: Math.round(parseFloat(e.target.value || '0') * 100),
                      })
                    }
                    className="form-input"
                    style={{ padding: '8px 12px', fontWeight: 700 }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--ink-secondary)', marginBottom: '4px' }}>
                    Frequency
                  </label>
                  <select
                    value={previewRecurringBill.frequency}
                    onChange={(e) =>
                      setPreviewRecurringBill({
                        ...previewRecurringBill,
                        frequency: e.target.value as BillFrequency,
                      })
                    }
                    className="form-select"
                    style={{ padding: '8px 12px', fontWeight: 600 }}
                  >
                    <option value="monthly">Monthly</option>
                    <option value="weekly">Weekly</option>
                    <option value="yearly">Yearly</option>
                    <option value="one_off">One-off</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--ink-secondary)', marginBottom: '4px' }}>
                    Category
                  </label>
                  <select
                    value={previewRecurringBill.categoryId}
                    onChange={(e) => setPreviewRecurringBill({ ...previewRecurringBill, categoryId: e.target.value })}
                    className="form-select"
                    style={{ padding: '8px 12px', fontWeight: 600 }}
                  >
                    {categories
                      .filter((c) => c.type === 'expense')
                      .map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--ink-secondary)', marginBottom: '4px' }}>
                    First Due Date
                  </label>
                  <input
                    type="date"
                    value={previewRecurringBill.dueDateLocal}
                    onChange={(e) => setPreviewRecurringBill({ ...previewRecurringBill, dueDateLocal: e.target.value })}
                    className="form-input"
                    style={{ padding: '8px 12px' }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* 4. PREVIEW: Edit Savings Goal Target */}
          {previewSavingsEdit && !queryResponse && (
            <div
              style={{
                padding: '16px',
                backgroundColor: 'var(--surface-subtle)',
                border: '1px solid var(--border-color)',
                borderRadius: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit3 size={18} color="#4F46E5" />
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#4F46E5', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Action Detected: Edit Savings Goal Target
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--ink-secondary)', marginBottom: '4px' }}>
                    Savings Goal
                  </label>
                  {savingsGoals.length > 0 ? (
                    <select
                      value={previewSavingsEdit.goalId || savingsGoals[0].id}
                      onChange={(e) => {
                        const found = savingsGoals.find((g) => g.id === e.target.value);
                        setPreviewSavingsEdit({
                          ...previewSavingsEdit,
                          goalId: e.target.value,
                          goalName: found ? found.name : previewSavingsEdit.goalName,
                        });
                      }}
                      className="form-select"
                      style={{ padding: '8px 12px', fontWeight: 600 }}
                    >
                      {savingsGoals.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name} (Current Target: {currencySymbol}{(g.targetMinor / 100).toLocaleString()})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={previewSavingsEdit.goalName}
                      readOnly
                      className="form-input"
                      style={{ padding: '8px 12px', opacity: 0.7 }}
                    />
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--ink-secondary)', marginBottom: '4px' }}>
                    New Target Amount ({currencySymbol})
                  </label>
                  <input
                    type="number"
                    value={previewSavingsEdit.newTargetMinor ? previewSavingsEdit.newTargetMinor / 100 : ''}
                    placeholder="e.g. 60000"
                    onChange={(e) =>
                      setPreviewSavingsEdit({
                        ...previewSavingsEdit,
                        newTargetMinor: Math.round(parseFloat(e.target.value || '0') * 100),
                      })
                    }
                    className="form-input"
                    style={{ padding: '8px 12px', fontWeight: 700 }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* 5. PREVIEW: Delete Savings Goal */}
          {previewSavingsDelete && !queryResponse && (
            <div
              style={{
                padding: '16px',
                backgroundColor: 'var(--negative-bg)',
                border: '1px solid var(--negative-border)',
                borderRadius: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Trash2 size={18} color="var(--negative-crimson)" />
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--negative-crimson)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Confirmation Required: Delete Savings Goal
                </span>
              </div>

              <p style={{ fontSize: '0.8125rem', color: 'var(--ink-primary)', margin: 0, lineHeight: 1.5 }}>
                Are you sure you want to delete savings goal <strong>"{previewSavingsDelete.goalName}"</strong>?
                This action requires your explicit confirmation before removal.
              </p>
            </div>
          )}

          {/* 6. PREVIEW: Show Savings History */}
          {previewSavingsHistory && !queryResponse && (
            <div
              style={{
                padding: '16px',
                backgroundColor: 'var(--surface-subtle)',
                border: '1px solid var(--border-color)',
                borderRadius: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <History size={18} color="#059669" />
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Action Detected: View Savings Goal History
                </span>
              </div>

              <p style={{ fontSize: '0.8125rem', color: 'var(--ink-primary)', margin: 0 }}>
                View complete deposit history and progress details for <strong>"{previewSavingsHistory.goalName}"</strong>.
              </p>
            </div>
          )}

          {/* 7. PREVIEW: Record Bill Payment */}
          {previewBillPayment && !queryResponse && (
            <div
              style={{
                padding: '16px',
                backgroundColor: 'var(--surface-subtle)',
                border: '1px solid var(--border-color)',
                borderRadius: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CreditCard size={18} color="#D97706" />
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#D97706', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Action Detected: Record Bill Payment
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--ink-secondary)', marginBottom: '4px' }}>
                    Tracked Bill
                  </label>
                  {bills.length > 0 ? (
                    <select
                      value={previewBillPayment.billId || bills[0].id}
                      onChange={(e) => {
                        const found = bills.find((b) => b.id === e.target.value);
                        setPreviewBillPayment({
                          ...previewBillPayment,
                          billId: e.target.value,
                          billName: found ? found.name : previewBillPayment.billName,
                          amountMinor: found ? found.amountMinor : previewBillPayment.amountMinor,
                        });
                      }}
                      className="form-select"
                      style={{ padding: '8px 12px', fontWeight: 600 }}
                    >
                      {bills.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({currencySymbol}{(b.amountMinor / 100).toLocaleString()}{b.isPaid ? ' - Paid' : ''})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={previewBillPayment.billName}
                      readOnly
                      className="form-input"
                      style={{ padding: '8px 12px', opacity: 0.7 }}
                    />
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--ink-secondary)', marginBottom: '4px' }}>
                    Payment Amount ({currencySymbol})
                  </label>
                  <input
                    type="number"
                    value={previewBillPayment.amountMinor ? previewBillPayment.amountMinor / 100 : ''}
                    placeholder="e.g. 1500"
                    onChange={(e) =>
                      setPreviewBillPayment({
                        ...previewBillPayment,
                        amountMinor: Math.round(parseFloat(e.target.value || '0') * 100),
                      })
                    }
                    className="form-input"
                    style={{ padding: '8px 12px', fontWeight: 700 }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* 8. PREVIEW: Income / Expense Transactions */}
          {previewTransactions.length > 0 &&
            !queryResponse &&
            !previewSavingsGoal &&
            !previewSavingsContribution &&
            !previewSavingsEdit &&
            !previewSavingsDelete &&
            !previewSavingsHistory &&
            !previewBillPayment &&
            !previewRecurringBill && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--ink-muted)' }}>
                Recognized Entry Preview ({previewTransactions.length})
              </div>

              {previewTransactions.map((tx, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '16px',
                    backgroundColor: 'var(--surface-subtle)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {/* Amount */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--ink-secondary)', marginBottom: '4px' }}>
                        Amount ({currencySymbol})
                      </label>
                      <input
                        type="number"
                        value={tx.amountMinor ? tx.amountMinor / 100 : ''}
                        onChange={(e) => {
                          const updated = [...previewTransactions];
                          updated[idx] = {
                            ...updated[idx],
                            amountMinor: Math.round(parseFloat(e.target.value || '0') * 100),
                          };
                          setPreviewTransactions(updated);
                        }}
                        className="form-input"
                        style={{ padding: '8px 12px', fontWeight: 700 }}
                      />
                    </div>

                    {/* Type */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--ink-secondary)', marginBottom: '4px' }}>
                        Type
                      </label>
                      <select
                        value={tx.type}
                        onChange={(e) => {
                          const updated = [...previewTransactions];
                          updated[idx] = {
                            ...updated[idx],
                            type: e.target.value as TransactionType,
                          };
                          setPreviewTransactions(updated);
                        }}
                        className="form-select"
                        style={{ padding: '8px 12px', fontWeight: 600 }}
                      >
                        <option value="expense">Expense</option>
                        <option value="income">Income</option>
                      </select>
                    </div>

                    {/* Category */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--ink-secondary)', marginBottom: '4px' }}>
                        Category
                      </label>
                      <select
                        value={resolveTransactionCategory(tx.categoryId, categories, tx.note || manualTranscript, tx.type)?.id || tx.categoryId || ''}
                        onChange={(e) => {
                          const updated = [...previewTransactions];
                          updated[idx] = {
                            ...updated[idx],
                            categoryId: e.target.value,
                          };
                          setPreviewTransactions(updated);
                        }}
                        className="form-select"
                        style={{ padding: '8px 12px', fontWeight: 600 }}
                      >
                        {categories
                          .filter((c) => c.type === tx.type)
                          .map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.name}
                            </option>
                          ))}
                      </select>
                    </div>

                    {/* Date */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--ink-secondary)', marginBottom: '4px' }}>
                        Date
                      </label>
                      <input
                        type="date"
                        value={tx.dateLocal}
                        onChange={(e) => {
                          const updated = [...previewTransactions];
                          updated[idx] = {
                            ...updated[idx],
                            dateLocal: e.target.value,
                          };
                          setPreviewTransactions(updated);
                        }}
                        className="form-input"
                        style={{ padding: '8px 12px' }}
                      />
                    </div>

                    {/* Time (Recorded only for Today) */}
                    {tx.dateLocal === getTodayLocalDateString() && (
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--ink-secondary)', marginBottom: '4px' }}>
                          Time (Today)
                        </label>
                        <input
                          type="time"
                          value={tx.timeLocal || getCurrentLocalTimeString()}
                          onChange={(e) => {
                            const updated = [...previewTransactions];
                            updated[idx] = {
                              ...updated[idx],
                              timeLocal: e.target.value,
                            };
                            setPreviewTransactions(updated);
                          }}
                          className="form-input"
                          style={{ padding: '8px 12px' }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          className="voice-modal-footer"
          style={{
            padding: '16px 24px',
            backgroundColor: 'var(--surface-subtle)',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Button variant="ghost" onClick={handleCancel}>
            Cancel
          </Button>

          {/* Action-Specific Confirm Buttons */}
          {previewSavingsGoal && !queryResponse && (
            <Button
              variant="primary"
              onClick={handleSaveSavingsGoal}
              isLoading={isSaving}
              leftIcon={<Save size={16} />}
              disabled={!previewSavingsGoal.targetMinor || previewSavingsGoal.targetMinor <= 0}
            >
              Confirm & Create Savings Goal
            </Button>
          )}

          {previewSavingsContribution && !queryResponse && (
            <Button
              variant="primary"
              onClick={handleSaveSavingsContribution}
              isLoading={isSaving}
              leftIcon={<Save size={16} />}
              disabled={!previewSavingsContribution.amountMinor || previewSavingsContribution.amountMinor <= 0 || !previewSavingsContribution.matchedGoalId}
            >
              Confirm & Add Contribution
            </Button>
          )}

          {previewSavingsEdit && !queryResponse && (
            <Button
              variant="primary"
              onClick={handleSaveSavingsEdit}
              isLoading={isSaving}
              leftIcon={<Save size={16} />}
              disabled={!previewSavingsEdit.newTargetMinor || previewSavingsEdit.newTargetMinor <= 0}
            >
              Confirm & Update Goal Target
            </Button>
          )}

          {previewSavingsDelete && !queryResponse && (
            <Button
              variant="primary"
              onClick={handleConfirmDeleteSavingsGoal}
              isLoading={isSaving}
              leftIcon={<Trash2 size={16} />}
              style={{ backgroundColor: 'var(--negative-crimson)', borderColor: 'var(--negative-crimson)' }}
            >
              Confirm & Delete Goal
            </Button>
          )}

          {previewSavingsHistory && !queryResponse && (
            <Button
              variant="primary"
              onClick={handleShowSavingsHistory}
              leftIcon={<History size={16} />}
            >
              View Goal History
            </Button>
          )}

          {previewBillPayment && !queryResponse && (
            <Button
              variant="primary"
              onClick={handleSaveBillPayment}
              isLoading={isSaving}
              leftIcon={<CheckCircle size={16} />}
            >
              Confirm Bill Payment
            </Button>
          )}

          {previewRecurringBill && !queryResponse && (
            <Button
              variant="primary"
              onClick={handleSaveRecurringBill}
              isLoading={isSaving}
              leftIcon={<Save size={16} />}
              disabled={!previewRecurringBill.amountMinor || previewRecurringBill.amountMinor <= 0}
            >
              Confirm & Save Recurring Bill
            </Button>
          )}

          {previewTransactions.length > 0 &&
            !queryResponse &&
            !previewSavingsGoal &&
            !previewSavingsContribution &&
            !previewSavingsEdit &&
            !previewSavingsDelete &&
            !previewSavingsHistory &&
            !previewBillPayment &&
            !previewRecurringBill && (
            <Button
              variant="primary"
              onClick={handleSaveTransactions}
              isLoading={isSaving}
              leftIcon={<Save size={16} />}
            >
              Confirm & Save to Account
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
