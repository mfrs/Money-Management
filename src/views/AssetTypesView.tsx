import React, { useState } from 'react';
import {
  Plus,
  Edit3,
  X,
  Save,
  Trash2,
  Diamond
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';
import ConfirmDialog from '../components/ConfirmDialog';
import { AssetType } from '../lib/types';

export default function AssetTypesView() {
  const { assetTypes, addAssetType, updateAssetType, deleteAssetType, language } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState('');

  const resetForm = () => {
    setFormName('');
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (type: AssetType) => {
    setFormName(type.name);
    setEditingId(type.id);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!formName.trim()) return;
    try {
      if (editingId) {
        updateAssetType(editingId, formName);
      } else {
        addAssetType(formName);
      }
      resetForm();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-8 pb-10"
    >
      <header className="flex flex-col md:flex-row md:items-end justify-between border-b border-on-surface/5 pb-8 lg:pb-10 gap-6 px-2">
        <div className="space-y-4">
          <h2 className="font-display text-4xl lg:text-5xl font-extrabold text-on-surface tracking-tighter uppercase">Asset Types</h2>
          <p className="text-sm text-on-surface/30 leading-relaxed max-w-xl font-medium uppercase tracking-widest">
            Manage categories for your assets and properties.
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="px-8 lg:px-10 py-3.5 bg-primary text-on-surface text-[10px] font-bold uppercase tracking-[0.3em] rounded-full hover:bg-primary/90 transition-all shadow-[0_0_20px_rgba(59,130,246,0.2)] flex items-center gap-3 active:scale-95 duration-200"
        >
          <Plus size={18} />
          New Type
        </button>
      </header>

      {/* Asset Types List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-8">
        {assetTypes.map((type) => (
          <motion.div
            key={type.id}
            whileHover={{ y: -10, scale: 1.02 }}
            className="glass rounded-[24px] lg:rounded-[32px] p-6 lg:p-8 flex flex-col gap-8 lg:gap-10 group transition-all duration-500 border border-on-surface/5 hover:border-on-surface/20 relative overflow-hidden"
          >
            <div className="flex justify-between items-start relative z-10">
              <div className="w-14 h-14 lg:w-16 lg:h-16 rounded-2xl flex items-center justify-center glass-dark border border-on-surface/10 group-hover:scale-110 transition-all duration-500 text-primary">
                <Diamond size={24} />
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => startEdit(type)}
                  className="w-9 h-9 lg:w-10 lg:h-10 flex items-center justify-center rounded-xl glass-dark border border-on-surface/5 text-on-surface/20 hover:bg-on-surface/10 hover:text-on-surface transition-all"
                >
                  <Edit3 size={16} />
                </button>
                {!type.isMandatory && (
                  <button
                    onClick={() => setDeleteId(type.id)}
                    className="w-9 h-9 lg:w-10 lg:h-10 flex items-center justify-center rounded-xl glass-dark border border-on-surface/5 text-on-surface/20 hover:bg-error/10 hover:text-error transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-xl font-bold text-on-surface truncate tracking-tight">{type.name}</h3>
              {type.isMandatory && (
                <span className="text-[10px] font-bold text-on-surface/40 uppercase tracking-widest mt-2 block">System</span>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Form Dialog */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center p-0 lg:p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "100%" }}
              className="w-full max-w-lg glass-dark rounded-t-[32px] lg:rounded-[40px] p-8 lg:p-10 border-t lg:border border-on-surface/10 shadow-[0_-10px_40px_rgba(0,0,0,0.3)] lg:shadow-2xl relative"
            >
              <button
                onClick={resetForm}
                className="absolute top-6 lg:top-8 right-6 lg:right-8 w-10 h-10 flex items-center justify-center rounded-full glass border border-on-surface/5 text-on-surface/40 hover:text-on-surface transition-all"
              >
                <X size={20} />
              </button>

              <h3 className="font-display text-2xl lg:text-3xl font-bold text-on-surface tracking-tighter uppercase mb-8">
                {editingId ? 'Edit Asset Type' : 'New Asset Type'}
              </h3>

              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-bold text-on-surface/30 uppercase tracking-[0.2em] ml-2 block mb-3">Type Name</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Saham Luar Negeri"
                    className="w-full px-6 py-4 bg-on-surface/[0.02] border border-on-surface/5 rounded-2xl text-sm font-bold text-on-surface focus:outline-none focus:border-primary/50 transition-all placeholder:text-on-surface/20"
                  />
                </div>

                <div className="pt-4 flex gap-4">
                  <button
                    onClick={resetForm}
                    className="flex-1 py-4 glass-dark rounded-2xl text-xs font-bold text-on-surface/60 hover:text-on-surface transition-all uppercase tracking-widest"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={!formName.trim()}
                    className="flex-1 py-4 bg-primary text-on-surface rounded-2xl text-xs font-bold hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(59,130,246,0.2)] uppercase tracking-widest"
                  >
                    <Save size={16} />
                    {editingId ? 'Update' : 'Save'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        isOpen={!!deleteId}
        title="Delete Asset Type"
        message="Are you sure you want to delete this asset type? Assets using this type might lose their categorization."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={() => {
          if (deleteId) deleteAssetType(deleteId);
          setDeleteId(null);
        }}
        onCancel={() => setDeleteId(null)}
      />
    </motion.div>
  );
}
