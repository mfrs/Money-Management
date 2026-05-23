import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BookOpen,
  Search,
  Calendar,
  X,
  FileText,
  ArrowDownToLine
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../lib/types';
import { cn } from '../lib/utils';
import { exportJournalDetail } from '../lib/pdfExport';

export default function LedgerView() {
  const { journals, wallets, categories, t, addToast, language } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJournal, setSelectedJournal] = useState<any>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'normal' | 'reversed'>('all');

  // Map journals into a sortable array with total amount
  const ledgerJournals = useMemo(() => {
    return journals.map(j => {
      const totalAmount = j.lines.filter((l: any) => l.type === 'DEBIT').reduce((s: number, l: any) => s + l.amount, 0);
      return {
        ...j,
        totalAmount
      };
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [journals]);

  // Filter journals based on active tab and search
  const filteredJournals = useMemo(() => {
    let result = [...ledgerJournals];

    if (activeTab === 'normal') {
      result = result.filter(j => !j.isReversed && !j.description.startsWith('[REVERSAL]'));
    } else if (activeTab === 'reversed') {
      result = result.filter(j => j.isReversed || j.description.startsWith('[REVERSAL]'));
    }

    if (!searchQuery) return result;
    const lowerQuery = searchQuery.toLowerCase();
    return result.filter(j => 
      j.description.toLowerCase().includes(lowerQuery) ||
      j.id.toLowerCase().includes(lowerQuery)
    );
  }, [ledgerJournals, searchQuery, activeTab]);

  const exportDetailToPDF = async () => {
    setIsExporting(true);
    addToast(
      language === 'id' ? 'Memproses PDF, mohon tunggu...' : 'Processing PDF, please wait...',
      'info'
    );
    
    try {
      if (!selectedJournal) throw new Error('No journal selected');

      const lines = selectedJournal.lines.map((l: any) => {
        let accountName = 'Unknown';
        let accountCategory = '';
        if (l.walletId) {
          const w = wallets.find((w: any) => w.id === l.walletId);
          accountName = w ? w.name : 'Unknown';
          accountCategory = 'ASSET';
        } else if (l.categoryId) {
          const c = categories.find((c: any) => c.id === l.categoryId);
          accountName = c ? c.name : 'Unknown';
          accountCategory = c?.type === 'income' ? 'REVENUE' : 'EXPENSE';
        }
        return {
          accountName,
          accountCategory,
          description: selectedJournal.description,
          debit: l.type === 'DEBIT' ? l.amount : 0,
          credit: l.type === 'CREDIT' ? l.amount : 0,
        };
      });

      exportJournalDetail({
        journalId: selectedJournal.id,
        description: selectedJournal.description,
        note: selectedJournal.note,
        date: selectedJournal.date,
        createdAt: selectedJournal.createdAt,
        lines,
        language,
      });

      addToast(
        language === 'id' ? 'Berhasil mengunduh PDF!' : 'PDF downloaded successfully!',
        'success'
      );
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      addToast(
        language === 'id' ? 'Gagal mengekspor PDF' : 'Failed to export PDF',
        'error'
      );
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-10"
    >
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 px-2 min-w-0 w-full">
        <div className="min-w-0 w-full">
          <h2 className="font-display text-3xl lg:text-4xl font-bold text-on-surface tracking-tight uppercase break-words">
            {t('ledger.title')}
          </h2>
          <p className="text-[10px] md:text-xs text-on-surface/40 uppercase tracking-[0.2em] font-medium mt-2 max-w-lg leading-relaxed break-words whitespace-normal">
            {t('ledger.subtitle')}
          </p>
        </div>
      </header>

      {/* Main Ledger Table */}
      <div className="glass rounded-[24px] lg:rounded-[32px] overflow-hidden border border-on-surface/5 flex flex-col">
        {/* Toolbar */}
        <div className="p-6 lg:p-8 border-b border-on-surface/5 bg-on-surface/[0.02] flex flex-col lg:flex-row gap-6 justify-between items-center min-w-0 w-full">
          <div className="flex items-center gap-4 w-full lg:w-auto">
            <div className="w-10 h-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center">
              <BookOpen size={20} />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold text-on-surface uppercase tracking-widest">
                {t('ledger.list')}
              </h3>
              <p className="text-[10px] text-on-surface/40 uppercase tracking-widest font-medium mt-0.5">
                {filteredJournals.length} {t('ledger.entriesCount')}
              </p>
            </div>
          </div>

          {/* Sub Menu Tabs */}
          <div className="flex gap-1.5 glass-dark p-1.5 rounded-full border border-on-surface/5 w-full min-w-0 max-w-full lg:w-auto justify-start lg:justify-center overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {(['all', 'normal', 'reversed'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-4 lg:px-5 py-2 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] transition-all",
                  activeTab === tab 
                    ? "bg-on-surface text-surface shadow-lg" 
                    : "text-on-surface/30 hover:text-on-surface"
                )}
              >
                {tab === 'all' 
                  ? (language === 'id' ? 'Semua Jurnal' : 'All Journals') 
                  : tab === 'normal' 
                    ? (language === 'id' ? 'Normal Journal Entry' : 'Normal Journal Entry') 
                    : (language === 'id' ? 'Reversed Journal' : 'Reversed Journal')}
              </button>
            ))}
          </div>
          
          <div className="relative w-full lg:w-80 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface/20 group-focus-within:text-primary transition-colors" size={16} />
            <input
              type="text"
              placeholder={t('ledger.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-on-surface/5 border border-on-surface/5 rounded-2xl text-xs font-bold text-on-surface focus:outline-none focus:border-primary/30 focus:ring-1 focus:ring-primary/30 transition-all placeholder:text-on-surface/20 uppercase tracking-widest"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left hidden md:table">
            <thead>
              <tr className="border-b border-on-surface/5 text-[9px] font-bold text-on-surface/20 uppercase tracking-[0.3em] bg-on-surface/[0.01]">
                <th className="px-4 lg:px-8 py-5 hidden md:table-cell">{t('ledger.postDate')}</th>
                <th className="px-4 lg:px-8 py-5 hidden md:table-cell">{t('ledger.journalNo')}</th>
                <th className="px-4 lg:px-8 py-5">{t('ledger.description')}</th>
                <th className="px-4 lg:px-8 py-5 text-right">{t('ledger.totalAmount')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredJournals.map((journal, index) => {
                const isReversed = journal.isReversed;
                const isReversal = journal.description.startsWith('[REVERSAL]');
                return (
                  <tr 
                    key={journal.id} 
                    onClick={() => setSelectedJournal(journal)}
                    className={cn(
                      "transition-colors cursor-pointer group",
                      index % 2 !== 0 ? "bg-on-surface/[0.02]" : "",
                      isReversed 
                        ? "bg-amber-500/[0.02] hover:bg-amber-500/[0.04] text-amber-500/70" 
                        : isReversal 
                          ? "bg-sky-500/[0.02] hover:bg-sky-500/[0.04] text-sky-500/70" 
                          : "hover:bg-on-surface/[0.04]"
                    )}
                  >
                  <td className="px-4 lg:px-8 py-4 whitespace-nowrap hidden md:table-cell">
                    <p className="text-[10px] font-bold text-on-surface/75 uppercase tracking-widest">
                      {new Date(journal.date).toLocaleDateString(language === 'id' ? 'id-ID' : 'en-GB')}
                    </p>
                    {journal.createdAt && (
                      <p className="text-[8px] font-medium text-on-surface/30 mt-1 uppercase tracking-wider">
                        {language === 'id' ? 'Diinput: ' : 'Entered: '}
                        {new Date(journal.createdAt).toLocaleDateString(language === 'id' ? 'id-ID' : 'en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        {' '}
                        {new Date(journal.createdAt).toLocaleTimeString(language === 'id' ? 'id-ID' : 'en-GB', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </td>
                  <td className="px-4 lg:px-8 py-4 text-[10px] font-bold text-on-surface/60 font-mono tracking-tighter uppercase hidden md:table-cell">
                    JRN-{journal.id.substring(journal.id.length - 6).toUpperCase()}
                  </td>
                  <td className="px-4 lg:px-8 py-4">
                    <div className="md:hidden flex flex-wrap gap-2 mb-2">
                      <span className="text-[9px] font-bold text-on-surface/50 uppercase tracking-widest">
                        {new Date(journal.date).toLocaleDateString(language === 'id' ? 'id-ID' : 'en-GB')}
                      </span>
                      <span className="text-[9px] font-bold text-on-surface/30 uppercase tracking-widest font-mono">
                        JRN-{journal.id.substring(journal.id.length - 6).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={cn(
                        "text-xs font-bold",
                        isReversed ? "line-through text-on-surface/40" : "text-on-surface"
                      )}>
                        {journal.description}
                      </p>
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
                    {journal.note && <p className="text-[9px] text-on-surface/40 mt-1 truncate max-w-sm">{journal.note}</p>}
                  </td>
                  <td className="px-4 lg:px-8 py-4 text-right text-sm font-bold font-display tracking-tighter tabular-nums whitespace-nowrap text-on-surface">
                    {formatCurrency(journal.totalAmount)}
                  </td>
                </tr>
              );
            })}
              {filteredJournals.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-8 py-16 text-center text-on-surface/20 text-sm uppercase tracking-widest">
                    {t('ledger.noEntries')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {/* Mobile List */}
          <div className="md:hidden flex flex-col divide-y divide-white/5">
            {filteredJournals.map((journal) => {
              const isReversed = journal.isReversed;
              const isReversal = journal.description.startsWith('[REVERSAL]');
              return (
                <div 
                  key={journal.id} 
                  onClick={() => setSelectedJournal(journal)}
                  className={cn(
                    "p-4 flex flex-col gap-3 transition-colors cursor-pointer group relative hover:bg-on-surface/[0.03]",
                    isReversed ? "bg-amber-500/[0.02] text-amber-500/70" : isReversal ? "bg-sky-500/[0.02] text-sky-500/70" : "even:bg-on-surface/[0.02]"
                  )}
                >
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <span className="text-[10px] font-bold text-on-surface/75 uppercase tracking-widest">
                          {new Date(journal.date).toLocaleDateString(language === 'id' ? 'id-ID' : 'en-GB')}
                        </span>
                        <span className="text-[9px] font-bold text-on-surface/40 uppercase tracking-widest font-mono">
                          JRN-{journal.id.substring(journal.id.length - 6).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={cn("text-xs font-bold leading-tight", isReversed ? "line-through text-on-surface/40" : "text-on-surface")}>
                          {journal.description}
                        </p>
                        {isReversed && <span className="text-[8px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 uppercase tracking-wider">Reversed</span>}
                        {isReversal && <span className="text-[8px] font-bold text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20 uppercase tracking-wider">Reversal</span>}
                      </div>
                      {journal.note && <p className="text-[9px] text-on-surface/40 mt-1.5">{journal.note}</p>}
                    </div>
                    <div className="text-right shrink-0 mt-1">
                      <p className="text-sm font-bold font-display tracking-tighter text-on-surface whitespace-nowrap">
                        {formatCurrency(journal.totalAmount)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
            {filteredJournals.length === 0 && (
              <div className="px-8 py-16 text-center text-on-surface/20 text-sm uppercase tracking-widest">
                {t('ledger.noEntries')}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detail Journal Modal */}
      <AnimatePresence>
        {selectedJournal && (
          <div className="fixed inset-0 z-[100] flex items-end lg:items-center justify-center p-0 lg:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedJournal(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            
            <motion.div
              initial={{ opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "100%" }}
              className="bg-surface-dim w-full max-w-4xl rounded-t-[32px] lg:rounded-[40px] shadow-[0_-10px_40px_rgba(0,0,0,0.3)] lg:shadow-2xl overflow-hidden relative z-10 border-t lg:border border-on-surface/10 flex flex-col max-h-[90vh] pb-[env(safe-area-inset-bottom,2rem)] lg:pb-0"
            >
              {/* Toolbar */}
              <div className="px-8 py-6 flex items-center justify-between border-b border-on-surface/5 bg-on-surface/[0.02]">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-on-surface/5 text-on-surface flex items-center justify-center border border-on-surface/10">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h3 className="font-display text-xl font-bold text-on-surface uppercase tracking-widest">
                      {t('ledger.detailTitle')}
                    </h3>
                    <p className="text-[10px] text-on-surface/40 uppercase tracking-widest mt-1">
                      No. Doc: JRN-{selectedJournal.id.substring(selectedJournal.id.length - 6).toUpperCase()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={exportDetailToPDF}
                    disabled={isExporting}
                    className="p-3 text-primary hover:bg-primary/10 rounded-xl transition-all disabled:opacity-50"
                    title="Export PDF"
                  >
                    <ArrowDownToLine size={20} />
                  </button>
                  <button
                    onClick={() => setSelectedJournal(null)}
                    className="p-3 text-on-surface/40 hover:text-on-surface hover:bg-on-surface/5 rounded-xl transition-all"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Scrollable Content */}
              <div id="journal-detail-content" className="p-8 overflow-y-auto bg-transparent">
                {/* Header Info */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-6 mb-8 p-6 glass-dark rounded-[24px] border border-on-surface/5">
                  <div>
                    <p className="text-[9px] font-bold text-on-surface/30 uppercase tracking-[0.2em] mb-1">
                      {t('ledger.currencyLabel')}
                    </p>
                    <p className="text-xs font-bold text-on-surface uppercase tracking-widest">
                      {t('ledger.currencyVal')}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-on-surface/30 uppercase tracking-[0.2em] mb-1">
                      {t('ledger.docDate')}
                    </p>
                    <p className="text-xs font-bold text-on-surface uppercase tracking-widest">
                      {new Date(selectedJournal.date).toLocaleDateString(language === 'id' ? 'id-ID' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-on-surface/30 uppercase tracking-[0.2em] mb-1">
                      {language === 'id' ? 'TGL. DIINPUT' : 'INSERT DATE'}
                    </p>
                    <p className="text-xs font-bold text-on-surface uppercase tracking-widest">
                      {selectedJournal.createdAt 
                        ? `${new Date(selectedJournal.createdAt).toLocaleDateString(language === 'id' ? 'id-ID' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} ${new Date(selectedJournal.createdAt).toLocaleTimeString(language === 'id' ? 'id-ID' : 'en-GB', { hour: '2-digit', minute: '2-digit' })}`
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-on-surface/30 uppercase tracking-[0.2em] mb-1">
                      {t('ledger.status')}
                    </p>
                    <p className="text-[10px] font-bold text-primary bg-primary/10 w-fit px-3 py-1 rounded-full uppercase tracking-widest">POSTED</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-on-surface/30 uppercase tracking-[0.2em] mb-1">
                      {t('ledger.voucherCode')}
                    </p>
                    <p className="text-xs font-bold text-on-surface uppercase tracking-widest font-mono truncate">{selectedJournal.id.substring(selectedJournal.id.length - 8).toUpperCase()}</p>
                  </div>
                  <div className="col-span-2 md:col-span-5 mt-2">
                    <p className="text-[9px] font-bold text-on-surface/30 uppercase tracking-[0.2em] mb-1">
                      {t('ledger.description')}
                    </p>
                    <p className="text-sm font-bold text-on-surface">{selectedJournal.description}</p>
                    {selectedJournal.note && (
                      <p className="text-xs text-on-surface/50 mt-1">{selectedJournal.note}</p>
                    )}
                  </div>
                </div>

                {/* Lines Table */}
                <div className="border border-on-surface/10 rounded-2xl overflow-hidden">
                  <table className="w-full text-left hidden md:table">
                    <thead>
                      <tr className="border-b border-on-surface/10 bg-on-surface/5 text-[9px] font-bold text-on-surface/40 uppercase tracking-[0.2em]">
                        <th className="p-4">GL Account</th>
                        <th className="p-4">Description</th>
                        <th className="p-4 text-right">Debet</th>
                        <th className="p-4 text-right">Credit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-on-surface/5">
                      {selectedJournal.lines.map((l: any, i: number) => {
                        let accountName = 'Unknown';
                        let accountCategory = '';
                        if (l.walletId) {
                          const w = wallets.find(w => w.id === l.walletId);
                          accountName = w ? w.name : 'Unknown';
                          accountCategory = 'ASSET';
                        } else if (l.categoryId) {
                          const c = categories.find(c => c.id === l.categoryId);
                          accountName = c ? c.name : 'Unknown';
                          accountCategory = c?.type === 'income' ? 'REVENUE' : 'EXPENSE';
                        }

                        return (
                          <tr key={l.id} className="bg-on-surface/[0.01] hover:bg-on-surface/[0.03] transition-colors">
                            <td className="p-4">
                              <p className="text-xs font-bold text-on-surface uppercase tracking-wider">{accountName}</p>
                              <p className="text-[9px] text-on-surface/40 uppercase tracking-widest mt-1">[{accountCategory}]</p>
                            </td>
                            <td className="p-4">
                              <p className="text-xs text-on-surface font-medium">{selectedJournal.description}</p>
                            </td>
                            <td className="p-4 text-right text-sm font-bold font-display tabular-nums">
                              {l.type === 'DEBIT' ? formatCurrency(l.amount) : '0'}
                            </td>
                            <td className="p-4 text-right text-sm font-bold font-display tabular-nums">
                              {l.type === 'CREDIT' ? formatCurrency(l.amount) : '0'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="border-t-2 border-on-surface/10 bg-on-surface/[0.02]">
                      <tr>
                        <td colSpan={2} className="p-4 text-[10px] font-bold text-on-surface/40 uppercase tracking-[0.3em]">
                          T O T A L
                        </td>
                        <td className="p-4 text-right text-sm font-bold text-secondary font-display tabular-nums">
                          {formatCurrency(selectedJournal.lines.filter((l:any) => l.type === 'DEBIT').reduce((s:number, l:any) => s + l.amount, 0))}
                        </td>
                        <td className="p-4 text-right text-sm font-bold text-primary font-display tabular-nums">
                          {formatCurrency(selectedJournal.lines.filter((l:any) => l.type === 'CREDIT').reduce((s:number, l:any) => s + l.amount, 0))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                  {/* Mobile Lines List */}
                  <div className="md:hidden flex flex-col divide-y divide-on-surface/10 bg-on-surface/[0.01]">
                    {selectedJournal.lines.map((l: any) => {
                      let accountName = 'Unknown';
                      let accountCategory = '';
                      if (l.walletId) {
                        const w = wallets.find(w => w.id === l.walletId);
                        accountName = w ? w.name : 'Unknown';
                        accountCategory = 'ASSET';
                      } else if (l.categoryId) {
                        const c = categories.find(c => c.id === l.categoryId);
                        accountName = c ? c.name : 'Unknown';
                        accountCategory = c?.type === 'income' ? 'REVENUE' : 'EXPENSE';
                      }

                      return (
                        <div key={l.id} className="p-4 bg-on-surface/[0.01] flex flex-col gap-3">
                          <div className="flex justify-between items-start gap-4">
                            <div>
                              <p className="text-xs font-bold text-on-surface uppercase tracking-wider">{accountName}</p>
                              <p className="text-[9px] text-on-surface/40 uppercase tracking-widest mt-0.5">[{accountCategory}]</p>
                            </div>
                            <div className="text-right shrink-0 mt-1">
                              {l.type === 'DEBIT' ? (
                                <p className="text-xs font-bold text-secondary font-display whitespace-nowrap">Db: {formatCurrency(l.amount)}</p>
                              ) : (
                                <p className="text-xs font-bold text-primary font-display whitespace-nowrap">Cr: {formatCurrency(l.amount)}</p>
                              )}
                            </div>
                          </div>
                          <p className="text-[10px] text-on-surface font-medium">{selectedJournal.description}</p>
                        </div>
                      );
                    })}
                    <div className="p-4 border-t-2 border-on-surface/10 bg-on-surface/[0.02] flex justify-between items-center">
                      <span className="text-[10px] font-bold text-on-surface/40 uppercase tracking-[0.3em]">TOTAL</span>
                      <div className="text-right space-y-1">
                        <p className="text-xs font-bold text-secondary font-display tabular-nums">Db: {formatCurrency(selectedJournal.lines.filter((l:any) => l.type === 'DEBIT').reduce((s:number, l:any) => s + l.amount, 0))}</p>
                        <p className="text-xs font-bold text-primary font-display tabular-nums">Cr: {formatCurrency(selectedJournal.lines.filter((l:any) => l.type === 'CREDIT').reduce((s:number, l:any) => s + l.amount, 0))}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
