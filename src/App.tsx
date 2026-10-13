import React from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider } from './components/ui/Toast';
import { AppProvider, useApp } from './context/AppContext';
import { AppShell } from './components/layout/AppShell';

import { HomeView } from './views/HomeView';
import { TransactionsView } from './views/TransactionsView';
import { BudgetsView } from './views/BudgetsView';
import { ReportsView } from './views/ReportsView';
import { RecurringView } from './views/RecurringView';
import { BillsView } from './views/BillsView';
import { SavingsView } from './views/SavingsView';
import { SettingsView } from './views/SettingsView';

import { ITransactionRepository } from './storage/storageRepository';

import { DeviceProtectionProvider, useDeviceProtection, DeviceBlockedScreen, DeviceActivationScreen } from './device-protection';
import { isRunningInstalledPWA } from './device-protection/installMode';

const MainContent: React.FC = () => {
  const { activeTab } = useApp();
  const { isBlocked, isUnactivated } = useDeviceProtection();
  const requiresActivation = isRunningInstalledPWA();

  if (requiresActivation && isUnactivated) {
    return <DeviceActivationScreen />;
  }

  if (requiresActivation && isBlocked) {
    return <DeviceBlockedScreen />;
  }

  switch (activeTab) {
    case 'home':
      return <HomeView />;
    case 'transactions':
      return <TransactionsView />;
    case 'budgets':
      return <BudgetsView />;
    case 'reports':
      return <ReportsView />;
    case 'recurring':
      return <RecurringView />;
    case 'bills':
      return <BillsView />;
    case 'savings':
      return <SavingsView />;
    case 'settings':
      return <SettingsView />;
    default:
      return <HomeView />;
  }
};

export function App({ repository }: { repository?: ITransactionRepository } = {}) {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AppProvider repository={repository}>
          <DeviceProtectionProvider>
            <AppShell>
              <MainContent />
            </AppShell>
          </DeviceProtectionProvider>
        </AppProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
