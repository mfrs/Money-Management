import React from 'react';
import { Search, Bell, Plus, Menu } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function TopBar() {
  const { setIsQuickEntryOpen, searchQuery, setSearchQuery, setCurrentView, setIsMobileSidebarOpen, user, t } = useApp();

  const initials = user ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U';

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setCurrentView('transactions');
    }
  };

  return (
    <header className="fixed top-5 right-5 left-5 lg:left-[300px] h-16 glass rounded-[24px] px-4 lg:px-8 py-4 flex justify-between items-center z-40">
      {/* Mobile hamburger */}
      <button
        onClick={() => setIsMobileSidebarOpen(true)}
        className="lg:hidden p-2 text-on-surface/40 hover:text-on-surface transition-colors rounded-xl"
      >
        <Menu size={20} />
      </button>

      {/* Search */}
      <div className="flex-1 max-w-md ml-2 lg:ml-0">
        <form onSubmit={handleSearch} className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface/40 group-focus-within:text-on-surface transition-colors" size={16} />
          <input
            id="search-input"
            type="text"
            placeholder={t('topbar.search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-th-input border border-th-input rounded-full text-xs focus:outline-none focus:border-th-input-focus transition-all text-on-surface placeholder:text-on-surface/30"
          />
        </form>
      </div>

      <div className="flex items-center gap-3 lg:gap-6">
        <button
          id="btn-quick-entry"
          onClick={() => setIsQuickEntryOpen(true)}
          className="flex items-center gap-2 bg-primary text-on-surface px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-primary/80 transition-all shadow-[0_0_15px_rgba(59,130,246,0.3)] active:scale-95 duration-200"
        >
          <Plus size={14} />
          <span className="hidden sm:inline">{t('topbar.quickAdd')}</span>
        </button>

        <button className="hidden sm:block text-on-surface/60 hover:text-on-surface transition-colors p-2 rounded-full relative">
          <Bell size={18} />
          <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-tertiary rounded-full shadow-[0_0_10px_rgba(236,72,153,0.5)]"></span>
        </button>

        <div className="hidden sm:flex items-center gap-3 bg-th-input px-3 py-1.5 rounded-full border border-th-input">
          <div className="w-6 h-6 rounded-full overflow-hidden border border-primary/30 bg-primary/20 flex items-center justify-center">
            <span className="text-[10px] font-bold text-primary">{initials}</span>
          </div>
          <span className="text-xs font-medium text-on-surface/80">{user?.name || 'User'}</span>
        </div>
      </div>
    </header>
  );
}
