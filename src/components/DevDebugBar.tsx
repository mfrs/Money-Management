import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Bug, 
  ChevronUp, 
  User, 
  ShieldAlert, 
  ShieldCheck, 
  RefreshCw, 
  Database, 
  Eye, 
  Monitor, 
  Zap, 
  LogOut, 
  Check,
  AlertCircle
} from 'lucide-react';

interface DevDebugBarProps {
  isPinVerified: boolean;
  setIsPinVerified: (verified: boolean) => void;
}

const VIEWS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'wallets', label: 'Wallets' },
  { id: 'budget', label: 'Budget' },
  { id: 'transactions', label: 'Transactions' },
  { id: 'reports', label: 'Reports' },
  { id: 'goals', label: 'Goals' },
  { id: 'assets', label: 'Assets' },
  { id: 'debts', label: 'Debts' },
  { id: 'pgmonitor', label: 'PGMonitor' },
  { id: 'admin', label: 'Admin Panel' },
];

export default function DevDebugBar({ isPinVerified, setIsPinVerified }: DevDebugBarProps) {
  const { 
    login, 
    logout, 
    isAuthenticated, 
    user, 
    resetAllData, 
    reloadData, 
    currentView, 
    setCurrentView,
    addToast
  } = useApp();

  const [isOpen, setIsOpen] = useState(() => localStorage.getItem('wm_debugbar_open') === 'true');
  const [bypassPin, setBypassPin] = useState(() => sessionStorage.getItem('wm_bypass_pin') === 'true');
  const [ping, setPing] = useState<number | null>(null);
  const [pingLoading, setPingLoading] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isReloading, setIsReloading] = useState(false);
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });

  // Update open state in storage
  const toggleOpen = () => {
    const next = !isOpen;
    setIsOpen(next);
    localStorage.setItem('wm_debugbar_open', String(next));
  };

  // Handle PIN Bypass Toggle
  const toggleBypassPin = () => {
    const nextBypass = !bypassPin;
    setBypassPin(nextBypass);
    if (nextBypass) {
      sessionStorage.setItem('wm_bypass_pin', 'true');
      setIsPinVerified(true);
      addToast('PIN lock bypassed for this session', 'info');
    } else {
      sessionStorage.removeItem('wm_bypass_pin');
      setIsPinVerified(false);
      addToast('PIN lock enabled', 'info');
    }
  };

  // Perform quick login for development
  const handleQuickLogin = async () => {
    setIsLoggingIn(true);
    try {
      await login('alex@logic.inf', 'password123');
    } catch (err: any) {
      console.error('Quick login failed:', err);
      addToast('Quick login failed: ' + err.message, 'error');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Perform database seed reset
  const handleReset = async () => {
    if (!window.confirm('Reset database & re-seed test data? All changes will be lost.')) return;
    setIsResetting(true);
    try {
      await resetAllData();
    } catch (err: any) {
      console.error('Reset failed:', err);
    } finally {
      setIsResetting(false);
    }
  };

  // Reload client data from API
  const handleReload = async () => {
    setIsReloading(true);
    try {
      await reloadData();
      addToast('Fresh data pulled from database', 'success');
    } catch (err: any) {
      console.error('Reload failed:', err);
    } finally {
      setIsReloading(false);
    }
  };

  // Measure server ping latency
  const checkLatency = async () => {
    setPingLoading(true);
    const start = performance.now();
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const end = performance.now();
        setPing(Math.round(end - start));
      } else {
        setPing(null);
      }
    } catch {
      setPing(null);
    } finally {
      setPingLoading(false);
    }
  };

  // Set up resize listener and server ping interval
  useEffect(() => {
    const handleResize = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);

    checkLatency();
    const interval = setInterval(checkLatency, 15000);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearInterval(interval);
    };
  }, []);

  const getBreakpoint = (width: number) => {
    if (width >= 1536) return '2xl';
    if (width >= 1280) return 'xl';
    if (width >= 1024) return 'lg';
    if (width >= 768) return 'md';
    if (width >= 640) return 'sm';
    return 'xs';
  };

  const breakpoint = getBreakpoint(dimensions.width);

  // Render minimized state
  if (!isOpen) {
    return (
      <button
        onClick={toggleOpen}
        className="fixed bottom-4 right-4 z-[9999] w-12 h-12 rounded-full flex items-center justify-center bg-primary hover:bg-primary/90 text-white shadow-low hover:shadow-medium cursor-pointer transition-all duration-200 active:scale-95 group border border-white/10"
        title="Open Dev Debugbar"
      >
        <Bug className="w-5 h-5 animate-pulse group-hover:rotate-12 transition-transform duration-200" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] liquid-glass border-t border-th-divider px-4 py-2.5 text-xs text-on-surface select-none shadow-medium animate-slide-up">
      <div className="max-w-[1440px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4">
        
        {/* Left Section: Branding, Responsive Info, Latency */}
        <div className="flex flex-wrap items-center gap-3 md:gap-4">
          <div className="flex items-center gap-1.5 font-bold text-primary">
            <Bug className="w-4 h-4" />
            <span>DEV BAR</span>
          </div>

          <div className="h-4 w-px bg-th-divider hidden sm:block" />

          {/* Breakpoint & Size Info */}
          <div className="flex items-center gap-1.5 font-mono text-[10px] text-on-surface-variant bg-on-surface/5 px-2 py-1 rounded-md border border-th-divider/40">
            <Monitor className="w-3.5 h-3.5" />
            <span>
              {dimensions.width}px × {dimensions.height}px ({breakpoint})
            </span>
          </div>

          {/* Server Ping */}
          <button 
            onClick={checkLatency} 
            disabled={pingLoading}
            className="flex items-center gap-1 font-mono text-[10px] text-on-surface-variant hover:text-on-surface bg-on-surface/5 px-2 py-1 rounded-md border border-th-divider/40 transition-colors cursor-pointer active:scale-95 disabled:opacity-50"
            title="Click to check API ping latency"
          >
            <Zap className={`w-3.5 h-3.5 ${pingLoading ? 'animate-pulse text-warning' : ping !== null ? 'text-success' : 'text-error'}`} />
            <span>API: {ping !== null ? `${ping}ms` : 'offline'}</span>
          </button>
        </div>

        {/* Center Section: App state controls (Auth, PIN, DB) */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Auth Simulation */}
          <div className="flex items-center gap-1.5 bg-on-surface/5 px-2 py-1 rounded-lg border border-th-divider/40">
            <User className="w-3.5 h-3.5 text-on-surface-variant" />
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <span className="font-semibold text-on-surface max-w-[120px] truncate">{user?.name}</span>
                {user?.isAdmin && <span className="text-[9px] bg-primary/20 text-primary border border-primary/30 px-1 rounded">Admin</span>}
                <button
                  onClick={logout}
                  className="text-error hover:underline flex items-center gap-0.5 cursor-pointer ml-1"
                >
                  <LogOut className="w-3 h-3" /> Sign Out
                </button>
              </div>
            ) : (
              <button
                onClick={handleQuickLogin}
                disabled={isLoggingIn}
                className="text-primary hover:underline font-bold cursor-pointer disabled:opacity-50"
              >
                {isLoggingIn ? 'Logging in...' : 'Quick Login (Demo)'}
              </button>
            )}
          </div>

          {/* PIN Bypass */}
          {isAuthenticated && (
            <button
              onClick={toggleBypassPin}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-bold cursor-pointer transition-colors active:scale-95 ${
                bypassPin
                  ? 'bg-success/10 border-success/30 text-success hover:bg-success/20'
                  : 'bg-warning/10 border-warning/30 text-warning hover:bg-warning/20'
              }`}
            >
              {bypassPin ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
              <span>{bypassPin ? 'PIN Bypassed' : 'PIN Active'}</span>
            </button>
          )}

          {/* Seeding & Loading */}
          {isAuthenticated && (
            <>
              <button
                onClick={handleReload}
                disabled={isReloading}
                className="flex items-center gap-1 bg-on-surface/5 hover:bg-on-surface/10 border border-th-divider/50 px-2.5 py-1 rounded-lg font-bold cursor-pointer transition-all active:scale-95 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isReloading ? 'animate-spin' : ''}`} />
                <span>Sync Data</span>
              </button>

              <button
                onClick={handleReset}
                disabled={isResetting}
                className="flex items-center gap-1 bg-error/10 hover:bg-error/15 border border-error/20 text-error px-2.5 py-1 rounded-lg font-bold cursor-pointer transition-all active:scale-95 disabled:opacity-50"
              >
                <Database className={`w-3.5 h-3.5 ${isResetting ? 'animate-pulse' : ''}`} />
                <span>Reset & Seed</span>
              </button>
            </>
          )}
        </div>

        {/* Right Section: View Switcher, Close Button */}
        <div className="flex items-center justify-between md:justify-end gap-3 border-t md:border-t-0 border-th-divider/50 pt-2.5 md:pt-0">
          
          {/* View Switcher Dropdown */}
          {isAuthenticated && isPinVerified && (
            <div className="flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-on-surface-variant" />
              <select
                value={currentView}
                onChange={(e) => setCurrentView(e.target.value as any)}
                className="bg-surface border border-th-divider/50 rounded-lg text-on-surface px-2 py-1 font-bold outline-none cursor-pointer focus:ring-1 focus:ring-primary text-[11px]"
              >
                {VIEWS.map((view) => (
                  <option key={view.id} value={view.id}>
                    {view.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="h-4 w-px bg-th-divider hidden md:block" />

          {/* Close Panel Button */}
          <button
            onClick={toggleOpen}
            className="flex items-center gap-1 text-on-surface-variant hover:text-on-surface hover:bg-on-surface/5 px-2 py-1 rounded-md transition-colors cursor-pointer active:scale-95 border border-transparent hover:border-th-divider/30"
          >
            <ChevronUp className="w-4 h-4 rotate-180" />
            <span>Collapse</span>
          </button>
        </div>

      </div>
    </div>
  );
}
