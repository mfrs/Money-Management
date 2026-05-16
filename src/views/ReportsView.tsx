import React, { useMemo, useState } from 'react';
import {
  PiggyBank,
  Flame,
  TrendingUp,
  Lightbulb,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { motion } from 'motion/react';
import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { cn } from '../lib/utils';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatCurrencyShort } from '../lib/types';
import { getIcon } from '../lib/icons';

export default function ReportsView() {
  const { transactions, categories, totalBalance, totalIncome, totalExpenses, getCategorySpent } = useApp();
  const [timePeriod, setTimePeriod] = useState<'3M' | '6M' | '1Y'>('6M');

  // Monthly data for chart
  const chartData = useMemo(() => {
    const months: Record<string, { income: number; expenses: number }> = {};
    const periodMonths = timePeriod === '3M' ? 3 : timePeriod === '6M' ? 6 : 12;
    const now = new Date();

    // Initialize months
    for (let i = periodMonths - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleDateString('en-US', { month: 'short' });
      months[key] = { income: 0, expenses: 0 };
    }

    // Fill data
    transactions.forEach(tx => {
      const d = new Date(tx.date);
      const key = d.toLocaleDateString('en-US', { month: 'short' });
      if (months[key]) {
        if (tx.type === 'income') months[key].income += tx.amount;
        else months[key].expenses += tx.amount;
      }
    });

    return Object.entries(months).map(([name, data]) => ({ name, ...data }));
  }, [transactions, timePeriod]);

  // Expense breakdown by category
  const breakdown = useMemo(() => {
    const expenseCats = categories.filter(c => c.type === 'expense');
    const items = expenseCats
      .map(cat => ({
        ...cat,
        spent: getCategorySpent(cat.id),
      }))
      .filter(c => c.spent > 0)
      .sort((a, b) => b.spent - a.spent)
      .slice(0, 5);

    const maxSpent = Math.max(...items.map(i => i.spent), 1);
    return items.map(item => ({
      name: item.name,
      amount: formatCurrency(item.spent),
      progress: Math.round((item.spent / maxSpent) * 100),
      color: item.color,
      icon: item.icon,
    }));
  }, [categories, getCategorySpent]);

  // Daily burn rate
  const burnRate = useMemo(() => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
    const recent = transactions
      .filter(t => t.type === 'expense' && new Date(t.date) >= thirtyDaysAgo)
      .reduce((s, t) => s + t.amount, 0);
    return Math.round(recent / 30);
  }, [transactions]);

  // Insights
  const insights = useMemo(() => {
    const result = [];

    // Savings insight
    const savingsRate = totalIncome > 0 ? Math.round(((totalIncome - totalExpenses) / totalIncome) * 100) : 0;
    if (savingsRate > 20) {
      result.push({
        title: 'Strong Savings',
        text: `You're saving ${savingsRate}% of your income this month. Keep it up!`,
        icon: CheckCircle,
        positive: true,
      });
    } else if (savingsRate > 0) {
      result.push({
        title: 'Low Savings Rate',
        text: `Only ${savingsRate}% savings rate. Consider reducing expenses to reach the recommended 20%.`,
        icon: AlertCircle,
        positive: false,
      });
    }

    // Over-budget categories
    const overBudget = categories
      .filter(c => c.type === 'expense' && c.budgetLimit > 0)
      .filter(c => getCategorySpent(c.id) > c.budgetLimit * 0.8);

    if (overBudget.length > 0) {
      result.push({
        title: 'Budget Warning',
        text: `${overBudget.map(c => c.name).join(', ')} ${overBudget.length > 1 ? 'are' : 'is'} approaching or exceeding budget limits.`,
        icon: AlertCircle,
        positive: false,
      });
    }

    if (result.length === 0) {
      result.push({
        title: 'Looking Good',
        text: 'Your spending is within healthy limits. No budget categories are in danger.',
        icon: CheckCircle,
        positive: true,
      });
    }

    return result;
  }, [totalIncome, totalExpenses, categories, getCategorySpent]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-10"
    >
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 px-2">
        <div>
          <h2 className="font-display text-3xl lg:text-4xl font-bold text-on-surface tracking-tighter uppercase">Financial Reports</h2>
          <p className="text-on-surface/40 mt-3 text-sm uppercase tracking-widest font-medium">Analytics breakdown of your financial distribution and spending patterns.</p>
        </div>
      </header>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
        {[
          { label: 'Total Savings', value: formatCurrency(Math.max(0, totalIncome - totalExpenses)), change: totalIncome > 0 ? `${Math.round(((totalIncome - totalExpenses) / totalIncome) * 100)}%` : '0%', icon: PiggyBank, color: 'text-primary' },
          { label: 'Daily Burn Rate', value: formatCurrencyShort(burnRate), change: '/day', icon: Flame, color: 'text-secondary' },
          { label: 'Net Worth', value: formatCurrency(totalBalance), change: `${transactions.length} txns`, icon: TrendingUp, color: 'text-tertiary' },
        ].map((metric, i) => (
          <div key={i} className="glass rounded-[24px] lg:rounded-[32px] p-6 lg:p-8 flex flex-col justify-between h-48 lg:h-52 border border-on-surface/5 hover:border-on-surface/20 transition-all group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-on-surface/[0.02] rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:bg-primary/5 transition-all duration-700" />
            <div className="flex justify-between items-start relative z-10">
              <div className={cn("w-12 h-12 lg:w-14 lg:h-14 rounded-2xl flex items-center justify-center glass-dark border border-on-surface/5 group-hover:scale-110 transition-transform", metric.color)}>
                <metric.icon size={24} />
              </div>
              <span className="px-4 lg:px-5 py-2 rounded-full text-[9px] font-bold uppercase tracking-widest glass-dark border border-on-surface/5 text-on-surface/30">
                {metric.change}
              </span>
            </div>
            <div className="relative z-10">
              <p className="text-[9px] font-bold text-on-surface/20 uppercase tracking-[0.3em] mb-3">{metric.label}</p>
              <h3 className="font-display text-2xl lg:text-3xl font-bold text-on-surface tracking-tighter tabular-nums">{metric.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="glass rounded-[28px] lg:rounded-[40px] p-6 lg:p-10 border border-on-surface/5 flex flex-col relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 to-transparent pointer-events-none" />
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 lg:mb-12 gap-6 lg:gap-8 relative z-10">
          <div className="text-center md:text-left">
            <h3 className="font-display text-xl lg:text-2xl font-bold text-on-surface tracking-tighter uppercase">Income vs Expenses</h3>
            <p className="text-sm text-on-surface/30 mt-3 uppercase tracking-widest font-medium">Monthly overview</p>
          </div>
          <div className="flex items-center glass-dark p-1.5 rounded-full border border-on-surface/5">
            {(['3M', '6M', '1Y'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTimePeriod(t)}
                className={cn(
                  "px-5 lg:px-7 py-2.5 rounded-full text-[9px] font-bold uppercase tracking-[0.2em] transition-all",
                  timePeriod === t ? "bg-on-surface text-surface shadow-xl" : "text-on-surface/30 hover:text-on-surface"
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="h-[280px] lg:h-[400px] w-full mt-2 relative z-10">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9, fontWeight: 700 }}
                dy={20}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9, fontWeight: 700 }}
                tickFormatter={(value) => formatCurrencyShort(value)}
                dx={-10}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: '24px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  backgroundColor: 'rgba(15, 15, 25, 0.95)',
                  backdropFilter: 'blur(10px)',
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
                  padding: '20px'
                }}
                formatter={(value: number) => formatCurrency(value)}
                itemStyle={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.1em' }}
                labelStyle={{ fontWeight: 800, marginBottom: '8px', color: 'rgba(255,255,255,0.5)' }}
              />
              <Area
                type="monotone"
                dataKey="income"
                stroke="#3b82f6"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#incomeGradient)"
                activeDot={{ r: 6, strokeWidth: 0, fill: '#3b82f6' }}
              />
              <Line
                type="monotone"
                dataKey="expenses"
                stroke="rgba(255,255,255,0.4)"
                strokeWidth={2}
                strokeDasharray="8 8"
                dot={{ r: 3, strokeWidth: 2, fill: 'rgba(15,15,25,1)', stroke: 'rgba(255,255,255,0.4)' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="flex justify-center items-center gap-8 lg:gap-12 mt-8 lg:mt-12 border-t border-on-surface/5 pt-6 lg:pt-8 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
            <span className="text-[9px] font-bold text-on-surface/30 uppercase tracking-[0.2em]">Income</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-2.5 h-2.5 rounded-full border border-on-surface/40 border-dashed" />
            <span className="text-[9px] font-bold text-on-surface/30 uppercase tracking-[0.2em]">Expenses</span>
          </div>
        </div>
      </div>

      {/* Breakdown + Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-stretch">
        {/* Breakdown */}
        <div className="glass rounded-[28px] lg:rounded-[40px] p-6 lg:p-10 flex flex-col border border-on-surface/5">
          <div className="flex justify-between items-center mb-8 lg:mb-10">
            <h3 className="font-display text-xl lg:text-2xl font-bold text-on-surface tracking-tighter uppercase">Expense Breakdown</h3>
          </div>
          <div className="flex flex-col gap-8 lg:gap-10 flex-grow justify-center">
            {breakdown.map((item, i) => {
              const IconComp = getIcon(item.icon);
              return (
                <div key={i}>
                  <div className="flex justify-between items-center mb-4">
                    <span className="font-bold text-sm text-on-surface flex items-center gap-4 lg:gap-5">
                      <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl glass-dark flex items-center justify-center border border-on-surface/5" style={{ color: item.color }}>
                        <IconComp size={18} />
                      </div>
                      <span className="uppercase tracking-widest text-xs">{item.name}</span>
                    </span>
                    <span className="text-sm font-bold text-on-surface font-mono tracking-tighter tabular-nums">{item.amount}</span>
                  </div>
                  <div className="w-full bg-on-surface/5 rounded-full h-1.5 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${item.progress}%` }}
                      transition={{ duration: 1.5, ease: "circOut" }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                  </div>
                </div>
              );
            })}
            {breakdown.length === 0 && (
              <div className="text-center py-12 text-on-surface/20 text-sm uppercase tracking-widest">No expenses this month</div>
            )}
          </div>
        </div>

        {/* Insights */}
        <div className="bg-primary rounded-[28px] lg:rounded-[40px] p-6 lg:p-10 flex flex-col justify-between text-on-surface relative overflow-hidden shadow-[0_0_50px_rgba(59,130,246,0.3)]">
          <div className="absolute top-0 right-0 w-80 h-80 bg-secondary/20 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute -left-10 -bottom-10 w-64 h-64 bg-tertiary-container/30 rounded-full blur-[80px] pointer-events-none" />

          <div className="relative z-10">
            <div className="flex items-center gap-5 mb-8 lg:mb-10 glass-dark w-fit px-6 lg:px-8 py-3 lg:py-4 rounded-3xl border border-on-surface/20 backdrop-blur-3xl shadow-2xl">
              <Lightbulb className="text-on-surface" size={22} />
              <h3 className="font-display text-base lg:text-lg font-bold text-on-surface tracking-widest uppercase leading-none">Smart Insights</h3>
            </div>

            <ul className="flex flex-col gap-4">
              {insights.map((insight, i) => (
                <li key={i} className="flex items-start gap-5 lg:gap-6 glass-dark p-5 lg:p-7 rounded-[24px] lg:rounded-[32px] border border-on-surface/10 backdrop-blur-sm group hover:bg-on-surface/10 transition-all cursor-default">
                  <insight.icon className={cn("mt-1 shrink-0 group-hover:scale-110 transition-transform", insight.positive ? "text-on-surface" : "text-on-surface/60")} size={22} />
                  <div>
                    <p className="text-sm font-bold text-on-surface uppercase tracking-widest mb-2 leading-none">{insight.title}</p>
                    <p className="text-[11px] text-on-surface/50 leading-relaxed font-medium">{insight.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
