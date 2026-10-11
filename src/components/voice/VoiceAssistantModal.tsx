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
  Trash2,
  HelpCircle,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { speechEngine, SpeechEngineState } from '../../services/voice/speechEngine';
import {
  parseVoiceCommand,
  executeVoiceQuery,
  type VoiceParseResult,
  type ParsedVoiceTransaction,
  type ParsedVoiceSavingsGoal,
  type ParsedVoiceSavingsContribution,
  type ParsedVoiceSavingsEdit,
  type ParsedVoiceSavingsDelete,
  type ParsedVoiceSavingsHistory,
  type ParsedVoiceBillPayment,
  type ParsedVoiceBillDelete,
  type ParsedVoiceRecurringBill,
  type ParsedVoiceBudget,
  VOICE_HELP_COMMANDS,
} from '../../domain/voiceCommandParser';
import { Category, MonthlySummary } from '../../domain/types';
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
    saveBill,
    deleteBill,
    saveBudget,
    markBillPaid,
    savingsGoals,
    bills,
    refreshAllData,
  } = useApp();

  const [engineState, setEngineState] = useState<SpeechEngineState>(speechEngine.getState());
  const [manualTranscript, setManualTranscript] = useState<string>('');
  const [previewTransactions, setPreviewTransactions] = useState<ParsedVoiceTransaction[]>([]);
  const [previewBudget, setPreviewBudget] = useState<ParsedVoiceBudget | null>(null);
  const [previewSavingsGoal, setPreviewSavingsGoal] = useState<ParsedVoiceSavingsGoal | null>(null);
  const [previewSavingsContribution, setPreviewSavingsContribution] = useState<ParsedVoiceSavingsContribution | null>(null);
  const [previewSavingsEdit, setPreviewSavingsEdit] = useState<ParsedVoiceSavingsEdit | null>(null);
  const [previewSavingsDelete, setPreviewSavingsDelete] = useState<ParsedVoiceSavingsDelete | null>(null);
  const [previewSavingsHistory, setPreviewSavingsHistory] = useState<ParsedVoiceSavingsHistory | null>(null);
  const [previewBillPayment, setPreviewBillPayment] = useState<ParsedVoiceBillPayment | null>(null);
  const [previewBillDelete, setPreviewBillDelete] = useState<ParsedVoiceBillDelete | null>(null);
  const [previewRecurringBill, setPreviewRecurringBill] = useState<ParsedVoiceRecurringBill | null>(null);
  const [clarificationPrompt, setClarificationPrompt] = useState<string | null>(null);
  const [queryResponse, setQueryResponse] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeHelpCategory, setActiveHelpCategory] = useState<number>(0);

  useEffect(() => {
    const unsubscribe = speechEngine.subscribe((state) => {
      setEngineState(state);
      if (state.transcript) {
        setManualTranscript(state.transcript);
      }
    });
    return () => unsubscribe();
  }, []);

  // Auto-start microphone listening when modal opens, cancel when closed
  useEffect(() => {
    if (isOpen) {
      setSuccessMessage(null);
      speechEngine.startListening();
    } else {
      speechEngine.cancelListening();
    }
  }, [isOpen]);

  // Parse command whenever transcript changes
  useEffect(() => {
    if (manualTranscript.trim()) {
      const result: VoiceParseResult = parseVoiceCommand(
        manualTranscript,
        categories,
        currentCurrency.code,
        savingsGoals,
        bills,
        previewTransactions.length > 0 ? { pendingTransactions: previewTransactions } : undefined
      );

      if (result.intent === 'CANCEL_PENDING') {
        handleCancel();
        return;
      }

      setPreviewTransactions(result.transactions || []);
      setPreviewBudget(result.budget || null);
      setPreviewSavingsGoal(result.savingsGoal || null);
      setPreviewSavingsContribution(result.savingsContribution || null);
      setPreviewSavingsEdit(result.savingsEdit || null);
      setPreviewSavingsDelete(result.savingsDelete || null);
      setPreviewSavingsHistory(result.savingsHistory || null);
      setPreviewBillPayment(result.billPayment || null);
      setPreviewBillDelete(result.billDelete || null);
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
      setPreviewTransactions([]);
      setPreviewBudget(null);
      setPreviewSavingsGoal(null);
      setPreviewSavingsContribution(null);
      setPreviewSavingsEdit(null);
      setPreviewSavingsDelete(null);
      setPreviewSavingsHistory(null);
      setPreviewBillPayment(null);
      setPreviewBillDelete(null);
      setPreviewRecurringBill(null);
      setClarificationPrompt(null);
      setQueryResponse(null);
    }
  }, [manualTranscript, categories, monthlySummary, currentCurrency.code, savingsGoals, bills]);

  if (!isOpen) return null;

  const clearActivePreviews = () => {
    setManualTranscript('');
    setPreviewTransactions([]);
    setPreviewBudget(null);
    setPreviewSavingsGoal(null);
    setPreviewSavingsContribution(null);
    setPreviewSavingsEdit(null);
    setPreviewSavingsDelete(null);
    setPreviewSavingsHistory(null);
    setPreviewBillPayment(null);
    setPreviewBillDelete(null);
    setPreviewRecurringBill(null);
    setClarificationPrompt(null);
    setQueryResponse(null);
  };

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
    setPreviewBudget(null);
    setPreviewSavingsGoal(null);
    setPreviewSavingsContribution(null);
    setPreviewSavingsEdit(null);
    setPreviewSavingsDelete(null);
    setPreviewSavingsHistory(null);
    setPreviewBillPayment(null);
    setPreviewBillDelete(null);
    setPreviewRecurringBill(null);
    setClarificationPrompt(null);
    setQueryResponse(null);
    setSuccessMessage(null);
  };

  const handleCloseModal = () => {
    handleCancel();
    onClose();
  };

  const handleSampleClick = (sample: string) => {
    setManualTranscript(sample);
  };

  const hasActiveContent = Boolean(
    previewTransactions.length > 0 ||
    previewBudget ||
    previewSavingsGoal ||
    previewSavingsContribution ||
    previewSavingsEdit ||
    previewSavingsDelete ||
    previewSavingsHistory ||
    previewBillPayment ||
    previewBillDelete ||
    previewRecurringBill ||
    queryResponse
  );

  // 1. Transaction Saver with Idempotency & Storage Verification
  const handleSaveTransactions = async () => {
    if (previewTransactions.length === 0 || isSaving) return;

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
      clearActivePreviews();
    } catch (err: any) {
      setIsSaving(false);
      alert(`Failed to save transaction: ${err.message}`);
    }
  };

  // 2. Budget Saver
  const handleSaveBudget = async () => {
    if (!previewBudget || !previewBudget.monthlyLimitMinor || previewBudget.monthlyLimitMinor <= 0 || isSaving) return;

    try {
      setIsSaving(true);
      const periodKey = new Date().toISOString().substring(0, 7);
      await saveBudget({
        periodKey,
        limitMinor: previewBudget.monthlyLimitMinor,
        categoryId: previewBudget.categoryId || undefined,
      });

      await refreshAllData();
      setIsSaving(false);
      const amtStr = (previewBudget.monthlyLimitMinor / 100).toLocaleString();
      const msg = `Saved budget of ${currencySymbol}${amtStr} for ${previewBudget.categoryName || 'all expenses'}!`;
      setSuccessMessage(msg);
      speechEngine.speak(msg);
      onTransactionSaved();
      clearActivePreviews();
    } catch (err: any) {
      setIsSaving(false);
      alert(`Failed to save budget: ${err.message}`);
    }
  };

  // 3. Savings Goal Creator
  const handleSaveSavingsGoal = async () => {
    if (!previewSavingsGoal || isSaving) return;
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
      clearActivePreviews();
    } catch (err: any) {
      setIsSaving(false);
      alert(`Failed to create savings goal: ${err.message}`);
    }
  };

  // 4. Savings Contribution
  const handleSaveSavingsContribution = async () => {
    if (!previewSavingsContribution || isSaving) return;
    const targetGoalId = previewSavingsContribution.matchedGoalId || (savingsGoals.length > 0 ? savingsGoals[0].id : null);
    if (!targetGoalId) {
      alert('Please select a valid savings goal.');
      return;
    }
    if (!previewSavingsContribution.amountMinor || previewSavingsContribution.amountMinor <= 0) {
      alert('Please enter a valid deposit amount.');
      return;
    }

    try {
      setIsSaving(true);
      await addSavingsContribution(
        targetGoalId,
        previewSavingsContribution.amountMinor,
        previewSavingsContribution.note || `Voice Deposit: ${manualTranscript}`
      );

      await refreshAllData();
      setIsSaving(false);
      const goal = savingsGoals.find((g) => g.id === targetGoalId);
      const amtStr = (previewSavingsContribution.amountMinor / 100).toLocaleString();
      const msg = `Added ${currencySymbol}${amtStr} to "${goal?.name || 'Savings Goal'}"!`;
      setSuccessMessage(msg);
      speechEngine.speak(msg);
      onTransactionSaved();
      clearActivePreviews();
    } catch (err: any) {
      setIsSaving(false);
      alert(`Failed to add deposit: ${err.message}`);
    }
  };

  // 5. Recurring Bill
  const handleSaveRecurringBill = async () => {
    if (!previewRecurringBill || isSaving) return;
    if (!previewRecurringBill.amountMinor || previewRecurringBill.amountMinor <= 0) {
      alert('Please enter a valid recurring bill amount.');
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
        categoryId: previewRecurringBill.categoryId || 'cat_utilities',
        isPaid: false,
      });

      await refreshAllData();
      setIsSaving(false);
      const amtStr = (previewRecurringBill.amountMinor / 100).toLocaleString();
      const msg = `Saved recurring monthly bill for "${previewRecurringBill.name}" (${currencySymbol}${amtStr})!`;
      setSuccessMessage(msg);
      speechEngine.speak(msg);
      onTransactionSaved();
      clearActivePreviews();
    } catch (err: any) {
      setIsSaving(false);
      alert(`Failed to save recurring bill: ${err.message}`);
    }
  };

  // 6. Savings Edit
  const handleSaveSavingsEdit = async () => {
    if (!previewSavingsEdit || isSaving) return;
    const targetGoalId = previewSavingsEdit.goalId || (savingsGoals.length > 0 ? savingsGoals[0].id : null);
    if (!targetGoalId) return;
    const goal = savingsGoals.find((g) => g.id === targetGoalId);
    if (!goal || !previewSavingsEdit.newTargetMinor) return;

    try {
      setIsSaving(true);
      await saveSavingsGoal({ ...goal, targetMinor: previewSavingsEdit.newTargetMinor }, goal.id);
      await refreshAllData();
      setIsSaving(false);
      const targetStr = (previewSavingsEdit.newTargetMinor / 100).toLocaleString();
      const msg = `Updated target for "${goal.name}" to ${currencySymbol}${targetStr}!`;
      setSuccessMessage(msg);
      speechEngine.speak(msg);
      onTransactionSaved();
      clearActivePreviews();
    } catch (err: any) {
      setIsSaving(false);
      alert(`Failed to update goal: ${err.message}`);
    }
  };

  // 7. Savings Delete
  const handleConfirmDeleteSavingsGoal = async () => {
    if (!previewSavingsDelete || isSaving) return;
    const targetGoalId = previewSavingsDelete.goalId || (savingsGoals.length > 0 ? savingsGoals[0].id : null);
    if (!targetGoalId) return;
    const goal = savingsGoals.find((g) => g.id === targetGoalId);
    if (!goal) return;

    try {
      setIsSaving(true);
      await deleteSavingsGoal(goal.id);
      await refreshAllData();
      setIsSaving(false);
      const msg = `Deleted savings goal "${goal.name}".`;
      setSuccessMessage(msg);
      speechEngine.speak(msg);
      onTransactionSaved();
      clearActivePreviews();
    } catch (err: any) {
      setIsSaving(false);
      alert(`Failed to delete goal: ${err.message}`);
    }
  };

  // 8. Bill Payment
  const handleSaveBillPayment = async () => {
    if (!previewBillPayment || isSaving) return;
    const targetBillId = previewBillPayment.billId || (bills.length > 0 ? bills[0].id : null);
    if (!targetBillId) return;
    const bill = bills.find((b) => b.id === targetBillId);
    if (!bill) return;

    try {
      setIsSaving(true);
      await markBillPaid(bill.id, true);
      await refreshAllData();
      setIsSaving(false);
      const msg = `Recorded bill payment for "${bill.name}"!`;
      setSuccessMessage(msg);
      speechEngine.speak(msg);
      onTransactionSaved();
      clearActivePreviews();
    } catch (err: any) {
      setIsSaving(false);
      alert(`Failed to record bill payment: ${err.message}`);
    }
  };

  // 9. Bill Deletion
  const handleConfirmDeleteBill = async () => {
    if (!previewBillDelete || isSaving) return;
    const targetBillId = previewBillDelete.billId || (bills.length > 0 ? bills[0].id : null);
    if (!targetBillId) return;
    const bill = bills.find((b) => b.id === targetBillId);
    if (!bill) return;

    try {
      setIsSaving(true);
      await deleteBill(bill.id);
      await refreshAllData();
      setIsSaving(false);
      const msg = `Deleted bill "${bill.name}".`;
      setSuccessMessage(msg);
      speechEngine.speak(msg);
      onTransactionSaved();
      clearActivePreviews();
    } catch (err: any) {
      setIsSaving(false);
      alert(`Failed to delete bill: ${err.message}`);
    }
  };

  return (
    <div className="modal-backdrop">
      <div
        className="modal-content"
        style={{
          maxWidth: '560px',
          width: '95%',
          maxHeight: 'min(90vh, 620px)',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#FFFFFF',
          borderRadius: '20px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          border: '1px solid var(--border-color)',
        }}
      >
        {/* Compact Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #4338CA 0%, #5B46E5 50%, #6366F1 100%)',
            padding: '12px 20px',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                padding: '6px',
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Sparkles size={18} color="#C7D2FE" />
            </div>
            <div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#FFFFFF', lineHeight: 1.2 }}>
                SpendMic Offline Voice Assistant
              </div>
              <div style={{ fontSize: '0.6875rem', color: 'rgba(255, 255, 255, 0.85)', fontWeight: 500 }}>
                100% On-Device Neural Speech Recognition
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              onClick={() => speechEngine.toggleMute()}
              style={{
                padding: '6px',
                color: '#FFFFFF',
                borderRadius: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.12)',
                cursor: 'pointer',
              }}
              title={engineState.isMuted ? 'Unmute Audio Response' : 'Mute Audio Response'}
            >
              {engineState.isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <button
              onClick={handleCloseModal}
              style={{
                padding: '6px',
                color: '#FFFFFF',
                borderRadius: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.12)',
                cursor: 'pointer',
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Modal Viewport Body — Fits completely without unnecessary scrolling */}
        <div
          style={{
            padding: '14px 18px',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            overflowY: 'auto',
          }}
        >
          {/* Status Message / Success Toast */}
          {successMessage && (
            <div
              style={{
                padding: '10px 14px',
                backgroundColor: 'var(--positive-bg)',
                border: '1px solid var(--positive-border)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: 'var(--positive-emerald)',
                fontSize: '0.8125rem',
                fontWeight: 600,
                flexShrink: 0,
              }}
            >
              <CheckCircle size={16} color="#10B981" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Clarification Alert (Section 5 & 11) */}
          {clarificationPrompt && (
            <div
              style={{
                padding: '10px 14px',
                backgroundColor: 'var(--warning-bg)',
                border: '1px solid var(--warning-border)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                flexShrink: 0,
              }}
            >
              <AlertCircle size={18} color="#D97706" style={{ flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', color: '#D97706' }}>
                  Clarification Required
                </div>
                <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--ink-primary)' }}>
                  {clarificationPrompt}
                </div>
              </div>
            </div>
          )}

          {/* Q&A Query Answer (Section 4 & 7) */}
          {queryResponse && (
            <div
              style={{
                padding: '12px 14px',
                backgroundColor: 'var(--primary-subtle)',
                border: '1px solid var(--primary-border)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                flexShrink: 0,
              }}
            >
              <Sparkles size={18} color="#5B46E5" style={{ flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', color: '#5B46E5' }}>
                  Financial Insights
                </div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--ink-primary)' }}>
                  {queryResponse}
                </div>
              </div>
            </div>
          )}

          {/* TOP BAR / CONTROL STRIP (When active content is present) */}
          {hasActiveContent ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                backgroundColor: 'var(--surface-subtle)',
                borderRadius: '12px',
                border: '1px solid var(--border-color)',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {engineState.status === 'listening' ? (
                  <button
                    onClick={handleStopListening}
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      backgroundColor: '#EF4444',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      border: '2px solid #FCA5A5',
                      animation: 'pulse 1.5s infinite',
                    }}
                    title="Listening... Tap to stop"
                  >
                    <Square size={14} style={{ fill: '#FFFFFF' }} />
                  </button>
                ) : engineState.status === 'processing' ? (
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #7928CA 0%, #4F46E5 100%)',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  </div>
                ) : (
                  <button
                    onClick={handleStartListening}
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #FF2E93 0%, #7928CA 50%, #4F46E5 100%)',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      border: 'none',
                    }}
                    title="Tap to speak correction or follow-up"
                  >
                    <Mic size={16} />
                  </button>
                )}

                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--ink-primary)' }}>
                    {engineState.status === 'listening'
                      ? 'Listening to speech...'
                      : engineState.status === 'processing'
                      ? 'Processing audio on-device...'
                      : 'Voice Ready (Tap mic to speak)'}
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--ink-muted)' }}>
                    Speak corrections or edit fields below
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                <Button variant="ghost" size="sm" onClick={handleStartListening}>
                  <RefreshCw size={13} style={{ marginRight: '4px' }} />
                  Retry
                </Button>
              </div>
            </div>
          ) : (
            /* IDLE MODE: Friendly centered microphone & Help commands */
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', flexShrink: 0 }}>
              {/* Mic Button */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '6px' }}>
                {engineState.status === 'listening' ? (
                  <button
                    onClick={handleStopListening}
                    style={{
                      width: '72px',
                      height: '72px',
                      borderRadius: '50%',
                      backgroundColor: '#EF4444',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 8px 24px rgba(239, 68, 68, 0.45)',
                      animation: 'pulse 1.5s infinite',
                      cursor: 'pointer',
                      border: '3px solid #FCA5A5',
                    }}
                  >
                    <Square size={26} style={{ fill: '#FFFFFF' }} />
                  </button>
                ) : engineState.status === 'processing' ? (
                  <div
                    style={{
                      width: '72px',
                      height: '72px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #7928CA 0%, #4F46E5 100%)',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 8px 24px rgba(79, 70, 229, 0.45)',
                    }}
                  >
                    <Loader2 size={30} style={{ animation: 'spin 1s linear infinite' }} />
                  </div>
                ) : (
                  <button
                    onClick={handleStartListening}
                    disabled={engineState.status !== 'ready' && engineState.status !== 'unloaded'}
                    style={{
                      width: '72px',
                      height: '72px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #FF2E93 0%, #7928CA 50%, #4F46E5 100%)',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 8px 24px rgba(124, 58, 237, 0.45)',
                      cursor: 'pointer',
                      border: '3px solid rgba(255, 255, 255, 0.9)',
                    }}
                  >
                    <Mic size={30} />
                  </button>
                )}

                <div style={{ textAlign: 'center', marginTop: '8px' }}>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--primary-brand)' }}>
                    {engineState.status === 'listening' ? 'Recording... Tap when finished' : 'Tap Microphone to Speak'}
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--ink-secondary)' }}>
                    Supports English, Hindi, and Hinglish financial commands
                  </div>
                </div>
              </div>

              {/* What can I say pill grid */}
              <div
                style={{
                  backgroundColor: 'var(--surface-subtle)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '14px',
                  padding: '10px 14px',
                  width: '100%',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', fontWeight: 700 }}>
                    <HelpCircle size={13} color="#5B46E5" />
                    <span>What can I say?</span>
                  </div>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--ink-muted)' }}>Tap example to test</span>
                </div>

                <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '6px', marginBottom: '8px' }}>
                  {VOICE_HELP_COMMANDS.map((cat, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveHelpCategory(idx)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '16px',
                        fontSize: '0.72rem',
                        fontWeight: activeHelpCategory === idx ? 700 : 500,
                        backgroundColor: activeHelpCategory === idx ? '#4F46E5' : 'var(--surface-card)',
                        color: activeHelpCategory === idx ? '#FFFFFF' : 'var(--ink-secondary)',
                        border: '1px solid ' + (activeHelpCategory === idx ? '#4F46E5' : 'var(--border-color)'),
                        whiteSpace: 'nowrap',
                        cursor: 'pointer',
                        flexShrink: 0,
                      }}
                    >
                      {cat.title}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', maxHeight: '135px', overflowY: 'auto' }}>
                  {VOICE_HELP_COMMANDS[activeHelpCategory]?.examples.map((ex, exIdx) => (
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
                        fontSize: '0.78125rem',
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
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* SPOKEN TRANSCRIPT INPUT (Always rendered for testability & manual edits) */}
          <div style={{ flexShrink: 0 }}>
            <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: '4px' }}>
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
                padding: '8px 12px',
                borderRadius: '10px',
                fontSize: '0.8125rem',
                fontWeight: 500,
              }}
            />
          </div>

          {/* REVIEW PANELS (Compact, cleanly fitted) */}

          {/* A. Transactions Review (Expense / Income) */}
          {previewTransactions.length > 0 && !queryResponse && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--ink-muted)' }}>
                Recognized Entry Preview ({previewTransactions.length})
              </div>

              {previewTransactions.map((tx, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '10px 12px',
                    backgroundColor: 'var(--surface-subtle)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '0.6875rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          backgroundColor: tx.type === 'income' ? '#DCFCE7' : '#FEE2E2',
                          color: tx.type === 'income' ? '#15803D' : '#B91C1C',
                        }}
                      >
                        {tx.type}
                      </span>
                      {previewTransactions.length > 1 && (
                        <span style={{ fontSize: '0.6875rem', color: 'var(--ink-muted)' }}>
                          Item #{idx + 1}
                        </span>
                      )}
                    </div>

                    <input
                      type="date"
                      value={tx.dateLocal}
                      onChange={(e) => {
                        const updated = [...previewTransactions];
                        updated[idx] = { ...updated[idx], dateLocal: e.target.value };
                        setPreviewTransactions(updated);
                      }}
                      className="form-input"
                      style={{ padding: '4px 8px', fontSize: '0.75rem', width: 'auto' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {/* Amount */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, color: 'var(--ink-secondary)', marginBottom: '2px' }}>
                        Amount ({currencySymbol})
                      </label>
                      <input
                        type="number"
                        value={tx.amountMinor ? tx.amountMinor / 100 : ''}
                        placeholder="Amount"
                        onChange={(e) => {
                          const updated = [...previewTransactions];
                          updated[idx] = {
                            ...updated[idx],
                            amountMinor: Math.round(parseFloat(e.target.value || '0') * 100),
                            isAmbiguous: false,
                          };
                          setPreviewTransactions(updated);
                        }}
                        className="form-input"
                        style={{ padding: '6px 10px', fontSize: '0.875rem', fontWeight: 700 }}
                      />
                    </div>

                    {/* Category */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, color: 'var(--ink-secondary)', marginBottom: '2px' }}>
                        Category
                      </label>
                      <select
                        value={resolveTransactionCategory(tx.categoryId, categories, tx.note || manualTranscript, tx.type)?.id || tx.categoryId || ''}
                        onChange={(e) => {
                          const updated = [...previewTransactions];
                          updated[idx] = { ...updated[idx], categoryId: e.target.value };
                          setPreviewTransactions(updated);
                        }}
                        className="form-select"
                        style={{ padding: '6px 10px', fontSize: '0.8125rem', fontWeight: 600 }}
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
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* B. Budget Setting Review (Section 4) */}
          {previewBudget && !queryResponse && (
            <div
              style={{
                padding: '10px 12px',
                backgroundColor: 'var(--surface-subtle)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Target size={16} color="#4F46E5" />
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4F46E5', textTransform: 'uppercase' }}>
                  Proposed Action: Set Monthly Budget
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, color: 'var(--ink-secondary)', marginBottom: '2px' }}>
                    Monthly Limit ({currencySymbol})
                  </label>
                  <input
                    type="number"
                    value={previewBudget.monthlyLimitMinor ? previewBudget.monthlyLimitMinor / 100 : ''}
                    placeholder="e.g. 5000"
                    onChange={(e) =>
                      setPreviewBudget({
                        ...previewBudget,
                        monthlyLimitMinor: Math.round(parseFloat(e.target.value || '0') * 100),
                      })
                    }
                    className="form-input"
                    style={{ padding: '6px 10px', fontSize: '0.875rem', fontWeight: 700 }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, color: 'var(--ink-secondary)', marginBottom: '2px' }}>
                    Category
                  </label>
                  <select
                    value={previewBudget.categoryId || ''}
                    onChange={(e) =>
                      setPreviewBudget({
                        ...previewBudget,
                        categoryId: e.target.value || null,
                      })
                    }
                    className="form-select"
                    style={{ padding: '6px 10px', fontSize: '0.8125rem', fontWeight: 600 }}
                  >
                    <option value="">Overall Monthly Budget</option>
                    {categories
                      .filter((c) => c.type === 'expense')
                      .map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* C. Savings Goal Review */}
          {previewSavingsGoal && !queryResponse && (
            <div
              style={{
                padding: '10px 12px',
                backgroundColor: 'var(--surface-subtle)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Target size={16} color="#10B981" />
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#10B981', textTransform: 'uppercase' }}>
                  Action Detected: Create Savings Goal
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, color: 'var(--ink-secondary)', marginBottom: '2px' }}>
                    Goal Name
                  </label>
                  <input
                    type="text"
                    value={previewSavingsGoal.name}
                    onChange={(e) => setPreviewSavingsGoal({ ...previewSavingsGoal, name: e.target.value })}
                    className="form-input"
                    style={{ padding: '6px 10px', fontSize: '0.8125rem', fontWeight: 600 }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, color: 'var(--ink-secondary)', marginBottom: '2px' }}>
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
                    style={{ padding: '6px 10px', fontSize: '0.875rem', fontWeight: 700 }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* D. Savings Contribution Review */}
          {previewSavingsContribution && !queryResponse && (
            <div
              style={{
                padding: '10px 12px',
                backgroundColor: 'var(--surface-subtle)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <PiggyBank size={16} color="#3B82F6" />
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#3B82F6', textTransform: 'uppercase' }}>
                  Action Detected: Add Savings Contribution
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, color: 'var(--ink-secondary)', marginBottom: '2px' }}>
                    Target Goal
                  </label>
                  {savingsGoals.length > 0 ? (
                    <select
                      value={previewSavingsContribution.matchedGoalId || savingsGoals[0].id}
                      onChange={(e) =>
                        setPreviewSavingsContribution({ ...previewSavingsContribution, matchedGoalId: e.target.value })
                      }
                      className="form-select"
                      style={{ padding: '6px 10px', fontSize: '0.8125rem', fontWeight: 600 }}
                    >
                      {savingsGoals.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={previewSavingsContribution.goalNameOrId}
                      readOnly
                      className="form-input"
                      style={{ padding: '6px 10px', fontSize: '0.8125rem' }}
                    />
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, color: 'var(--ink-secondary)', marginBottom: '2px' }}>
                    Amount ({currencySymbol})
                  </label>
                  <input
                    type="number"
                    value={previewSavingsContribution.amountMinor ? previewSavingsContribution.amountMinor / 100 : ''}
                    onChange={(e) =>
                      setPreviewSavingsContribution({
                        ...previewSavingsContribution,
                        amountMinor: Math.round(parseFloat(e.target.value || '0') * 100),
                      })
                    }
                    className="form-input"
                    style={{ padding: '6px 10px', fontSize: '0.875rem', fontWeight: 700 }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* E. Recurring Bill Review */}
          {previewRecurringBill && !queryResponse && (
            <div
              style={{
                padding: '10px 12px',
                backgroundColor: 'var(--surface-subtle)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Repeat size={16} color="#7C3AED" />
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#7C3AED', textTransform: 'uppercase' }}>
                  Action Detected: Create Recurring Bill
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, color: 'var(--ink-secondary)', marginBottom: '2px' }}>
                    Bill Name
                  </label>
                  <input
                    type="text"
                    value={previewRecurringBill.name}
                    onChange={(e) => setPreviewRecurringBill({ ...previewRecurringBill, name: e.target.value })}
                    className="form-input"
                    style={{ padding: '6px 10px', fontSize: '0.8125rem', fontWeight: 600 }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, color: 'var(--ink-secondary)', marginBottom: '2px' }}>
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
                    style={{ padding: '6px 10px', fontSize: '0.875rem', fontWeight: 700 }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* F. Bill Delete Review */}
          {previewBillDelete && !queryResponse && (
            <div
              style={{
                padding: '10px 12px',
                backgroundColor: 'var(--surface-subtle)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Trash2 size={16} color="var(--negative-crimson)" />
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--negative-crimson)', textTransform: 'uppercase' }}>
                  Action Detected: Delete Bill
                </span>
              </div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--ink-primary)' }}>
                Are you sure you want to delete bill "{previewBillDelete.billName}"?
              </div>
            </div>
          )}
        </div>

        {/* FIXED ACTION FOOTER — ALWAYS VISIBLE WITHOUT SCROLLING (Section 10) */}
        <div
          className="voice-modal-footer"
          style={{
            padding: '12px 18px',
            backgroundColor: 'var(--surface-subtle)',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <Button variant="ghost" size="sm" onClick={handleCloseModal}>
            Cancel
          </Button>

          {/* Action Confirmation Buttons */}
          {previewBudget && !queryResponse && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveBudget}
              isLoading={isSaving}
              leftIcon={<Save size={15} />}
              disabled={!previewBudget.monthlyLimitMinor || previewBudget.monthlyLimitMinor <= 0}
            >
              Confirm & Save Budget
            </Button>
          )}

          {previewSavingsGoal && !queryResponse && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveSavingsGoal}
              isLoading={isSaving}
              leftIcon={<Save size={15} />}
              disabled={!previewSavingsGoal.targetMinor || previewSavingsGoal.targetMinor <= 0}
            >
              Confirm & Create Savings Goal
            </Button>
          )}

          {previewSavingsContribution && !queryResponse && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveSavingsContribution}
              isLoading={isSaving}
              leftIcon={<Save size={15} />}
              disabled={!previewSavingsContribution.amountMinor || previewSavingsContribution.amountMinor <= 0}
            >
              Confirm & Add Contribution
            </Button>
          )}

          {previewSavingsEdit && !queryResponse && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveSavingsEdit}
              isLoading={isSaving}
              leftIcon={<Save size={15} />}
              disabled={!previewSavingsEdit.newTargetMinor || previewSavingsEdit.newTargetMinor <= 0}
            >
              Confirm & Update Goal Target
            </Button>
          )}

          {previewSavingsDelete && !queryResponse && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleConfirmDeleteSavingsGoal}
              isLoading={isSaving}
              leftIcon={<Trash2 size={15} />}
              style={{ backgroundColor: 'var(--negative-crimson)', borderColor: 'var(--negative-crimson)' }}
            >
              Confirm & Delete Goal
            </Button>
          )}

          {previewRecurringBill && !queryResponse && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveRecurringBill}
              isLoading={isSaving}
              leftIcon={<Save size={15} />}
              disabled={!previewRecurringBill.amountMinor || previewRecurringBill.amountMinor <= 0}
            >
              Confirm & Save Recurring Bill
            </Button>
          )}

          {previewBillPayment && !queryResponse && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveBillPayment}
              isLoading={isSaving}
              leftIcon={<CheckCircle size={15} />}
            >
              Confirm Bill Payment
            </Button>
          )}

          {previewBillDelete && !queryResponse && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleConfirmDeleteBill}
              isLoading={isSaving}
              leftIcon={<Trash2 size={15} />}
              style={{ backgroundColor: 'var(--negative-crimson)', borderColor: 'var(--negative-crimson)' }}
            >
              Confirm & Delete Bill
            </Button>
          )}

          {previewTransactions.length > 0 &&
            !queryResponse &&
            !previewBudget &&
            !previewSavingsGoal &&
            !previewSavingsContribution &&
            !previewSavingsEdit &&
            !previewSavingsDelete &&
            !previewBillPayment &&
            !previewRecurringBill && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveTransactions}
                isLoading={isSaving}
                leftIcon={<Save size={15} />}
                disabled={previewTransactions.some((t) => !t.amountMinor || t.isAmbiguous)}
              >
                Confirm & Save to Account
              </Button>
            )}
        </div>
      </div>
    </div>
  );
};
