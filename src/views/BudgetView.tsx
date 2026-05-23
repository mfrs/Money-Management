import React, { useState, useMemo, useRef } from 'react';
import {
  Plus,
  Trash2,
  ChevronRight,
  CreditCard,
  History,
  Wallet,
  X,
  Save,
  Check,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';
import { cn, isExpensePaidForCurrentTerm } from '../lib/utils';
import { formatCurrency } from '../lib/types';
import { getIcon } from '../lib/icons';
import CensoredAmount from '../components/CensoredAmount';

export default function BudgetView() {
  const {
    budget, wallets,
    addIncomeSource, updateIncomeSource, deleteIncomeSource,
    addFixedExpense, updateFixedExpense, deleteFixedExpense,
    addWalletAllocation, updateWalletAllocation, deleteWalletAllocation,
    setCurrentView, addToast, t, isSensored,
  } = useApp();

  // Computed totals
  const totalIncome = useMemo(() => budget.incomeSources.reduce((s, i) => s + i.amount, 0), [budget.incomeSources]);
  const totalFixed = useMemo(() => budget.fixedExpenses.reduce((s, e) => s + e.amount, 0), [budget.fixedExpenses]);
  const totalAllocated = useMemo(() => budget.walletAllocations.reduce((s, a) => s + a.amount, 0), [budget.walletAllocations]);
  const totalCommitted = totalFixed + totalAllocated;
  const residual = totalIncome - totalCommitted;
  const allocationPercent = totalIncome > 0 ? Math.round((totalCommitted / totalIncome) * 100) : 0;

  // Add income source
  const handleAddIncome = () => {
    addIncomeSource({ name: 'New Source', amount: 0 });
  };

  // Add fixed expense
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expName, setExpName] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expTerm, setExpTerm] = useState('01-MONTH');
  const [expDueDate, setExpDueDate] = useState('1');

  const handleAddExpense = () => {
    if (!expName.trim()) return;
    addFixedExpense({
      name: expName,
      amount: parseFloat(expAmount) || 0,
      term: expTerm,
      icon: 'CreditCard',
      autoPay: false,
      dueDate: parseInt(expDueDate) || 1,
    });
    setExpName('');
    setExpAmount('');
    setExpDueDate('1');
    setShowExpenseForm(false);
  };

  // Add wallet allocation
  const handleAddAllocation = () => {
    const unallocatedWallets = wallets.filter(w => !budget.walletAllocations.find(a => a.walletId === w.id));
    if (unallocatedWallets.length > 0) {
      addWalletAllocation({ walletId: unallocatedWallets[0].id, amount: 0 });
    } else {
      addToast('All wallets already have allocations', 'info');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-8 pb-32"
    >
      <div className="mb-6 px-2">
        <p className="text-[10px] font-bold text-primary tracking-[0.3em] uppercase mb-3">{t('budget.engineering')}</p>
        <h3 className="font-display text-3xl lg:text-4xl font-extrabold text-on-surface tracking-tighter uppercase">{t('budget.allocationTitle')}</h3>
        <p className="text-sm text-on-surface/40 mt-3 max-w-2xl leading-relaxed font-medium uppercase tracking-[0.05em]">
          {t('budget.allocationSub')}
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Left Column */}
        <div className="xl:col-span-7 flex flex-col gap-8">
          {/* Income Card */}
          <div className="glass rounded-[24px] lg:rounded-[32px] p-6 lg:p-8 relative overflow-hidden">
            <div className="flex justify-between items-center mb-8 lg:mb-10 relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-on-surface/5 border border-on-surface/10 flex items-center justify-center text-primary shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                  <CreditCard size={20} />
                </div>
                <h4 className="font-display text-base lg:text-lg font-bold text-on-surface uppercase tracking-widest leading-none">{t('budget.inflow')}</h4>
              </div>
            </div>

            <div className="space-y-4 relative z-10">
              {budget.incomeSources.map((source) => (
                <IncomeSourceRow key={source.id} source={source} onUpdate={updateIncomeSource} onDelete={deleteIncomeSource} />
              ))}

              <button
                onClick={handleAddIncome}
                className="w-full py-5 rounded-2xl border border-dashed border-on-surface/10 hover:bg-on-surface/[0.02] hover:border-on-surface/20 transition-all text-on-surface/30 hover:text-on-surface flex items-center justify-center gap-3 group"
              >
                <Plus size={18} className="group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Append Source</span>
              </button>
            </div>

            <div className="mt-8 lg:mt-10 pt-8 border-t border-on-surface/5 flex justify-between items-center relative z-10">
              <span className="text-[10px] font-bold text-on-surface/30 uppercase tracking-[0.2em]">{t('budget.totalInflow')}</span>
              <span className="font-display text-2xl lg:text-3xl font-bold text-primary tracking-tighter">
                <CensoredAmount amount={totalIncome} isSensored={isSensored} />
              </span>
            </div>
          </div>

          {/* Fixed Expenses Card */}
          <div className="glass rounded-[24px] lg:rounded-[32px] p-6 lg:p-8">
            <div className="flex justify-between items-center mb-8 lg:mb-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-on-surface/5 border border-on-surface/10 flex items-center justify-center text-secondary">
                  <History size={20} />
                </div>
                <h4 className="font-display text-base lg:text-lg font-bold text-on-surface uppercase tracking-widest">{t('budget.fixed')}</h4>
              </div>
              <button
                onClick={() => setShowExpenseForm(true)}
                className="text-[10px] font-bold text-on-surface/30 hover:text-on-surface uppercase tracking-widest px-4 py-2 bg-on-surface/5 rounded-full border border-on-surface/5 transition-all flex items-center gap-2"
              >
                <Plus size={14} /> {t('common.add')}
              </button>
            </div>

            <div className="space-y-1">
              {budget.fixedExpenses.map((item) => {
                const IconComp = getIcon(item.icon);
                const isPaid = isExpensePaidForCurrentTerm(item.lastPaid, item.term);

                return (
                  <div key={item.id} className="flex items-center justify-between p-4 lg:p-5 hover:bg-on-surface/[0.04] rounded-2xl transition-all group">
                    <div className="flex items-center gap-4 lg:gap-5">
                      <div className="w-10 h-10 rounded-xl bg-on-surface/5 flex items-center justify-center text-on-surface/40 border border-on-surface/5 group-hover:border-on-surface/10 transition-colors">
                        <IconComp size={16} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-on-surface">{item.name}</p>
                        <p className="text-[9px] uppercase tracking-widest text-on-surface/30 font-bold mt-1.5 flex gap-2 items-center">
                          <span>TERM: {item.term}</span>
                          {item.dueDate && <span className="text-secondary/80">• DUE: Day {item.dueDate}</span>}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 lg:gap-10">
                      <div className="flex flex-col items-end gap-1.5">
                        <span className="font-display text-base lg:text-lg font-bold text-on-surface tabular-nums">
                          <CensoredAmount amount={item.amount} isSensored={isSensored} />
                        </span>
                        {isPaid ? (
                          <span className="text-[9px] font-bold text-green-400 uppercase tracking-widest bg-green-400/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Check size={10} /> {t('budget.paid')}
                          </span>
                        ) : (
                          <button 
                            onClick={() => updateFixedExpense(item.id, { lastPaid: new Date().toISOString() })}
                            className="text-[9px] font-bold text-on-surface/50 hover:text-on-surface bg-on-surface/5 hover:bg-on-surface/10 px-2 py-0.5 rounded-full uppercase tracking-widest transition-all"
                          >
                            {t('budget.markPaid')}
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => updateFixedExpense(item.id, { autoPay: !item.autoPay })}
                          className={cn(
                            "w-9 h-5 rounded-full relative transition-colors duration-300 focus:outline-none border border-on-surface/5",
                            item.autoPay ? "bg-primary" : "bg-on-surface/5"
                          )}
                        >
                          <div className={cn(
                            "absolute top-0.5 w-[14px] h-[14px] bg-on-surface rounded-full transition-all duration-300 shadow-sm",
                            item.autoPay ? "left-[18px]" : "left-0.5"
                          )} />
                        </button>
                        <button
                          onClick={() => deleteFixedExpense(item.id)}
                          className="text-on-surface/10 hover:text-error transition-colors p-1"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {budget.fixedExpenses.length === 0 && (
                <div className="py-8 text-center text-on-surface/20 text-sm uppercase tracking-widest">No fixed expenses</div>
              )}
            </div>

            <div className="mt-8 flex justify-between items-center px-4">
              <span className="text-[10px] font-bold text-on-surface/20 uppercase tracking-widest">{t('budget.fixedTotal')}</span>
              <span className="text-lg font-bold text-on-surface tracking-tighter">
                <CensoredAmount amount={totalFixed} isSensored={isSensored} />
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Wallet Allocation */}
        <div className="xl:col-span-5">
          <div className="glass rounded-[24px] lg:rounded-[32px] p-6 lg:p-8 h-full flex flex-col">
            <div className="mb-8 lg:mb-10">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-on-surface/5 border border-on-surface/10 flex items-center justify-center text-tertiary">
                  <Wallet size={20} />
                </div>
                <h4 className="font-display text-base lg:text-lg font-bold text-on-surface uppercase tracking-widest">{t('budget.walletAlloc')}</h4>
              </div>
              <p className="text-sm text-on-surface/40 leading-relaxed font-medium">
                {t('budget.residualDesc')} <span className="text-on-surface font-bold"><CensoredAmount amount={Math.max(0, residual)} isSensored={isSensored} /></span> {t('budget.residualInto')}
              </p>
            </div>

            <div className="flex flex-col gap-4 flex-grow overflow-y-auto pr-1">
              {budget.walletAllocations.map((alloc) => {
                const wallet = wallets.find(w => w.id === alloc.walletId);
                if (!wallet) return null;
                return (
                  <WalletAllocationRow 
                    key={alloc.id} 
                    alloc={alloc} 
                    wallet={wallet} 
                    isSensored={isSensored} 
                    onUpdate={updateWalletAllocation} 
                    onDelete={deleteWalletAllocation} 
                  />
                );
              })}

              <button
                onClick={handleAddAllocation}
                className="p-8 lg:p-10 rounded-2xl border border-dashed border-on-surface/10 bg-transparent flex flex-col items-center justify-center gap-4 cursor-pointer hover:bg-on-surface/[0.02] hover:border-on-surface/20 transition-all text-on-surface/20 hover:text-on-surface min-h-[120px] group"
              >
                <Plus size={24} className="group-hover:rotate-90 transition-transform duration-500" />
                <span className="text-[10px] font-bold uppercase tracking-[0.3em]">{t('budget.addAllocation')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Summary Bar */}
      <div className="fixed bottom-6 left-5 lg:left-[280px] right-5 lg:right-6 liquid-glass rounded-[24px] lg:rounded-[32px] shadow-2xl z-[45] p-4 lg:p-5 overflow-hidden">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-primary/40" />
        <div className="max-w-[1280px] mx-auto flex items-center justify-between gap-6 lg:gap-10 overflow-x-auto">
          <div className="flex items-center gap-6 lg:gap-10 flex-1">
            <div className="space-y-1 px-4 whitespace-nowrap">
              <p className="text-[9px] font-bold text-on-surface/30 uppercase tracking-[0.2em]">{t('budget.grossFlow')}</p>
              <p className="font-display text-lg lg:text-xl font-bold text-on-surface tracking-tighter">
                <CensoredAmount amount={totalIncome} isSensored={isSensored} />
              </p>
            </div>
            <div className="h-10 w-px bg-on-surface/5 shrink-0" />
            <div className="space-y-1 px-4 whitespace-nowrap">
              <p className="text-[9px] font-bold text-on-surface/30 uppercase tracking-[0.2em]">{t('budget.committed')}</p>
              <p className="font-display text-lg lg:text-xl font-bold text-primary tracking-tighter">
                <CensoredAmount amount={totalCommitted} isSensored={isSensored} />
              </p>
            </div>
            <div className="h-10 w-px bg-on-surface/5 shrink-0" />
            <div className="space-y-1 px-4 whitespace-nowrap">
              <p className="text-[9px] font-bold text-on-surface/30 uppercase tracking-[0.2em]">{t('budget.residual')}</p>
              <p className={cn("font-display text-lg lg:text-xl font-bold tracking-tighter", residual >= 0 ? "text-secondary" : "text-error")}>
                <CensoredAmount amount={residual} isSensored={isSensored} />
              </p>
            </div>

            <div className="h-10 w-px bg-on-surface/5 shrink-0" />
            <div className="flex-1 min-w-[180px] max-w-sm ml-6 lg:ml-10 shrink-0">
              <div className="flex justify-between text-[9px] font-bold text-on-surface/20 uppercase tracking-widest mb-2.5">
                <span>{t('budget.allocation')}</span>
                <span className="text-primary font-mono tabular-nums">{allocationPercent}%</span>
              </div>
              <div className="h-1.5 w-full bg-on-surface/5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, allocationPercent)}%` }}
                  className={cn("h-full shadow-[0_0_15px_rgba(59,130,246,0.5)]", allocationPercent > 100 ? "bg-error" : "bg-primary")}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Fixed Expense Modal */}
      <AnimatePresence>
        {showExpenseForm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowExpenseForm(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="glass rounded-[32px] p-8 w-full max-w-sm relative z-10 border border-on-surface/10"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-display text-lg font-bold text-on-surface">{t('budget.addFixed')}</h3>
                <button onClick={() => setShowExpenseForm(false)} className="text-on-surface/30 hover:text-on-surface"><X size={18} /></button>
              </div>
              <div className="space-y-4">
                <input type="text" value={expName} onChange={(e) => setExpName(e.target.value)} placeholder="Name" className="w-full px-5 py-4 bg-on-surface/5 border border-on-surface/5 rounded-2xl text-sm font-bold text-on-surface focus:outline-none focus:border-on-surface/20 transition-all placeholder:text-on-surface/15" />
                <div className="relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-on-surface/20 font-bold">Rp</span>
                  <input type="number" value={expAmount} onChange={(e) => setExpAmount(e.target.value)} placeholder="0" className="w-full pl-12 pr-5 py-4 bg-on-surface/5 border border-on-surface/5 rounded-2xl text-sm font-bold text-on-surface focus:outline-none focus:border-on-surface/20 transition-all placeholder:text-on-surface/15 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                </div>
                <select value={expTerm} onChange={(e) => setExpTerm(e.target.value)} className="w-full px-5 py-4 bg-on-surface/5 border border-on-surface/5 rounded-2xl text-xs font-bold text-on-surface focus:outline-none appearance-none cursor-pointer uppercase tracking-widest">
                  <option value="01-MONTH">{t('budget.monthly')}</option>
                  <option value="03-MONTH">{t('budget.quarterly')}</option>
                  <option value="06-MONTH">{t('budget.semiAnnual')}</option>
                  <option value="12-MONTH">{t('budget.annual')}</option>
                </select>
                <div className="relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-on-surface/20 text-[10px] font-bold uppercase tracking-widest">{t('budget.dueDay')}</span>
                  <input type="number" min="1" max="31" value={expDueDate} onChange={(e) => setExpDueDate(e.target.value)} placeholder="1" className="w-full pl-40 pr-5 py-4 bg-on-surface/5 border border-on-surface/5 rounded-2xl text-sm font-bold text-on-surface focus:outline-none focus:border-on-surface/20 transition-all placeholder:text-on-surface/15" />
                </div>
                <button onClick={handleAddExpense} disabled={!expName.trim()} className="w-full py-4 bg-secondary text-on-surface text-sm font-bold uppercase tracking-widest rounded-2xl hover:bg-secondary/80 transition-all shadow-lg disabled:opacity-30 flex items-center justify-center gap-2">
                  <Save size={16} /> {t('common.save')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Inline editable row that buffers changes and only calls API on blur
function IncomeSourceRow({ source, onUpdate, onDelete }: { source: any; onUpdate: (id: string, data: any) => void; onDelete: (id: string) => void }) {
  const { isSensored } = useApp();
  const [localName, setLocalName] = useState(source.name);
  const [localAmount, setLocalAmount] = useState(source.amount?.toString() || '');

  React.useEffect(() => {
    setLocalName(source.name);
    setLocalAmount(source.amount?.toString() || '');
  }, [source.name, source.amount]);

  return (
    <div className="flex items-end gap-4 lg:gap-6 p-4 lg:p-6 rounded-2xl bg-on-surface/[0.03] border border-on-surface/5 hover:border-on-surface/10 transition-all group">
      <div className="flex-1">
        <label className="block text-[9px] font-bold text-on-surface/20 uppercase tracking-widest mb-2 ml-1">Source Label</label>
        <input
          type="text"
          value={localName}
          onChange={(e) => setLocalName(e.target.value)}
          onBlur={() => { if (localName !== source.name) onUpdate(source.id, { name: localName }); }}
          className="w-full bg-transparent border-none p-0 font-display text-base lg:text-lg text-on-surface focus:ring-0 font-bold placeholder:text-on-surface/10 outline-none"
        />
      </div>
      <div className="flex-1 text-right">
        <label className="block text-[9px] font-bold text-on-surface/20 uppercase tracking-widest mb-2 mr-1">Amount</label>
        <div className="relative flex justify-end items-center">
          <span className="text-on-surface/30 font-display text-base lg:text-lg mr-1 shrink-0">Rp</span>
          <input
            type="number"
            value={localAmount}
            onChange={(e) => setLocalAmount(e.target.value)}
            onBlur={() => { const v = parseFloat(localAmount) || 0; if (v !== source.amount) onUpdate(source.id, { amount: v }); }}
            style={{ width: localAmount ? `${localAmount.length}ch` : '3ch' }}
            className={cn("bg-transparent border-none p-0 font-display text-xl lg:text-2xl text-on-surface focus:ring-0 font-bold tabular-nums text-right outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none", isSensored && "blur-[6px] select-none pointer-events-none")}
          />
        </div>
      </div>
      <button
        onClick={() => onDelete(source.id)}
        className="p-2.5 text-on-surface/10 hover:text-tertiary transition-colors hover:bg-tertiary/5 rounded-xl"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}

// Inline editable row that buffers changes and only calls API on blur for wallets
function WalletAllocationRow({ alloc, wallet, isSensored, onUpdate, onDelete }: { alloc: any; wallet: any; isSensored: boolean; onUpdate: (id: string, data: any) => void; onDelete: (id: string) => void }) {
  const IconComp = getIcon(wallet.icon);
  const [localAmount, setLocalAmount] = useState(alloc.amount?.toString() || '');

  React.useEffect(() => {
    setLocalAmount(alloc.amount?.toString() || '');
  }, [alloc.amount]);

  return (
    <div className="p-5 lg:p-6 rounded-2xl border border-on-surface/5 bg-on-surface/[0.01] flex flex-col gap-4 relative overflow-hidden group hover:bg-on-surface/[0.04] hover:border-on-surface/10 transition-all">
      <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: wallet.color, opacity: 0.5 }} />
      <div className="flex justify-between items-center pl-2 text-on-surface">
        <div className="flex items-center gap-3">
          <IconComp style={{ color: wallet.color }} className="opacity-60" size={16} />
          <span className="text-xs font-bold text-on-surface tracking-widest uppercase">{wallet.name}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[9px] font-bold text-on-surface/20 uppercase tracking-widest">
            <CensoredAmount amount={wallet.balance} isSensored={isSensored} />
          </span>
          <button onClick={() => onDelete(alloc.id)} className="text-on-surface/10 hover:text-error transition-colors p-1">
            <Trash2 size={12} />
          </button>
        </div>
      </div>
      <div className="flex items-center gap-3 pl-2">
        <div className="relative flex-1">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface/20 font-bold text-sm">Rp</span>
          <input
            type="number"
            value={localAmount}
            onChange={(e) => setLocalAmount(e.target.value)}
            onBlur={() => { const v = parseFloat(localAmount) || 0; if (v !== alloc.amount) onUpdate(alloc.id, { amount: v }); }}
            className={cn("w-full bg-on-surface/5 border border-on-surface/5 rounded-xl py-3 pl-10 pr-4 font-display text-sm text-on-surface focus:outline-none focus:border-on-surface/20 focus:ring-1 focus:ring-on-surface/20 transition-all font-bold tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none", isSensored && "blur-[6px] select-none pointer-events-none")}
          />
        </div>
      </div>
    </div>
  );
}
