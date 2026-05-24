import React, { useState, useMemo } from 'react';
import ImportTransactionsModal from '../components/ImportTransactionsModal';
import {
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Trash2,
  X,
  MoreHorizontal,
  Plus,
  ArrowRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, getLocalDateString, combineDateAndTimeToISO } from '../lib/utils';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate } from '../lib/types';
import { getIcon } from '../lib/icons';
import ConfirmDialog from '../components/ConfirmDialog';

const PAGE_SIZE = 8;

export default function TransactionsView() {
  const {
    journals, categories, wallets, searchQuery,
    addJournal, deleteJournal,
    getCategoryById, getWalletById, t
  } = useApp();

  const [activeTab, setActiveTab] = useState<'all' | 'income' | 'expense'>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterWallet, setFilterWallet] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [showImport, setShowImport] = useState(false);
  // Quick add form
  const [showForm, setShowForm] = useState(false);
  const [formAmount, setFormAmount] = useState('');
  const [formType, setFormType] = useState<'income' | 'expense'>('expense');
  const [formWallet, setFormWallet] = useState(wallets[0]?.id || '');
  const [formCategory, setFormCategory] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDate, setFormDate] = useState(getLocalDateString());

  const filteredCategories = categories.filter(c => c.type === formType);

  const mappedTransactions = useMemo(() => {
    return journals
      .map(j => {
        const categoryLine = j.lines.find(l => l.categoryId);
      const walletLines = j.lines.filter(l => l.walletId);
      
      let type: 'income' | 'expense' | 'transfer' = 'expense';
      let categoryId = undefined;
      let walletId = walletLines[0]?.walletId || '';
      let toWalletId = undefined;
      let amount = 0;
      let debtType: 'DEBT' | 'RECEIVABLE' | undefined = undefined;

      if (walletLines.length === 2 && !categoryLine) {
        type = 'transfer';
        const creditLine = walletLines.find(l => l.type === 'CREDIT');
        const debitLine = walletLines.find(l => l.type === 'DEBIT');
        if (creditLine) {
          walletId = creditLine.walletId;
          amount = creditLine.amount;
        }
        if (debitLine) {
          toWalletId = debitLine.walletId;
        }
      } else if (categoryLine) {
        categoryId = categoryLine.categoryId;
        amount = categoryLine.amount;
        type = categoryLine.type === 'CREDIT' ? 'income' : 'expense';
        const wLine = walletLines.find(l => l.walletId);
        if (wLine) walletId = wLine.walletId;
      } else if (walletLines.length === 1 && !categoryLine) {
        const wLine = walletLines[0];
        walletId = wLine.walletId;
        amount = wLine.amount;
        type = wLine.type === 'DEBIT' ? 'income' : 'expense';
        if (j.description.includes('[Hutang]') || j.description.includes('[Bayar Hutang]')) {
          debtType = 'DEBT';
        } else if (j.description.includes('[Piutang]') || j.description.includes('[Terima Piutang]')) {
          debtType = 'RECEIVABLE';
        }
      }

      return {
        id: j.id,
        seqId: j.seqId,
        description: j.description,
        note: j.note,
        date: j.date,
        type,
        amount,
        categoryId,
        walletId,
        toWalletId,
        isReversed: j.isReversed,
        debtType,
      };
    });
  }, [journals]);

  // Filter and sort transactions
  const filtered = useMemo(() => {
    let result = [...mappedTransactions];

    // Tab filter
    if (activeTab !== 'all') {
      result = result.filter(t => t.type === activeTab);
    }

    // Category filter
    if (filterCategory) {
      result = result.filter(t => t.categoryId === filterCategory);
    }

    // Wallet filter
    if (filterWallet) {
      result = result.filter(t => t.walletId === filterWallet);
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t => {
        const cat = getCategoryById(t.categoryId);
        const wallet = getWalletById(t.walletId);
        return (
          t.id.toLowerCase().includes(q) ||
          String(t.seqId || '').includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.note.toLowerCase().includes(q) ||
          cat?.name.toLowerCase().includes(q) ||
          wallet?.name.toLowerCase().includes(q)
        );
      });
    }

    // Sort
    switch (sortOrder) {
      case 'newest': result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); break;
      case 'oldest': result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); break;
      case 'highest': result.sort((a, b) => b.amount - a.amount); break;
      case 'lowest': result.sort((a, b) => a.amount - b.amount); break;
    }

    return result;
  }, [mappedTransactions, activeTab, filterCategory, filterWallet, searchQuery, sortOrder, getCategoryById, getWalletById]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Total for filter summary
  const filteredTotal = filtered.reduce((s, t) => s + (t.type === 'expense' ? -t.amount : t.amount), 0);

  const handleFormSubmit = () => {
    const num = parseFloat(formAmount);
    if (!num || num <= 0 || !formWallet || !formCategory) return;

    addJournal({
      description: formDescription || 'Transaction',
      amount: num,
      type: formType,
      categoryId: formCategory,
      walletId: formWallet,
      date: combineDateAndTimeToISO(formDate),
      note: '',
    });

    setFormAmount('');
    setFormDescription('');
    setShowForm(false);
  };

  React.useEffect(() => {
    if (filteredCategories.length > 0 && !filteredCategories.find(c => c.id === formCategory)) {
      setFormCategory(filteredCategories[0].id);
    }
  }, [formType, filteredCategories]);

  // Reset page when filters change
  React.useEffect(() => { setPage(1); }, [activeTab, filterCategory, filterWallet, searchQuery, sortOrder]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8 pb-10"
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 px-2 min-w-0 w-full">
        <div className="min-w-0 w-full">
          <h2 className="font-display text-3xl lg:text-4xl font-bold text-on-surface tracking-tight uppercase break-words">
            Transactions
          </h2>
          <p className="text-[10px] md:text-xs text-on-surface/40 uppercase tracking-[0.2em] font-medium mt-2 max-w-lg leading-relaxed break-words whitespace-normal">
            {filtered.length} transactions • Net: {formatCurrency(filteredTotal)}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowImport(true)}
            className="bg-on-surface/10 text-on-surface font-bold text-[10px] uppercase tracking-widest px-6 py-3.5 rounded-full hover:bg-on-surface/20 transition-all flex items-center gap-2 active:scale-95"
          >
            Import CSV
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="bg-primary text-on-surface font-bold text-[10px] uppercase tracking-widest px-8 py-3.5 rounded-full hover:bg-primary/80 transition-all flex items-center gap-3 active:scale-95 shadow-[0_0_15px_rgba(59,130,246,0.3)]"
          >
            <Plus size={16} />
            Add Transaction
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="glass rounded-[24px] lg:rounded-[32px] flex flex-col overflow-hidden relative">
        {/* Toolbar */}
        <div className="p-6 lg:p-8 border-b border-on-surface/5 flex flex-wrap gap-4 lg:gap-6 justify-between items-center min-w-0 w-full">
          <div className="flex gap-3 lg:gap-4 w-full md:w-auto min-w-0 max-w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "px-5 lg:px-6 py-2.5 rounded-full border glass-dark text-[10px] font-bold hover:text-on-surface hover:border-on-surface/20 transition-all flex items-center gap-3 uppercase tracking-[0.2em]",
                showFilters ? "text-on-surface border-on-surface/20" : "text-on-surface/60 border-on-surface/5"
              )}
            >
              <Filter size={14} /> <span>Filter</span>
            </button>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as any)}
              className="px-5 lg:px-6 py-2.5 rounded-full border border-on-surface/5 glass-dark text-[10px] font-bold text-on-surface/60 uppercase tracking-[0.2em] appearance-none cursor-pointer bg-transparent focus:outline-none"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="highest">Highest</option>
              <option value="lowest">Lowest</option>
            </select>
            <select
              value={filterWallet}
              onChange={(e) => setFilterWallet(e.target.value)}
              className="px-5 lg:px-6 py-2.5 rounded-full border border-on-surface/5 glass-dark text-[10px] font-bold text-on-surface/60 uppercase tracking-[0.2em] appearance-none cursor-pointer bg-transparent focus:outline-none"
            >
              <option value="">All Wallets</option>
              {wallets.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <div className="flex gap-1.5 glass-dark p-1 rounded-full border border-on-surface/5 w-full md:w-auto min-w-0 max-w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {(['all', 'income', 'expense'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-5 lg:px-6 py-2 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] transition-all",
                  activeTab === tab ? "bg-on-surface text-surface shadow-lg" : "text-on-surface/30 hover:text-on-surface"
                )}
              >
                {tab === 'all' ? 'All' : tab === 'income' ? 'Inflow' : 'Outflow'}
              </button>
            ))}
          </div>
        </div>

        {/* Filters Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-b border-on-surface/5 overflow-hidden"
            >
              <div className="p-6 lg:p-8 flex flex-wrap gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-bold text-on-surface/20 uppercase tracking-widest">Category</label>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="px-5 py-3 bg-on-surface/5 border border-on-surface/5 rounded-xl text-xs font-bold text-on-surface appearance-none cursor-pointer focus:outline-none min-w-[140px]"
                  >
                    <option value="">All Categories</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                <button
                  onClick={() => { setFilterCategory(''); setFilterWallet(''); }}
                  className="self-end px-5 py-3 text-[10px] font-bold text-on-surface/30 hover:text-on-surface uppercase tracking-widest transition-colors"
                >
                  Clear
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Table */}
        <div className="flex-1 overflow-x-auto">
          <table className="w-full text-left hidden md:table">
            <thead>
              <tr className="border-b border-on-surface/5 text-[9px] font-bold text-on-surface/20 uppercase tracking-[0.3em]">
                <th className="px-4 md:px-6 lg:px-10 py-4 lg:py-6 hidden md:table-cell">Tx ID</th>
                <th className="px-4 md:px-6 lg:px-10 py-4 lg:py-6 hidden md:table-cell">Date</th>
                <th className="px-4 md:px-6 lg:px-10 py-4 lg:py-6">Description</th>
                <th className="px-4 md:px-6 lg:px-10 py-4 lg:py-6 hidden lg:table-cell">Category</th>
                <th className="px-4 md:px-6 lg:px-10 py-4 lg:py-6 hidden md:table-cell">Wallet</th>
                <th className="px-4 md:px-6 lg:px-10 py-4 lg:py-6 text-right">Amount</th>
                <th className="px-2 md:px-4 lg:px-6 py-4 lg:py-6 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {paged.map((tx) => {
                const cat = getCategoryById(tx.categoryId);
                const wallet = getWalletById(tx.walletId);
                const isDebtTx = !tx.categoryId && tx.type !== 'transfer';
                const IconComp = cat 
                  ? getIcon(cat.icon) 
                  : isDebtTx 
                    ? getIcon('Handshake') 
                    : getIcon('HelpCircle');
                const categoryName = tx.type === 'transfer' 
                  ? t('common.transfer') 
                  : cat 
                    ? cat.name 
                    : isDebtTx 
                      ? tx.debtType === 'DEBT'
                        ? t('common.debt')
                        : t('common.receivable')
                      : 'Unknown';                const isReversed = tx.isReversed;
                const isReversal = tx.description.startsWith('[REVERSAL]');

                return (
                  <tr 
                    key={tx.id} 
                    className={cn(
                      "transition-colors group",
                      isReversed 
                        ? "bg-amber-500/[0.02] hover:bg-amber-500/[0.04] text-amber-500/70" 
                        : isReversal 
                          ? "bg-sky-500/[0.02] hover:bg-sky-500/[0.04] text-sky-500/70" 
                          : "hover:bg-on-surface/[0.04] even:bg-on-surface/[0.02]"
                    )}
                  >
                    <td className="px-4 md:px-6 lg:px-10 py-4 lg:py-7 text-xs font-bold text-on-surface font-mono tracking-tighter uppercase whitespace-nowrap hidden md:table-cell">
                      TX-{tx.seqId || 'N/A'}
                    </td>
                    <td className="px-4 md:px-6 lg:px-10 py-4 lg:py-7 text-xs font-bold text-on-surface/30 uppercase tracking-widest tabular-nums whitespace-nowrap hidden md:table-cell">
                      {formatDate(tx.date)}
                    </td>
                    <td className="px-4 md:px-6 lg:px-10 py-4 lg:py-7">
                      <div className="flex items-center gap-4 lg:gap-5">
                        <div className={cn(
                          "w-9 h-9 lg:w-10 lg:h-10 rounded-xl glass-dark border flex items-center justify-center group-hover:border-primary/20 transition-all",
                          isReversed 
                            ? "border-amber-500/20 text-amber-400 bg-amber-500/5" 
                            : isReversal 
                              ? "border-sky-500/20 text-sky-400 bg-sky-500/5" 
                              : tx.type === 'income' 
                                ? "border-on-surface/5 text-primary" 
                                : tx.type === 'transfer' 
                                  ? "border-on-surface/5 text-secondary" 
                                  : "border-on-surface/5 text-on-surface/50"
                        )}>
                          {tx.type === 'transfer' ? <ArrowUpDown size={16} className="rotate-45" /> : <IconComp size={16} />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={cn(
                              "text-sm font-bold",
                              isReversed ? "line-through text-on-surface/40" : "text-on-surface"
                            )}>
                              {tx.description}
                            </span>
                            {isReversed && (
                              <span className="text-[8px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 uppercase tracking-wider">
                                Reversed
                              </span>
                            )}
                            {isReversal && (
                              <span className="text-[8px] font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20 uppercase tracking-wider">
                                Reversal
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <span className="md:hidden text-[9px] font-bold text-on-surface/40 uppercase tracking-widest">
                              {formatDate(tx.date)}
                            </span>
                            <span className="text-[9px] font-bold text-on-surface/20 uppercase tracking-widest font-mono">
                              ID: TX-{tx.seqId || 'N/A'}
                            </span>
                            <span className="block lg:hidden text-[9px] text-on-surface/30 uppercase tracking-widest">{categoryName}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 md:px-6 lg:px-10 py-4 lg:py-7 hidden lg:table-cell">
                      <span className="text-xs font-bold text-on-surface/40 uppercase tracking-widest">{categoryName}</span>
                    </td>
                    <td className="px-4 md:px-6 lg:px-10 py-4 lg:py-7 hidden md:table-cell">
                      <span className="px-3 lg:px-4 py-1.5 glass-dark rounded-lg text-[9px] font-bold text-on-surface/60 border border-on-surface/5 uppercase tracking-[0.2em] inline-flex items-center gap-1.5">
                        {wallet?.name || 'Unknown'} {tx.type === 'transfer' && tx.toWalletId && <><ArrowRight size={10} className="opacity-50" /> {getWalletById(tx.toWalletId)?.name}</>}
                      </span>
                    </td>
                    <td className={cn(
                      "px-4 md:px-6 lg:px-10 py-4 lg:py-7 text-right text-base lg:text-lg font-bold font-display tracking-tighter whitespace-nowrap",
                      tx.type === 'income' ? "text-primary" : tx.type === 'transfer' ? "text-secondary" : "text-on-surface/80"
                    )}>
                      {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}{formatCurrency(tx.amount)}
                    </td>
                    <td className="px-2 md:px-4 lg:px-6 py-4 lg:py-7">
                      {!tx.isReversed && !tx.description.startsWith('[REVERSAL]') && (
                        <button
                          onClick={() => setDeleteId(tx.id)}
                          className="text-on-surface/10 hover:text-error transition-colors p-1"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {paged.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-10 py-16 text-center text-on-surface/20 text-sm uppercase tracking-widest">
                    {searchQuery ? 'No transactions match your search' : 'No transactions yet'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {/* Mobile List */}
          <div className="md:hidden flex flex-col divide-y divide-white/5">
            {paged.map((tx) => {
              const cat = getCategoryById(tx.categoryId);
              const wallet = getWalletById(tx.walletId);
              const isDebtTx = !tx.categoryId && tx.type !== 'transfer';
              const IconComp = cat ? getIcon(cat.icon) : isDebtTx ? getIcon('Handshake') : getIcon('HelpCircle');
              const categoryName = tx.type === 'transfer' ? t('common.transfer') : cat ? cat.name : isDebtTx ? tx.debtType === 'DEBT' ? t('common.debt') : t('common.receivable') : 'Unknown';
              const isReversed = tx.isReversed;
              const isReversal = tx.description.startsWith('[REVERSAL]');

              return (
                <div key={tx.id} className={cn("p-4 flex flex-col gap-3 transition-colors relative group hover:bg-on-surface/[0.03]", isReversed ? "bg-amber-500/[0.02] text-amber-500/70" : isReversal ? "bg-sky-500/[0.02] text-sky-500/70" : "even:bg-on-surface/[0.02]")}>
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-10 h-10 rounded-xl glass-dark border flex items-center justify-center shrink-0", isReversed ? "border-amber-500/20 text-amber-400 bg-amber-500/5" : isReversal ? "border-sky-500/20 text-sky-400 bg-sky-500/5" : tx.type === 'income' ? "border-on-surface/5 text-primary" : tx.type === 'transfer' ? "border-on-surface/5 text-secondary" : "border-on-surface/5 text-on-surface/50")}>
                        {tx.type === 'transfer' ? <ArrowUpDown size={16} className="rotate-45" /> : <IconComp size={16} />}
                      </div>
                      <div>
                        <p className={cn("text-sm font-bold leading-tight", isReversed ? "line-through text-on-surface/40" : "text-on-surface")}>
                          {tx.description}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          {isReversed && <span className="text-[8px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded uppercase border border-amber-500/20 tracking-wider">Reversed</span>}
                          {isReversal && <span className="text-[8px] font-bold text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded uppercase border border-sky-500/20 tracking-wider">Reversal</span>}
                          <span className="text-[9px] font-bold text-on-surface/40 uppercase tracking-widest">{formatDate(tx.date)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0 mt-1">
                      <p className={cn("text-base font-bold font-display tracking-tighter whitespace-nowrap", tx.type === 'income' ? "text-primary" : tx.type === 'transfer' ? "text-secondary" : "text-on-surface/80")}>
                        {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}{formatCurrency(tx.amount)}
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center pl-[52px]">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[9px] font-bold text-on-surface/30 uppercase tracking-widest font-mono">ID: TX-{tx.seqId || 'N/A'}</span>
                      <span className="text-[9px] text-on-surface/20">•</span>
                      <span className="text-[9px] font-bold text-on-surface/40 uppercase tracking-widest">{categoryName}</span>
                    </div>
                    {!tx.isReversed && !tx.description.startsWith('[REVERSAL]') && (
                      <button onClick={() => setDeleteId(tx.id)} className="p-2 text-on-surface/20 hover:text-error transition-colors -mr-2">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {paged.length === 0 && (
              <div className="px-10 py-16 text-center text-on-surface/20 text-sm uppercase tracking-widest">
                {searchQuery ? 'No transactions match your search' : 'No transactions yet'}
              </div>
            )}
          </div>
        </div>
        {/* Pagination */}
        <div className="p-6 lg:p-8 border-t border-on-surface/5 flex justify-between items-center text-[9px] font-bold text-on-surface/20 uppercase tracking-[0.3em] glass-dark">
          <span className="flex items-center gap-4">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            {filtered.length} transactions
          </span>
          <div className="flex gap-3">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="w-10 h-10 rounded-xl flex items-center justify-center glass-dark border border-on-surface/5 text-on-surface/30 hover:text-on-surface transition-all disabled:opacity-20"
            >
              <ChevronLeft size={18} />
            </button>
            <button className="px-5 h-10 rounded-xl flex items-center justify-center bg-on-surface text-surface font-bold text-[10px] tracking-widest shadow-xl">
              {page}/{totalPages}
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="w-10 h-10 rounded-xl flex items-center justify-center glass-dark border border-on-surface/5 text-on-surface/30 hover:text-on-surface transition-all disabled:opacity-20"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Quick Add Form Modal */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-[100] flex items-end lg:items-center justify-center p-0 lg:p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowForm(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "100%" }}
              className="glass rounded-t-[32px] lg:rounded-[32px] p-8 lg:p-10 pb-[max(2rem,env(safe-area-inset-bottom))] lg:pb-10 w-full max-w-md relative z-10 border-t lg:border border-on-surface/10 shadow-[0_-10px_40px_rgba(0,0,0,0.3)] lg:shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="font-display text-xl font-bold text-on-surface">New Transaction</h3>
                <button onClick={() => setShowForm(false)} className="text-on-surface/30 hover:text-on-surface transition-colors"><X size={20} /></button>
              </div>

              <div className="space-y-5">
                <div className="flex p-1.5 bg-on-surface/5 rounded-[20px] border border-on-surface/5">
                  <button type="button" onClick={() => setFormType('expense')} className={cn("flex-1 py-3 rounded-[16px] text-xs font-bold uppercase tracking-widest transition-all", formType === 'expense' ? "bg-tertiary/20 text-tertiary border border-tertiary/20" : "text-on-surface/30")}>Expense</button>
                  <button type="button" onClick={() => setFormType('income')} className={cn("flex-1 py-3 rounded-[16px] text-xs font-bold uppercase tracking-widest transition-all", formType === 'income' ? "bg-primary/20 text-primary border border-primary/20" : "text-on-surface/30")}>Income</button>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-on-surface/30 uppercase tracking-[0.2em] ml-1">Amount</label>
                  <div className="relative">
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-on-surface/20 font-bold text-lg">Rp</span>
                    <input type="number" value={formAmount} onChange={(e) => setFormAmount(e.target.value)} placeholder="0" className="w-full pl-14 pr-5 py-5 bg-on-surface/5 border border-on-surface/5 rounded-2xl font-display text-2xl font-bold text-on-surface focus:outline-none focus:border-on-surface/20 transition-all placeholder:text-on-surface/10" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-on-surface/30 uppercase tracking-[0.2em] ml-1">Description</label>
                  <input type="text" value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="What for?" className="w-full px-5 py-4 bg-on-surface/5 border border-on-surface/5 rounded-2xl text-sm font-bold text-on-surface focus:outline-none focus:border-on-surface/20 transition-all placeholder:text-on-surface/15" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-on-surface/30 uppercase tracking-[0.2em] ml-1">Wallet</label>
                    <select value={formWallet} onChange={(e) => setFormWallet(e.target.value)} className="w-full px-5 py-4 bg-on-surface/5 border border-on-surface/5 rounded-2xl text-xs font-bold text-on-surface focus:outline-none appearance-none cursor-pointer uppercase tracking-widest">
                      {wallets.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-on-surface/30 uppercase tracking-[0.2em] ml-1">Category</label>
                    <select value={formCategory} onChange={(e) => setFormCategory(e.target.value)} className="w-full px-5 py-4 bg-on-surface/5 border border-on-surface/5 rounded-2xl text-xs font-bold text-on-surface focus:outline-none appearance-none cursor-pointer uppercase tracking-widest">
                      {filteredCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-on-surface/30 uppercase tracking-[0.2em] ml-1">Date</label>
                  <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} className="w-full px-5 py-4 bg-on-surface/5 border border-on-surface/5 rounded-2xl text-xs font-bold text-on-surface focus:outline-none cursor-pointer uppercase tracking-widest" />
                </div>

                <button
                  onClick={handleFormSubmit}
                  disabled={!formAmount || parseFloat(formAmount) <= 0}
                  className={cn(
                    "w-full py-5 text-on-surface text-sm font-bold uppercase tracking-widest rounded-2xl transition-all shadow-lg active:scale-95 duration-200 disabled:opacity-30 disabled:cursor-not-allowed mt-2",
                    formType === 'expense' ? "bg-tertiary hover:bg-tertiary/80" : "bg-primary hover:bg-primary/80"
                  )}
                >
                  Save {formType === 'expense' ? 'Expense' : 'Income'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ImportTransactionsModal isOpen={showImport} onClose={() => setShowImport(false)} />

      <ConfirmDialog
        isOpen={!!deleteId}
        title={t('transactions.deleteConfirmTitle')}
        message="Menghapus transaksi ini akan membuat Jurnal Pembalik (Reversing Entry) secara otomatis pada General Ledger untuk mengembalikan saldo, sehingga histori finansial tetap utuh."
        onConfirm={() => { if (deleteId) deleteJournal(deleteId); setDeleteId(null); }}
        onCancel={() => setDeleteId(null)}
      />
    </motion.div>
  );
}
