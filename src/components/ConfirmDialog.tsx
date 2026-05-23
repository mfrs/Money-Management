import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({ isOpen, title, message, confirmLabel = 'Delete', onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[150] flex items-end lg:items-center justify-center p-0 lg:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            className="glass rounded-t-[32px] lg:rounded-[32px] p-8 pb-[max(2rem,env(safe-area-inset-bottom))] lg:pb-8 max-w-md w-full relative z-10 border-t lg:border border-on-surface/10 shadow-[0_-10px_40px_rgba(0,0,0,0.3)] lg:shadow-none"
          >
            <div className="flex items-start gap-5 mb-6">
              <div className="w-12 h-12 rounded-xl bg-error-container flex items-center justify-center text-error shrink-0">
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 className="font-display text-lg font-bold text-on-surface mb-2">{title}</h3>
                <p className="text-sm text-on-surface/50 leading-relaxed">{message}</p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-8">
              <button
                onClick={onCancel}
                className="px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest text-on-surface/50 hover:text-on-surface hover:bg-on-surface/5 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => { onConfirm(); onCancel(); }}
                className="px-8 py-3 rounded-xl bg-error text-on-surface text-xs font-bold uppercase tracking-widest hover:bg-error/80 transition-all shadow-lg active:scale-95 duration-200"
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
