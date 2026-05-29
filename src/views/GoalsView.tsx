import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Target, CheckCircle, Clock, Trash2, Edit2, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatCurrencyShort } from '../lib/types';
import { cn, getLocalDateString } from '../lib/utils';
import { getIcon } from '../lib/icons';

export default function GoalsView() {
  const { goals, addGoal, updateGoal, deleteGoal, t, language } = useApp();
  const [isAdding, setIsAdding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [color, setColor] = useState('#10B981');

  const openAdd = () => {
    setName('');
    setTargetAmount('');
    setCurrentAmount('');
    setDeadline('');
    setColor('#10B981');
    setEditingId(null);
    setIsAdding(true);
  };

  const openEdit = (goal: any) => {
    setName(goal.name);
    setTargetAmount(goal.targetAmount.toString());
    setCurrentAmount(goal.currentAmount.toString());
    setDeadline(goal.deadline ? getLocalDateString(goal.deadline) : '');
    setColor(goal.color);
    setEditingId(goal.id);
    setIsAdding(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !targetAmount || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const data = {
        name,
        targetAmount: parseFloat(targetAmount) || 0,
        currentAmount: parseFloat(currentAmount) || 0,
        deadline: deadline || undefined,
        icon: 'Target',
        color,
      };

      if (editingId) {
        await updateGoal(editingId, data);
      } else {
        await addGoal(data as any);
      }
      setIsAdding(false);
    } catch (err) {
      console.error('Failed to save goal', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-10"
    >
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 px-2">
        <div>
          <h2 className="font-display text-3xl lg:text-4xl font-bold text-on-surface tracking-tighter uppercase">{t('goals.title')}</h2>
          <p className="text-on-surface/40 mt-3 text-sm uppercase tracking-widest font-medium">{t('goals.subtitle')}</p>
        </div>
        <button
          onClick={openAdd}
          className="bg-primary text-on-surface px-6 py-3 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-primary/80 transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] flex items-center gap-2"
        >
          <Plus size={16} /> {t('goals.new')}
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {goals.map((goal) => {
          const progress = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
          const isComplete = progress >= 100;

          return (
            <div key={goal.id} className="glass rounded-[32px] p-8 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 opacity-20 blur-[40px] pointer-events-none transition-all duration-500 group-hover:opacity-40" style={{ backgroundColor: goal.color }} />
              
              <div className="flex justify-between items-start mb-6">
                <div className="w-14 h-14 rounded-2xl glass-dark flex items-center justify-center border border-on-surface/5" style={{ color: goal.color }}>
                  <Target size={24} />
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(goal)} className="p-2 text-on-surface/40 hover:text-on-surface bg-surface-container rounded-xl transition-colors">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => deleteGoal(goal.id)} className="p-2 text-on-surface/40 hover:text-error bg-surface-container rounded-xl transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-lg text-on-surface uppercase tracking-widest mb-1">{goal.name}</h3>
                {goal.deadline && (
                  <p className="text-xs text-on-surface/40 uppercase tracking-widest flex items-center gap-1.5 mb-6">
                    <Clock size={12} /> by {new Date(goal.deadline).toLocaleDateString()}
                  </p>
                )}
                {!goal.deadline && <div className="h-6 mb-6" />}
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-display font-bold tabular-nums text-on-surface tracking-tighter">
                      {formatCurrencyShort(goal.currentAmount)}
                    </span>
                    <span className="text-sm font-bold text-on-surface/60 tabular-nums">
                      {progress}%
                    </span>
                  </div>
                  <span className="text-xs font-bold text-on-surface/40 uppercase tracking-widest tabular-nums">
                    / {formatCurrencyShort(goal.targetAmount)}
                  </span>
                </div>
                
                <div className="w-full h-2 bg-on-surface/5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className="h-full rounded-full relative"
                    style={{ backgroundColor: goal.color }}
                  >
                    {isComplete && <div className="absolute inset-0 bg-white/30" />}
                  </motion.div>
                </div>
              </div>

              {isComplete && (
                <div className="absolute bottom-6 right-6 text-green-400 bg-green-400/10 p-1 rounded-full">
                  <CheckCircle size={20} />
                </div>
              )}
            </div>
          );
        })}

        {goals.length === 0 && (
          <div className="col-span-full py-20 text-center glass rounded-[32px] border-dashed border-2 border-on-surface/10">
            <Target size={48} className="mx-auto text-on-surface/20 mb-4" />
            <h3 className="font-bold text-lg text-on-surface uppercase tracking-widest mb-2">{t('goals.empty')}</h3>
            <p className="text-sm text-on-surface/40 font-medium max-w-md mx-auto">{t('goals.emptySub')}</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center p-0 lg:p-4 bg-black/60 ">
            <motion.div
              initial={{ opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "100%" }}
              className="w-full max-w-md glass-dark rounded-t-[32px] lg:rounded-[32px] p-8 pb-[max(2rem,env(safe-area-inset-bottom))] lg:pb-8 border-t lg:border border-on-surface/10 shadow-[0_-10px_40px_rgba(0,0,0,0.3)] lg:shadow-2xl relative"
            >
              <button onClick={() => setIsAdding(false)} className="absolute top-6 right-6 text-on-surface/40 hover:text-on-surface">
                <X size={20} />
              </button>
              
              <h3 className="font-display text-2xl font-bold text-on-surface tracking-tighter uppercase mb-8">
                {editingId ? t('goals.edit') : t('goals.new')}
              </h3>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-on-surface/30 uppercase tracking-[0.2em] ml-1">{t('goals.name')}</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Dream Vacation"
                    className="w-full px-5 py-4 bg-th-input border border-th-input rounded-2xl text-sm font-bold text-on-surface focus:outline-none focus:border-th-input-focus transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-on-surface/30 uppercase tracking-[0.2em] ml-1">{t('goals.target')}</label>
                    <input
                      type="number"
                      required
                      value={targetAmount}
                      onChange={(e) => setTargetAmount(e.target.value)}
                      placeholder="0"
                      className="w-full px-5 py-4 bg-th-input border border-th-input rounded-2xl text-sm font-bold text-on-surface focus:outline-none focus:border-th-input-focus transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-on-surface/30 uppercase tracking-[0.2em] ml-1">{t('goals.current')}</label>
                    <input
                      type="number"
                      value={currentAmount}
                      onChange={(e) => setCurrentAmount(e.target.value)}
                      placeholder="0"
                      className="w-full px-5 py-4 bg-th-input border border-th-input rounded-2xl text-sm font-bold text-on-surface focus:outline-none focus:border-th-input-focus transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-on-surface/30 uppercase tracking-[0.2em] ml-1">{t('goals.deadline')}</label>
                    <input
                      type="date"
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                      className="w-full px-5 py-4 bg-th-input border border-th-input rounded-2xl text-sm font-bold text-on-surface focus:outline-none focus:border-th-input-focus transition-all [color-scheme:dark]"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-on-surface/30 uppercase tracking-[0.2em] ml-1">{t('goals.color')}</label>
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-full h-14 p-1 bg-th-input border border-th-input rounded-2xl cursor-pointer"
                    />
                  </div>
                </div>

                <button disabled={isSubmitting} type="submit" className="w-full py-4 mt-4 bg-primary text-on-surface rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-primary/90 transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed">
                  {isSubmitting ? (language === 'id' ? 'Menyimpan...' : 'Saving...') : (editingId ? t('goals.update') : t('goals.save'))}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
