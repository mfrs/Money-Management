import React, { useMemo } from 'react';
import {
  Trophy,
  Award,
  Zap,
  Flame,
  Target,
  ShieldAlert,
  Sparkles,
  Camera,
  Coins,
  Lock,
  CheckCircle,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useApp } from '../context/AppContext';
import { cn } from '../lib/utils';

export default function AchievementsView() {
  const { wallets, categories, goals, journals, language } = useApp();

  // Gamification formulas
  const xp = useMemo(() => {
    const journalCount = journals.filter(j => !j.isReversed).length;
    const goalCount = goals.length;
    const achievedGoals = goals.filter(g => g.currentAmount >= g.targetAmount).length;
    const categoryCount = categories.length;

    return (journalCount * 100) + (goalCount * 150) + (achievedGoals * 1000) + (categoryCount * 50);
  }, [journals, goals, categories]);

  const level = useMemo(() => {
    return Math.floor(Math.sqrt(xp / 100)) + 1;
  }, [xp]);

  const xpNeededForNextLevel = useMemo(() => {
    const nextLevel = level + 1;
    return Math.pow(nextLevel - 1, 2) * 100;
  }, [level]);

  const xpForCurrentLevel = useMemo(() => {
    return Math.pow(level - 1, 2) * 100;
  }, [level]);

  const xpProgressInLevel = xp - xpForCurrentLevel;
  const xpNeededInLevel = xpNeededForNextLevel - xpForCurrentLevel;
  const progressPercentage = Math.round((xpProgressInLevel / xpNeededInLevel) * 100);

  // Total balance
  const totalBalance = useMemo(() => {
    return wallets.reduce((sum, w) => sum + w.balance, 0);
  }, [wallets]);

  // Spending for categories
  const categorySpent = useMemo(() => {
    const spent: { [key: string]: number } = {};
    journals
      .filter(j => !j.isReversed)
      .forEach(j => {
        j.lines.forEach(l => {
          if (l.categoryId && l.type === 'DEBIT') {
            spent[l.categoryId] = (spent[l.categoryId] || 0) + l.amount;
          }
        });
      });
    return spent;
  }, [journals]);

  // Streak calculations
  const transactionDates = useMemo(() => {
    const dates = journals
      .filter(j => !j.isReversed)
      .map(j => new Date(j.date).toDateString());
    return Array.from(new Set(dates)).map(d => new Date(d));
  }, [journals]);

  const currentStreak = useMemo(() => {
    if (transactionDates.length === 0) return 0;
    const sorted = [...transactionDates].sort((a, b) => b.getTime() - a.getTime());
    
    let streak = 0;
    let today = new Date();
    today.setHours(0,0,0,0);
    
    let lastDate = sorted[0];
    lastDate.setHours(0,0,0,0);
    
    // If last transaction is older than yesterday, streak is broken
    const diffTime = Math.abs(today.getTime() - lastDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > 1) return 0;

    streak = 1;
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      const diff = (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24);
      if (diff === 1) {
        streak++;
      } else if (diff > 1) {
        break;
      }
    }
    return streak;
  }, [transactionDates]);

  // Badges Definitions
  const badgesList = useMemo(() => {
    const isIndo = language === 'id';
    return [
      {
        id: 'smart_saver',
        title: isIndo ? 'Smart Saver' : 'Smart Saver',
        desc: isIndo ? 'Mulai menabung untuk target masa depan Anda.' : 'Allocate money to a savings goal for the first time.',
        icon: Target,
        color: 'text-success bg-success/15 border-success/30 shadow-[0_0_15px_rgba(16,185,129,0.15)]',
        unlocked: goals.some(g => g.currentAmount > 0),
      },
      {
        id: 'budget_master',
        title: isIndo ? 'Budget Master' : 'Budget Master',
        desc: isIndo ? 'Menjaga semua batas anggaran bulanan tetap aman.' : 'Maintain all categories within their budget limits.',
        icon: ShieldAlert,
        color: 'text-primary bg-primary/15 border-primary/30 shadow-[0_0_15px_rgba(59,130,246,0.15)]',
        unlocked: categories.some(c => c.budgetLimit > 0) && categories.filter(c => c.budgetLimit > 0).every(c => (categorySpent[c.id] || 0) <= c.budgetLimit),
      },
      {
        id: 'scan_wizard',
        title: isIndo ? 'Scan Wizard' : 'Scan Wizard',
        desc: isIndo ? 'Berhasil memindai struk belanja dengan AI.' : 'Scan a receipt or record an expense using the AI Assistant.',
        icon: Camera,
        color: 'text-secondary bg-secondary/15 border-secondary/30 shadow-[0_0_15px_rgba(139,92,246,0.15)]',
        unlocked: journals.some(j => j.note && j.note.includes('AI')),
      },
      {
        id: 'wealth_builder',
        title: isIndo ? 'Wealth Builder' : 'Wealth Builder',
        desc: isIndo ? 'Miliki total saldo di atas Rp 10.000.000.' : 'Accumulate a total wallet balance exceeding Rp 10,000,000.',
        icon: Coins,
        color: 'text-amber-500 bg-amber-500/15 border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.15)]',
        unlocked: totalBalance >= 10000000,
      },
      {
        id: 'pro_investor',
        title: isIndo ? 'Perencana Ulung' : 'Pro Investor',
        desc: isIndo ? 'Miliki minimal 3 target tabungan aktif.' : 'Create and maintain at least 3 active savings goals.',
        icon: Sparkles,
        color: 'text-tertiary bg-tertiary/15 border-tertiary/30 shadow-[0_0_15px_rgba(236,72,153,0.15)]',
        unlocked: goals.length >= 3,
      },
      {
        id: 'streak_starter',
        title: isIndo ? 'Streak Starter' : 'Streak Starter',
        desc: isIndo ? 'Mencatat transaksi selama 3 hari berurutan.' : 'Log transactions for at least 3 consecutive days.',
        icon: Flame,
        color: 'text-orange-500 bg-orange-500/15 border-orange-500/30 shadow-[0_0_15px_rgba(249,115,22,0.15)]',
        unlocked: currentStreak >= 3,
      },
    ];
  }, [goals, categories, categorySpent, journals, totalBalance, currentStreak, language]);

  const unlockedCount = useMemo(() => {
    return badgesList.filter(b => b.unlocked).length;
  }, [badgesList]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-10"
    >
      {/* Achievements Banner */}
      <div className="glass rounded-[24px] lg:rounded-[32px] p-6 lg:p-8 flex flex-col md:flex-row gap-6 justify-between items-center relative overflow-hidden">
        <div className="space-y-2 text-center md:text-left z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-secondary/20 to-primary/20 text-secondary border border-secondary/20 text-[10px] font-bold uppercase tracking-wider">
            <Trophy size={12} />
            {language === 'id' ? 'Lencana & Pencapaian' : 'Achievements & Level'}
          </div>
          <h1 className="font-display text-2xl lg:text-4xl font-bold text-on-surface tracking-tight">
            {language === 'id' ? 'Ksatria Finansial Cerdas' : 'Financial Champion'}
          </h1>
          <p className="text-xs text-on-surface/50 max-w-lg">
            {language === 'id'
              ? 'Tingkatkan level keuangan Anda dengan rajin mencatat pengeluaran, konsisten menabung, dan disiplin menjaga anggaran!'
              : 'Level up your financial status by logging expenses, saving consistently, and disciplining your budget!'}
          </p>
        </div>

        {/* Level Stats Big Card */}
        <div className="glass bg-on-surface/5 p-6 rounded-2xl border border-on-surface/10 flex items-center gap-5 w-full md:w-auto md:min-w-[280px] z-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-secondary to-primary flex items-center justify-center text-white shadow-[0_4px_20px_rgba(139,92,246,0.3)]">
            <span className="font-display text-2xl font-bold">Lvl {level}</span>
          </div>
          <div className="flex-1 space-y-1.5">
            <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-on-surface/60">
              <span>{xp} XP Total</span>
              <span>{progressPercentage}%</span>
            </div>
            <div className="w-full bg-on-surface/5 h-2.5 rounded-full overflow-hidden border border-on-surface/5">
              <div
                className="bg-gradient-to-r from-secondary to-primary h-full rounded-full transition-all duration-700 shadow-[0_0_10px_rgba(139,92,246,0.5)]"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <p className="text-[10px] text-on-surface/40">
              {xpProgressInLevel} / {xpNeededInLevel} XP {language === 'id' ? 'untuk naik level' : 'to next level'}
            </p>
          </div>
        </div>

        {/* Abstract glowing accents */}
        <div className="absolute right-[-100px] top-[-50px] w-64 h-64 bg-secondary/10 rounded-full blur-[80px] pointer-events-none" />
      </div>

      {/* Streaks & Badges Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Streak card */}
        <div className="glass rounded-[24px] p-6 flex items-center justify-between group hover:bg-on-surface/[0.04] transition-all duration-300">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface/40">
              {language === 'id' ? 'UNTUNG HARI' : 'TRANSACTION STREAK'}
            </span>
            <div className="font-display text-2xl lg:text-3xl font-bold text-on-surface flex items-center gap-2">
              <Flame size={28} className={cn("transition-transform duration-500", currentStreak > 0 ? "text-orange-500 scale-110 animate-pulse" : "text-on-surface/20")} />
              {currentStreak} {language === 'id' ? 'Hari' : 'Days'}
            </div>
            <p className="text-[10px] text-on-surface/40 mt-1">
              {currentStreak > 0
                ? (language === 'id' ? 'Jaga rekor mencatat Anda tetap menyala! 🔥' : 'Keep your entry streak burning! 🔥')
                : (language === 'id' ? 'Mulai mencatat hari ini untuk streak!' : 'Log today to start your streak!')}
            </p>
          </div>
        </div>

        {/* Unlocked Badges count */}
        <div className="glass rounded-[24px] p-6 flex items-center justify-between group hover:bg-on-surface/[0.04] transition-all duration-300">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface/40">
              {language === 'id' ? 'LENCANA TERBUKA' : 'BADGES EARNED'}
            </span>
            <div className="font-display text-2xl lg:text-3xl font-bold text-on-surface flex items-center gap-2">
              <Award size={28} className="text-amber-500 animate-bounce" />
              {unlockedCount} / {badgesList.length}
            </div>
            <p className="text-[10px] text-on-surface/40 mt-1">
              {language === 'id'
                ? `Terbuka ${Math.round((unlockedCount / badgesList.length) * 100)}% dari total lencana`
                : `${Math.round((unlockedCount / badgesList.length) * 100)}% of total achievements unlocked`}
            </p>
          </div>
        </div>

        {/* Level bonus modifier */}
        <div className="glass rounded-[24px] p-6 flex items-center justify-between group hover:bg-on-surface/[0.04] transition-all duration-300">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface/40">
              {language === 'id' ? 'MODIFIER LEVEL' : 'BONUS MULTIPLIER'}
            </span>
            <div className="font-display text-2xl lg:text-3xl font-bold text-on-surface flex items-center gap-2">
              <Zap size={28} className="text-secondary animate-pulse" />
              {(1 + level * 0.1).toFixed(1)}x
            </div>
            <p className="text-[10px] text-on-surface/40 mt-1">
              {language === 'id' ? 'Menggandakan XP dari input struk selanjutnya!' : 'Boosts your XP yields for subsequent inputs!'}
            </p>
          </div>
        </div>
      </div>

      {/* Badges Grid list */}
      <div className="space-y-6">
        <h3 className="font-display text-lg font-bold text-on-surface uppercase tracking-widest flex items-center gap-2">
          <Award size={18} />
          {language === 'id' ? 'Galeri Lencana Kehormatan' : 'Badges of Honor'}
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {badgesList.map((badge, idx) => {
            const BadgeIcon = badge.icon;
            return (
              <motion.div
                key={badge.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
                className={cn(
                  "glass rounded-3xl p-6 border relative overflow-hidden flex flex-col justify-between min-h-[200px] transition-all duration-300",
                  badge.unlocked
                    ? "border-on-surface/10 hover:border-secondary/30 hover:scale-[1.03] shadow-md"
                    : "border-on-surface/5 opacity-55 saturate-[0.1]"
                )}
              >
                {/* Badge Header: Icon + status */}
                <div className="flex justify-between items-start">
                  <div className={cn("p-4 rounded-2xl border", badge.unlocked ? badge.color : "text-on-surface/30 bg-on-surface/5 border-on-surface/10")}>
                    <BadgeIcon size={24} />
                  </div>
                  {badge.unlocked ? (
                    <span className="text-[9px] font-bold bg-success/10 text-success border border-success/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle size={10} />
                      {language === 'id' ? 'TERBUKA' : 'UNLOCKED'}
                    </span>
                  ) : (
                    <span className="text-[9px] font-bold bg-on-surface/5 text-on-surface/40 border border-on-surface/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Lock size={10} />
                      {language === 'id' ? 'TERKUNCI' : 'LOCKED'}
                    </span>
                  )}
                </div>

                {/* Badge details */}
                <div className="space-y-1 mt-6">
                  <h4 className="font-display text-sm font-bold text-on-surface">{badge.title}</h4>
                  <p className="text-[11px] text-on-surface/50 leading-relaxed">{badge.desc}</p>
                </div>

                {/* Decorative unlocked glow behind icon */}
                {badge.unlocked && (
                  <div className="absolute right-[-20px] bottom-[-20px] w-24 h-24 bg-secondary/5 rounded-full blur-[20px] pointer-events-none" />
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
