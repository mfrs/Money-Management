import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import StashlyLandingPage from '../Landing Page/StashlyLandingPage';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import DashboardView from './views/DashboardView';
import WalletsView from './views/WalletsView';
import BudgetView from './views/BudgetView';
import TransactionsView from './views/TransactionsView';
import ReportsView from './views/ReportsView';
import SettingsView from './views/SettingsView';
import SignInView from './views/SignInView';
import PinLockView from './views/PinLockView';
import GoalsView from './views/GoalsView';
import AdminView from './views/AdminView';
import LedgerView from './views/LedgerView';
import AchievementsView from './views/AchievementsView';
import AssetsView from './views/AssetsView';
import DebtsView from './views/DebtsView';
import PGMonitorView from './views/PGMonitorView';
import QuickEntryModal from './components/QuickEntryModal';
import ToastContainer from './components/ToastContainer';
import AIChatAssistant from './components/AIChatAssistant';
import { AnimatePresence } from 'motion/react';
import { ShieldAlert } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';

function AppContent() {
  const { currentView, setCurrentView, isAuthenticated, user, isLoading, authLoading, logout } = useApp();
  const [isPinVerified, setIsPinVerified] = React.useState(false);

  // Sync /pgmonitor pathname to view state
  React.useEffect(() => {
    if (window.location.pathname === '/pgmonitor') {
      setCurrentView('pgmonitor');
    }
  }, [setCurrentView]);

  // Capacitor Mobile Initialization
  React.useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
      SplashScreen.hide().catch(() => {});
    }
  }, []);

  // Sync URL state when navigating away from pgmonitor
  React.useEffect(() => {
    if (currentView !== 'pgmonitor' && window.location.pathname === '/pgmonitor') {
      window.history.pushState({}, '', '/');
    }
  }, [currentView]);

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

  if (!isPinVerified) {
    return <PinLockView onVerified={() => setIsPinVerified(true)} onLogout={logout} />;
  }

  // Admin access check for PGMonitor URL
  if (window.location.pathname === '/pgmonitor' && user && !user.isAdmin) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-4">
        <div className="max-w-md w-full glass p-8 rounded-3xl border border-error/20 text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-error/10 flex items-center justify-center border border-error/20 mx-auto">
            <ShieldAlert className="text-error" size={32} />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-on-surface">Access Denied</h1>
            <p className="text-sm text-on-surface-variant">
              You do not have the required permissions to view the PostgreSQL monitor dashboard.
            </p>
          </div>
          <button
            onClick={() => {
              window.history.pushState({}, '', '/');
              setCurrentView('dashboard');
            }}
            className="w-full py-3.5 bg-primary hover:bg-primary/95 text-on-primary rounded-2xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
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
      case 'goals': return <GoalsView />;
      case 'admin': return <AdminView />;
      case 'ledger': return <LedgerView />;
      case 'achievements': return <AchievementsView />;
      case 'assets': return <AssetsView />;
      case 'debts': return <DebtsView />;
      case 'pgmonitor': return <PGMonitorView />;
      default: return <DashboardView />;
    }
  };

  return (
    <div className="min-h-screen bg-surface flex selection:bg-secondary-container/30 w-full max-w-[100vw] overflow-x-hidden">
      <Sidebar />

      <main className="flex-1 lg:ml-[280px] min-w-0 flex flex-col max-w-full w-full">
        <TopBar />
        <div className="pt-[calc(env(safe-area-inset-top,0px)+128px)] lg:pt-[calc(env(safe-area-inset-top,0px)+144px)] px-4 lg:px-10 w-full max-w-[1440px] mx-auto min-h-screen min-w-0">
          <AnimatePresence mode="wait">
            <React.Fragment key={currentView}>
              {renderView()}
            </React.Fragment>
          </AnimatePresence>
        </div>
      </main>

      <QuickEntryModal />
      <AIChatAssistant />
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
  const hostname = window.location.hostname;
  
  // Deteksi domain: tampilkan Landing Page jika diakses dari www.farisrf.tech atau farisrf.tech
  // Untuk pengujian lokal (localhost), Anda bisa mengubah isLandingPage menjadi `true` sementara jika ingin melihatnya
  const isLandingPage = hostname === 'www.farisrf.tech' || hostname === 'farisrf.tech';

  if (isLandingPage) {
    return <StashlyLandingPage />;
  }

  // Tampilkan Web App utama jika diakses dari mm.farisrf.tech (atau localhost)
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
