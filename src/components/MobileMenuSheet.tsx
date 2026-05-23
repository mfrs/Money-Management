import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Target, 
  Diamond, 
  Handshake, 
  Award, 
  ArrowLeftRight, 
  BookOpen, 
  ShieldCheck, 
  Database,
  User
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { cn } from '../lib/utils';

interface MobileMenuSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileMenuSheet({ isOpen, onClose }: MobileMenuSheetProps) {
  const { setCurrentView, user, t } = useApp();

  // Prevent background scrolling when sheet is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleNav = (view: any) => {
    setCurrentView(view);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end lg:hidden">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            transition={{ duration: 0.2 }}
            onClick={onClose} 
            className="absolute inset-0 bg-black/80" 
          />
          
          {/* Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "tween", ease: [0.32, 0.72, 0, 1], duration: 0.3 }}
            className="w-full bg-[#12141c] border-t border-on-surface/10 rounded-t-[32px] p-6 pb-[calc(env(safe-area-inset-bottom,0px)+24px)] relative z-10 shadow-2xl flex flex-col max-h-[85vh] will-change-transform"
          >
            {/* Header & Drag Handle Indicator */}
            <div className="flex flex-col items-center mb-6 shrink-0">
              <div className="w-12 h-1.5 bg-on-surface/20 rounded-full mb-5" />
              <div className="flex justify-between items-center w-full">
                <h3 className="font-display text-xl font-bold text-on-surface uppercase tracking-widest">Menu Utama</h3>
                <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-on-surface/5 text-on-surface/50 hover:text-on-surface hover:bg-on-surface/10 transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-6 pb-4">
              
              {/* Menu Grid */}
              <div className="grid grid-cols-2 gap-4">
                <MenuCard icon={Target} color="bg-primary/20 text-primary" label={t('nav.goals')} onClick={() => handleNav('goals')} />
                <MenuCard icon={Diamond} color="bg-secondary/20 text-secondary" label={t('nav.assets')} onClick={() => handleNav('assets')} />
                <MenuCard icon={Handshake} color="bg-error/20 text-error" label={t('nav.debts')} onClick={() => handleNav('debts')} />
                <MenuCard icon={Award} color="bg-tertiary/20 text-tertiary" label={t('nav.achievements')} onClick={() => handleNav('achievements')} />
                <MenuCard icon={ArrowLeftRight} color="bg-emerald-500/20 text-emerald-500" label={t('nav.transactions')} onClick={() => handleNav('transactions')} />
                <MenuCard icon={BookOpen} color="bg-blue-400/20 text-blue-400" label={t('nav.ledger')} onClick={() => handleNav('ledger')} />
                
                {user?.role === 'admin' && (
                  <>
                    <MenuCard icon={ShieldCheck} color="bg-purple-500/20 text-purple-500" label="Admin" onClick={() => handleNav('admin')} />
                    <MenuCard icon={Database} color="bg-amber-500/20 text-amber-500" label="Monitor" onClick={() => handleNav('pg_monitor')} />
                  </>
                )}
              </div>

              {/* Profile & Settings Button */}
              <div className="pt-2 border-t border-on-surface/5">
                <button 
                  onClick={() => handleNav('settings')} 
                  className="w-full flex items-center justify-between p-4 rounded-2xl bg-on-surface/5 border border-on-surface/5 hover:bg-on-surface/10 active:scale-95 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-on-surface/10 flex items-center justify-center text-on-surface group-hover:scale-110 transition-transform">
                      <User size={18} />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-sm text-on-surface uppercase tracking-widest">{t('settings.profile')}</p>
                      <p className="text-[10px] text-on-surface/40 uppercase tracking-widest font-bold mt-0.5">Pengaturan & Keamanan</p>
                    </div>
                  </div>
                </button>
              </div>

            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function MenuCard({ icon: Icon, label, color, onClick }: { icon: any, label: string, color: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick} 
      className="flex flex-col items-center justify-center p-5 rounded-[20px] bg-on-surface/5 border border-on-surface/5 hover:bg-on-surface/10 hover:border-on-surface/10 transition-all active:scale-[0.98] gap-3 group"
    >
      <div className={cn("w-12 h-12 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300", color)}>
        <Icon size={22} />
      </div>
      <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface">{label}</span>
    </button>
  );
}
