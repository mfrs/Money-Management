import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Delete, LogOut, CheckCircle2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { cn } from '../lib/utils';

interface PinLockViewProps {
  onVerified: () => void;
  onLogout: () => void;
}

export default function PinLockView({ onVerified, onLogout }: PinLockViewProps) {
  const { user, addToast, language } = useApp();
  const [pin, setPin] = useState('');
  const [setupPin, setSetupPin] = useState('');
  const [step, setStep] = useState<'verify' | 'setup' | 'confirm'>('verify');
  const [errorAnimation, setErrorAnimation] = useState(false);

  useEffect(() => {
    const savedPin = localStorage.getItem(`wm_pin_${user?.id}`);
    if (!savedPin) {
      setStep('setup');
    } else {
      setStep('verify');
    }
  }, [user]);

  const handleKeyPress = (digit: string) => {
    if (pin.length < 6) {
      const newPin = pin + digit;
      setPin(newPin);
      
      if (newPin.length === 6) {
        processCompletedPin(newPin);
      }
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
  };

  const processCompletedPin = (enteredPin: string) => {
    setTimeout(() => {
      if (step === 'setup') {
        setSetupPin(enteredPin);
        setPin('');
        setStep('confirm');
      } else if (step === 'confirm') {
        if (enteredPin === setupPin) {
          localStorage.setItem(`wm_pin_${user?.id}`, enteredPin);
          addToast(language === 'id' ? 'PIN berhasil dibuat!' : 'PIN successfully set!', 'success');
          onVerified();
        } else {
          triggerError();
          addToast(language === 'id' ? 'PIN tidak cocok. Silakan coba lagi.' : 'PIN does not match. Please try again.', 'error');
          setPin('');
          setSetupPin('');
          setStep('setup');
        }
      } else if (step === 'verify') {
        const savedPin = localStorage.getItem(`wm_pin_${user?.id}`);
        if (enteredPin === savedPin) {
          onVerified();
        } else {
          triggerError();
          setPin('');
        }
      }
    }, 200);
  };

  const triggerError = () => {
    setErrorAnimation(true);
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200]);
    }
    setTimeout(() => setErrorAnimation(false), 500);
  };

  const getTitleText = () => {
    if (language === 'id') {
      if (step === 'setup') return 'Buat PIN Keamanan';
      if (step === 'confirm') return 'Konfirmasi PIN Anda';
      return 'Masukkan PIN';
    } else {
      if (step === 'setup') return 'Create Security PIN';
      if (step === 'confirm') return 'Confirm Your PIN';
      return 'Enter PIN';
    }
  };

  const getSubtitleText = () => {
    if (language === 'id') {
      if (step === 'setup') return 'Masukkan 6 digit angka untuk mengamankan data Anda';
      if (step === 'confirm') return 'Masukkan kembali 6 digit angka yang baru dibuat';
      return 'Masukkan 6 digit PIN untuk membuka aplikasi';
    } else {
      if (step === 'setup') return 'Enter 6 digits to secure your financial data';
      if (step === 'confirm') return 'Re-enter the 6 digits you just created';
      return 'Enter your 6-digit PIN to unlock';
    }
  };

  return (
    <div className="min-h-[100dvh] w-full bg-surface flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary rounded-full blur-[120px] opacity-20 animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-secondary rounded-full blur-[120px] opacity-20" />
      </div>

      <div className="z-10 w-full max-w-sm flex flex-col items-center">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center text-center mb-10"
        >
          <div className="w-16 h-16 bg-on-surface/5 rounded-2xl flex items-center justify-center mb-6 border border-on-surface/10 shadow-lg relative">
            <Lock size={28} className="text-primary" />
            {step === 'confirm' && (
              <div className="absolute -bottom-2 -right-2 w-7 h-7 bg-success rounded-full flex items-center justify-center border-2 border-surface">
                <CheckCircle2 size={14} className="text-white" />
              </div>
            )}
          </div>
          <h1 className="text-2xl font-display font-bold text-on-surface mb-2 tracking-tight">
            {getTitleText()}
          </h1>
          <p className="text-sm text-on-surface/50 max-w-[250px]">
            {getSubtitleText()}
          </p>
        </motion.div>

        {/* PIN Indicators */}
        <motion.div 
          className={cn(
            "flex items-center gap-4 mb-12",
            errorAnimation && "animate-[shake_0.4s_ease-in-out]"
          )}
        >
          {[...Array(6)].map((_, i) => (
            <div 
              key={i}
              className={cn(
                "w-4 h-4 rounded-full transition-all duration-200 border-2",
                i < pin.length 
                  ? "bg-primary border-primary scale-110 shadow-[0_0_10px_rgba(59,130,246,0.5)]" 
                  : "bg-transparent border-on-surface/20 scale-100"
              )}
            />
          ))}
        </motion.div>

        {/* Keypad */}
        <div className="w-full grid grid-cols-3 gap-y-4 gap-x-6 max-w-[280px] mx-auto mb-10">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => handleKeyPress(num.toString())}
              className="h-16 w-16 mx-auto rounded-full text-2xl font-display font-bold text-on-surface hover:bg-on-surface/10 active:bg-primary/20 active:scale-95 transition-all flex items-center justify-center"
            >
              {num}
            </button>
          ))}
          <div /> {/* Empty space */}
          <button
            onClick={() => handleKeyPress('0')}
            className="h-16 w-16 mx-auto rounded-full text-2xl font-display font-bold text-on-surface hover:bg-on-surface/10 active:bg-primary/20 active:scale-95 transition-all flex items-center justify-center"
          >
            0
          </button>
          <button
            onClick={handleDelete}
            disabled={pin.length === 0}
            className="h-16 w-16 mx-auto rounded-full text-on-surface hover:bg-on-surface/10 active:bg-error/20 active:scale-95 transition-all flex items-center justify-center disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <Delete size={24} />
          </button>
        </div>

        {/* Logout Option */}
        <button
          onClick={onLogout}
          className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-on-surface/40 hover:text-error transition-colors px-6 py-3 rounded-full hover:bg-error/5"
        >
          <LogOut size={16} />
          <span>{language === 'id' ? 'Keluar Akun' : 'Logout'}</span>
        </button>
      </div>
    </div>
  );
}
