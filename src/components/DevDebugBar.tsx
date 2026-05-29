import React, { useState, useEffect, useMemo } from 'react';
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
  Trash2,
  ChevronDown,
  Terminal,
  Clock
} from 'lucide-react';

interface DevDebugBarProps {
  isPinVerified: boolean;
  setIsPinVerified: (verified: boolean) => void;
}

interface QueryLogItem {
  query: string;
  params: string;
  duration: number;
}

interface RequestQueryLog {
  id: string;
  url: string;
  method: string;
  timestamp: string;
  queries: QueryLogItem[];
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
  const [activeTab, setActiveTab] = useState<'info' | 'queries'>(() => {
    return (localStorage.getItem('wm_debugbar_active_tab') as 'info' | 'queries') || 'info';
  });
  const [bypassPin, setBypassPin] = useState(() => sessionStorage.getItem('wm_bypass_pin') === 'true');
  const [ping, setPing] = useState<number | null>(null);
  const [pingLoading, setPingLoading] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isReloading, setIsReloading] = useState(false);
  
  // Responsive / Viewport info
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });

  // Query Logger State
  const [queryLogs, setQueryLogs] = useState<RequestQueryLog[]>([]);
  const [expandedRequests, setExpandedRequests] = useState<Record<string, boolean>>({});

  // Summary Metrics
  const totalQueriesCount = useMemo(() => {
    return queryLogs.reduce((acc, log) => acc + log.queries.length, 0);
  }, [queryLogs]);

  const totalQueriesDuration = useMemo(() => {
    return parseFloat(
      queryLogs.reduce((acc, log) => acc + log.queries.reduce((s, q) => s + q.duration, 0), 0).toFixed(2)
    );
  }, [queryLogs]);

  // Handle opening / collapsing DevBar
  const toggleOpen = () => {
    const next = !isOpen;
    setIsOpen(next);
    localStorage.setItem('wm_debugbar_open', String(next));
  };

  const handleTabClick = (tab: 'info' | 'queries') => {
    if (!isOpen) {
      setIsOpen(true);
      localStorage.setItem('wm_debugbar_open', 'true');
    }
    setActiveTab(tab);
    localStorage.setItem('wm_debugbar_active_tab', tab);
  };

  // Toggle PIN Bypass
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

  // Demo Login
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

  // Reset database
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

  // Sync client data
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

  // Measure server API ping latency
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

  // Toggle request accordion expansion
  const toggleRequestExpanded = (id: string) => {
    setExpandedRequests(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const clearQueryLogs = () => {
    setQueryLogs([]);
    setExpandedRequests({});
    addToast('Query logs cleared', 'info');
  };

  // Listen to dimensions, events, and ping server
  useEffect(() => {
    const handleResize = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);

    const handleQueriesEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { url, method, timestamp, queries } = customEvent.detail;
      setQueryLogs(prev => [
        {
          id: Math.random().toString(36).substring(2, 9),
          url,
          method,
          timestamp,
          queries
        },
        ...prev
      ]);
    };

    window.addEventListener('wm_api_queries', handleQueriesEvent);

    checkLatency();
    const interval = setInterval(checkLatency, 15000);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('wm_api_queries', handleQueriesEvent);
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

  // Method Badge color mapper
  const getMethodBadgeClass = (method: string) => {
    switch (method.toUpperCase()) {
      case 'GET': return 'bg-success/15 text-success border border-success/30';
      case 'POST': return 'bg-primary/15 text-primary border border-primary/30';
      case 'PUT': return 'bg-amber-500/15 text-amber-500 border border-amber-500/30';
      case 'DELETE': return 'bg-error/15 text-error border border-error/30';
      default: return 'bg-on-surface/10 text-on-surface-variant border border-th-divider';
    }
  };

  // Query timing color mapper
  const getQueryTimingColor = (duration: number) => {
    if (duration >= 50) return 'text-error font-bold'; // Very slow
    if (duration >= 10) return 'text-amber-500 font-semibold'; // Moderately slow
    return 'text-success'; // Fast
  };

  // Render minimized state (Floating Bug Button)
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
    <div className="fixed bottom-0 left-0 right-0 z-[9999] liquid-glass border-t border-th-divider text-xs text-on-surface select-none shadow-medium animate-slide-up font-sans">
      
      {/* Sliding Drawer Panel (Expanded tab content) */}
      <div className="h-[250px] md:h-[300px] border-b border-th-divider/50 overflow-y-auto [scrollbar-width:thin] bg-surface/90">
        
        {/* Tab 1: System Info */}
        {activeTab === 'info' && (
          <div className="max-w-[1440px] mx-auto p-4 grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
            
            {/* Column 1: System Status & Client Details */}
            <div className="space-y-3.5">
              <h3 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider border-b border-th-divider pb-1">Client Diagnostics</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-on-surface-variant">Screen Resolution:</span>
                  <span className="font-mono text-on-surface font-semibold bg-on-surface/5 px-2 py-0.5 rounded border border-th-divider/55">
                    {dimensions.width}px × {dimensions.height}px ({breakpoint})
                  </span>
                </div>
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-on-surface-variant">API Server Connection:</span>
                  <button 
                    onClick={checkLatency} 
                    disabled={pingLoading}
                    className="flex items-center gap-1 font-mono bg-on-surface/5 hover:bg-on-surface/10 px-2 py-0.5 rounded border border-th-divider/55 transition-colors cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    <Zap className={`w-3.5 h-3.5 ${pingLoading ? 'animate-pulse text-warning' : ping !== null ? 'text-success' : 'text-error'}`} />
                    <span className="font-semibold">{ping !== null ? `${ping}ms latency` : 'offline'}</span>
                  </button>
                </div>
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-on-surface-variant">Active Theme:</span>
                  <span className="capitalize font-semibold text-on-surface bg-on-surface/5 px-2 py-0.5 rounded border border-th-divider/55">
                    {document.documentElement.getAttribute('data-theme') || 'dark'} mode
                  </span>
                </div>
              </div>
            </div>

            {/* Column 2: Auth Simulation Controls */}
            <div className="space-y-3.5">
              <h3 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider border-b border-th-divider pb-1">User & Security Simulator</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-on-surface-variant">Active Account:</span>
                  {isAuthenticated ? (
                    <div className="flex items-center gap-1.5 bg-on-surface/5 px-2.5 py-0.5 rounded-lg border border-th-divider/55">
                      <span className="font-semibold text-on-surface max-w-[100px] truncate">{user?.name}</span>
                      {user?.isAdmin && <span className="text-[9px] bg-primary/25 text-primary border border-primary/30 px-1 rounded font-bold uppercase">Admin</span>}
                    </div>
                  ) : (
                    <span className="font-semibold text-error bg-error/5 border border-error/15 px-2 py-0.5 rounded">Signed Out</span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {!isAuthenticated ? (
                    import.meta.env.DEV && (
                      <button
                        onClick={handleQuickLogin}
                        disabled={isLoggingIn}
                        className="flex-1 py-2 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl shadow-low transition-colors cursor-pointer text-center text-xs disabled:opacity-50"
                      >
                        {isLoggingIn ? 'Signing in...' : 'Quick Login (Alex Thorne)'}
                      </button>
                    )
                  ) : (
                    <div className="flex w-full gap-2">
                      {/* PIN Bypass toggle */}
                      <button
                        onClick={toggleBypassPin}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border font-bold cursor-pointer transition-colors active:scale-95 ${
                          bypassPin
                            ? 'bg-success/15 border-success/30 text-success hover:bg-success/20'
                            : 'bg-warning/15 border-warning/30 text-warning hover:bg-warning/20'
                        }`}
                      >
                        {bypassPin ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                        <span>{bypassPin ? 'Bypass Active' : 'Bypass PIN'}</span>
                      </button>

                      <button
                        onClick={logout}
                        className="py-2 px-3.5 bg-error/10 hover:bg-error/15 border border-error/20 text-error rounded-xl font-bold cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-1"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Column 3: Database seeding / reset */}
            <div className="space-y-3.5">
              <h3 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider border-b border-th-divider pb-1">Database Seeding Tools</h3>
              <div className="space-y-3">
                <p className="text-[10px] text-on-surface-variant leading-normal">
                  Reset the local SQLite or PostgreSQL database and seed it with standard transaction, wallet, budget allocation, and goal logs.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleReload}
                    disabled={isReloading}
                    className="flex-1 flex items-center justify-center gap-1 bg-on-surface/5 hover:bg-on-surface/10 border border-th-divider/55 py-2.5 rounded-xl font-bold cursor-pointer transition-all active:scale-95 disabled:opacity-50 text-xs text-on-surface"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isReloading ? 'animate-spin' : ''}`} />
                    <span>Sync Client Cache</span>
                  </button>

                  <button
                    onClick={handleReset}
                    disabled={isResetting}
                    className="flex-1 flex items-center justify-center gap-1 bg-error/10 hover:bg-error/15 border border-error/25 text-error py-2.5 rounded-xl font-bold cursor-pointer transition-all active:scale-95 disabled:opacity-50 text-xs"
                  >
                    <Database className={`w-3.5 h-3.5 ${isResetting ? 'animate-pulse' : ''}`} />
                    <span>Reset & Re-Seed</span>
                  </button>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* Tab 2: SQL Query Log Inspector (Laravel-style) */}
        {activeTab === 'queries' && (
          <div className="max-w-[1440px] mx-auto p-4 space-y-4">
            
            {/* Headers and statistics */}
            <div className="flex items-center justify-between border-b border-th-divider/55 pb-2 shrink-0">
              <div className="flex items-center gap-3">
                <span className="font-bold uppercase text-[10px] tracking-wider text-on-surface-variant">Prisma Query Log</span>
                <span className="text-[10px] bg-on-surface/5 px-2 py-0.5 rounded border border-th-divider/40 text-on-surface font-mono">
                  {queryLogs.length} request logs captured
                </span>
                <span className="text-[10px] bg-primary/10 px-2 py-0.5 rounded border border-primary/20 text-primary font-mono font-semibold">
                  {totalQueriesCount} SQL queries executed ({totalQueriesDuration}ms total duration)
                </span>
              </div>
              <button
                onClick={clearQueryLogs}
                disabled={queryLogs.length === 0}
                className="flex items-center gap-1 px-2.5 py-1 bg-error/10 hover:bg-error/15 border border-error/20 text-error rounded-lg font-bold cursor-pointer transition-colors active:scale-95 disabled:opacity-50 text-[11px]"
              >
                <Trash2 size={13} />
                <span>Clear Logs</span>
              </button>
            </div>

            {/* List of captured requests */}
            <div className="space-y-2.5">
              {queryLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-on-surface-variant space-y-2">
                  <Database size={24} className="text-on-surface/20" />
                  <p className="font-semibold text-xs text-on-surface">No queries recorded yet</p>
                  <p className="text-[10px]">Interact with the app, change tabs, or sync client data to capture backend query executions.</p>
                </div>
              ) : (
                queryLogs.map((log) => {
                  const isExpanded = !!expandedRequests[log.id];
                  const totalReqTime = parseFloat(
                    log.queries.reduce((acc, q) => acc + q.duration, 0).toFixed(2)
                  );

                  return (
                    <div key={log.id} className="border border-th-divider/50 rounded-2xl overflow-hidden glass">
                      
                      {/* Accordion Trigger */}
                      <div 
                        onClick={() => toggleRequestExpanded(log.id)}
                        className="flex items-center justify-between p-3 hover:bg-on-surface/5 cursor-pointer select-none transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-0.5 text-[9px] font-black rounded font-mono uppercase ${getMethodBadgeClass(log.method)}`}>
                            {log.method}
                          </span>
                          <span className="font-mono font-semibold text-on-surface break-all">{log.url}</span>
                          <span className="text-[10px] text-on-surface-variant font-mono">[{log.timestamp}]</span>
                        </div>
                        
                        <div className="flex items-center gap-4 text-on-surface-variant font-mono text-[11px]">
                          <span className="flex items-center gap-1">
                            <Terminal size={12} className="text-on-surface-variant/70" />
                            <strong>{log.queries.length}</strong> queries
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock size={12} className="text-on-surface-variant/70" />
                            <strong className={getQueryTimingColor(totalReqTime)}>{totalReqTime}ms</strong>
                          </span>
                          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                        </div>
                      </div>

                      {/* Accordion Content */}
                      {isExpanded && (
                        <div className="bg-surface/50 border-t border-th-divider/40 p-3 space-y-3">
                          {log.queries.length === 0 ? (
                            <p className="text-[10px] text-on-surface-variant font-mono italic">No database queries executed during this API request.</p>
                          ) : (
                            log.queries.map((q, idx) => (
                              <div key={`${log.id}-q-${idx}`} className="space-y-1.5 border-b border-th-divider/30 last:border-0 pb-3 last:pb-0">
                                <div className="flex justify-between items-center text-[10px] text-on-surface-variant font-mono">
                                  <span className="font-bold text-primary">Query #{idx + 1}</span>
                                  <span className={`flex items-center gap-1 ${getQueryTimingColor(q.duration)}`}>
                                    <Clock size={10} />
                                    {q.duration.toFixed(2)}ms
                                  </span>
                                </div>
                                
                                {/* Monospace SQL Query */}
                                <pre className="font-mono text-[10.5px] bg-surface p-2.5 rounded-xl border border-th-divider/40 text-on-surface overflow-x-auto whitespace-pre-wrap select-text leading-relaxed">
                                  {q.query}
                                </pre>

                                {/* Bind parameters */}
                                {q.params && q.params !== '[]' && (
                                  <div className="text-[10px] text-on-surface-variant font-mono flex gap-1.5 items-start pl-1">
                                    <span className="font-bold text-on-surface-variant/70">Bindings:</span>
                                    <span className="text-on-surface select-text bg-on-surface/5 px-1.5 py-0.5 rounded border border-th-divider/40 leading-normal">{q.params}</span>
                                  </div>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      )}

                    </div>
                  );
                })
              )}
            </div>

          </div>
        )}

      </div>

      {/* Bottom Horizontal Tab Bar */}
      <div className="max-w-[1440px] mx-auto px-4 py-2 flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4 h-[44px]">
        
        {/* Left Section: Branding & Tab Triggers */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-bold text-primary mr-2">
            <Bug className="w-4 h-4" />
            <span>DEV BAR</span>
          </div>

          <div className="h-4 w-px bg-th-divider" />

          {/* Tab Button: Diagnostics */}
          <button
            onClick={() => handleTabClick('info')}
            className={`px-3 py-1 rounded-lg font-bold cursor-pointer transition-colors ${
              activeTab === 'info'
                ? 'bg-primary text-white'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-on-surface/5'
            }`}
          >
            System Status
          </button>

          {/* Tab Button: Queries (Laravel-style query badge) */}
          <button
            onClick={() => handleTabClick('queries')}
            className={`px-3 py-1 rounded-lg font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
              activeTab === 'queries'
                ? 'bg-primary text-white'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-on-surface/5'
            }`}
          >
            <span>Queries</span>
            <span className={`px-1.5 py-0.2 rounded-full font-mono text-[9px] font-black ${
              activeTab === 'queries'
                ? 'bg-white/20 text-white'
                : 'bg-on-surface/10 text-on-surface-variant'
            }`}>
              {totalQueriesCount}
            </span>
          </button>
        </div>

        {/* Right Section: View Switcher, Latency indicator, Collapse */}
        <div className="flex items-center justify-between md:justify-end gap-4">
          
          {/* View Switcher Dropdown */}
          {isAuthenticated && isPinVerified && (
            <div className="flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-on-surface-variant" />
              <select
                value={currentView}
                onChange={(e) => setCurrentView(e.target.value as any)}
                className="bg-surface border border-th-divider/50 rounded-lg text-on-surface px-2 py-0.5 font-bold outline-none cursor-pointer focus:ring-1 focus:ring-primary text-[11px]"
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

          {/* Collapse Panel Button */}
          <button
            onClick={toggleOpen}
            className="flex items-center gap-1 text-on-surface-variant hover:text-on-surface hover:bg-on-surface/5 px-2 py-0.5 rounded-md transition-colors cursor-pointer active:scale-95 border border-transparent hover:border-th-divider/30"
          >
            <ChevronUp className="w-4 h-4 rotate-180" />
            <span>Collapse</span>
          </button>
        </div>

      </div>

    </div>
  );
}
