import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import DashboardView from './views/DashboardView';
import WalletsView from './views/WalletsView';
import BudgetView from './views/BudgetView';
import TransactionsView from './views/TransactionsView';
import ReportsView from './views/ReportsView';
import SettingsView from './views/SettingsView';
import SignInView from './views/SignInView';
import QuickEntryModal from './components/QuickEntryModal';
import ToastContainer from './components/ToastContainer';
import { AnimatePresence } from 'motion/react';

function AppContent() {
  const { currentView, isAuthenticated, isLoading, authLoading } = useApp();

  // Show nothing while checking if user has a saved session
  if (authLoading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="w-12 h-12 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-on-surface/40 text-xs font-bold uppercase tracking-[0.3em]">Restoring session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <SignInView />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="w-12 h-12 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-on-surface/40 text-xs font-bold uppercase tracking-[0.3em]">Loading your data...</p>
        </div>
        <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden">
          <div className="absolute top-[-100px] left-[-100px] w-[400px] h-[400px] bg-[#3b82f6] rounded-full blur-[100px] opacity-[--th-accent-glow] animate-pulse" />
        </div>
      </div>
    );
  }

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <DashboardView />;
      case 'wallets': return <WalletsView />;
      case 'budget': return <BudgetView />;
      case 'transactions': return <TransactionsView />;
      case 'reports': return <ReportsView />;
      case 'settings': return <SettingsView />;
      default: return <DashboardView />;
    }
  };

  return (
    <div className="min-h-screen bg-surface flex selection:bg-secondary-container/30">
      <Sidebar />

      <main className="flex-1 lg:ml-[280px]">
        <TopBar />
        <div className="pt-32 lg:pt-36 px-4 lg:px-10 max-w-[1440px] mx-auto min-h-screen">
          <AnimatePresence mode="wait">
            <React.Fragment key={currentView}>
              {renderView()}
            </React.Fragment>
          </AnimatePresence>
        </div>
      </main>

      <QuickEntryModal />
      <ToastContainer />

      {/* Dynamic background accents */}
      <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden" style={{ opacity: 'var(--th-accent-glow)' }}>
        <div className="absolute top-[-100px] left-[-100px] w-[400px] h-[400px] bg-[#3b82f6] rounded-full blur-[100px] opacity-40 animate-pulse" />
        <div className="absolute bottom-[-150px] right-[20%] w-[500px] h-[500px] bg-[#8b5cf6] rounded-full blur-[140px] opacity-30" />
        <div className="absolute top-[20%] right-[-100px] w-[350px] h-[350px] bg-[#ec4899] rounded-full blur-[120px] opacity-20" />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
