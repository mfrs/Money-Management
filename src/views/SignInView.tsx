import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Building2,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  User,
  CircleGauge,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function SignInView() {
  const { login, register } = useApp();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (mode === 'register') {
      if (!name.trim()) return setError('Name is required');
      if (password.length < 6) return setError('Password must be at least 6 characters');
      if (password !== confirmPassword) return setError('Passwords do not match');
    }

    if (!email.trim() || !password.trim()) return setError('Email and password are required');

    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(name, email, password);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setError('');
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="min-h-screen flex items-stretch bg-black overflow-hidden relative">
      <div className="absolute top-0 left-0 w-full h-full">
        <div className="absolute top-[10%] left-[10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[10%] right-[10%] w-[30%] h-[30%] bg-tertiary-container/10 rounded-full blur-[100px]" />
      </div>

      {/* Left panel - Branding */}
      <div className="hidden lg:flex lg:w-3/5 relative overflow-hidden border-r border-white/5">
        <img
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuDPJSpTCmByeNa2KYkTta7R3jrepjbppV7OvoupLt3agUPHT87_5t4_SjnHTDXW9jdlJGkVg3cGuWrSGDYkUOQTCaP26hy3jn2of7MCxJY0wdez5I788Z-95eqOwYFQWCuXRvKvS8pxCEdNVRA-xFE8PCNw_CZZWnzGDtDGr8iH3PSjKR6D70FGS1BqxXigCl48d_fAA6tAFitgLptuNGVXwIjm3PTby-0_3Ro7MdJNg0n3n_9VjBoZM8BMLkZJGtdhop2vahlkuWa0"
          alt="Wealth management visual"
          className="absolute inset-0 w-full h-full object-cover opacity-20 grayscale brightness-50"
        />
        <div className="relative z-10 p-24 flex flex-col justify-between h-full w-full">
          <div className="flex items-center gap-5 glass p-5 rounded-3xl border border-white/10 w-fit backdrop-blur-2xl">
            <CircleGauge className="text-white" size={28} />
            <span className="font-display text-xl font-bold text-white tracking-widest uppercase italic">Logic Wealth v2.0</span>
          </div>
          <div className="max-w-2xl">
            <motion.h2
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.8 }}
              className="font-display text-6xl md:text-8xl font-black text-white mb-10 tracking-tighter leading-[0.9] uppercase italic"
            >
              Absolute <br /> <span className="text-primary italic">Financial</span> <br /> Control.
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-lg text-white/40 leading-relaxed font-medium uppercase tracking-[0.2em] max-w-lg"
            >
              Enterprise-grade wealth management for the individual elite. Precision algorithms, dark-mode mastery, absolute growth.
            </motion.p>
            <div className="mt-16 flex gap-12">
              <div className="glass-dark border border-white/5 p-8 rounded-[32px] min-w-[160px]">
                <p className="text-4xl font-bold text-white tracking-tighter tabular-nums italic">99.99</p>
                <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.3em] mt-3">Node Uptime</p>
              </div>
              <div className="glass-dark border border-white/5 p-8 rounded-[32px] min-w-[160px]">
                <p className="text-4xl font-bold text-white tracking-tighter tabular-nums italic">AES-256</p>
                <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.3em] mt-3">Security Protocol</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel - Auth Form */}
      <div className="w-full lg:w-2/5 flex items-center justify-center p-6 lg:p-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md glass rounded-[48px] p-10 lg:p-12 border border-white/10 shadow-2xl relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />

          {/* Header */}
          <div className="flex items-center gap-5 mb-12 relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-2xl text-black">
              <Building2 size={26} />
            </div>
            <span className="font-display text-2xl font-bold text-white tracking-widest uppercase italic">Access Panel</span>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="relative z-10"
            >
              <div className="mb-10">
                <h1 className="font-display text-3xl lg:text-4xl font-bold text-white mb-4 tracking-tighter uppercase italic leading-none">
                  {mode === 'login' ? 'Initialize Session' : 'Create Identity'}
                </h1>
                <p className="text-xs text-white/30 uppercase tracking-[0.2em] font-medium leading-relaxed">
                  {mode === 'login'
                    ? 'Enter your credentials to access your financial dashboard.'
                    : 'Register a new identity to begin tracking your wealth.'}
                </p>
              </div>

              {/* Error */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 px-5 py-4 mb-6 rounded-2xl bg-error/10 border border-error/20"
                >
                  <AlertCircle size={16} className="text-error shrink-0" />
                  <p className="text-xs text-error font-bold uppercase tracking-widest">{error}</p>
                </motion.div>
              )}

              <form className="space-y-5" onSubmit={handleSubmit}>
                {/* Name field (register only) */}
                {mode === 'register' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                    <label className="text-[10px] font-bold text-white/20 uppercase tracking-[0.4em] ml-2" htmlFor="name">Full Name</label>
                    <div className="relative group">
                      <User className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-white transition-colors" size={18} />
                      <input
                        id="name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="YOUR NAME"
                        className="w-full glass-dark border border-white/5 rounded-full pl-16 pr-8 py-5 text-sm uppercase font-bold tracking-widest text-white placeholder:text-white/10 focus:border-white/20 focus:bg-white/[0.03] outline-none transition-all"
                      />
                    </div>
                  </motion.div>
                )}

                {/* Email */}
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-white/20 uppercase tracking-[0.4em] ml-2" htmlFor="email">Identity Identifier</label>
                  <div className="relative group">
                    <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-white transition-colors" size={18} />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="USER@LOGIC.INF"
                      className="w-full glass-dark border border-white/5 rounded-full pl-16 pr-8 py-5 text-sm uppercase font-bold tracking-widest text-white placeholder:text-white/10 focus:border-white/20 focus:bg-white/[0.03] outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-white/20 uppercase tracking-[0.4em] ml-2" htmlFor="password">Security Keyword</label>
                  <div className="relative group">
                    <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-white transition-colors" size={18} />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full glass-dark border border-white/5 rounded-full pl-16 pr-14 py-5 text-sm font-bold tracking-widest text-white placeholder:text-white/10 focus:border-white/20 focus:bg-white/[0.03] outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-6 top-1/2 -translate-y-1/2 p-1 text-white/20 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password (register only) */}
                {mode === 'register' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                    <label className="text-[10px] font-bold text-white/20 uppercase tracking-[0.4em] ml-2" htmlFor="confirm">Confirm Keyword</label>
                    <div className="relative group">
                      <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-white transition-colors" size={18} />
                      <input
                        id="confirm"
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full glass-dark border border-white/5 rounded-full pl-16 pr-8 py-5 text-sm font-bold tracking-widest text-white placeholder:text-white/10 focus:border-white/20 focus:bg-white/[0.03] outline-none transition-all"
                      />
                    </div>
                  </motion.div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-4 py-6 px-10 bg-white text-black rounded-full text-[10px] font-bold uppercase tracking-[0.5em] hover:bg-white/90 transition-all shadow-2xl active:scale-[0.98] duration-300 mt-4 overflow-hidden relative group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="relative z-10 flex items-center gap-4">
                    {loading ? (
                      <><Loader2 size={16} className="animate-spin" /> Processing...</>
                    ) : mode === 'login' ? (
                      <>Execute Session <ArrowRight size={16} /></>
                    ) : (
                      <>Create Identity <ArrowRight size={16} /></>
                    )}
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                </button>
              </form>
            </motion.div>
          </AnimatePresence>

          {/* Switch mode */}
          <div className="mt-12 text-center relative z-10 border-t border-white/5 pt-8">
            <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">
              {mode === 'login' ? 'New Operator?' : 'Already registered?'}
              <button onClick={switchMode} className="text-white ml-3 hover:underline underline-offset-4 decoration-primary/50">
                {mode === 'login' ? 'Register Identifier' : 'Sign In'}
              </button>
            </p>
          </div>

          {/* Demo credentials hint */}
          {mode === 'login' && (
            <div className="mt-6 text-center relative z-10">
              <button
                type="button"
                onClick={() => { setEmail('alex@logic.inf'); setPassword('password123'); }}
                className="text-[9px] font-bold text-white/10 uppercase tracking-[0.2em] hover:text-white/30 transition-colors"
              >
                Use demo credentials
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
