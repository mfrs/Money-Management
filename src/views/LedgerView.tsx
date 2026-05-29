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
import { exportWalletJournal, exportJournalDetail } from '../lib/pdfExport';
import { exportWalletJournalToCSV } from '../lib/excelExport';

export default function LedgerView() {
  const { journals, categories, wallets, addToast, t, language, user, setCurrentView } = useApp();
  
  const getFirstDayOfMonth = () => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  };

  const getTodayDateString = () => {
    return new Date().toISOString().split('T')[0];
  };

  const formatTransDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = String(date.getDate()).padStart(2, '0');
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const getGLAccountCode = (wallet: any) => {
    if (!wallet) return '111101';
    if (wallet.account && /^\d+$/.test(wallet.account.trim())) {
      return wallet.account.trim();
    }
    const map: Record<string, string> = {
      cash: '111101',
      bank: '111201',
      ewallet: '111301',
      savings: '111401'
    };
    return map[wallet.type as string] || '111101';
  };

  const [selectedWalletId, setSelectedWalletId] = useState(wallets[0]?.id || '');
  const [isExporting, setIsExporting] = useState(false);
  const [journalStartDate, setJournalStartDate] = useState(getFirstDayOfMonth());
  const [journalEndDate, setJournalEndDate] = useState(getTodayDateString());
  const [journalSortOrder, setJournalSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [selectedJournal, setSelectedJournal] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const mappedTransactions = useMemo(() => {
    return journals
      .filter(j => !j.isReversed && !j.description.startsWith('[REVERSAL]'))
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
          date: j.date,
          type,
          amount,
          categoryId,
          walletId,
          toWalletId,
          debtType,
        };
      });
  }, [journals]);

  const journalEntries = useMemo(() => {
    if (!selectedWalletId) return [];
    
    const wallet = wallets.find(w => w.id === selectedWalletId);
    if (!wallet) return [];

    // Calculate full running balance history by sorting all transactions newest to oldest
    const allRelevantTxs = mappedTransactions
      .filter(t => t.walletId === selectedWalletId || t.toWalletId === selectedWalletId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const allEntries: any[] = [];
    let currentBalance = wallet.balance;

    for (const tx of allRelevantTxs) {
      let debit = 0;
      let credit = 0;

      if (tx.type === 'income') {
        debit = tx.amount;
      } else if (tx.type === 'expense') {
        credit = tx.amount;
      } else if (tx.type === 'transfer') {
        if (tx.walletId === selectedWalletId) {
          credit = tx.amount;
        } else {
          debit = tx.amount;
        }
      }

      allEntries.push({
        ...tx,
        debit,
        credit,
        runningBalance: currentBalance
      });

      // Trace backward
      currentBalance = currentBalance - debit + credit;
    }

    // Filter by dates
    let filtered = allEntries;
    if (journalStartDate) {
      const start = new Date(journalStartDate + 'T00:00:00').getTime();
      filtered = filtered.filter(e => new Date(e.date).getTime() >= start);
    }
    if (journalEndDate) {
      const end = new Date(journalEndDate + 'T23:59:59').getTime();
      filtered = filtered.filter(e => new Date(e.date).getTime() <= end);
    }

    // Filter by search query
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(e => 
        e.description.toLowerCase().includes(lowerQuery) ||
        e.id.toLowerCase().includes(lowerQuery)
      );
    }

    if (journalSortOrder === 'oldest') {
      return filtered.reverse();
    }
    return filtered;
  }, [mappedTransactions, selectedWalletId, wallets, journalSortOrder, journalStartDate, journalEndDate, searchQuery]);

  const exportExcel = () => {
    const wallet = wallets.find(w => w.id === selectedWalletId);
    if (!wallet) return;

    const excelEntries = journalEntries.map((e: any) => {
      const dateFormatted = formatTransDate(e.date);
      const glAccount = getGLAccountCode(wallet);
      const accountShortText = wallet.name.toUpperCase();
      const transactionType = e.type === 'income' ? 'Manual Journal' : e.type === 'expense' ? 'Petty Cash' : 'Transfer';
      const shortText = e.categoryId ? (categories.find(c => c.id === e.categoryId)?.name || '') : e.type === 'transfer' ? 'Transfer' : '';
      const userEntry = user?.name || 'Amanda Caroline';

      return {
        dateFormatted,
        glAccount,
        accountShortText,
        docNumber: String(e.seqId || e.id.substring(e.id.length - 6).toUpperCase()),
        costCenter: '-',
        transactionType,
        regNumber: '-',
        debit: e.debit,
        credit: e.credit,
        balance: e.runningBalance,
        description: e.description,
        shortText,
        userEntry
      };
    });

    exportWalletJournalToCSV({
      walletName: wallet.name,
      startDate: journalStartDate,
      endDate: journalEndDate,
      entries: excelEntries
    });
  };

  const exportToPDF = async () => {
    setIsExporting(true);
    addToast(
      language === 'id' ? 'Memproses PDF, mohon tunggu...' : 'Processing PDF, please wait...',
      'info'
    );
    
    try {
      const wallet = wallets.find(w => w.id === selectedWalletId);
      exportWalletJournal({
        walletName: wallet?.name || 'Unknown',
        entries: journalEntries.map((e: any) => {
          const dateFormatted = formatTransDate(e.date);
          const glAccount = getGLAccountCode(wallet);
          const accountShortText = wallet ? wallet.name.toUpperCase() : '';
          const transactionType = e.type === 'income' ? 'Manual Journal' : e.type === 'expense' ? 'Petty Cash' : 'Transfer';
          const shortText = e.categoryId ? (categories.find(c => c.id === e.categoryId)?.name || '') : e.type === 'transfer' ? 'Transfer' : '';
          const userEntry = user?.name || 'Amanda Caroline';

          return {
            date: e.date,
            dateFormatted,
            glAccount,
            accountShortText,
            docNumber: String(e.seqId || e.id.substring(e.id.length - 6).toUpperCase()),
            costCenter: '-',
            transactionType,
            regNumber: '-',
            debit: e.debit,
            credit: e.credit,
            runningBalance: e.runningBalance,
            description: e.description,
            shortText,
            userEntry
          };
        }),
        language,
      });
      
      addToast(
        language === 'id' ? 'Berhasil mengunduh PDF!' : 'PDF downloaded successfully!',
        'success'
      );
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      addToast(
        language === 'id'
          ? 'Gagal mengekspor PDF: ' + (error.message || 'Silakan coba lagi')
          : 'Failed to export PDF: ' + (error.message || 'Please try again'),
        'error'
      );
    } finally {
      setIsExporting(false);
    }
  };

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

      <div className="glass rounded-[28px] lg:rounded-[40px] flex flex-col overflow-hidden relative">
        {/* Header area with select filters and Date Inputs */}
        <div className="p-6 lg:p-8 border-b border-on-surface/5 flex flex-wrap gap-4 lg:gap-6 justify-between items-center bg-on-surface/[0.02]">
          <div className="flex flex-col gap-1">
            <h3 className="font-display text-xl font-bold text-on-surface uppercase tracking-tight">Overview Ledger</h3>
            <p className="text-[10px] text-on-surface/40 uppercase tracking-widest font-bold">
              Periode : {journalStartDate ? formatTransDate(journalStartDate) : ''} Until {journalEndDate ? formatTransDate(journalEndDate) : ''}
            </p>
          </div>

          <div className="flex flex-wrap gap-4 items-center">
            {/* Wallet Selector */}
            <div className="relative group min-w-[180px]">
              <select
                value={selectedWalletId}
                onChange={(e) => setSelectedWalletId(e.target.value)}
                className="w-full px-5 py-3 bg-on-surface/5 border border-on-surface/5 rounded-xl text-xs font-bold text-on-surface appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all uppercase tracking-widest"
              >
                {wallets.map(w => <option key={w.id} value={w.id}>{w.name.toUpperCase()}</option>)}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface/30 pointer-events-none">▼</div>
            </div>

            {/* Start Date */}
            <div className="flex flex-col">
              <input
                type="date"
                value={journalStartDate}
                onChange={(e) => setJournalStartDate(e.target.value)}
                className="px-4 py-2.5 rounded-xl border border-on-surface/5 bg-on-surface/5 text-[10px] font-bold text-on-surface/80 uppercase focus:outline-none cursor-pointer [color-scheme:dark]"
              />
            </div>

            {/* End Date */}
            <div className="flex flex-col">
              <input
                type="date"
                value={journalEndDate}
                onChange={(e) => setJournalEndDate(e.target.value)}
                className="px-4 py-2.5 rounded-xl border border-on-surface/5 bg-on-surface/5 text-[10px] font-bold text-on-surface/80 uppercase focus:outline-none cursor-pointer [color-scheme:dark]"
              />
            </div>

            {/* Sort Order */}
            <div className="relative group min-w-[140px]">
              <select
                value={journalSortOrder}
                onChange={(e) => setJournalSortOrder(e.target.value as any)}
                className="w-full px-5 py-3 bg-on-surface/5 border border-on-surface/5 rounded-xl text-xs font-bold text-on-surface appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all uppercase tracking-widest"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface/30 pointer-events-none">▼</div>
            </div>

            {/* Search Input */}
            <div className="relative group min-w-[200px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface/20 group-focus-within:text-primary transition-colors" size={14} />
              <input
                type="text"
                placeholder={t('ledger.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-on-surface/5 border border-on-surface/5 rounded-xl text-xs font-bold text-on-surface focus:outline-none focus:border-primary/30 focus:ring-1 focus:ring-primary/30 transition-all placeholder:text-on-surface/20 uppercase tracking-widest"
              />
            </div>
          </div>
        </div>

        {/* Action Toolbar: TUTUP, PRINT, EXCEL, and Detail checkbox */}
        <div className="px-6 py-4 border-b border-on-surface/5 flex flex-wrap justify-between items-center bg-on-surface/[0.04] gap-4">
          <div className="flex items-center gap-3">
            {/* TUTUP Button */}
            <button
              onClick={() => setCurrentView('dashboard')}
              className="px-6 py-2 rounded-lg bg-on-surface/10 hover:bg-on-surface/20 text-on-surface font-bold text-[10px] uppercase tracking-widest transition-all cursor-pointer border border-on-surface/10 shadow-sm"
            >
              TUTUP
            </button>

            {/* PRINT Button */}
            <button
              onClick={exportToPDF}
              disabled={isExporting}
              className="px-6 py-2 rounded-lg bg-primary hover:bg-primary/95 text-on-surface font-bold text-[10px] uppercase tracking-widest transition-all cursor-pointer shadow-md disabled:opacity-50 flex items-center gap-2"
            >
              PRINT
            </button>

            {/* EXCEL Button */}
            <button
              onClick={exportExcel}
              className="px-6 py-2 rounded-lg bg-secondary hover:bg-secondary/95 text-on-surface font-bold text-[10px] uppercase tracking-widest transition-all cursor-pointer shadow-md flex items-center gap-2"
            >
              EXCEL
            </button>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="detail-checkbox"
              defaultChecked
              className="w-4 h-4 rounded border-on-surface/20 bg-on-surface/5 text-primary focus:ring-0 cursor-pointer"
            />
            <label htmlFor="detail-checkbox" className="text-[10px] font-bold text-on-surface/60 uppercase tracking-widest cursor-pointer select-none">
              Detail
            </label>
          </div>
        </div>

        {/* The Ledger Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left table-auto min-w-[1300px]">
            <thead>
              <tr className="border-b border-on-surface/10 text-[9px] font-bold text-on-surface/30 uppercase tracking-[0.2em] bg-on-surface/5">
                <th className="px-4 py-4">Tgl. Trans</th>
                <th className="px-4 py-4">GL Account</th>
                <th className="px-4 py-4">Account Short Tex</th>
                <th className="px-4 py-4">Doc Number</th>
                <th className="px-4 py-4">Cost Center</th>
                <th className="px-4 py-4">Transaction Type</th>
                <th className="px-4 py-4">Reg. Number</th>
                <th className="px-4 py-4 text-right">Debet</th>
                <th className="px-4 py-4 text-right">Credit</th>
                <th className="px-4 py-4 text-right">Balance</th>
                <th className="px-4 py-4">Description</th>
                <th className="px-4 py-4">Short Text</th>
                <th className="px-4 py-4">User Entry</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-[11px]">
              {journalEntries.map((entry, index) => {
                const wallet = wallets.find(w => w.id === selectedWalletId);
                const glAccount = getGLAccountCode(wallet);
                const accountShortText = wallet ? wallet.name.toUpperCase() : '';
                const transactionType = entry.type === 'income' ? 'Manual Journal' : entry.type === 'expense' ? 'Petty Cash' : 'Transfer';
                const shortText = entry.categoryId ? (categories.find(c => c.id === entry.categoryId)?.name || '') : entry.type === 'transfer' ? 'Transfer' : '';
                const userEntry = user?.name || 'Amanda Caroline';
                const rawJournal = journals.find(j => j.id === entry.id);

                // Formatting numbers in Indonesian format: thousand separator '.' and decimal ','
                const formatNumber = (num: number): string => {
                  return new Intl.NumberFormat('id-ID', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  }).format(num);
                };

                return (
                  <tr key={entry.id} className={cn("hover:bg-on-surface/[0.03] transition-colors", index % 2 !== 0 ? "bg-on-surface/[0.02]" : "")}>
                    <td className="px-4 py-3.5 whitespace-nowrap text-on-surface/70 font-medium">
                      {formatTransDate(entry.date)}
                    </td>
                    <td className="px-4 py-3.5 text-on-surface/60 font-mono">
                      {glAccount}
                    </td>
                    <td className="px-4 py-3.5 text-on-surface/80 font-bold uppercase truncate max-w-[150px]" title={accountShortText}>
                      {accountShortText}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <button
                        onClick={() => rawJournal && setSelectedJournal(rawJournal)}
                        className="text-primary hover:text-primary-container font-mono font-bold hover:underline bg-transparent border-none p-0 cursor-pointer"
                      >
                        {entry.seqId || entry.id.substring(entry.id.length - 6).toUpperCase()}
                      </button>
                    </td>
                    <td className="px-4 py-3.5 text-on-surface/30">
                      -
                    </td>
                    <td className="px-4 py-3.5 text-on-surface/60 font-medium whitespace-nowrap">
                      {transactionType}
                    </td>
                    <td className="px-4 py-3.5 text-on-surface/30">
                      -
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-semibold text-secondary whitespace-nowrap">
                      {formatNumber(entry.debit)}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-semibold text-on-surface/80 whitespace-nowrap">
                      {formatNumber(entry.credit)}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-bold text-primary whitespace-nowrap">
                      {formatNumber(entry.runningBalance)}
                    </td>
                    <td className="px-4 py-3.5 text-on-surface/80 max-w-[250px] truncate" title={entry.description}>
                      {entry.description}
                    </td>
                    <td className="px-4 py-3.5 text-on-surface/60 truncate max-w-[120px]" title={shortText}>
                      {shortText || '-'}
                    </td>
                    <td className="px-4 py-3.5 text-on-surface/60 whitespace-nowrap">
                      {userEntry}
                    </td>
                  </tr>
                );
              })}
              {journalEntries.length === 0 && (
                <tr>
                  <td colSpan={13} className="px-8 py-16 text-center text-on-surface/20 text-xs uppercase tracking-widest font-bold">
                    {t('reports.noTransactions')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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
              className="absolute inset-0 bg-black/60 "
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
                      Detail Jurnal
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
                      Mata Uang
                    </p>
                    <p className="text-xs font-bold text-on-surface uppercase tracking-widest">
                      IDR (Rupiah)
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-on-surface/30 uppercase tracking-[0.2em] mb-1">
                      Tgl. Dokumen
                    </p>
                    <p className="text-xs font-bold text-on-surface uppercase tracking-widest">
                      {new Date(selectedJournal.date).toLocaleDateString(language === 'id' ? 'id-ID' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-on-surface/30 uppercase tracking-[0.2em] mb-1">
                      TGL. DIINPUT
                    </p>
                    <p className="text-xs font-bold text-on-surface uppercase tracking-widest">
                      {selectedJournal.createdAt 
                        ? `${new Date(selectedJournal.createdAt).toLocaleDateString(language === 'id' ? 'id-ID' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} ${new Date(selectedJournal.createdAt).toLocaleTimeString(language === 'id' ? 'id-ID' : 'en-GB', { hour: '2-digit', minute: '2-digit' })}`
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-on-surface/30 uppercase tracking-[0.2em] mb-1">
                      Status
                    </p>
                    <p className="text-[10px] font-bold text-primary bg-primary/10 w-fit px-3 py-1 rounded-full uppercase tracking-widest">POSTED</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-on-surface/30 uppercase tracking-[0.2em] mb-1">
                      KODE VOUCHER
                    </p>
                    <p className="text-xs font-bold text-on-surface uppercase tracking-widest font-mono truncate">{selectedJournal.id.substring(selectedJournal.id.length - 8).toUpperCase()}</p>
                  </div>
                  <div className="col-span-2 md:col-span-5 mt-2">
                    <p className="text-[9px] font-bold text-on-surface/30 uppercase tracking-[0.2em] mb-1">
                      Keterangan
                    </p>
                    <p className="text-sm font-bold text-on-surface">{selectedJournal.description}</p>
                    {selectedJournal.note && (
                      <p className="text-xs text-on-surface/50 mt-1">{selectedJournal.note}</p>
                    )}
                  </div>
                </div>

                {/* Lines Table */}
                <div className="border border-on-surface/10 rounded-2xl overflow-hidden">
                  <table className="w-full text-left">
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
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
