import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, ChevronLeft, X, Play } from 'lucide-react';
import { api } from '../lib/api';

interface TourStep {
  targetId: string;
  title: string;
  content: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

interface InteractiveTourProps {
  onComplete: () => void;
}

export default function InteractiveTour({ onComplete }: InteractiveTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const steps: TourStep[] = [
    {
      targetId: 'tour-dashboard',
      title: 'Selamat Datang di Stashly!',
      content: 'Ini adalah dashboard utama Anda. Di sini Anda bisa melihat ringkasan kekayaan bersih (Net Worth) secara real-time.',
      position: 'bottom'
    },
    {
      targetId: 'tour-wallets',
      title: 'Kelola Dompet & Rekening',
      content: 'Klik di sini untuk menambahkan dompet, rekening bank, atau e-wallet baru. Anda bisa memantau saldo setiap akun dengan mudah.',
      position: 'right'
    },
    {
      targetId: 'tour-categories',
      title: 'Atur Kategori Keuangan',
      content: 'Sesuaikan kategori pemasukan dan pengeluaran Anda. Berikan limit anggaran pada setiap kategori agar keuangan tetap terkendali.',
      position: 'right'
    },
    {
      targetId: 'tour-quick-entry',
      title: 'Catat Transaksi dengan Cepat',
      content: 'Gunakan tombol ini untuk mencatat transaksi secara manual atau biarkan AI membantu Anda memproses struk belanja!',
      position: 'left'
    },
    {
      targetId: 'tour-debts',
      title: 'Pantau Hutang & Piutang',
      content: 'Jangan sampai lupa! Catat semua pinjaman dan hutang Anda di sini agar tagihan selalu terbayar tepat waktu.',
      position: 'right'
    },
    {
      targetId: 'tour-goals',
      title: 'Capai Tujuan Finansial',
      content: 'Mimpi punya mobil baru atau dana darurat? Buat target finansial Anda dan pantau progresnya di menu ini.',
      position: 'right'
    }
  ];

  const updateTargetRect = useCallback(() => {
    const element = document.getElementById(steps[currentStep].targetId);
    if (element) {
      setTargetRect(element.getBoundingClientRect());
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [currentStep]);

  useEffect(() => {
    updateTargetRect();
    window.addEventListener('resize', updateTargetRect);
    window.addEventListener('scroll', updateTargetRect);
    return () => {
      window.removeEventListener('resize', updateTargetRect);
      window.removeEventListener('scroll', updateTargetRect);
    };
  }, [updateTargetRect]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = async () => {
    try {
      await api.post('/auth/complete-tour', {});
      onComplete();
    } catch (err) {
      console.error('Failed to complete tour', err);
      onComplete(); // Still close the tour even if API fails
    }
  };

  if (!targetRect || !isVisible) return null;

  // Calculate box position
  const getBoxStyle = () => {
    if (!targetRect) return {};
    const padding = 20;
    const step = steps[currentStep];

    switch (step.position) {
      case 'bottom':
        return { top: targetRect.bottom + padding, left: targetRect.left + targetRect.width / 2 };
      case 'top':
        return { bottom: window.innerHeight - targetRect.top + padding, left: targetRect.left + targetRect.width / 2 };
      case 'left':
        return { top: targetRect.top + targetRect.height / 2, right: window.innerWidth - targetRect.left + padding };
      case 'right':
        return { top: targetRect.top + targetRect.height / 2, left: targetRect.right + padding };
      default:
        return {};
    }
  };

  const boxStyle = getBoxStyle();

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      {/* Overlay with Spotlight Hole */}
      <svg className="absolute inset-0 w-full h-full pointer-events-auto">
        <defs>
          <mask id="spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            <motion.circle
              initial={false}
              animate={{
                cx: targetRect.left + targetRect.width / 2,
                cy: targetRect.top + targetRect.height / 2,
                r: Math.max(targetRect.width, targetRect.height) / 2 + 10
              }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              fill="black"
            />
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.7)"
          mask="url(#spotlight-mask)"
        />
      </svg>

      {/* Floating Info Box */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 10 }}
          style={{
            position: 'fixed',
            ...boxStyle,
            transform: steps[currentStep].position === 'bottom' || steps[currentStep].position === 'top' 
              ? 'translateX(-50%)' 
              : 'translateY(-50%)'
          }}
          className="pointer-events-auto w-[320px] bg-surface/90 backdrop-blur-md border border-on-surface/10 shadow-2xl rounded-3xl p-6 overflow-hidden"
        >
          {/* Progress dots */}
          <div className="flex gap-1 mb-4">
            {steps.map((_, i) => (
              <div 
                key={i} 
                className={`h-1 rounded-full transition-all duration-300 ${i === currentStep ? 'w-4 bg-primary' : 'w-1 bg-on-surface/20'}`} 
              />
            ))}
          </div>

          <h3 className="text-lg font-bold text-on-surface mb-2 leading-tight">
            {steps[currentStep].title}
          </h3>
          <p className="text-sm text-on-surface/70 mb-6 leading-relaxed">
            {steps[currentStep].content}
          </p>

          <div className="flex items-center justify-between gap-3">
            <button
              onClick={handleComplete}
              className="text-xs font-bold text-on-surface/40 hover:text-on-surface uppercase tracking-widest transition-colors"
            >
              Skip
            </button>
            <div className="flex gap-2">
              {currentStep > 0 && (
                <button
                  onClick={handlePrev}
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-on-surface/5 text-on-surface/60 hover:bg-on-surface/10 hover:text-on-surface transition-colors"
                >
                  <ChevronLeft size={20} />
                </button>
              )}
              <button
                onClick={handleNext}
                className="flex-1 px-4 h-10 flex items-center justify-center gap-2 rounded-xl bg-primary text-on-primary font-bold text-sm shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
              >
                {currentStep === steps.length - 1 ? 'Mulai Sekarang' : 'Lanjut'}
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
