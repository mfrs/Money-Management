import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, Bell, Plus, Menu, AlertCircle, Calendar, Eye, EyeOff, Megaphone, X } from 'lucide-react';
import { isExpensePaidForCurrentTerm, cn } from '../lib/utils';
import { useApp } from '../context/AppContext';
import { formatCurrencyShort } from '../lib/types';
import { AnimatePresence, motion } from 'motion/react';
import WhatsNewModal from './WhatsNewModal';

export default function TopBar() {
  const { setIsQuickEntryOpen, searchQuery, setSearchQuery, setCurrentView, setIsMobileSidebarOpen, user, t, budget, goals, isSensored, toggleSensored } = useApp();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showWhatsNew, setShowWhatsNew] = useState(false);
  const [hasNewChangelog, setHasNewChangelog] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check if there's a new changelog on mount
    checkLatestChangelog();

    // Listen for custom event from WhatsNewModal
    const handleChangelogSeen = () => setHasNewChangelog(false);
    window.addEventListener('changelog_seen', handleChangelogSeen);
    
    return () => window.removeEventListener('changelog_seen', handleChangelogSeen);
  }, []);

  const checkLatestChangelog = async () => {
    try {
      const { api } = await import('../lib/api');
      const data = await api.get('/changelog');
      if (data && data.length > 0) {
        const latestId = data[0].id;
        const lastSeenId = localStorage.getItem('stashly_last_seen_changelog');
        if (latestId !== lastSeenId) {
          setHasNewChangelog(true);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const initials = user ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U';

  // Compute Notifications
  const notifications = useMemo(() => {
    const notifs: { id: string; title: string; message: string; type: 'warning' | 'info'; icon: any }[] = [];
    const now = new Date();
    const currentDay = now.getDate();
    
    // Check Fixed Expenses for Due Dates
    budget.fixedExpenses.forEach(exp => {
      if (!exp.dueDate) return;
      
      const isPaid = isExpensePaidForCurrentTerm(exp.lastPaid, exp.term);

      if (isPaid) return;

      // Simple due date check (within next 3 days, or overdue)
      // Note: doesn't handle month boundary perfectly, but good enough for simple tracking
      const daysUntilDue = exp.dueDate - currentDay;
      
      if (daysUntilDue < 0 && daysUntilDue > -10) {
        notifs.push({
          id: `exp-${exp.id}`,
          title: 'Tagihan Jatuh Tempo',
          message: `Tagihan ${exp.name} sudah lewat jatuh tempo (Tanggal ${exp.dueDate}).`,
          type: 'warning',
          icon: AlertCircle
        });
      } else if (daysUntilDue >= 0 && daysUntilDue <= 3) {
        notifs.push({
          id: `exp-${exp.id}`,
          title: 'Pengingat Tagihan',
          message: `Tagihan ${exp.name} akan jatuh tempo dalam ${daysUntilDue} hari.`,
          type: 'info',
          icon: Calendar
        });
      }
    });

    // Check Goals for approaching deadlines
    goals.forEach(goal => {
      if (!goal.deadline) return;
      if (goal.currentAmount >= goal.targetAmount) return; // Completed

      const deadlineDate = new Date(goal.deadline);
      const diffTime = deadlineDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays >= 0 && diffDays <= 7) {
        notifs.push({
          id: `goal-${goal.id}`,
          title: 'Batas Waktu Goal',
          message: `Target "${goal.name}" tersisa ${diffDays} hari lagi.`,
          type: 'info',
          icon: Calendar
        });
      }
    });

    return notifs;
  }, [budget.fixedExpenses, goals]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setCurrentView('transactions');
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 lg:top-[calc(env(safe-area-inset-top,0px)+20px)] lg:right-5 lg:left-[300px] lg:h-16 glass bg-surface/95 lg:bg-transparent rounded-none lg:rounded-[24px] px-5 lg:px-8 pt-[calc(env(safe-area-inset-top,0px)+16px)] pb-4 lg:py-4 flex justify-between items-center z-40 border-b border-on-surface/5 lg:border-none shadow-sm lg:shadow-none">
      {/* Mobile Profile */}
      <div className="lg:hidden flex items-center gap-3">
        <div className="w-9 h-9 rounded-full overflow-hidden border border-primary/30 bg-primary/20 flex items-center justify-center">
          <span className="text-xs font-bold text-primary">{initials}</span>
        </div>
        <span className="font-display text-sm font-bold tracking-widest uppercase text-on-surface">{user?.name || 'USER'}</span>
      </div>

      {/* Search */}
      <div 
        className={cn(
          "hidden lg:block max-w-md transition-all duration-300 ease-in-out flex-1",
        )}
      >
        <form onSubmit={handleSearch} className="relative group flex items-center gap-2 w-full min-w-[200px] lg:min-w-0">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface/40 group-focus-within:text-on-surface transition-colors" size={16} />
            <input
              id="search-input"
              type="text"
              placeholder={t('topbar.search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus={isSearchExpanded}
              className="w-full pl-10 pr-4 py-2 bg-th-input border border-th-input rounded-full text-xs focus:outline-none focus:border-th-input-focus transition-all text-on-surface placeholder:text-on-surface/30"
            />
          </div>
          {isSearchExpanded && (
            <button 
              type="button" 
              onClick={() => {
                setIsSearchExpanded(false);
                setSearchQuery('');
              }} 
              className="p-2 lg:hidden text-on-surface/60 hover:text-on-surface shrink-0"
            >
              <X size={20} />
            </button>
          )}
        </form>
      </div>

      <div 
        className={cn(
          "items-center gap-3 lg:gap-6 transition-all duration-300 ease-in-out lg:flex lg:opacity-100 lg:w-auto lg:overflow-visible lg:translate-x-0",
          isSearchExpanded ? "w-0 opacity-0 overflow-hidden translate-x-4 flex" : "flex opacity-100 translate-x-0"
        )}
      >
        {/* Mobile Search Toggle Removed */}
        <button
          onClick={() => {
            setShowWhatsNew(true);
            setHasNewChangelog(false);
          }}
          className="hidden lg:flex relative items-center justify-center p-2.5 bg-th-input text-on-surface hover:bg-th-input-focus transition-all active:scale-95 duration-200 border border-th-input rounded-full"
          title="What's New"
        >
          <Megaphone size={16} />
          {hasNewChangelog && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full shadow-[0_0_10px_rgba(59,130,246,0.8)] animate-pulse"></span>
          )}
        </button>

        <button
          id="btn-quick-entry"
          onClick={() => setIsQuickEntryOpen(true)}
          className="hidden lg:flex items-center gap-2 bg-primary text-on-surface px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-primary/80 transition-all shadow-[0_0_15px_rgba(59,130,246,0.3)] active:scale-95 duration-200"
        >
          <Plus size={14} />
          <span className="hidden sm:inline">{t('topbar.quickAdd')}</span>
        </button>

        <button
          id="btn-toggle-sensor"
          onClick={toggleSensored}
          className="hidden lg:flex items-center justify-center p-2.5 bg-th-input text-on-surface hover:bg-th-input-focus transition-all active:scale-95 duration-200 border border-th-input rounded-full relative"
          title={isSensored ? "Show balances" : "Hide balances"}
        >
          {isSensored ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>

        <div className="relative" ref={notifRef}>
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="text-on-surface/60 hover:text-on-surface transition-colors p-2 rounded-full relative"
          >
            <Bell size={18} />
            {notifications.length > 0 && (
              <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-tertiary rounded-full shadow-[0_0_10px_rgba(236,72,153,0.5)]"></span>
            )}
          </button>

          <AnimatePresence>
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute right-0 mt-4 w-80 glass rounded-[24px] shadow-2xl border border-on-surface/10 overflow-hidden"
              >
                <div className="p-4 border-b border-on-surface/5 flex justify-between items-center bg-on-surface/[0.02]">
                  <h3 className="font-bold text-sm uppercase tracking-widest text-on-surface">{t('notif.title')}</h3>
                  {notifications.length > 0 && (
                    <span className="bg-primary/20 text-primary px-2 py-0.5 rounded-full text-[10px] font-bold">{notifications.length}</span>
                  )}
                </div>
                
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-on-surface/40 text-xs font-bold uppercase tracking-widest">
                      {t('notif.empty')}
                    </div>
                  ) : (
                    <div className="flex flex-col">
                      {notifications.map(notif => {
                        const Icon = notif.icon;
                        return (
                          <div key={notif.id} className="p-4 border-b border-on-surface/5 hover:bg-on-surface/[0.03] transition-colors flex gap-3">
                            <div className={`mt-0.5 ${notif.type === 'warning' ? 'text-error' : 'text-secondary'}`}>
                              <Icon size={16} />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-on-surface mb-1">{notif.title}</p>
                              <p className="text-[10px] text-on-surface/60 leading-relaxed">{notif.message}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="hidden lg:flex items-center gap-3 bg-th-input px-3 py-1.5 rounded-full border border-th-input">
          <div className="w-6 h-6 rounded-full overflow-hidden border border-primary/30 bg-primary/20 flex items-center justify-center">
            <span className="text-[10px] font-bold text-primary">{initials}</span>
          </div>
          <span className="text-xs font-medium text-on-surface/80">{user?.name || 'User'}</span>
        </div>
      </div>

      <WhatsNewModal 
        isOpen={showWhatsNew} 
        onClose={() => setShowWhatsNew(false)} 
      />
    </header>
  );
}
