import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Upload, Download, CheckCircle2, AlertCircle, Trash2, ArrowRight } from 'lucide-react';
import Papa from 'papaparse';
import { useApp } from '../context/AppContext';
import { cn, combineDateAndTimeToISO } from '../lib/utils';
import { formatCurrency, formatDate } from '../lib/types';

interface ImportTransactionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ParsedRow {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense' | 'transfer';
  walletName: string;
  categoryName: string;
  // Mapped internal values
  walletId?: string;
  categoryId?: string;
  toWalletId?: string; // For transfers
  isValid: boolean;
  errors: string[];
}

export default function ImportTransactionsModal({ isOpen, onClose }: ImportTransactionsModalProps) {
  const { wallets, categories, bulkAddJournals, addToast } = useApp();
  const [step, setStep] = useState<'upload' | 'review'>('upload');
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadTemplate = () => {
    const csvContent = "Date (YYYY-MM-DD HH:mm),Description,Amount,Type (income/expense/transfer),Wallet Name,Category Name (or Target Wallet if transfer)\n2023-10-01 08:30,Gaji Bulanan,10000000,income,BCA,Salary\n2023-10-02 12:45,Makan Siang McD,50000,expense,Mandiri,Makan\n2023-10-03 15:00,Transfer Tabungan,1000000,transfer,BCA,BNI";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'stashly_template_transaksi.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const processFile = (file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsedRows: ParsedRow[] = results.data.map((row: any, index: number) => {
          let dateStr = row['Date (YYYY-MM-DD HH:mm)']?.trim() || row['Date (YYYY-MM-DD)']?.trim() || row['Tanggal & Waktu']?.trim() || '';

          // Try to normalize DD/MM/YY HH.mm format from e-statement to YYYY-MM-DDTHH:mm
          if (dateStr && dateStr.includes('/')) {
            const parts = dateStr.split(/[\s,]+/);
            const dateParts = parts[0].split('/');
            if (dateParts.length === 3) {
              const day = dateParts[0].padStart(2, '0');
              const month = dateParts[1].padStart(2, '0');
              let year = dateParts[2];
              if (year.length === 2) year = `20${year}`;

              let time = parts[1] ? parts[1].replace('.', ':') : '00:00';
              if (time.length === 4) time = `0${time}`;
              dateStr = `${year}-${month}-${day}T${time}`;
            }
          } else if (dateStr && !dateStr.includes('T')) {
            dateStr = dateStr.replace(' ', 'T');
          }

          const desc = row['Description']?.trim() || row['Keterangan / Deskripsi']?.trim() || '';
          const amountStr = (row['Amount']?.toString() || row['Nominal (IDR)']?.toString() || '0').replace(/[^0-9.-]+/g, "");
          const amount = parseFloat(amountStr);

          let typeRaw = row['Type (income/expense/transfer)']?.toLowerCase().trim() || '';
          if (!typeRaw) {
            const jenis = row['Jenis']?.toLowerCase().trim();
            if (jenis === 'keluar') typeRaw = 'expense';
            else if (jenis === 'masuk') typeRaw = 'income';
            else typeRaw = 'expense';
          }
          const type = ['income', 'expense', 'transfer'].includes(typeRaw) ? typeRaw as any : 'expense';
          const walletName = row['Wallet Name']?.trim() || '';
          const catName = row['Category Name (or Target Wallet if transfer)']?.trim() || '';

          const errors: string[] = [];

          if (!dateStr || isNaN(new Date(dateStr).getTime())) errors.push('Invalid Date');
          if (!desc) errors.push('Description missing');
          if (isNaN(amount) || amount <= 0) errors.push('Invalid Amount');

          let walletId = wallets.find(w => w.name.toLowerCase() === walletName.toLowerCase())?.id;
          if (!walletId) errors.push(`Wallet '${walletName}' not found`);

          let categoryId = undefined;
          let toWalletId = undefined;

          if (type === 'transfer') {
            toWalletId = wallets.find(w => w.name.toLowerCase() === catName.toLowerCase())?.id;
            if (!toWalletId) errors.push(`Target Wallet '${catName}' not found`);
          } else {
            categoryId = categories.find(c => c.name.toLowerCase() === catName.toLowerCase() && c.type === type)?.id;
            if (!categoryId) errors.push(`Category '${catName}' not found for ${type}`);
          }

          return {
            id: `row-${index}`,
            date: dateStr,
            description: desc,
            amount,
            type,
            walletName,
            categoryName: catName,
            walletId,
            categoryId,
            toWalletId,
            isValid: errors.length === 0,
            errors
          };
        });

        setRows(parsedRows);
        setStep('review');
      },
      error: () => {
        addToast('Failed to parse CSV file', 'error');
      }
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const updateRow = (id: string, updates: Partial<ParsedRow>) => {
    setRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      const updated = { ...r, ...updates };

      // Revalidate
      updated.errors = [];
      if (!updated.date || isNaN(new Date(updated.date).getTime())) updated.errors.push('Invalid Date');
      if (!updated.description) updated.errors.push('Description missing');
      if (isNaN(updated.amount) || updated.amount <= 0) updated.errors.push('Invalid Amount');
      if (!updated.walletId) updated.errors.push('Wallet required');
      if (updated.type === 'transfer' && !updated.toWalletId) updated.errors.push('Target Wallet required');
      if (updated.type !== 'transfer' && !updated.categoryId) updated.errors.push('Category required');
      updated.isValid = updated.errors.length === 0;

      return updated;
    }));
  };

  const removeRow = (id: string) => {
    setRows(prev => prev.filter(r => r.id !== id));
  };

  const handleSave = async () => {
    const validRows = rows.filter(r => r.isValid);
    if (validRows.length === 0) return addToast('No valid rows to save', 'error');

    setIsSubmitting(true);
    const payloads = validRows.map(r => ({
      description: r.description,
      amount: r.amount,
      type: r.type,
      categoryId: r.categoryId,
      walletId: r.walletId,
      toWalletId: r.toWalletId,
      date: new Date(r.date).toISOString(),
      note: 'Imported via CSV',
    }));

    try {
      await bulkAddJournals(payloads);
      onClose();
      setTimeout(() => { setStep('upload'); setRows([]); }, 300);
    } catch (e) {
      // Error is handled in context
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="glass rounded-[32px] w-full max-w-5xl relative z-10 border border-on-surface/10 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
      >
        <div className="p-6 lg:p-8 border-b border-on-surface/5 flex justify-between items-center bg-on-surface/5">
          <div>
            <h3 className="font-display text-xl lg:text-2xl font-bold text-on-surface uppercase tracking-tight">Import Transactions</h3>
            <p className="text-xs text-on-surface/50 mt-1 uppercase tracking-widest">{step === 'upload' ? 'Upload CSV File' : 'Review & Save'}</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-xl glass-dark border border-on-surface/5 flex items-center justify-center text-on-surface/30 hover:text-on-surface transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 lg:p-8">
          <AnimatePresence mode="wait">
            {step === 'upload' ? (
              <motion.div key="upload" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8 max-w-2xl mx-auto">

                <div className="bg-on-surface/5 rounded-[24px] p-6 lg:p-8 border border-on-surface/5">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/20 text-primary flex items-center justify-center shrink-0">
                      <Download size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold text-on-surface text-lg">Step 1: Download Template</h4>
                      <p className="text-sm text-on-surface/60 mt-2 mb-4 leading-relaxed">
                        Download our standard CSV template. Fill it out using Excel or Google Sheets, then save as CSV.
                      </p>
                      <button onClick={handleDownloadTemplate} className="px-6 py-3 rounded-xl bg-on-surface/10 hover:bg-on-surface/20 text-on-surface font-bold text-xs uppercase tracking-widest transition-colors flex items-center gap-2">
                        Download Template CSV
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-on-surface/5 rounded-[24px] p-6 lg:p-8 border border-on-surface/5">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-secondary/20 text-secondary flex items-center justify-center shrink-0">
                      <Upload size={24} />
                    </div>
                    <div className="w-full">
                      <h4 className="font-bold text-on-surface text-lg">Step 2: Upload CSV</h4>
                      <p className="text-sm text-on-surface/60 mt-2 mb-6 leading-relaxed">
                        Upload your filled CSV file here. We will review it together before saving.
                      </p>
                      <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full border-2 border-dashed border-on-surface/20 rounded-[20px] p-10 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all group"
                      >
                        <Upload size={32} className="mx-auto text-on-surface/20 group-hover:text-primary transition-colors mb-4" />
                        <p className="text-sm font-bold text-on-surface/60 group-hover:text-on-surface transition-colors">Click to browse or drag CSV file here</p>
                      </div>
                    </div>
                  </div>
                </div>

              </motion.div>
            ) : (
              <motion.div key="review" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-6">

                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                  <p className="text-sm text-on-surface/60">
                    Found <span className="font-bold text-on-surface">{rows.length}</span> rows.
                    <span className="text-primary font-bold ml-2">{rows.filter(r => r.isValid).length} ready</span>,
                    <span className="text-error font-bold ml-2">{rows.filter(r => !r.isValid).length} needs fixing</span>
                  </p>
                  <div className="flex gap-3 w-full lg:w-auto">
                    <button onClick={() => setStep('upload')} className="flex-1 lg:flex-none px-6 py-3 rounded-xl bg-on-surface/10 hover:bg-on-surface/20 text-on-surface font-bold text-xs uppercase tracking-widest transition-colors">
                      Cancel
                    </button>
                    <button onClick={handleSave} disabled={isSubmitting || rows.filter(r => r.isValid).length === 0} className="flex-1 lg:flex-none px-8 py-3 rounded-xl bg-primary hover:bg-primary/80 text-on-surface font-bold text-xs uppercase tracking-widest transition-colors shadow-lg disabled:opacity-50 flex items-center justify-center gap-2">
                      {isSubmitting ? <div className="w-4 h-4 border-2 border-on-surface border-t-transparent rounded-full animate-spin" /> : <CheckCircle2 size={16} />}
                      Save {rows.filter(r => r.isValid).length} Valid Rows
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-[24px] border border-on-surface/5 glass-dark">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-on-surface/5 text-[9px] font-bold text-on-surface/30 uppercase tracking-[0.2em] bg-on-surface/5">
                        <th className="px-4 py-4 w-10">Status</th>
                        <th className="px-4 py-4 min-w-[120px]">Date</th>
                        <th className="px-4 py-4 min-w-[150px]">Description</th>
                        <th className="px-4 py-4 min-w-[120px]">Amount</th>
                        <th className="px-4 py-4 min-w-[120px]">Type</th>
                        <th className="px-4 py-4 min-w-[150px]">Wallet</th>
                        <th className="px-4 py-4 min-w-[150px]">Category / To</th>
                        <th className="px-4 py-4 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-sm">
                      {rows.map(row => (
                        <tr key={row.id} className={cn("transition-colors", !row.isValid ? "bg-error/5" : "hover:bg-on-surface/5")}>
                          <td className="px-4 py-4">
                            {row.isValid ? <CheckCircle2 size={16} className="text-primary" /> : <AlertCircle size={16} className="text-error" title={row.errors.join('\n')} />}
                          </td>
                          <td className="px-4 py-4">
                            <input type="datetime-local" value={row.date} onChange={e => updateRow(row.id, { date: e.target.value })} className="bg-transparent text-[10px] lg:text-xs font-mono focus:outline-none w-full min-w-[130px]" />
                          </td>
                          <td className="px-4 py-4">
                            <input type="text" value={row.description} onChange={e => updateRow(row.id, { description: e.target.value })} className="bg-transparent font-bold focus:outline-none w-full" />
                          </td>
                          <td className="px-4 py-4">
                            <input type="number" value={row.amount || ''} onChange={e => updateRow(row.id, { amount: parseFloat(e.target.value) })} className="bg-transparent font-mono focus:outline-none w-full" />
                          </td>
                          <td className="px-4 py-4">
                            <select value={row.type} onChange={e => updateRow(row.id, { type: e.target.value as any })} className="bg-transparent text-xs uppercase tracking-widest focus:outline-none cursor-pointer">
                              <option value="expense">Expense</option>
                              <option value="income">Income</option>
                              <option value="transfer">Transfer</option>
                            </select>
                          </td>
                          <td className="px-4 py-4">
                            <select value={row.walletId || ''} onChange={e => updateRow(row.id, { walletId: e.target.value })} className={cn("bg-transparent focus:outline-none w-full", !row.walletId && "text-error")}>
                              <option value="">-- Select Wallet --</option>
                              {wallets.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                            </select>
                          </td>
                          <td className="px-4 py-4">
                            {row.type === 'transfer' ? (
                              <select value={row.toWalletId || ''} onChange={e => updateRow(row.id, { toWalletId: e.target.value })} className={cn("bg-transparent focus:outline-none w-full", !row.toWalletId && "text-error")}>
                                <option value="">-- Target Wallet --</option>
                                {wallets.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                              </select>
                            ) : (
                              <select value={row.categoryId || ''} onChange={e => updateRow(row.id, { categoryId: e.target.value })} className={cn("bg-transparent focus:outline-none w-full", !row.categoryId && "text-error")}>
                                <option value="">-- Select Category --</option>
                                {categories.filter(c => c.type === row.type).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                              </select>
                            )}
                          </td>
                          <td className="px-4 py-4 text-right">
                            <button onClick={() => removeRow(row.id)} className="text-on-surface/30 hover:text-error transition-colors p-1"><Trash2 size={16} /></button>
                          </td>
                        </tr>
                      ))}
                      {rows.length === 0 && (
                        <tr>
                          <td colSpan={8} className="px-4 py-8 text-center text-on-surface/30 text-xs uppercase tracking-widest">
                            No data found in CSV
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
