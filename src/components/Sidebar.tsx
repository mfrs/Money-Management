import React from 'react';
import {
  LayoutDashboard,
  Wallet,
  Receipt,
  BarChart3,
  Settings,
  BookOpen,
  LogOut,
  CircleGauge,
  X,
  CreditCard,
  Sun,
  Moon,
  Target,
  ShieldCheck,
  Trophy,
  Coins,
  Handshake,
  Database,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useApp } from '../context/AppContext';

const navItems = [
  { id: 'dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { id: 'wallets', labelKey: 'nav.wallets', icon: Wallet },
  { id: 'budget', labelKey: 'nav.budget', icon: CreditCard },
  { id: 'goals', labelKey: 'nav.goals', icon: Target },
  { id: 'assets', labelKey: 'nav.assets', icon: Coins },
  { id: 'debts', labelKey: 'nav.debts', icon: Handshake },
  { id: 'achievements', labelKey: 'nav.achievements', icon: Trophy },
  { id: 'transactions', labelKey: 'nav.transactions', icon: Receipt },
  { id: 'ledger', labelKey: 'nav.ledger', icon: BookOpen },
  { id: 'reports', labelKey: 'nav.reports', icon: BarChart3 },
] as const;

export default function Sidebar() {
  const { currentView, setCurrentView, isMobileSidebarOpen, setIsMobileSidebarOpen, logout, theme, toggleTheme, user, t, appName, appLogo, goals, categories, journals } = useApp();

  // Level and XP calculations
  const xp = React.useMemo(() => {
    const journalCount = journals.filter(j => !j.isReversed).length;
    const goalCount = goals.length;
    const achievedGoals = goals.filter(g => g.currentAmount >= g.targetAmount).length;
    const categoryCount = categories.length;

    return (journalCount * 100) + (goalCount * 150) + (achievedGoals * 1000) + (categoryCount * 50);
  }, [journals, goals, categories]);

  const level = React.useMemo(() => {
    return Math.floor(Math.sqrt(xp / 100)) + 1;
  }, [xp]);

  const xpNeededForNextLevel = React.useMemo(() => {
    const nextLevel = level + 1;
    return Math.pow(nextLevel - 1, 2) * 100;
  }, [level]);

  const xpForCurrentLevel = React.useMemo(() => {
    return Math.pow(level - 1, 2) * 100;
  }, [level]);

  const xpProgressInLevel = xp - xpForCurrentLevel;
  const xpNeededInLevel = xpNeededForNextLevel - xpForCurrentLevel;
  const progressPercentage = Math.min(100, Math.round((xpProgressInLevel / xpNeededInLevel) * 100));

  const navContent = (
    <div className="flex flex-col h-full p-6">
      {/* Logo */}
      <div className="flex items-center justify-between mb-8 shrink-0">
        <div className="flex items-center gap-4">
          {appLogo === 'CircleGauge' ? (
            <CircleGauge className="text-on-surface shrink-0" size={24} />
          ) : appLogo.startsWith('http') || appLogo.startsWith('data:') ? (
            <img src={appLogo} alt="Logo" className="w-6 h-6 object-contain shrink-0" />
          ) : (
            <span className="text-xl shrink-0 leading-none">{appLogo}</span>
          )}
          <span className="font-display text-lg font-bold text-on-surface tracking-widest uppercase truncate max-w-[140px]">{appName}</span>
        </div>
        <button
          onClick={() => setIsMobileSidebarOpen(false)}
          className="lg:hidden p-2 text-on-surface/40 hover:text-on-surface transition-colors rounded-xl"
        >
          <X size={20} />
        </button>
      </div>

      {/* User profile mini */}
      {user && (
        <div className="mb-6 p-4 rounded-2xl glass border border-th-divider space-y-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30">
              <span className="font-display text-xs font-bold text-primary">
                {user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-on-surface truncate">{user.name}</p>
              <p className="text-[10px] text-on-surface-variant truncate">{user.email}</p>
            </div>
          </div>

          {/* XP & Level progress bar */}
          <div className="pt-2 border-t border-th-divider space-y-1.5">
            <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-wider">
              <span className="text-primary flex items-center gap-1">
                <Trophy size={10} />
                Lvl {level}
              </span>
              <span className="text-on-surface/40">{xpProgressInLevel} / {xpNeededInLevel} XP</span>
            </div>
            <div className="w-full bg-on-surface/5 h-1.5 rounded-full overflow-hidden border border-on-surface/5">
              <div 
                className="bg-primary h-full rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 space-y-2 overflow-y-auto min-h-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden mb-4">
        {navItems.map((item) => (
          <button
            key={item.id}
            id={item.id === 'wallets' ? 'tour-wallets' : item.id === 'goals' ? 'tour-goals' : item.id === 'debts' ? 'tour-debts' : undefined}
            onClick={() => setCurrentView(item.id as any)}
            className={cn(
              "w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] transition-all duration-300 group",
              currentView === item.id
                ? "bg-primary-container text-primary shadow-[0_4px_20px_-10px_var(--color-primary)]"
                : "text-on-surface/30 hover:text-on-surface hover:bg-surface-container"
            )}
          >
            <item.icon size={18} className={cn(
              "transition-colors",
              currentView === item.id ? "text-primary" : "text-on-surface/20 group-hover:text-on-surface"
            )} />
            {item.labelKey.startsWith('nav.') ? t(item.labelKey) : item.labelKey}
          </button>
        ))}

        {user?.isAdmin && (
          <div className="space-y-1 mt-3 pt-3 border-t border-th-divider/30">
            <button
              onClick={() => setCurrentView('admin' as any)}
              className={cn(
                "w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] transition-all duration-300 group",
                currentView === 'admin'
                  ? "bg-primary/25 text-primary border border-primary/20"
                  : "text-primary/60 hover:text-primary hover:bg-primary/10 border border-transparent"
              )}
            >
              <ShieldCheck size={18} className={cn(
                "transition-colors",
                currentView === 'admin' ? "text-primary" : "text-primary/50 group-hover:text-primary"
              )} />
              Admin Panel
            </button>
            <button
              onClick={() => {
                window.history.pushState({}, '', '/pgmonitor');
                setCurrentView('pgmonitor' as any);
              }}
              className={cn(
                "w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] transition-all duration-300 group",
                currentView === 'pgmonitor'
                  ? "bg-primary/25 text-primary border border-primary/20"
                  : "text-primary/60 hover:text-primary hover:bg-primary/10 border border-transparent"
              )}
            >
              <Database size={18} className={cn(
                "transition-colors",
                currentView === 'pgmonitor' ? "text-primary" : "text-primary/50 group-hover:text-primary"
              )} />
              PGMonitor
            </button>
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="space-y-2 pt-6 border-t border-th-divider shrink-0">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface/30 hover:text-on-surface hover:bg-surface-container transition-all duration-300 group"
        >
          {theme === 'dark' ? (
            <Sun size={18} className="text-on-surface/20 group-hover:text-amber-400 transition-colors" />
          ) : (
            <Moon size={18} className="text-on-surface/20 group-hover:text-indigo-500 transition-colors" />
          )}
          {theme === 'dark' ? t('nav.lightMode') : t('nav.darkMode')}
        </button>

        {/* Settings */}
        <button
          onClick={() => setCurrentView('settings')}
          className={cn(
            "w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] transition-all duration-300 group",
            currentView === 'settings'
              ? "bg-on-surface text-surface shadow-xl"
              : "text-on-surface/30 hover:text-on-surface hover:bg-surface-container"
          )}
        >
          <Settings size={18} className={cn(currentView === 'settings' ? "text-surface" : "text-on-surface/20 group-hover:text-on-surface")} />
          {t('nav.settings')}
        </button>

        {/* Sign Out */}
        <button
          onClick={logout}
          className="w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface/30 hover:text-error hover:bg-error/5 transition-all duration-300 group"
        >
          <LogOut size={18} className="text-on-surface/20 group-hover:text-error transition-colors" />
          {t('nav.signOut')}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed top-0 left-0 bottom-0 w-[280px] flex-col glass-dark z-40 border-r border-th-divider">
        {navContent}
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMobileSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileSidebarOpen(false)}
              className="fixed inset-0 bg-black/50 z-[90] lg:hidden backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed top-0 left-0 bottom-0 w-[280px] glass-dark z-[100] lg:hidden border-r border-th-divider"
            >
              {navContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
