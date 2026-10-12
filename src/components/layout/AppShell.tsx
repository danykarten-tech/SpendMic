import React from 'react';
import { DesktopSidebar, MobileBottomNav } from './Navigation';
import { Header } from './Header';
import { AddTransactionModal } from '../modals/AddTransactionModal';
import { TransactionDetailsModal } from '../modals/TransactionDetailsModal';
import { CategoriesManagerModal } from '../modals/CategoriesManagerModal';
import { SetBudgetModal } from '../modals/SetBudgetModal';
import { RecurringTemplateModal } from '../modals/RecurringTemplateModal';
import { DueOccurrencesModal } from '../modals/DueOccurrencesModal';
import { BillModal } from '../modals/BillModal';
import { SavingsModal } from '../modals/SavingsModal';
import { SavingsGoalDetailsModal } from '../modals/SavingsGoalDetailsModal';
import { SavingsContributionModal } from '../modals/SavingsContributionModal';
import { VoiceAssistantModal } from '../voice/VoiceAssistantModal';
import { NotificationCenterModal } from '../notifications/NotificationCenterModal';
import { useApp } from '../../context/AppContext';
import { useDeviceProtection } from '../../device-protection';

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isBlocked, isPending } = useDeviceProtection();
  const {
    isOffline,
    isRecurringModalOpen,
    closeRecurringModal,
    editingRecurringTemplate,
    isDueOccurrencesModalOpen,
    closeDueOccurrencesModal,
    pendingOccurrences,
    processPendingOccurrences,
    isBillModalOpen,
    closeBillModal,
    editingBill,
    isSavingsModalOpen,
    openSavingsModal,
    closeSavingsModal,
    editingSavingsGoal,
    isSavingsDetailsModalOpen,
    selectedSavingsGoalForDetails,
    closeSavingsDetailsModal,
    isSavingsContributionModalOpen,
    targetGoalForContribution,
    openSavingsContributionModal,
    closeSavingsContributionModal,
    isVoiceModalOpen,
    closeVoiceModal,
    isNotificationCenterOpen,
    closeNotificationCenter,
    categories,
    monthlySummary,
    refreshAllData,
  } = useApp();

  if (isBlocked) {
    return <>{children}</>;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-app)' }}>
      {/* Desktop Sidebar (visible on screens >= 1024px) */}
      <div className="sidebar-container">
        <DesktopSidebar />
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Header />

        {isPending && (
          <div
            style={{
              backgroundColor: 'var(--info-bg, #eff6ff)',
              borderBottom: '1px solid var(--info-border, #bfdbfe)',
              padding: '8px 16px',
              fontSize: '0.8125rem',
              color: 'var(--info-blue, #1d4ed8)',
              textAlign: 'center',
              fontWeight: 500,
            }}
          >
            Device license is pending online server confirmation. All changes remain safely saved locally on this device.
          </div>
        )}

        {isOffline && (
          <div
            style={{
              backgroundColor: 'var(--warning-bg)',
              borderBottom: '1px solid var(--warning-border)',
              padding: '8px 16px',
              fontSize: '0.8125rem',
              color: 'var(--warning-amber)',
              textAlign: 'center',
              fontWeight: 500,
            }}
          >
            You are currently offline. SpendMic AI works fully offline — all changes are stored locally in your browser.
          </div>
        )}

        <main
          className="app-main-content"
          style={{
            flex: 1,
            padding: '24px 16px 96px 16px', // bottom padding for mobile nav clearance
            maxWidth: 'var(--max-content-width)',
            width: '100%',
            margin: '0 auto',
          }}
        >
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation (visible on screens < 1024px) */}
      <div className="mobile-nav-container">
        <MobileBottomNav />
      </div>

      {/* Global Modals */}
      <AddTransactionModal />
      <TransactionDetailsModal />
      <CategoriesManagerModal />
      <SetBudgetModal />

      {/* Phase 4 Modals */}
      <RecurringTemplateModal
        isOpen={isRecurringModalOpen}
        onClose={closeRecurringModal}
        templateToEdit={editingRecurringTemplate}
      />
      <DueOccurrencesModal
        isOpen={isDueOccurrencesModalOpen}
        onClose={closeDueOccurrencesModal}
        pendingOccurrences={pendingOccurrences}
        onConfirmGenerated={async () => {
          await processPendingOccurrences(pendingOccurrences.map((p) => p.occurrenceKey));
        }}
      />
      <BillModal
        isOpen={isBillModalOpen}
        onClose={closeBillModal}
        billToEdit={editingBill}
      />
      <SavingsModal
        isOpen={isSavingsModalOpen}
        onClose={closeSavingsModal}
        goalToEdit={editingSavingsGoal}
      />
      <SavingsGoalDetailsModal
        isOpen={isSavingsDetailsModalOpen}
        onClose={closeSavingsDetailsModal}
        goal={selectedSavingsGoalForDetails}
        onOpenDeposit={(goal) => {
          openSavingsContributionModal(goal);
        }}
        onOpenEditGoal={(goal) => {
          openSavingsModal(goal);
        }}
      />
      <SavingsContributionModal
        isOpen={isSavingsContributionModalOpen}
        onClose={closeSavingsContributionModal}
        targetGoal={targetGoalForContribution}
      />
      <VoiceAssistantModal
        isOpen={isVoiceModalOpen}
        onClose={closeVoiceModal}
        categories={categories}
        monthlySummary={monthlySummary}
        onTransactionSaved={async () => {
          await refreshAllData();
        }}
      />
      <NotificationCenterModal
        isOpen={isNotificationCenterOpen}
        onClose={closeNotificationCenter}
      />
    </div>
  );
};
