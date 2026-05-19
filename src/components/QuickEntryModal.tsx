import React, { useState } from 'react';
import {
  X,
  ArrowUpRight,
  ArrowDownLeft,
  Wallet,
  Tag,
  Calendar,
  StickyNote,
  ChevronDown,
  Camera,
  Loader2,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';
import { cn, compressImage } from '../lib/utils';
import { toolsApi } from '../lib/api';

export default function QuickEntryModal() {
  const { isQuickEntryOpen, setIsQuickEntryOpen, wallets, categories, addJournal, addToast, language } = useApp();
  const [type, setType] = useState<'expense' | 'income' | 'transfer'>('expense');
  const [amount, setAmount] = useState('');
  const [walletId, setWalletId] = useState('');
  const [toWalletId, setToWalletId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [description, setDescription] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [isProcessingChat, setIsProcessingChat] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const filteredCategories = categories.filter(c => c.type === type);

  const handleScanReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (fileInputRef.current) fileInputRef.current.value = '';

    setIsScanning(true);

    try {
      addToast(
        language === 'id' ? 'Mengompresi gambar...' : 'Compressing image...',
        'info'
      );
      const { dataUrl, base64: base64Data } = await compressImage(file);
      const mimeType = 'image/jpeg'; // always jpeg after canvas export

      addToast(
        language === 'id' ? 'Menganalisis struk belanja...' : 'Analyzing receipt...',
        'info'
      );
      const data = await toolsApi.scanReceipt(base64Data, mimeType);
      
      if (data.totalAmount) setAmount(data.totalAmount.toString());
      if (data.merchantName) setDescription(data.merchantName);
      if (data.date) setDate(data.date);
      
      addToast(
        language === 'id' ? 'Berhasil membaca struk!' : 'Receipt scanned successfully!',
        'success'
      );
    } catch (err: any) {
      console.error('Failed to scan receipt in modal:', err);
      addToast(
        err.message || (language === 'id' ? 'Gagal membaca struk' : 'Failed to scan receipt'),
        'error'
      );
    } finally {
      setIsScanning(false);
    }
  };

  const handleChatEntry = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter' || !aiInput.trim() || isProcessingChat) return;
    
    setIsProcessingChat(true);
    addToast(
      language === 'id' ? 'Menganalisis chat...' : 'Analyzing chat...',
      'info'
    );
    
    try {
      const data = await toolsApi.chatEntry(
        aiInput,
        wallets.map(w => ({ id: w.id, name: w.name })),
        categories.map(c => ({ id: c.id, name: c.name, type: c.type })),
        new Date().toISOString()
      );
      
      if (data.type) setType(data.type);
      if (data.amount) setAmount(data.amount.toString());
      if (data.description) setDescription(data.description);
      if (data.date) setDate(data.date.split('T')[0]);
      if (data.walletId) setWalletId(data.walletId);
      if (data.categoryId) setCategoryId(data.categoryId);
      if (data.toWalletId) setToWalletId(data.toWalletId);
      
      setAiInput('');
      addToast(
        language === 'id' ? 'Berhasil mengisi dari chat!' : 'Successfully filled from chat!',
        'success'
      );
    } catch (err: any) {
      addToast(
        language === 'id' ? 'Gagal memproses chat' : 'Failed to process chat',
        'error'
      );
    } finally {
      setIsProcessingChat(false);
    }
  };

  const handleSubmit = () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) return;
    if (!walletId) return;
    if (type === 'transfer' && !toWalletId) return;
    if (type !== 'transfer' && !categoryId) return;

    addJournal({
      description: type === 'transfer' ? description || note || 'Transfer' : description || note || filteredCategories.find(c => c.id === categoryId)?.name || 'Transaction',
      amount: numAmount,
      type,
      categoryId: type === 'transfer' ? undefined : categoryId,
      walletId,
      toWalletId: type === 'transfer' ? toWalletId : undefined,
      date: `${date}T${new Date().toTimeString().split(' ')[0]}`,
      note,
    });

    // Reset form
    setAmount('');
    setNote('');
    setDescription('');
    setIsQuickEntryOpen(false);
  };

  // Set defaults when opening
  React.useEffect(() => {
    if (isQuickEntryOpen) {
      if (!walletId && wallets.length > 0) setWalletId(wallets[0].id);
      if (!toWalletId && wallets.length > 1) setToWalletId(wallets[1].id);
      if (!categoryId && filteredCategories.length > 0) setCategoryId(filteredCategories[0].id);
      setDate(new Date().toISOString().split('T')[0]);
    }
  }, [isQuickEntryOpen]);

  // Update category when type changes
  React.useEffect(() => {
    if (filteredCategories.length > 0 && !filteredCategories.find(c => c.id === categoryId)) {
      setCategoryId(filteredCategories[0].id);
    }
  }, [type]);

  return (
    <AnimatePresence>
      {isQuickEntryOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsQuickEntryOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-[#0d0f14] w-full max-w-lg rounded-[32px] lg:rounded-[40px] shadow-2xl overflow-hidden relative z-10 border border-on-surface/10 max-h-[90vh] overflow-y-auto"
          >
            <div className="px-8 lg:px-10 py-6 lg:py-8 flex items-center justify-between border-b border-on-surface/5">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center shadow-low",
                  type === 'expense' ? "bg-tertiary/20 text-tertiary" : type === 'transfer' ? "bg-secondary/20 text-secondary" : "bg-primary/20 text-primary"
                )}>
                  {type === 'expense' ? <ArrowUpRight size={20} /> : type === 'transfer' ? <ArrowUpRight className="rotate-45" size={20} /> : <ArrowDownLeft size={20} />}
                </div>
                <h3 className="font-display text-xl lg:text-2xl font-bold text-on-surface tracking-tight">Quick Entry</h3>
                {type === 'expense' && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isScanning}
                    className="ml-2 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-tertiary/10 hover:bg-tertiary/20 text-tertiary border border-tertiary/20 text-[10px] uppercase font-bold tracking-widest transition-all disabled:opacity-50"
                  >
                    {isScanning ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                    <span className="hidden sm:inline">Scan Struk</span>
                  </button>
                )}
                <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleScanReceipt} />
              </div>
              <button
                id="btn-close-quick-entry"
                onClick={() => setIsQuickEntryOpen(false)}
                className="p-3 hover:bg-on-surface/5 rounded-2xl transition-all group"
              >
                <X size={24} className="text-on-surface/40 group-hover:text-on-surface group-hover:rotate-90 transition-all duration-300" />
              </button>
            </div>

            <div className="p-8 lg:p-10 space-y-6 lg:space-y-8">
              {/* Magic Chat Input */}
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                  {isProcessingChat ? <Loader2 size={18} className="text-secondary animate-spin" /> : <Sparkles size={18} className="text-secondary group-focus-within:text-secondary/80 transition-colors" />}
                </div>
                <input
                  type="text"
                  value={aiInput}
                  onChange={e => setAiInput(e.target.value)}
                  onKeyDown={handleChatEntry}
                  disabled={isProcessingChat}
                  placeholder="Ketik lalu Enter (misal: Beli kopi 50rb pake BCA)"
                  className="w-full bg-secondary/5 border border-secondary/20 hover:border-secondary/40 focus:border-secondary text-on-surface text-sm lg:text-base rounded-2xl py-4 pl-14 pr-6 transition-all outline-none placeholder:text-on-surface/30 focus:bg-secondary/10"
                />
                <div className="absolute top-0 right-0 h-full w-full pointer-events-none rounded-2xl shadow-[0_0_15px_rgba(var(--color-secondary),0.1)] opacity-0 group-focus-within:opacity-100 transition-opacity" />
              </div>

              {/* Type Toggle */}
              <div className="flex p-1.5 bg-on-surface/5 rounded-[20px] lg:rounded-[24px] border border-on-surface/5">
                <button
                  type="button"
                  onClick={() => setType('expense')}
                  className={cn(
                    "flex-1 py-3 lg:py-3.5 px-2 rounded-[16px] lg:rounded-[20px] text-[10px] lg:text-xs font-bold uppercase tracking-widest transition-all",
                    type === 'expense' ? "bg-tertiary/20 text-tertiary shadow-md border border-tertiary/20" : "text-on-surface/30 hover:text-on-surface/60"
                  )}
                >
                  Expense
                </button>
                <button
                  type="button"
                  onClick={() => setType('income')}
                  className={cn(
                    "flex-1 py-3 lg:py-3.5 px-2 rounded-[16px] lg:rounded-[20px] text-[10px] lg:text-xs font-bold uppercase tracking-widest transition-all",
                    type === 'income' ? "bg-primary/20 text-primary shadow-md border border-primary/20" : "text-on-surface/30 hover:text-on-surface/60"
                  )}
                >
                  Income
                </button>
                <button
                  type="button"
                  onClick={() => setType('transfer')}
                  className={cn(
                    "flex-1 py-3 lg:py-3.5 px-2 rounded-[16px] lg:rounded-[20px] text-[10px] lg:text-xs font-bold uppercase tracking-widest transition-all",
                    type === 'transfer' ? "bg-secondary/20 text-secondary shadow-md border border-secondary/20" : "text-on-surface/30 hover:text-on-surface/60"
                  )}
                >
                  Transfer
                </button>
              </div>

              {/* Amount */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-2">
                  <label className="text-[10px] font-bold text-on-surface/30 uppercase tracking-[0.2em]">Amount</label>
                  <span className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">IDR</span>
                </div>
                <div className="relative group">
                  <span className="absolute left-5 lg:left-6 top-1/2 -translate-y-1/2 font-display text-xl lg:text-2xl font-bold text-on-surface/20 group-focus-within:text-primary transition-colors">Rp</span>
                  <input
                    id="input-amount"
                    type="number"
                    placeholder="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full pl-14 lg:pl-16 pr-6 lg:pr-8 py-6 lg:py-8 bg-on-surface/5 border border-on-surface/5 rounded-[24px] lg:rounded-[32px] font-display text-3xl lg:text-5xl font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary/30 text-on-surface placeholder:text-on-surface/10 transition-all outline-none"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-on-surface/30 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                  <StickyNote size={12} />
                  Description
                </label>
                <input
                  id="input-description"
                  type="text"
                  placeholder="e.g. Warung Nasi Padang"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-5 lg:px-6 py-3.5 lg:py-4 bg-on-surface/5 border border-on-surface/5 rounded-2xl font-medium text-sm text-on-surface focus:outline-none focus:border-on-surface/20 focus:ring-1 focus:ring-on-surface/20 transition-all placeholder:text-on-surface/15"
                />
              </div>

              {/* Wallet & Category */}
              <div className="grid grid-cols-2 gap-4 lg:gap-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-on-surface/30 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                    <Wallet size={12} />
                    {type === 'transfer' ? 'From Wallet' : 'Wallet'}
                  </label>
                  <div className="relative group">
                    <select
                      id="select-wallet"
                      value={walletId}
                      onChange={(e) => setWalletId(e.target.value)}
                      className="w-full px-4 lg:px-6 py-3.5 lg:py-4 bg-on-surface/5 border border-on-surface/5 rounded-2xl font-bold text-[10px] lg:text-xs uppercase tracking-widest text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/10 appearance-none transition-all cursor-pointer"
                    >
                      {wallets.map(w => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 lg:right-4 top-1/2 -translate-y-1/2 text-on-surface/30 pointer-events-none" size={16} />
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-on-surface/30 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                    {type === 'transfer' ? <Wallet size={12} /> : <Tag size={12} />}
                    {type === 'transfer' ? 'To Wallet' : 'Category'}
                  </label>
                  <div className="relative group">
                    {type === 'transfer' ? (
                      <select
                        id="select-to-wallet"
                        value={toWalletId}
                        onChange={(e) => setToWalletId(e.target.value)}
                        className="w-full px-4 lg:px-6 py-3.5 lg:py-4 bg-on-surface/5 border border-on-surface/5 rounded-2xl font-bold text-[10px] lg:text-xs uppercase tracking-widest text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/10 appearance-none transition-all cursor-pointer"
                      >
                        {wallets.map(w => (
                          <option key={w.id} value={w.id} disabled={w.id === walletId}>{w.name}</option>
                        ))}
                      </select>
                    ) : (
                      <select
                        id="select-category"
                        value={categoryId}
                        onChange={(e) => setCategoryId(e.target.value)}
                        className="w-full px-4 lg:px-6 py-3.5 lg:py-4 bg-on-surface/5 border border-on-surface/5 rounded-2xl font-bold text-[10px] lg:text-xs uppercase tracking-widest text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/10 appearance-none transition-all cursor-pointer"
                      >
                        {filteredCategories.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    )}
                    <ChevronDown className="absolute right-3 lg:right-4 top-1/2 -translate-y-1/2 text-on-surface/30 pointer-events-none" size={16} />
                  </div>
                </div>
              </div>

              {/* Date */}
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-on-surface/30 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                  <Calendar size={12} />
                  Transaction Date
                </label>
                <input
                  id="input-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-5 lg:px-6 py-3.5 lg:py-4 bg-on-surface/5 border border-on-surface/5 rounded-2xl font-bold text-xs uppercase tracking-widest text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all cursor-pointer"
                />
              </div>

              {/* Note */}
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-on-surface/30 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                  <StickyNote size={12} />
                  Note (Optional)
                </label>
                <textarea
                  id="input-note"
                  placeholder="What was this for?"
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-5 lg:px-6 py-3.5 lg:py-4 bg-on-surface/5 border border-on-surface/5 rounded-2xl font-medium text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/10 resize-none transition-all placeholder:text-on-surface/15"
                />
              </div>

              {/* Submit */}
              <button
                id="btn-save-transaction"
                onClick={handleSubmit}
                disabled={!amount || parseFloat(amount) <= 0 || !walletId || (type === 'transfer' ? !toWalletId : !categoryId)}
                className={cn(
                  "w-full py-5 lg:py-6 text-on-surface text-sm font-bold uppercase tracking-[0.3em] rounded-2xl lg:rounded-3xl transition-all shadow-xl hover:shadow-2xl hover:scale-[1.01] active:scale-95 duration-200 mt-2",
                  type === 'expense'
                    ? "bg-tertiary hover:bg-tertiary/80 disabled:bg-tertiary/30"
                    : type === 'transfer'
                    ? "bg-secondary hover:bg-secondary/80 disabled:bg-secondary/30"
                    : "bg-primary hover:bg-primary/80 disabled:bg-primary/30",
                  (!amount || parseFloat(amount) <= 0) && "opacity-50 cursor-not-allowed"
                )}
              >
                Save {type === 'expense' ? 'Expense' : type === 'transfer' ? 'Transfer' : 'Income'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
