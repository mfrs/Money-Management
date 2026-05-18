import React, { useState } from 'react';
import {
  Plus,
  Filter,
  Edit3,
  X,
  Save,
  Trash2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useApp } from '../context/AppContext';
import { formatCurrency, Category } from '../lib/types';
import { getIcon, availableIcons } from '../lib/icons';
import ConfirmDialog from '../components/ConfirmDialog';

const categoryColors = ['#EF4444', '#F59E0B', '#4EDEA3', '#8B5CF6', '#06B6D4', '#3B82F6', '#EC4899', '#F97316', '#22C55E', '#14B8A6', '#6366F1'];

export default function CategoriesView() {
  const { categories, addCategory, updateCategory, deleteCategory, getCategorySpent } = useApp();
  const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formIcon, setFormIcon] = useState('Utensils');
  const [formColor, setFormColor] = useState(categoryColors[0]);
  const [formBudget, setFormBudget] = useState('');

  const filteredCategories = categories.filter(c => c.type === activeTab);

  const resetForm = () => {
    setFormName('');
    setFormIcon('Utensils');
    setFormColor(categoryColors[0]);
    setFormBudget('');
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (cat: Category) => {
    setFormName(cat.name);
    setFormIcon(cat.icon);
    setFormColor(cat.color);
    setFormBudget(cat.budgetLimit > 0 ? cat.budgetLimit.toString() : '');
    setEditingId(cat.id);
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!formName.trim()) return;
    const data = {
      name: formName,
      type: activeTab as 'expense' | 'income',
      icon: formIcon,
      color: formColor,
      budgetLimit: parseFloat(formBudget) || 0,
    };
    if (editingId) {
      updateCategory(editingId, data);
    } else {
      addCategory(data);
    }
    resetForm();
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-8 pb-10"
    >
      <header className="flex flex-col md:flex-row md:items-end justify-between border-b border-on-surface/5 pb-8 lg:pb-10 gap-6 px-2">
        <div className="space-y-4">
          <h2 className="font-display text-4xl lg:text-5xl font-extrabold text-on-surface tracking-tighter uppercase">Categories</h2>
          <p className="text-sm text-on-surface/30 leading-relaxed max-w-xl font-medium uppercase tracking-widest">
            Define your spending and income categories to track and control your finances.
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="px-8 lg:px-10 py-3.5 bg-primary text-on-surface text-[10px] font-bold uppercase tracking-[0.3em] rounded-full hover:bg-primary/90 transition-all shadow-[0_0_20px_rgba(59,130,246,0.2)] flex items-center gap-3 active:scale-95 duration-200"
        >
          <Plus size={18} />
          New Category
        </button>
      </header>

      {/* Tab Toggle */}
      <div className="flex items-center glass-dark rounded-full p-1.5 border border-on-surface/5 shadow-inner w-fit backdrop-blur-xl">
        <button
          onClick={() => setActiveTab('expense')}
          className={cn(
            "px-8 lg:px-12 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all",
            activeTab === 'expense' ? "bg-on-surface text-surface shadow-lg" : "text-on-surface/30 hover:text-on-surface"
          )}
        >
          Expenses
        </button>
        <button
          onClick={() => setActiveTab('income')}
          className={cn(
            "px-8 lg:px-12 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all",
            activeTab === 'income' ? "bg-on-surface text-surface shadow-lg" : "text-on-surface/30 hover:text-on-surface"
          )}
        >
          Income
        </button>
      </div>

      {/* Category Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-8">
        {filteredCategories.map((cat) => {
          const IconComp = getIcon(cat.icon);
          const spent = getCategorySpent(cat.id);
          const progress = cat.budgetLimit > 0 ? Math.round((spent / cat.budgetLimit) * 100) : 0;

          return (
            <motion.div
              key={cat.id}
              whileHover={{ y: -10, scale: 1.02 }}
              className="glass rounded-[24px] lg:rounded-[32px] p-6 lg:p-8 flex flex-col gap-8 lg:gap-10 group transition-all duration-500 border border-on-surface/5 hover:border-on-surface/20 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-on-surface/[0.02] rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:bg-primary/10 transition-all duration-700" />

              <div className="flex justify-between items-start relative z-10">
                <div className="w-14 h-14 lg:w-16 lg:h-16 rounded-2xl flex items-center justify-center glass-dark border border-on-surface/10 group-hover:scale-110 transition-all duration-500" style={{ color: cat.color }}>
                  <IconComp size={24} />
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => startEdit(cat)}
                    className="w-9 h-9 lg:w-10 lg:h-10 flex items-center justify-center rounded-xl glass-dark border border-on-surface/5 text-on-surface/20 hover:bg-on-surface/10 hover:text-on-surface transition-all"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button
                    onClick={() => setDeleteId(cat.id)}
                    className="w-9 h-9 lg:w-10 lg:h-10 flex items-center justify-center rounded-xl glass-dark border border-on-surface/5 text-on-surface/20 hover:bg-error/10 hover:text-error transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="space-y-4 relative z-10">
                <h3 className="font-display text-xl lg:text-2xl font-bold text-on-surface tracking-tighter uppercase">{cat.name}</h3>
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: cat.color }} />
                  <p className="text-[9px] font-bold text-on-surface/30 uppercase tracking-[0.3em] font-mono">{cat.type} CATEGORY</p>
                </div>
              </div>

              {cat.budgetLimit > 0 ? (
                <div className="mt-auto pt-6 lg:pt-8 border-t border-on-surface/5 relative z-10 space-y-4">
                  <div className="flex justify-between items-end">
                    <div>
                      <span className="text-[9px] font-bold text-on-surface/25 uppercase tracking-[0.25em] block mb-1">
                        Spent
                      </span>
                      <span className="font-display text-base lg:text-lg font-extrabold text-on-surface tracking-tight tabular-nums">
                        {formatCurrency(spent)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] font-bold text-on-surface/25 uppercase tracking-[0.25em] block mb-1">
                        Limit
                      </span>
                      <span className="font-display text-xs lg:text-sm font-semibold text-on-surface/50 tracking-tight tabular-nums">
                        {formatCurrency(cat.budgetLimit)}/mo
                      </span>
                    </div>
                  </div>
                  
                  <div className="w-full h-2 bg-on-surface/5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, progress)}%` }}
                      className="h-full rounded-full transition-all duration-1000"
                      style={{ backgroundColor: progress > 80 ? '#EF4444' : cat.color }}
                    />
                  </div>
                  
                  <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-wider">
                    <span className={cn(progress > 80 ? "text-error" : "text-on-surface/40")}>
                      {progress}%
                    </span>
                    {spent > cat.budgetLimit ? (
                      <span className="text-error font-extrabold">
                        {formatCurrency(spent - cat.budgetLimit)} Over Limit ⚠️
                      </span>
                    ) : (
                      <span className="text-success/75 font-semibold">
                        {formatCurrency(cat.budgetLimit - spent)} Left
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="mt-auto pt-6 lg:pt-8 border-t border-on-surface/5 relative z-10">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-bold text-on-surface/25 uppercase tracking-[0.25em]">
                      {cat.type === 'expense' ? 'Total Spent' : 'Total Earned'}
                    </span>
                    <span className="font-display text-base lg:text-lg font-extrabold text-on-surface tracking-tight tabular-nums">
                      {formatCurrency(spent)}
                    </span>
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}

        {/* Add Card */}
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="glass-dark rounded-[24px] lg:rounded-[32px] border border-dashed border-on-surface/10 p-8 lg:p-10 flex flex-col items-center justify-center gap-6 group hover:border-on-surface/30 hover:bg-on-surface/[0.02] transition-all min-h-[280px] lg:min-h-[340px] relative overflow-hidden"
        >
          <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-2xl glass border border-on-surface/5 flex items-center justify-center text-on-surface/10 group-hover:text-on-surface group-hover:scale-110 transition-all duration-700">
            <Plus size={32} strokeWidth={1} />
          </div>
          <span className="text-[10px] font-bold text-on-surface/20 uppercase tracking-[0.4em] group-hover:text-on-surface transition-all">New Category</span>
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
        </button>
      </div>

      {/* Add/Edit Form Modal */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={resetForm} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="glass rounded-[32px] p-8 lg:p-10 w-full max-w-md relative z-10 border border-on-surface/10 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="font-display text-xl font-bold text-on-surface">{editingId ? 'Edit Category' : 'New Category'}</h3>
                <button onClick={resetForm} className="text-on-surface/30 hover:text-on-surface"><X size={20} /></button>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-on-surface/30 uppercase tracking-[0.2em] ml-1">Name</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Food & Dining"
                    className="w-full px-5 py-4 bg-on-surface/5 border border-on-surface/5 rounded-2xl text-sm font-bold text-on-surface focus:outline-none focus:border-on-surface/20 transition-all placeholder:text-on-surface/15"
                  />
                </div>

                {activeTab === 'expense' && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-on-surface/30 uppercase tracking-[0.2em] ml-1">Monthly Budget Limit</label>
                    <div className="relative">
                      <span className="absolute left-5 top-1/2 -translate-y-1/2 text-on-surface/20 font-bold">Rp</span>
                      <input
                        type="number"
                        value={formBudget}
                        onChange={(e) => setFormBudget(e.target.value)}
                        placeholder="0 (no limit)"
                        className="w-full pl-12 pr-5 py-4 bg-on-surface/5 border border-on-surface/5 rounded-2xl text-sm font-bold text-on-surface focus:outline-none focus:border-on-surface/20 transition-all placeholder:text-on-surface/15"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-on-surface/30 uppercase tracking-[0.2em] ml-1">Color</label>
                  <div className="flex gap-2 flex-wrap">
                    {categoryColors.map(color => (
                      <button
                        key={color}
                        onClick={() => setFormColor(color)}
                        className={cn(
                          "w-8 h-8 rounded-lg transition-all",
                          formColor === color ? "ring-2 ring-on-surface ring-offset-2 ring-offset-[#0d0f14] scale-110" : "opacity-50 hover:opacity-100"
                        )}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-on-surface/30 uppercase tracking-[0.2em] ml-1">Icon</label>
                  <div className="grid grid-cols-8 gap-2 max-h-[200px] overflow-y-auto p-2 bg-on-surface/[0.02] rounded-2xl">
                    {availableIcons.map(iconName => {
                      const Ic = getIcon(iconName);
                      return (
                        <button
                          key={iconName}
                          onClick={() => setFormIcon(iconName)}
                          className={cn(
                            "w-9 h-9 rounded-lg flex items-center justify-center transition-all",
                            formIcon === iconName ? "bg-on-surface/20 text-on-surface ring-1 ring-on-surface/30" : "text-on-surface/30 hover:bg-on-surface/10 hover:text-on-surface"
                          )}
                        >
                          <Ic size={16} />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={!formName.trim()}
                  className="w-full py-5 bg-primary text-on-surface text-sm font-bold uppercase tracking-widest rounded-2xl hover:bg-primary/80 transition-all shadow-lg active:scale-95 duration-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                >
                  <Save size={16} />
                  {editingId ? 'Update Category' : 'Create Category'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        isOpen={!!deleteId}
        title="Delete Category"
        message="This will permanently delete this category. Existing journals using this category will retain their data."
        onConfirm={() => { if (deleteId) deleteCategory(deleteId); setDeleteId(null); }}
        onCancel={() => setDeleteId(null)}
      />
    </motion.div>
  );
}
