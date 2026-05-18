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
import * as htmlToImage from 'html-to-image';
import { jsPDF } from 'jspdf';

export default function LedgerView() {
  const { journals, wallets, categories, t, addToast } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJournal, setSelectedJournal] = useState<any>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Flatten journals into individual ledger lines
  const ledgerLines = useMemo(() => {
    const lines: any[] = [];
    for (const j of journals) {
      for (const l of j.lines) {
        let accountName = 'Unknown Account';
        let accountType = '';

        if (l.walletId) {
          const w = wallets.find(w => w.id === l.walletId);
          accountName = w ? w.name : 'Unknown Wallet';
          accountType = 'Asset';
        } else if (l.categoryId) {
          const c = categories.find(c => c.id === l.categoryId);
          accountName = c ? c.name : 'Unknown Category';
          accountType = c?.type === 'income' ? 'Revenue' : 'Expense';
        }

        lines.push({
          id: l.id,
          journalId: j.id,
          date: j.date,
          description: j.description,
          note: j.note,
          accountName,
          accountType,
          type: l.type,
          amount: l.amount,
          journal: j
        });
      }
    }
    return lines.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [journals, wallets, categories]);

  // Filter lines based on search
  const filteredLines = useMemo(() => {
    if (!searchQuery) return ledgerLines;
    const lowerQuery = searchQuery.toLowerCase();
    return ledgerLines.filter(l => 
      l.description.toLowerCase().includes(lowerQuery) ||
      l.accountName.toLowerCase().includes(lowerQuery) ||
      l.journalId.toLowerCase().includes(lowerQuery)
    );
  }, [ledgerLines, searchQuery]);

  const exportDetailToPDF = async () => {
    setIsExporting(true);
    addToast('Memproses PDF, mohon tunggu...', 'info');
    
    try {
      const element = document.getElementById('journal-detail-content');
      if (!element) throw new Error('Elemen tidak ditemukan');
      
      // Wait a bit to ensure rendering
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const imgData = await htmlToImage.toJpeg(element, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: '#0f0f19',
      });
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      
      const img = new Image();
      img.src = imgData;
      await new Promise((resolve) => { img.onload = resolve; });
      
      const pdfHeight = (img.height * pdfWidth) / img.width;
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Journal_Detail_${selectedJournal.id.substring(0,8)}.pdf`);
      
      addToast('Berhasil mengunduh PDF!', 'success');
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      addToast('Gagal mengekspor PDF', 'error');
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
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
        <div>
          <h2 className="font-display text-3xl lg:text-4xl font-bold text-on-surface tracking-tight uppercase">Jurnal Umum</h2>
          <p className="text-sm text-on-surface/40 mt-3 max-w-lg leading-relaxed uppercase tracking-widest font-medium">
            General Ledger - Catatan seluruh mutasi debet dan kredit sistem.
          </p>
        </div>
      </header>

      {/* Main Ledger Table */}
      <div className="glass rounded-[24px] lg:rounded-[32px] overflow-hidden border border-on-surface/5 flex flex-col">
        {/* Toolbar */}
        <div className="p-6 lg:p-8 border-b border-on-surface/5 bg-on-surface/[0.02] flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="w-10 h-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center">
              <BookOpen size={20} />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold text-on-surface uppercase tracking-widest">Daftar Jurnal</h3>
              <p className="text-[10px] text-on-surface/40 uppercase tracking-widest font-medium mt-0.5">{filteredLines.length} baris pencatatan</p>
            </div>
          </div>
          
          <div className="relative w-full md:w-80 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface/20 group-focus-within:text-primary transition-colors" size={16} />
            <input
              type="text"
              placeholder="Cari keterangan, akun, atau no. jurnal..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-on-surface/5 border border-on-surface/5 rounded-2xl text-xs font-bold text-on-surface focus:outline-none focus:border-primary/30 focus:ring-1 focus:ring-primary/30 transition-all placeholder:text-on-surface/20 uppercase tracking-widest"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-on-surface/5 text-[9px] font-bold text-on-surface/20 uppercase tracking-[0.3em] bg-on-surface/[0.01]">
                <th className="px-6 lg:px-8 py-5">Tgl. Posting</th>
                <th className="px-6 lg:px-8 py-5">No. Jurnal</th>
                <th className="px-6 lg:px-8 py-5">Account (COA)</th>
                <th className="px-6 lg:px-8 py-5">Keterangan</th>
                <th className="px-6 lg:px-8 py-5 text-right">Debet</th>
                <th className="px-6 lg:px-8 py-5 text-right">Kredit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredLines.map((line, idx) => (
                <tr 
                  key={line.id} 
                  onClick={() => setSelectedJournal(line.journal)}
                  className="hover:bg-on-surface/[0.04] transition-colors cursor-pointer group"
                >
                  <td className="px-6 lg:px-8 py-4 text-[10px] font-bold text-on-surface/40 uppercase tracking-widest whitespace-nowrap">
                    {new Date(line.date).toLocaleDateString('en-GB')}
                  </td>
                  <td className="px-6 lg:px-8 py-4 text-[10px] font-bold text-on-surface/60 font-mono tracking-tighter uppercase">
                    JRN-{line.journalId.substring(line.journalId.length - 6).toUpperCase()}
                  </td>
                  <td className="px-6 lg:px-8 py-4">
                    <p className="text-xs font-bold text-on-surface tracking-wide uppercase">{line.accountName}</p>
                    <p className="text-[9px] text-on-surface/30 uppercase tracking-widest mt-0.5">{line.accountType}</p>
                  </td>
                  <td className="px-6 lg:px-8 py-4">
                    <p className="text-xs font-bold text-on-surface max-w-[200px] truncate">{line.description}</p>
                  </td>
                  <td className="px-6 lg:px-8 py-4 text-right text-sm font-bold font-display tracking-tighter tabular-nums whitespace-nowrap">
                    {line.type === 'DEBIT' ? <span className="text-secondary">{formatCurrency(line.amount)}</span> : <span className="text-on-surface/20">-</span>}
                  </td>
                  <td className="px-6 lg:px-8 py-4 text-right text-sm font-bold font-display tracking-tighter tabular-nums whitespace-nowrap">
                    {line.type === 'CREDIT' ? <span className="text-primary">{formatCurrency(line.amount)}</span> : <span className="text-on-surface/20">-</span>}
                  </td>
                </tr>
              ))}
              {filteredLines.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-8 py-16 text-center text-on-surface/20 text-sm uppercase tracking-widest">
                    Tidak ada catatan jurnal ditemukan
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
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedJournal(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[#0f0f19] w-full max-w-4xl rounded-[32px] shadow-2xl relative z-10 border border-on-surface/10 flex flex-col max-h-[90vh] overflow-hidden"
            >
              {/* Toolbar */}
              <div className="px-8 py-6 flex items-center justify-between border-b border-on-surface/5 bg-on-surface/[0.02]">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-on-surface/5 text-on-surface flex items-center justify-center border border-on-surface/10">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h3 className="font-display text-xl font-bold text-on-surface uppercase tracking-widest">Detail Jurnal</h3>
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
              <div id="journal-detail-content" className="p-8 overflow-y-auto bg-[#0f0f19]">
                {/* Header Info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8 p-6 glass-dark rounded-[24px] border border-on-surface/5">
                  <div>
                    <p className="text-[9px] font-bold text-on-surface/30 uppercase tracking-[0.2em] mb-1">Mata Uang</p>
                    <p className="text-xs font-bold text-on-surface uppercase tracking-widest">IDR (Rupiah)</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-on-surface/30 uppercase tracking-[0.2em] mb-1">Tgl. Doc</p>
                    <p className="text-xs font-bold text-on-surface uppercase tracking-widest">
                      {new Date(selectedJournal.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-on-surface/30 uppercase tracking-[0.2em] mb-1">Status</p>
                    <p className="text-[10px] font-bold text-primary bg-primary/10 w-fit px-3 py-1 rounded-full uppercase tracking-widest">POSTED</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-on-surface/30 uppercase tracking-[0.2em] mb-1">Kode Voucher</p>
                    <p className="text-xs font-bold text-on-surface uppercase tracking-widest font-mono">{selectedJournal.id}</p>
                  </div>
                  <div className="col-span-2 md:col-span-4 mt-2">
                    <p className="text-[9px] font-bold text-on-surface/30 uppercase tracking-[0.2em] mb-1">Keterangan</p>
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
