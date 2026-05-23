import React from 'react';
import { LayoutDashboard, Wallet, Receipt, User, Plus } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { cn } from '../lib/utils';

export default function MobileBottomNav() {
  const { currentView, setCurrentView, setIsQuickEntryOpen, t } = useApp();

  const navItems = [
    { id: 'dashboard', label: 'Dasbor', icon: LayoutDashboard },
    { id: 'wallets', label: 'Dompet', icon: Wallet },
    { id: 'quick-add', label: '', icon: Plus, isAction: true },
    { id: 'budget', label: 'Anggaran', icon: Receipt },
    { id: 'settings', label: 'Profil', icon: User },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 glass-dark border-t border-th-divider z-40 pb-[env(safe-area-inset-bottom,0px)]">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          if (item.isAction) {
            return (
              <button
                key={item.id}
                onClick={() => setIsQuickEntryOpen(true)}
                className="relative -top-5 flex flex-col items-center justify-center"
              >
                <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-on-surface shadow-[0_0_20px_rgba(59,130,246,0.4)] active:scale-95 transition-transform">
                  <Plus size={28} />
                </div>
              </button>
            );
          }

          const isActive = currentView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id as any)}
              className="flex flex-col items-center justify-center gap-1.5 p-2 min-w-[64px]"
            >
              <item.icon
                size={22}
                className={cn(
                  "transition-colors",
                  isActive ? "text-primary" : "text-on-surface/40"
                )}
              />
              <span
                className={cn(
                  "text-[10px] font-medium tracking-wide transition-colors",
                  isActive ? "text-primary" : "text-on-surface/40"
                )}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
