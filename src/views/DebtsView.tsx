import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, Edit2, X, Handshake, ArrowUpRight, ArrowDownLeft, Calendar, User, Percent, DollarSign, Wallet, FileText, Info, CheckCircle, AlertTriangle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatCurrencyShort } from '../lib/types';
import { cn, getLocalDateString } from '../lib/utils';

const loc = {
  en: {
    debtsTitle: 'Debts & Loans',
    debtsSubtitle: 'Manage what you owe to others and what others owe to you.',
    newDebt: 'New Debt / Receivable',
    addDebt: 'Add Loan Record',
    editDebt: 'Edit Loan Record',
    title: 'Description Title',
    type: 'Record Type',
    contact: 'Contact Person / Institution',
    amount: 'Initial Amount',
    remainingAmount: 'Remaining Amount',
    dueDate: 'Due Date',
    interestRate: 'Interest Rate (% per year)',
    notes: 'Notes / Agreement details',
    walletHelp: 'Choose a wallet to auto-adjust its balance and post a transaction (leave empty for simple tracking).',
    saveDebt: 'Save Record',
    updateDebt: 'Update Details',
    totalDebts: 'Total Debts (Liabilities)',
    totalReceivables: 'Total Receivables (Lent)',
    netPosition: 'Net Loan Position',
    activeDebts: 'Active Debts',
    activeReceivables: 'Active Receivables',
    paidHistory: 'Paid Off History',
    payCicilan: 'Pay Cicilan',
    receiveCicilan: 'Collect Instalment',
    empty: 'No Records Found',
    emptySub: 'Keep track of borrow and lend transactions here.',
    initialAmount: 'Initial Principal',
    remaining: 'Remaining',
    paymentDate: 'Payment Date',
    paymentAmount: 'Amount paid/received',
    selectWallet: 'Source Wallet',
    recordPayment: 'Record Payment',
    lunas: 'Lunas (Paid Off)',
    overdue: 'Overdue',
    types: {
      DEBT: 'Hutang (You Owe)',
      RECEIVABLE: 'Piutang (Owed to You)'
    }
  },
  id: {
    debtsTitle: 'Hutang & Piutang',
    debtsSubtitle: 'Pantau kewajiban finansial Anda dan dana yang dipinjamkan ke pihak lain.',
    newDebt: 'Pinjaman Baru',
    addDebt: 'Tambah Catatan Pinjaman',
    editDebt: 'Ubah Catatan Pinjaman',
    title: 'Judul Pinjaman',
    type: 'Tipe Catatan',
    contact: 'Kontak / Instansi',
    amount: 'Jumlah Pinjaman Awal',
    remainingAmount: 'Sisa Saldo',
    dueDate: 'Tenggat Waktu',
    interestRate: 'Suku Bunga (% per tahun)',
    notes: 'Catatan / Deskripsi Perjanjian',
    walletHelp: 'Pilih dompet jika ingin saldo dompet otomatis disesuaikan dan transaksi dicatat ke Jurnal (kosongkan jika hanya ingin pelacakan biasa).',
    saveDebt: 'Simpan Catatan',
    updateDebt: 'Perbarui Detail',
    totalDebts: 'Total Hutang',
    totalReceivables: 'Total Piutang',
    netPosition: 'Posisi Pinjaman Bersih',
    activeDebts: 'Hutang Aktif',
    activeReceivables: 'Piutang Aktif',
    paidHistory: 'Riwayat Lunas',
    payCicilan: 'Bayar Cicilan',
    receiveCicilan: 'Terima Cicilan',
    empty: 'Belum Ada Catatan',
    emptySub: 'Catat hutang bank, cicilan kartu kredit, atau pinjaman teman untuk menjaga arus kas Anda.',
    initialAmount: 'Pokok Pinjaman',
    remaining: 'Sisa',
    paymentDate: 'Tanggal Pembayaran',
    paymentAmount: 'Nominal Cicilan',
    selectWallet: 'Dompet Pembayaran',
    recordPayment: 'Catat Transaksi',
    lunas: 'Lunas',
    overdue: 'Terlambat',
    types: {
      DEBT: 'Hutang (Saya Berhutang)',
      RECEIVABLE: 'Piutang (Saya Meminjamkan)'
    }
  }
};

export default function DebtsView() {
  const { debts, addDebt, updateDebt, deleteDebt, payDebt, wallets, language, isSensored } = useApp();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Payment Modal State
  const [payingDebtId, setPayingDebtId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentWalletId, setPaymentWalletId] = useState('');
  const [paymentDate, setPaymentDate] = useState(getLocalDateString());
  const [paymentNote, setPaymentNote] = useState('');

  // Form State
  const [title, setTitle] = useState('');
  const [type, setType] = useState<'DEBT' | 'RECEIVABLE'>('DEBT');
  const [contact, setContact] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [interestRate, setInterestRate] = useState('0');
  const [notes, setNotes] = useState('');
  const [walletId, setWalletId] = useState('');

  // Tabs
  const [activeTab, setActiveTab] = useState<'DEBT' | 'RECEIVABLE' | 'PAID'>('DEBT');

  const activeLoc = language === 'id' ? loc.id : loc.en;

  // Analytics
  const totalDebts = useMemo(() => {
    return debts
      .filter((d) => d.type === 'DEBT' && d.status === 'ACTIVE')
      .reduce((sum, item) => sum + item.remainingAmount, 0);
  }, [debts]);

  const totalReceivables = useMemo(() => {
    return debts
      .filter((d) => d.type === 'RECEIVABLE' && d.status === 'ACTIVE')
      .reduce((sum, item) => sum + item.remainingAmount, 0);
  }, [debts]);

  const netPosition = useMemo(() => {
    return totalReceivables - totalDebts;
  }, [totalDebts, totalReceivables]);

  // Filtered debts list based on active tab
  const filteredDebts = useMemo(() => {
    return debts.filter((d) => {
      if (activeTab === 'PAID') {
        return d.status === 'PAID';
      }
      return d.type === activeTab && d.status === 'ACTIVE';
    });
  }, [debts, activeTab]);

  const openAdd = () => {
    setTitle('');
    setType('DEBT');
    setContact('');
    setAmount('');
    setDueDate('');
    setInterestRate('0');
    setNotes('');
    setWalletId('');
    setEditingId(null);
    setIsAdding(true);
  };

  const openEdit = (debt: any) => {
    setTitle(debt.title);
    setType(debt.type);
    setContact(debt.contact);
    setAmount(debt.amount.toString());
    setDueDate(debt.dueDate ? getLocalDateString(debt.dueDate) : '');
    setInterestRate(debt.interestRate.toString());
    setNotes(debt.notes || '');
    setWalletId(debt.walletId || '');
    setEditingId(debt.id);
    setIsAdding(true);
  };

  const openPayment = (debt: any) => {
    setPayingDebtId(debt.id);
    setPaymentAmount(debt.remainingAmount.toString());
    setPaymentWalletId(wallets[0]?.id || '');
    setPaymentDate(getLocalDateString());
    setPaymentNote('');
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !contact || !amount) return;

    const data = {
      title,
      type,
      contact,
      amount: parseFloat(amount),
      dueDate: dueDate || undefined,
      interestRate: parseFloat(interestRate) || 0,
      notes,
      walletId: walletId || undefined,
    };

    if (editingId) {
      await updateDebt(editingId, data as any);
    } else {
      await addDebt(data);
    }
    setIsAdding(false);
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingDebtId || !paymentAmount || !paymentWalletId) return;

    await payDebt(payingDebtId, {
      walletId: paymentWalletId,
      amount: parseFloat(paymentAmount),
      date: paymentDate,
      note: paymentNote,
    });
    setPayingDebtId(null);
  };

  const selectedPayingDebt = useMemo(() => {
    return debts.find((d) => d.id === payingDebtId);
  }, [debts, payingDebtId]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-10"
    >
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 px-2">
        <div>
          <h2 className="font-display text-3xl lg:text-4xl font-bold text-on-surface tracking-tighter uppercase">{activeLoc.debtsTitle}</h2>
          <p className="text-on-surface/40 mt-3 text-sm uppercase tracking-widest font-medium">{activeLoc.debtsSubtitle}</p>
        </div>
        <button
          onClick={openAdd}
          className="bg-primary text-on-surface px-6 py-3 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-primary/80 transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] flex items-center gap-2"
        >
          <Plus size={16} /> {activeLoc.newDebt}
        </button>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Debts */}
        <div className="glass rounded-[32px] p-8 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 opacity-10 bg-rose-500 rounded-full blur-[40px] pointer-events-none" />
          <div className="flex justify-between items-start">
            <p className="text-[10px] font-bold text-on-surface/30 uppercase tracking-[0.2em]">{activeLoc.totalDebts}</p>
            <span className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <ArrowUpRight size={16} />
            </span>
          </div>
          <h3 className="text-3xl font-display font-bold tracking-tighter text-on-surface mt-4 truncate">
            {formatCurrency(totalDebts, isSensored)}
          </h3>
        </div>

        {/* Total Receivables */}
        <div className="glass rounded-[32px] p-8 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 opacity-10 bg-emerald-500 rounded-full blur-[40px] pointer-events-none" />
          <div className="flex justify-between items-start">
            <p className="text-[10px] font-bold text-on-surface/30 uppercase tracking-[0.2em]">{activeLoc.totalReceivables}</p>
            <span className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <ArrowDownLeft size={16} />
            </span>
          </div>
          <h3 className="text-3xl font-display font-bold tracking-tighter text-on-surface mt-4 truncate">
            {formatCurrency(totalReceivables, isSensored)}
          </h3>
        </div>

        {/* Net Debt Position */}
        <div className="glass rounded-[32px] p-8 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 opacity-10 bg-primary rounded-full blur-[40px] pointer-events-none" />
          <div className="flex justify-between items-start">
            <p className="text-[10px] font-bold text-on-surface/30 uppercase tracking-[0.2em]">{activeLoc.netPosition}</p>
            <span className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Handshake size={16} />
            </span>
          </div>
          <h3 className={cn(
            "text-3xl font-display font-bold tracking-tighter mt-4 truncate",
            netPosition >= 0 ? "text-emerald-400" : "text-rose-400"
          )}>
            {netPosition >= 0 ? '+' : ''}{formatCurrency(netPosition, isSensored)}
          </h3>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex gap-2 border-b border-on-surface/5 pb-2">
        <button
          onClick={() => setActiveTab('DEBT')}
          className={cn(
            "px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all",
            activeTab === 'DEBT'
              ? "bg-rose-500/10 text-rose-400"
              : "text-on-surface/40 hover:text-on-surface"
          )}
        >
          {activeLoc.activeDebts}
        </button>
        <button
          onClick={() => setActiveTab('RECEIVABLE')}
          className={cn(
            "px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all",
            activeTab === 'RECEIVABLE'
              ? "bg-emerald-500/10 text-emerald-400"
              : "text-on-surface/40 hover:text-on-surface"
          )}
        >
          {activeLoc.activeReceivables}
        </button>
        <button
          onClick={() => setActiveTab('PAID')}
          className={cn(
            "px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all",
            activeTab === 'PAID'
              ? "bg-primary/10 text-primary"
              : "text-on-surface/40 hover:text-on-surface"
          )}
        >
          {activeLoc.paidHistory}
        </button>
      </div>

      {/* Grid of Debt Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDebts.map((debt) => {
          const paidPercentage = Math.round(((debt.amount - debt.remainingAmount) / debt.amount) * 100);
          const isLunas = debt.status === 'PAID';
          const isDebt = debt.type === 'DEBT';
          const colorClass = isLunas ? 'text-primary' : isDebt ? 'text-rose-400' : 'text-emerald-400';
          const isOverdue = debt.dueDate && new Date(debt.dueDate) < new Date() && !isLunas;

          return (
            <div key={debt.id} className="glass rounded-[32px] p-8 relative overflow-hidden group">
              {/* Type Badge & Edit Actions */}
              <div className="flex justify-between items-start mb-6">
                <span className={cn(
                  "text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider",
                  isLunas ? "bg-primary/10 text-primary" : isDebt ? "bg-rose-500/10 text-rose-400" : "bg-emerald-500/10 text-emerald-400"
                )}>
                  {isLunas ? activeLoc.lunas : activeLoc.types[debt.type]}
                </span>
                
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(debt)} className="p-2 text-on-surface/40 hover:text-on-surface bg-surface-container rounded-xl transition-colors">
                    <Edit2 size={12} />
                  </button>
                  <button onClick={() => deleteDebt(debt.id)} className="p-2 text-on-surface/40 hover:text-error bg-surface-container rounded-xl transition-colors">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>

              {/* Title & Contact */}
              <div className="space-y-1">
                <h4 className="font-bold text-lg text-on-surface uppercase tracking-widest truncate">{debt.title}</h4>
                <p className="text-xs text-on-surface/40 flex items-center gap-1.5 font-medium uppercase tracking-wider">
                  <User size={12} /> {debt.contact}
                </p>
              </div>

              {/* Due Date or Interest Status */}
              <div className="mt-4 flex flex-wrap gap-2 text-[10px]">
                {debt.dueDate && (
                  <span className={cn(
                    "flex items-center gap-1 font-bold px-2 py-0.5 rounded uppercase tracking-wider",
                    isOverdue ? "bg-rose-500/10 text-rose-400" : "bg-on-surface/5 text-on-surface/40"
                  )}>
                    <Calendar size={10} /> {new Date(debt.dueDate).toLocaleDateString()} {isOverdue && `(${activeLoc.overdue})`}
                  </span>
                )}
                {debt.interestRate > 0 && (
                  <span className="flex items-center gap-1 font-bold px-2 py-0.5 rounded bg-on-surface/5 text-on-surface/40 uppercase tracking-wider">
                    <Percent size={10} /> {debt.interestRate}% bunga/th
                  </span>
                )}
              </div>

              {/* Progress visual */}
              <div className="mt-8 space-y-2">
                <div className="flex justify-between text-xs font-bold text-on-surface/40 uppercase tracking-wider">
                  <span>{activeLoc.remaining}</span>
                  <span className="tabular-nums">{paidPercentage}% Lunas</span>
                </div>
                <h3 className={cn("text-2xl font-display font-bold tracking-tighter", colorClass)}>
                  {formatCurrency(debt.remainingAmount, isSensored)}
                </h3>

                <div className="w-full h-1.5 bg-on-surface/5 rounded-full overflow-hidden mt-2">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      isLunas ? "bg-primary" : isDebt ? "bg-rose-500" : "bg-emerald-500"
                    )}
                    style={{ width: `${paidPercentage}%` }}
                  />
                </div>

                <div className="flex justify-between text-[10px] text-on-surface/30 pt-1 font-medium">
                  <span>{activeLoc.initialAmount}:</span>
                  <span>{formatCurrencyShort(debt.amount, isSensored)}</span>
                </div>
              </div>

              {/* Notes display */}
              {debt.notes && (
                <div className="mt-4 flex items-start gap-1.5 text-[10px] text-on-surface/40 bg-on-surface/[0.02] p-2.5 rounded-xl">
                  <FileText size={12} className="shrink-0 mt-0.5 text-on-surface/30" />
                  <span className="line-clamp-2">{debt.notes}</span>
                </div>
              )}

              {/* Quick payment button */}
              {!isLunas && (
                <button
                  onClick={() => openPayment(debt)}
                  className={cn(
                    "w-full py-3 mt-6 rounded-2xl text-[10px] font-bold uppercase tracking-wider transition-all",
                    isDebt 
                      ? "bg-rose-500/10 text-rose-400 hover:bg-rose-500/20" 
                      : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                  )}
                >
                  {isDebt ? activeLoc.payCicilan : activeLoc.receiveCicilan}
                </button>
              )}
            </div>
          );
        })}

        {filteredDebts.length === 0 && (
          <div className="col-span-full py-20 text-center glass rounded-[32px] border-dashed border-2 border-on-surface/10">
            <Handshake size={48} className="mx-auto text-on-surface/20 mb-4" />
            <h3 className="font-bold text-lg text-on-surface uppercase tracking-widest mb-2">{activeLoc.empty}</h3>
            <p className="text-sm text-on-surface/40 font-medium max-w-md mx-auto">{activeLoc.emptySub}</p>
          </div>
        )}
      </div>

      {/* Main Loan Add/Edit Modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg glass-dark rounded-[32px] p-8 border border-on-surface/10 shadow-2xl relative max-h-[90vh] overflow-y-auto"
            >
              <button onClick={() => setIsAdding(false)} className="absolute top-6 right-6 text-on-surface/40 hover:text-on-surface">
                <X size={20} />
              </button>

              <h3 className="font-display text-2xl font-bold text-on-surface tracking-tighter uppercase mb-8">
                {editingId ? activeLoc.editDebt : activeLoc.addDebt}
              </h3>

              <form onSubmit={handleFormSubmit} className="space-y-5">
                {/* Description Title */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-on-surface/30 uppercase tracking-[0.2em] ml-1">{activeLoc.title}</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Pinjaman Bank Mandiri / Piutang Budi"
                    className="w-full px-5 py-4 bg-th-input border border-th-input rounded-2xl text-sm font-bold text-on-surface focus:outline-none focus:border-th-input-focus transition-all"
                  />
                </div>

                {/* Type Selection */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-on-surface/30 uppercase tracking-[0.2em] ml-1">{activeLoc.type}</label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value as any)}
                      className="w-full px-5 py-4 bg-th-input border border-th-input rounded-2xl text-sm font-bold text-on-surface focus:outline-none focus:border-th-input-focus transition-all appearance-none cursor-pointer"
                    >
                      <option value="DEBT" className="bg-surface text-on-surface">{activeLoc.types.DEBT}</option>
                      <option value="RECEIVABLE" className="bg-surface text-on-surface">{activeLoc.types.RECEIVABLE}</option>
                    </select>
                  </div>
                  
                  {/* Contact Person */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-on-surface/30 uppercase tracking-[0.2em] ml-1">{activeLoc.contact}</label>
                    <input
                      type="text"
                      required
                      value={contact}
                      onChange={(e) => setContact(e.target.value)}
                      placeholder="e.g. Bank Mandiri / Budi"
                      className="w-full px-5 py-4 bg-th-input border border-th-input rounded-2xl text-sm font-bold text-on-surface focus:outline-none focus:border-th-input-focus transition-all"
                    />
                  </div>
                </div>

                {/* Amount and Interest Rate */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-on-surface/30 uppercase tracking-[0.2em] ml-1">{activeLoc.amount}</label>
                    <input
                      type="number"
                      required
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0"
                      className="w-full px-5 py-4 bg-th-input border border-th-input rounded-2xl text-sm font-bold text-on-surface focus:outline-none focus:border-th-input-focus transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-on-surface/30 uppercase tracking-[0.2em] ml-1">{activeLoc.interestRate}</label>
                    <input
                      type="number"
                      step="0.01"
                      value={interestRate}
                      onChange={(e) => setInterestRate(e.target.value)}
                      placeholder="0"
                      className="w-full px-5 py-4 bg-th-input border border-th-input rounded-2xl text-sm font-bold text-on-surface focus:outline-none focus:border-th-input-focus transition-all"
                    />
                  </div>
                </div>

                {/* Due Date & Wallet Connection */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-on-surface/30 uppercase tracking-[0.2em] ml-1">{activeLoc.dueDate}</label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full px-5 py-4 bg-th-input border border-th-input rounded-2xl text-sm font-bold text-on-surface focus:outline-none focus:border-th-input-focus transition-all [color-scheme:dark]"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-on-surface/30 uppercase tracking-[0.2em] ml-1">{activeLoc.selectWallet}</label>
                    <select
                      value={walletId}
                      onChange={(e) => setWalletId(e.target.value)}
                      disabled={!!editingId}
                      className="w-full px-5 py-4 bg-th-input border border-th-input rounded-2xl text-sm font-bold text-on-surface focus:outline-none focus:border-th-input-focus transition-all appearance-none cursor-pointer disabled:opacity-50"
                    >
                      <option value="" className="bg-surface text-on-surface">-</option>
                      {wallets.map(w => (
                        <option key={w.id} value={w.id} className="bg-surface text-on-surface">
                          {w.name} ({formatCurrencyShort(w.balance)})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Wallet Info Alert */}
                {!editingId && walletId && (
                  <div className="flex items-start gap-2 bg-primary/10 p-3 rounded-2xl">
                    <Info size={14} className="text-primary shrink-0 mt-0.5" />
                    <p className="text-[10px] text-primary font-medium leading-relaxed">
                      {activeLoc.walletHelp}
                    </p>
                  </div>
                )}

                {/* Notes */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-on-surface/30 uppercase tracking-[0.2em] ml-1">{activeLoc.notes}</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Tenor 12 bulan, jatuh tempo setiap tanggal 10"
                    rows={2}
                    className="w-full px-5 py-4 bg-th-input border border-th-input rounded-2xl text-sm font-bold text-on-surface focus:outline-none focus:border-th-input-focus transition-all resize-none"
                  />
                </div>

                <button type="submit" className="w-full py-4 mt-4 bg-primary text-on-surface rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-primary/90 transition-all shadow-xl">
                  {editingId ? activeLoc.updateDebt : activeLoc.saveDebt}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* instalment Repayment Modal */}
      <AnimatePresence>
        {payingDebtId && selectedPayingDebt && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md glass-dark rounded-[32px] p-8 border border-on-surface/10 shadow-2xl relative"
            >
              <button onClick={() => setPayingDebtId(null)} className="absolute top-6 right-6 text-on-surface/40 hover:text-on-surface">
                <X size={20} />
              </button>

              <h3 className="font-display text-2xl font-bold text-on-surface tracking-tighter uppercase mb-6">
                {selectedPayingDebt.type === 'DEBT' ? activeLoc.payCicilan : activeLoc.receiveCicilan}
              </h3>
              
              <div className="mb-6 p-4 rounded-2xl bg-on-surface/5 border border-on-surface/5">
                <p className="text-[10px] font-bold text-on-surface/40 uppercase tracking-widest">{selectedPayingDebt.title}</p>
                <p className="text-xs text-on-surface/50 mt-1 font-medium uppercase tracking-wider">{activeLoc.contact}: {selectedPayingDebt.contact}</p>
                <p className="text-lg font-bold text-on-surface mt-2">
                  {activeLoc.remaining}: <span className={selectedPayingDebt.type === 'DEBT' ? 'text-rose-400' : 'text-emerald-400'}>
                    {formatCurrency(selectedPayingDebt.remainingAmount, isSensored)}
                  </span>
                </p>
              </div>

              <form onSubmit={handlePaymentSubmit} className="space-y-4">
                {/* Source/Target Wallet */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-on-surface/30 uppercase tracking-[0.2em] ml-1">{activeLoc.selectWallet}</label>
                  <select
                    required
                    value={paymentWalletId}
                    onChange={(e) => setPaymentWalletId(e.target.value)}
                    className="w-full px-5 py-4 bg-th-input border border-th-input rounded-2xl text-sm font-bold text-on-surface focus:outline-none focus:border-th-input-focus transition-all appearance-none cursor-pointer"
                  >
                    {wallets.map(w => (
                      <option key={w.id} value={w.id} className="bg-surface text-on-surface">
                        {w.name} ({formatCurrencyShort(w.balance)})
                      </option>
                    ))}
                  </select>
                </div>

                {/* instalment Amount */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-on-surface/30 uppercase tracking-[0.2em] ml-1">{activeLoc.paymentAmount}</label>
                  <input
                    type="number"
                    required
                    max={selectedPayingDebt.remainingAmount}
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full px-5 py-4 bg-th-input border border-th-input rounded-2xl text-sm font-bold text-on-surface focus:outline-none focus:border-th-input-focus transition-all"
                  />
                </div>

                {/* Date */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-on-surface/30 uppercase tracking-[0.2em] ml-1">{activeLoc.paymentDate}</label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-5 py-4 bg-th-input border border-th-input rounded-2xl text-sm font-bold text-on-surface focus:outline-none focus:border-th-input-focus transition-all [color-scheme:dark]"
                  />
                </div>

                {/* Note */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-on-surface/30 uppercase tracking-[0.2em] ml-1">{activeLoc.notes}</label>
                  <input
                    type="text"
                    value={paymentNote}
                    onChange={(e) => setPaymentNote(e.target.value)}
                    placeholder="e.g. Pembayaran bulan ke-3"
                    className="w-full px-5 py-4 bg-th-input border border-th-input rounded-2xl text-sm font-bold text-on-surface focus:outline-none focus:border-th-input-focus transition-all"
                  />
                </div>

                <button type="submit" className="w-full py-4 mt-4 bg-primary text-on-surface rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-primary/90 transition-all shadow-xl">
                  {activeLoc.recordPayment}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
