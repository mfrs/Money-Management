import React, { useState } from 'react';
import {
  Plus,
  MoreVertical,
  TrendingUp,
  Trash2,
  Edit3,
  X,
  Save,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatCurrencyShort, Wallet } from '../lib/types';
import { getIcon } from '../lib/icons';
import ConfirmDialog from '../components/ConfirmDialog';

const walletTypes = [
  { value: 'bank', label: 'Bank Account' },
  { value: 'ewallet', label: 'E-Wallet' },
  { value: 'cash', label: 'Cash' },
  { value: 'savings', label: 'Savings' },
];

const walletColors = ['#005AA9', '#00A5CF', '#9CA3AF', '#F2A900', '#22C55E', '#8B5CF6', '#EC4899', '#EF4444'];

export default function WalletsView() {
  const { wallets, totalBalance, addWallet, updateWallet, deleteWallet, journals } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<Wallet['type']>('bank');
  const [formAccount, setFormAccount] = useState('');
  const [formBalance, setFormBalance] = useState('');
  const [formColor, setFormColor] = useState(walletColors[0]);
  const [formGoal, setFormGoal] = useState('');

  const resetForm = () => {
    setFormName('');
    setFormType('bank');
    setFormAccount('');
    setFormBalance('');
    setFormColor(walletColors[0]);
    setFormGoal('');
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (wallet: Wallet) => {
    setFormName(wallet.name);
    setFormType(wallet.type);
    setFormAccount(wallet.account);
    setFormBalance(wallet.balance.toString());
    setFormColor(wallet.color);
    setFormGoal(wallet.goal?.toString() || '');
    setEditingId(wallet.id);
    setShowForm(true);
    setMenuOpenId(null);
  };

  const handleSubmit = () => {
    if (!formName.trim()) return;
    const walletData = {
      name: formName,
      type: formType,
      account: formAccount,
      balance: parseFloat(formBalance) || 0,
      icon: formType === 'bank' ? 'Landmark' : formType === 'ewallet' ? 'Smartphone' : formType === 'savings' ? 'PiggyBank' : 'Wallet',
      color: formColor,
      goal: formGoal ? parseFloat(formGoal) : undefined,
    };
    if (editingId) {
      updateWallet(editingId, walletData);
    } else {
      addWallet(walletData);
    }
    resetForm();
  };

  // Liquidity = non-savings wallets
  const liquidity = wallets.filter(w => w.type !== 'savings').reduce((s, w) => s + w.balance, 0);
  const allocated = wallets.filter(w => w.type === 'savings').reduce((s, w) => s + w.balance, 0);

  // Last journal per wallet
  const getLastActivity = (walletId: string) => {
    const j = journals
      .filter(j => j.lines.some(l => l.walletId === walletId))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
      
    if (!j) return { name: 'No activity', change: '' };
    
    const netChange = j.lines
      .filter(l => l.walletId === walletId)
      .reduce((sum, l) => sum + (l.type === 'DEBIT' ? l.amount : -l.amount), 0);
      
    return {
      name: j.description,
      change: `${netChange >= 0 ? '+' : ''}${formatCurrency(netChange)}`,
      isNegative: netChange < 0,
    };
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-10 pb-10"
    >
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
        <div>
          <h2 className="font-display text-3xl lg:text-4xl font-bold text-on-surface tracking-tight">Vaults</h2>
          <p className="text-sm text-on-surface/40 mt-3 max-w-lg leading-relaxed uppercase tracking-widest font-medium">
            Manage your liquid assets and capital distribution across all connected wallets.
          </p>
        </div>
        <button
          id="btn-create-wallet"
          onClick={() => { resetForm(); setShowForm(true); }}
          className="bg-on-surface/5 text-on-surface font-bold text-[10px] uppercase tracking-widest px-8 py-3.5 rounded-full border border-on-surface/10 hover:bg-on-surface/10 transition-all flex items-center gap-3 active:scale-95"
        >
          <Plus size={16} />
          Create Vault
        </button>
      </header>

      {/* Aggregate Overview */}
      <section className="glass rounded-[24px] lg:rounded-[32px] p-8 lg:p-10 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none transition-all duration-700" />
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
          <div className="space-y-6">
            <p className="text-[10px] font-bold text-on-surface/30 uppercase tracking-[0.3em] mb-2">Aggregate Capital</p>
            <h3 className="font-display text-4xl md:text-5xl lg:text-7xl font-bold text-on-surface tracking-tighter">{formatCurrency(totalBalance)}</h3>
            <div className="flex items-center gap-2 text-[10px] font-bold text-primary bg-primary/10 w-fit px-4 py-2 rounded-full border border-primary/20 uppercase tracking-widest">
              <TrendingUp size={14} />
              <span>{wallets.length} Vaults Active</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 w-full md:w-auto">
            <div className="flex-1 md:flex-none glass-dark rounded-2xl p-6 min-w-[160px] border border-on-surface/5 group-hover:border-on-surface/10 transition-colors">
              <p className="text-[10px] font-bold text-on-surface/30 uppercase tracking-widest mb-3">Liquidity</p>
              <p className="font-display text-xl lg:text-2xl font-bold text-on-surface tracking-tight">{formatCurrencyShort(liquidity)}</p>
            </div>
            <div className="flex-1 md:flex-none glass-dark rounded-2xl p-6 min-w-[160px] border border-on-surface/5 group-hover:border-on-surface/10 transition-colors">
              <p className="text-[10px] font-bold text-on-surface/30 uppercase tracking-widest mb-3">Allocated</p>
              <p className="font-display text-xl lg:text-2xl font-bold text-on-surface tracking-tight">{formatCurrencyShort(allocated)}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Wallet Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8">
        {wallets.map((wallet) => {
          const IconComp = getIcon(wallet.icon);
          const activity = getLastActivity(wallet.id);
          const progress = wallet.goal ? Math.round((wallet.balance / wallet.goal) * 100) : undefined;

          return (
            <motion.article
              key={wallet.id}
              whileHover={{ y: -8 }}
              className="glass rounded-[28px] p-6 lg:p-8 flex flex-col hover:bg-on-surface/[0.06] transition-all duration-300 relative overflow-hidden group"
            >
              <div className="flex justify-between items-start mb-8 lg:mb-10 relative z-10">
                <div className="flex items-center gap-4 lg:gap-5">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center border border-on-surface/10 glass-dark" style={{ backgroundColor: `${wallet.color}15` }}>
                    <IconComp size={22} style={{ color: wallet.color }} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-on-surface leading-none uppercase tracking-widest">{wallet.name}</h4>
                    <p className="text-[9px] font-bold text-on-surface/30 uppercase tracking-[0.2em] mt-2">
                      {walletTypes.find(t => t.value === wallet.type)?.label}
                    </p>
                  </div>
                </div>
                <div className="relative">
                  <button
                    onClick={() => setMenuOpenId(menuOpenId === wallet.id ? null : wallet.id)}
                    className="text-on-surface/20 hover:text-on-surface transition-colors p-2"
                  >
                    <MoreVertical size={18} />
                  </button>
                  <AnimatePresence>
                    {menuOpenId === wallet.id && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="absolute right-0 top-10 glass rounded-xl border border-on-surface/10 py-2 min-w-[140px] z-20"
                      >
                        <button
                          onClick={() => startEdit(wallet)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-on-surface/60 hover:text-on-surface hover:bg-on-surface/5 transition-all"
                        >
                          <Edit3 size={14} /> Edit
                        </button>
                        <button
                          onClick={() => { setDeleteId(wallet.id); setMenuOpenId(null); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-error hover:bg-error/5 transition-all"
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="mb-8 lg:mb-10 relative z-10">
                <p className="text-[9px] font-bold text-on-surface/20 uppercase tracking-[0.3em] mb-3">{wallet.account}</p>
                <p className="font-display text-2xl lg:text-3xl font-bold text-on-surface tracking-tighter tabular-nums">{formatCurrency(wallet.balance)}</p>
                {progress !== undefined && (
                  <div className="mt-8 space-y-3">
                    <div className="h-1.5 w-full bg-on-surface/5 rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, progress)}%` }} className="h-full bg-primary rounded-full shadow-[0_0_8px_rgba(59,130,246,0.3)]" />
                    </div>
                    <div className="flex justify-between text-[9px] font-bold text-on-surface/20 uppercase tracking-widest">
                      <span>{progress}% goal reached</span>
                      <span className="text-on-surface/40">{formatCurrencyShort(wallet.goal!)}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-auto pt-6 border-t border-on-surface/5 group-hover:border-on-surface/10 transition-colors">
                <p className="text-[9px] font-bold text-on-surface/20 uppercase tracking-widest mb-3">Last Activity</p>
                <div className="flex justify-between items-baseline">
                  <span className="text-xs font-bold text-on-surface/80">{activity.name}</span>
                  {activity.change && (
                    <span className={cn("text-xs font-bold font-mono tracking-tighter", activity.isNegative ? "text-tertiary" : "text-primary")}>
                      {activity.change}
                    </span>
                  )}
                </div>
              </div>
            </motion.article>
          );
        })}
      </div>

      {/* Add/Edit Form Modal */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={resetForm}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="glass rounded-[32px] p-8 lg:p-10 w-full max-w-md relative z-10 border border-on-surface/10 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="font-display text-xl font-bold text-on-surface">{editingId ? 'Edit Vault' : 'Create Vault'}</h3>
                <button onClick={resetForm} className="text-on-surface/30 hover:text-on-surface transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-on-surface/30 uppercase tracking-[0.2em] ml-1">Name</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. BCA Primary"
                    className="w-full px-5 py-4 bg-on-surface/5 border border-on-surface/5 rounded-2xl text-sm font-bold text-on-surface focus:outline-none focus:border-on-surface/20 transition-all placeholder:text-on-surface/15"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-on-surface/30 uppercase tracking-[0.2em] ml-1">Type</label>
                    <select
                      value={formType}
                      onChange={(e) => setFormType(e.target.value as Wallet['type'])}
                      className="w-full px-5 py-4 bg-on-surface/5 border border-on-surface/5 rounded-2xl text-xs font-bold text-on-surface focus:outline-none focus:border-on-surface/20 transition-all appearance-none cursor-pointer uppercase tracking-widest"
                    >
                      {walletTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-on-surface/30 uppercase tracking-[0.2em] ml-1">Account</label>
                    <input
                      type="text"
                      value={formAccount}
                      onChange={(e) => setFormAccount(e.target.value)}
                      placeholder="**** 1234"
                      className="w-full px-5 py-4 bg-on-surface/5 border border-on-surface/5 rounded-2xl text-sm font-bold text-on-surface focus:outline-none focus:border-on-surface/20 transition-all placeholder:text-on-surface/15"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-on-surface/30 uppercase tracking-[0.2em] ml-1">Initial Balance</label>
                  <div className="relative">
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-on-surface/20 font-bold">Rp</span>
                    <input
                      type="number"
                      value={formBalance}
                      onChange={(e) => setFormBalance(e.target.value)}
                      placeholder="0"
                      className="w-full pl-12 pr-5 py-4 bg-on-surface/5 border border-on-surface/5 rounded-2xl text-sm font-bold text-on-surface focus:outline-none focus:border-on-surface/20 transition-all placeholder:text-on-surface/15"
                    />
                  </div>
                </div>

                {formType === 'savings' && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-on-surface/30 uppercase tracking-[0.2em] ml-1">Goal Amount</label>
                    <div className="relative">
                      <span className="absolute left-5 top-1/2 -translate-y-1/2 text-on-surface/20 font-bold">Rp</span>
                      <input
                        type="number"
                        value={formGoal}
                        onChange={(e) => setFormGoal(e.target.value)}
                        placeholder="0"
                        className="w-full pl-12 pr-5 py-4 bg-on-surface/5 border border-on-surface/5 rounded-2xl text-sm font-bold text-on-surface focus:outline-none focus:border-on-surface/20 transition-all placeholder:text-on-surface/15"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-on-surface/30 uppercase tracking-[0.2em] ml-1">Color</label>
                  <div className="flex gap-3 flex-wrap">
                    {walletColors.map(color => (
                      <button
                        key={color}
                        onClick={() => setFormColor(color)}
                        className={cn(
                          "w-9 h-9 rounded-xl transition-all",
                          formColor === color ? "ring-2 ring-on-surface ring-offset-2 ring-offset-[#0d0f14] scale-110" : "opacity-60 hover:opacity-100"
                        )}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={!formName.trim()}
                  className="w-full py-5 bg-primary text-on-surface text-sm font-bold uppercase tracking-widest rounded-2xl hover:bg-primary/80 transition-all shadow-lg active:scale-95 duration-200 disabled:opacity-30 disabled:cursor-not-allowed mt-4 flex items-center justify-center gap-3"
                >
                  <Save size={16} />
                  {editingId ? 'Update Vault' : 'Create Vault'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteId}
        title="Delete Vault"
        message="This will permanently delete this vault and all its associated journals. This action cannot be undone."
        onConfirm={() => { if (deleteId) deleteWallet(deleteId); setDeleteId(null); }}
        onCancel={() => setDeleteId(null)}
      />
    </motion.div>
  );
}
