import React, { useMemo, useState } from 'react';
import {
  TrendingDown,
  TrendingUp,
  Flame,
  PiggyBank,
  ShieldCheck,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatCurrencyShort, formatDate } from '../lib/types';
import { getIcon } from '../lib/icons';
import CensoredAmount from '../components/CensoredAmount';

export default function Dashboard() {
  const {
    wallets, categories, journals,
    totalBalance, totalIncome, totalExpenses,
    getCategorySpent, getCategoryById, getWalletById,
    setCurrentView, t, isSensored,
  } = useApp();

  const [selectedMonthDate, setSelectedMonthDate] = useState(new Date());
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const handlePrevMonth = () => {
    setSelectedMonthDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setSelectedMonthDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const daysOfWeek = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

  const now = new Date();
  const year = selectedMonthDate.getFullYear();
  const month = selectedMonthDate.getMonth();

  const firstDayIndex = new Date(year, month, 1).getDay(); // 0-6
  const totalDays = new Date(year, month + 1, 0).getDate();
  const prevMonthTotalDays = new Date(year, month, 0).getDate();

  // Top expense categories with spending data
  const categorySpending = useMemo(() => {
    const expenseCats = categories.filter(c => c.type === 'expense');
    return expenseCats
      .map(cat => ({
        ...cat,
        spent: getCategorySpent(cat.id),
        percentage: cat.budgetLimit > 0 ? Math.round((getCategorySpent(cat.id) / cat.budgetLimit) * 100) : 0,
        remaining: cat.budgetLimit - getCategorySpent(cat.id),
      }))
      .filter(c => c.spent > 0)
      .sort((a, b) => b.spent - a.spent)
      .slice(0, 4);
  }, [categories, getCategorySpent]);

  // Pie chart data
  const pieData = useMemo(() => {
    return categorySpending.map(c => ({
      name: c.name,
      value: c.spent,
      color: c.color,
    }));
  }, [categorySpending]);

  const mappedTransactions = useMemo(() => {
    return journals
      .filter(j => !j.isReversed && !j.description.startsWith('[REVERSAL]'))
      .map(j => {
        const categoryLine = j.lines.find(l => l.categoryId);
      const walletLines = j.lines.filter(l => l.walletId);
      
      let type: 'income' | 'expense' | 'transfer' = 'expense';
      let categoryId = undefined;
      let amount = 0;
      let debtType: 'DEBT' | 'RECEIVABLE' | undefined = undefined;

      if (walletLines.length === 2 && !categoryLine) {
        type = 'transfer';
        amount = walletLines[0].amount;
      } else if (categoryLine) {
        categoryId = categoryLine.categoryId;
        amount = categoryLine.amount;
        type = categoryLine.type === 'CREDIT' ? 'income' : 'expense';
      } else if (walletLines.length === 1 && !categoryLine) {
        const wLine = walletLines[0];
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
        description: j.description,
        date: j.date,
        type,
        amount,
        categoryId,
        debtType,
      };
    });
  }, [journals]);

  const calendarCells = useMemo(() => {
    const cells: { day: number; isCurrentMonth: boolean; expenses: number }[] = [];

    // Prev month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      cells.push({
        day: prevMonthTotalDays - i,
        isCurrentMonth: false,
        expenses: 0
      });
    }

    // Current month
    for (let i = 1; i <= totalDays; i++) {
      const dayExpenses = mappedTransactions
        .filter(t => {
          if (t.type !== 'expense') return false;
          const txDate = new Date(t.date);
          return txDate.getFullYear() === year &&
                 txDate.getMonth() === month &&
                 txDate.getDate() === i;
        })
        .reduce((sum, t) => sum + t.amount, 0);

      cells.push({
        day: i,
        isCurrentMonth: true,
        expenses: dayExpenses
      });
    }

    // Next month padding
    const remainingSlots = 42 - cells.length;
    for (let i = 1; i <= remainingSlots; i++) {
      cells.push({
        day: i,
        isCurrentMonth: false,
        expenses: 0
      });
    }

    return cells;
  }, [mappedTransactions, year, month, firstDayIndex, totalDays, prevMonthTotalDays]);

  // Recent transactions
  const recentTransactions = useMemo(() => {
    return [...mappedTransactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 6);
  }, [mappedTransactions]);

  const burnRate = useMemo(() => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
    const recentExpenses = mappedTransactions
      .filter(t => t.type === 'expense' && new Date(t.date) >= thirtyDaysAgo)
      .reduce((s, t) => s + t.amount, 0);
    return Math.round(recentExpenses / 30);
  }, [mappedTransactions]);

  // Savings rate
  const savingsRate = useMemo(() => {
    if (totalIncome === 0) return 0;
    return Math.round(((totalIncome - totalExpenses) / totalIncome) * 100);
  }, [totalIncome, totalExpenses]);

  // Buffer fund (savings wallets total)
  const bufferFund = useMemo(() => {
    return wallets.filter(w => w.type === 'savings').reduce((s, w) => s + w.balance, 0);
  }, [wallets]);

  // Budget alerts
  const alerts = useMemo(() => {
    return categorySpending.filter(c => c.percentage >= 80);
  }, [categorySpending]);

  // Last 7 days balance trend for the sparkline
  const sparklineData = useMemo(() => {
    const data = [];
    let currentBal = totalBalance;
    const now = new Date();
    
    for (let i = 0; i < 7; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const dayTxs = mappedTransactions.filter(t => {
        const txDate = new Date(t.date);
        return txDate.getFullYear() === d.getFullYear() && txDate.getMonth() === d.getMonth() && txDate.getDate() === d.getDate();
      });
      const net = dayTxs.reduce((sum, tx) => sum + (tx.type === 'income' ? tx.amount : tx.type === 'expense' ? -tx.amount : 0), 0);
      
      data.unshift({
        name: d.getDate().toString(),
        value: currentBal
      });
      currentBal -= net; // go backwards to find past balances
    }
    
    // Add some variance if all values are identical so the chart doesn't look flat
    const allSame = data.every(d => d.value === data[0].value);
    if (allSame) {
      return data.map((d, i) => ({ ...d, value: d.value + (i * (d.value * 0.001)) }));
    }
    
    return data;
  }, [totalBalance, mappedTransactions]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-10"
    >
      {/* Balance Header */}
      <header className="glass rounded-[24px] lg:rounded-[32px] p-6 lg:p-8 shadow-sm">
        <h2 className="text-xs font-bold text-on-surface/40 uppercase tracking-[0.2em] mb-3">{t('common.totalBalance')}</h2>
        <div className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-on-surface tracking-tighter mb-8 break-words">
          <CensoredAmount amount={totalBalance} isSensored={isSensored} />
        </div>
        
        <div className="flex items-center justify-between border-t border-on-surface/10 pt-6 mt-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
              <span className="text-[10px] font-bold text-on-surface/50 uppercase tracking-widest">{t('common.income')}</span>
            </div>
            <div className="font-display text-lg sm:text-xl font-bold text-on-surface tracking-tight">
              <CensoredAmount amount={totalIncome} isSensored={isSensored} useShort />
            </div>
          </div>
          
          <div className="w-px h-8 bg-on-surface/10 mx-4"></div>
          
          <div className="flex-1 text-right flex flex-col items-end">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-bold text-on-surface/50 uppercase tracking-widest">{t('common.expense')}</span>
              <div className="w-2 h-2 rounded-full bg-tertiary shadow-[0_0_8px_rgba(236,72,153,0.5)]"></div>
            </div>
            <div className="font-display text-lg sm:text-xl font-bold text-on-surface tracking-tight">
              <CensoredAmount amount={totalExpenses} isSensored={isSensored} useShort />
            </div>
          </div>
        </div>
      </header>

      {/* Budget Alerts */}
      {alerts.length > 0 && (
        <section className="space-y-3">
          {alerts.map(alert => (
            <div key={alert.id} className="bg-tertiary/10 border border-tertiary/20 rounded-[20px] p-5 flex items-center gap-5">
              <div className="p-2.5 bg-tertiary text-on-surface rounded-xl shadow-[0_0_15px_rgba(236,72,153,0.4)]">
                <AlertTriangle size={18} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-on-surface uppercase tracking-widest">Budget Alert</h4>
                <p className="text-sm text-on-surface/60 mt-1">
                  Category <span className="text-on-surface font-bold">{alert.name}</span> has reached {alert.percentage}% of budget limit.
                </p>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Stats Cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
        <div className="glass rounded-[24px] p-6 flex flex-col justify-between h-44 group hover:bg-on-surface/[0.06] transition-colors">
          <div className="flex justify-between items-start">
            <div className="p-3 bg-on-surface/5 rounded-xl text-primary border border-on-surface/10 group-hover:scale-110 transition-transform">
              <Flame size={20} />
            </div>
            <span className="text-[10px] font-bold text-primary flex items-center bg-primary/10 px-3 py-1 rounded-full uppercase tracking-wider">
              /day
            </span>
          </div>
          <div>
            <h3 className="text-[10px] font-bold text-on-surface/40 uppercase tracking-widest mb-1">{t('dash.burnRate')}</h3>
            <div className="font-display text-xl lg:text-2xl font-bold text-on-surface tracking-tight">
              <CensoredAmount amount={burnRate} isSensored={isSensored} useShort />
            </div>
          </div>
        </div>

        <div className="glass rounded-[24px] p-6 flex flex-col justify-between h-44 group hover:bg-on-surface/[0.06] transition-colors relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div className="p-3 bg-on-surface/5 rounded-xl text-secondary border border-on-surface/10">
              <PiggyBank size={20} />
            </div>
          </div>
          <div className="flex justify-between items-end">
            <div>
              <h3 className="text-[10px] font-bold text-on-surface/40 uppercase tracking-widest mb-1">{t('dash.savingsRate')}</h3>
              <div className="font-display text-3xl lg:text-4xl font-bold text-on-surface tracking-tighter">{Math.max(0, savingsRate)}%</div>
            </div>
            <div className="relative w-12 h-12">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 48 48">
                <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-on-surface/5" />
                <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="transparent" strokeDasharray={126} strokeDashoffset={126 - (126 * Math.max(0, savingsRate)) / 100} className="text-secondary" />
              </svg>
            </div>
          </div>
        </div>

        <div className="glass rounded-[24px] p-6 flex flex-col justify-between h-44 group hover:bg-on-surface/[0.06] transition-colors">
          <div className="flex justify-between items-start">
            <div className="p-3 bg-on-surface/5 rounded-xl text-tertiary border border-on-surface/10">
              <ShieldCheck size={20} />
            </div>
          </div>
          <div>
            <h3 className="text-[10px] font-bold text-on-surface/40 uppercase tracking-widest mb-1">{t('dash.bufferFund')}</h3>
            <div className="font-display text-xl lg:text-2xl font-bold text-on-surface tracking-tight">
              <CensoredAmount amount={bufferFund} isSensored={isSensored} useShort />
            </div>
            <div className="w-full bg-on-surface/5 h-1.5 rounded-full mt-4 overflow-hidden">
              <div
                className="bg-tertiary h-full rounded-full shadow-[0_0_10px_rgba(236,72,153,0.3)] transition-all duration-1000"
                style={{ width: `${Math.min(100, (bufferFund / (wallets.find(w => w.type === 'savings')?.goal || bufferFund)) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Budget Flow + Monthly Activity + Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Arus Anggaran */}
        <div className="glass rounded-[24px] lg:rounded-[32px] p-6 lg:p-8 flex flex-col h-full bg-gradient-to-br from-white/[0.02] to-white/[0.01]">
          <h3 className="font-display text-lg font-bold text-on-surface mb-8 uppercase tracking-widest">{t('dash.budgetFlow')}</h3>
          <div className="space-y-6 flex-grow flex flex-col justify-center">
            {categorySpending.map((item) => {
              const IconComp = getIcon(item.icon);
              return (
                <div key={item.id} className="group">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-on-surface/5 flex items-center justify-center text-on-surface/80 border border-on-surface/10 group-hover:bg-on-surface/10 transition-colors">
                        <IconComp size={18} />
                      </div>
                      <span className="text-sm font-bold text-on-surface">{item.name}</span>
                    </div>
                    <span className={cn(
                      "text-[10px] font-bold uppercase tracking-widest",
                      item.percentage >= 80 ? "text-tertiary" : "text-on-surface/40"
                    )}>
                      <CensoredAmount amount={Math.max(0, item.remaining)} isSensored={isSensored} suffix=" left" />
                    </span>
                  </div>
                  <div className="w-full bg-on-surface/5 h-2 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, item.percentage)}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="h-full rounded-full"
                      style={{
                        backgroundColor: item.color,
                        boxShadow: `0 0 12px ${item.color}44`
                      }}
                    />
                  </div>
                </div>
              );
            })}
            {categorySpending.length === 0 && (
              <div className="text-center py-12 text-on-surface/20 text-sm uppercase tracking-widest">
                No expenses this month yet
              </div>
            )}
          </div>
        </div>

        {/* Aktifitas Bulanan (Monthly Activity) */}
        <div className="glass rounded-[24px] lg:rounded-[32px] p-6 lg:p-8 flex flex-col h-full bg-gradient-to-br from-white/[0.02] to-white/[0.01]">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-display text-xs lg:text-sm font-bold text-on-surface uppercase tracking-widest">Aktifitas Bulanan</h3>
              <p className="text-[8px] lg:text-[9px] text-on-surface/30 uppercase tracking-widest mt-1">Pengeluaran Harian</p>
            </div>
            <div className="flex items-center gap-2 bg-on-surface/5 px-3 py-1.5 rounded-full border border-on-surface/5 shadow-sm relative">
              <button
                onClick={handlePrevMonth}
                className="text-on-surface/60 hover:text-on-surface transition-all active:scale-95 duration-200 p-0.5"
              >
                <ChevronLeft size={14} />
              </button>
              <span
                onClick={() => setIsPickerOpen(!isPickerOpen)}
                className="text-[9px] lg:text-[10px] font-bold uppercase tracking-wider text-on-surface min-w-[75px] text-center cursor-pointer hover:text-primary transition-colors select-none whitespace-nowrap"
              >
                {monthNames[selectedMonthDate.getMonth()].substring(0, 3)} {selectedMonthDate.getFullYear()}
              </span>
              <button
                onClick={handleNextMonth}
                className="text-on-surface/60 hover:text-on-surface transition-all active:scale-95 duration-200 p-0.5"
              >
                <ChevronRight size={14} />
              </button>

              {/* Month & Year Picker Dropdown */}
              {isPickerOpen && (
                <>
                  {/* Invisible backdrop to close the picker */}
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setIsPickerOpen(false)}
                  />
                  
                  <div className="absolute right-0 top-full mt-2 w-64 bg-surface-dim/95 backdrop-blur-xl border border-on-surface/10 rounded-[20px] p-4 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Year Selection Header */}
                    <div className="flex justify-between items-center mb-4 border-b border-on-surface/5 pb-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedMonthDate(prev => new Date(prev.getFullYear() - 1, prev.getMonth(), 1));
                        }}
                        className="text-on-surface/60 hover:text-on-surface p-1 transition-colors hover:bg-on-surface/5 rounded-lg"
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <span className="text-xs font-bold text-on-surface tabular-nums select-none">
                        {selectedMonthDate.getFullYear()}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedMonthDate(prev => new Date(prev.getFullYear() + 1, prev.getMonth(), 1));
                        }}
                        className="text-on-surface/60 hover:text-on-surface p-1 transition-colors hover:bg-on-surface/5 rounded-lg"
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>

                    {/* Today Shortcut Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedMonthDate(new Date());
                        setIsPickerOpen(false);
                      }}
                      className="w-full py-2 mb-4 text-[10px] font-bold text-primary hover:text-white bg-primary/10 hover:bg-primary border border-primary/20 rounded-xl transition-all uppercase tracking-wider text-center flex items-center justify-center gap-1.5 active:scale-95 duration-150 cursor-pointer shadow-sm hover:shadow-primary/20"
                    >
                      <CalendarDays size={12} />
                      Hari Ini
                    </button>

                    {/* Months Grid */}
                    <div className="grid grid-cols-3 gap-2">
                      {monthNames.map((mName, mIdx) => {
                        const isCurrentSelected = selectedMonthDate.getMonth() === mIdx;
                        return (
                          <button
                            key={mIdx}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedMonthDate(new Date(selectedMonthDate.getFullYear(), mIdx, 1));
                              setIsPickerOpen(false);
                            }}
                            className={cn(
                              "py-2 text-[10px] font-bold rounded-xl transition-all uppercase tracking-wider text-center",
                              isCurrentSelected 
                                ? "bg-primary text-white shadow-lg shadow-primary/20" 
                                : "text-on-surface/60 hover:text-on-surface hover:bg-on-surface/5"
                            )}
                          >
                            {mName.substring(0, 3)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {daysOfWeek.map(day => (
              <div key={day} className="text-[8px] lg:text-[9px] font-bold text-on-surface/30 uppercase tracking-widest py-1">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5 flex-grow items-center justify-center">
            {calendarCells.map((cell, idx) => {
              const isToday = cell.isCurrentMonth && 
                              cell.day === now.getDate() && 
                              selectedMonthDate.getMonth() === now.getMonth() && 
                              selectedMonthDate.getFullYear() === now.getFullYear();
              return (
                <div
                  key={idx}
                  className={cn(
                    "aspect-square rounded-xl p-0.5 flex flex-col items-center justify-between transition-all border border-on-surface/5",
                    cell.isCurrentMonth 
                      ? (isToday ? "bg-primary/[0.05] border-primary/20 shadow-[0_0_8px_rgba(59,130,246,0.1)]" : "bg-on-surface/[0.01] hover:bg-on-surface/[0.04]") 
                      : "bg-transparent opacity-10 pointer-events-none border-none"
                  )}
                >
                  <span className={cn(
                    "text-[10px] lg:text-[11px] font-bold mt-0.5",
                    isToday ? "text-primary" : "text-on-surface/50"
                  )}>
                    {cell.day}
                  </span>
                  {cell.isCurrentMonth && cell.expenses > 0 ? (
                    <CensoredAmount
                      amount={cell.expenses}
                      isSensored={isSensored}
                      useShort
                      stripRp
                      prefix="-"
                      className="text-[10px] lg:text-[12px] leading-[1] font-mono font-bold text-tertiary tracking-tighter truncate mb-1"
                    />
                  ) : (
                    <span className="h-[10px]" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Distribusi */}
        <div className="glass rounded-[24px] lg:rounded-[32px] p-6 lg:p-8 flex flex-col h-full bg-gradient-to-br from-white/[0.03] to-white/[0.01]">
          <h3 className="font-display text-lg font-bold text-on-surface mb-8 uppercase tracking-widest">{t('dash.distribution')}</h3>
          <div className="flex-grow flex flex-col items-center justify-center">
            {pieData.length > 0 ? (
              <>
                <div className="relative w-36 h-36 mb-8">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={60}
                        paddingAngle={8}
                        dataKey="value"
                        stroke="none"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <div className="text-[8px] font-bold text-on-surface/30 uppercase tracking-[0.2em]">Spent</div>
                    <div className="font-display text-lg font-bold text-on-surface pointer-events-auto">
                      <CensoredAmount amount={totalExpenses} isSensored={isSensored} useShort />
                    </div>
                  </div>
                </div>

                <div className="w-full space-y-4">
                  {pieData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between group">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></div>
                        <span className="text-[9px] font-bold text-on-surface/50 uppercase tracking-widest group-hover:text-on-surface/80 transition-colors">{item.name}</span>
                      </div>
                      <span className="text-[9px] font-bold text-on-surface tabular-nums">
                        {totalExpenses > 0 ? Math.round((item.value / totalExpenses) * 100) : 0}%
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-on-surface/20 text-sm uppercase tracking-widest">
                No data yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Live Ledger */}
      <section className="glass rounded-[24px] lg:rounded-[32px] p-6 lg:p-8">
        <div className="flex justify-between items-center mb-8 px-2">
          <h3 className="font-display text-lg font-bold text-on-surface uppercase tracking-widest">{t('dash.liveLedger')}</h3>
          <button
            onClick={() => setCurrentView('transactions')}
            className="text-[10px] font-bold text-on-surface/40 hover:text-on-surface transition-colors uppercase tracking-widest bg-on-surface/5 px-4 py-2 rounded-full border border-on-surface/5"
          >
            {t('dash.viewAll')}
          </button>
        </div>
        <div className="space-y-1">
          {recentTransactions.map((tx) => {
            const cat = getCategoryById(tx.categoryId);
            const isDebtTx = !tx.categoryId && tx.type !== 'transfer';
            const IconComp = cat 
              ? getIcon(cat.icon) 
              : isDebtTx 
                ? getIcon('Handshake') 
                : TrendingDown;
            const categoryName = cat 
              ? cat.name 
              : isDebtTx 
                ? tx.debtType === 'DEBT'
                  ? t('common.debt')
                  : t('common.receivable')
                : 'Unknown';

            return (
              <div key={tx.id} className="flex items-center justify-between py-3 lg:py-4 px-3 lg:px-4 hover:bg-on-surface/[0.04] rounded-2xl transition-all cursor-pointer group">
                <div className="flex items-center gap-4 lg:gap-5">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center border border-on-surface/10 transition-transform group-hover:scale-105",
                    tx.type === 'income' ? "bg-primary/10 text-primary" : "bg-on-surface/5 text-on-surface/60"
                  )}>
                    <IconComp size={16} />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-on-surface group-hover:text-on-surface transition-colors">{tx.description}</div>
                    <div className="text-[10px] text-on-surface/30 uppercase tracking-widest mt-1">
                      {categoryName} • {formatDate(tx.date)}
                    </div>
                  </div>
                </div>
                <div className={cn(
                  "text-sm font-bold tabular-nums",
                  tx.type === 'income' ? "text-primary" : "text-on-surface"
                )}>
                  <CensoredAmount
                    amount={tx.amount}
                    isSensored={isSensored}
                    prefix={tx.type === 'income' ? '+' : '-'}
                  />
                </div>
              </div>
            );
          })}
          {recentTransactions.length === 0 && (
            <div className="text-center py-12 text-on-surface/20 text-sm uppercase tracking-widest">
              {t('dash.noTransactions')}
            </div>
          )}
        </div>
      </section>
    </motion.div>
  );
}
