import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
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
    <div className="min-h-screen flex items-center justify-center bg-black overflow-hidden relative font-sans">
      {/* Autofill CSS Fix to prevent ugly browser yellow fields */}
      <style>{`
        input:-webkit-autofill,
        input:-webkit-autofill:hover, 
        input:-webkit-autofill:focus, 
        input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 1000px #0b0d12 inset !important;
          -webkit-text-fill-color: #ffffff !important;
          transition: background-color 5000s ease-in-out 0s;
        }
      `}</style>

      {/* Floating Animated Gradient Mesh Spheres */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <motion.div
          animate={{
            x: [0, 80, -60, 0],
            y: [0, -100, 50, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-[10%] left-[15%] w-[45vw] h-[45vw] md:w-[35vw] md:h-[35vw] bg-primary/10 rounded-full blur-[130px]"
        />
        <motion.div
          animate={{
            x: [0, -90, 70, 0],
            y: [0, 80, -90, 0],
          }}
          transition={{
            duration: 30,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute bottom-[10%] right-[15%] w-[45vw] h-[45vw] md:w-[30vw] md:h-[30vw] bg-secondary/10 rounded-full blur-[140px]"
        />
      </div>

      <div className="relative z-10 w-full max-w-md p-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-10 text-center">
          <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center shadow-lg mb-4 backdrop-blur-xl">
            <CircleGauge className="text-white" size={24} />
          </div>
          <span className="font-display text-sm font-bold text-white/40 tracking-[0.25em] uppercase">Stashly</span>
        </div>

        {/* Auth Card */}
        <motion.div
          layout
          className="glass rounded-[32px] p-8 md:p-10 border border-white/10 shadow-2xl relative overflow-hidden backdrop-blur-3xl bg-white/[0.02]"
        >
          {/* Subtle gradient glow inside the card */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />

          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="relative z-10"
            >
              <div className="mb-8">
                <h1 className="font-display text-2xl font-bold text-white tracking-tight mb-2">
                  {mode === 'login' ? 'Sign In' : 'Create Account'}
                </h1>
                <p className="text-xs text-white/40 leading-relaxed font-medium">
                  {mode === 'login'
                    ? 'Welcome back. Enter your credentials to access your financial dashboard.'
                    : 'Get started. Register a new account to begin tracking your wealth.'}
                </p>
              </div>

              {/* Error Alert */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-3 px-4 py-3.5 mb-6 rounded-2xl bg-error/10 border border-error/20"
                >
                  <AlertCircle size={15} className="text-error shrink-0" />
                  <p className="text-xs text-error font-medium">{error}</p>
                </motion.div>
              )}

              <form className="space-y-5" onSubmit={handleSubmit}>
                {/* Name field (register only) */}
                {mode === 'register' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="space-y-2"
                  >
                    <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] ml-1" htmlFor="name">Full Name</label>
                    <div className="relative group">
                      <User className="absolute left-5 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-white transition-colors" size={16} />
                      <input
                        id="name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your Name"
                        className="w-full bg-[#0b0d12] border border-white/10 rounded-2xl pl-12 pr-6 py-4 text-sm text-white placeholder:text-white/20 focus:border-white/30 outline-none transition-all"
                      />
                    </div>
                  </motion.div>
                )}

                {/* Email */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] ml-1" htmlFor="email">Email Address</label>
                  <div className="relative group">
                    <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-white transition-colors" size={16} />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@domain.com"
                      className="w-full bg-[#0b0d12] border border-white/10 rounded-2xl pl-12 pr-6 py-4 text-sm text-white placeholder:text-white/20 focus:border-white/30 outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] ml-1" htmlFor="password">Password</label>
                  <div className="relative group">
                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-white transition-colors" size={16} />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-[#0b0d12] border border-white/10 rounded-2xl pl-12 pr-12 py-4 text-sm text-white placeholder:text-white/20 focus:border-white/30 outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-5 top-1/2 -translate-y-1/2 p-1 text-white/30 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password (register only) */}
                {mode === 'register' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="space-y-2"
                  >
                    <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] ml-1" htmlFor="confirm">Confirm Password</label>
                    <div className="relative group">
                      <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-white transition-colors" size={16} />
                      <input
                        id="confirm"
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-[#0b0d12] border border-white/10 rounded-2xl pl-12 pr-6 py-4 text-sm text-white placeholder:text-white/20 focus:border-white/30 outline-none transition-all"
                      />
                    </div>
                  </motion.div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 py-4 px-6 bg-white hover:bg-white/95 text-black rounded-2xl text-xs font-bold uppercase tracking-wider transition-all shadow-lg active:scale-[0.98] duration-200 mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <><Loader2 size={14} className="animate-spin" /> Processing...</>
                  ) : mode === 'login' ? (
                    <>Sign In <ArrowRight size={14} /></>
                  ) : (
                    <>Create Account <ArrowRight size={14} /></>
                  )}
                </button>
              </form>
            </motion.div>
          </AnimatePresence>

          {/* Switch Mode Footer */}
          <div className="mt-8 text-center relative z-10 border-t border-white/5 pt-6">
            <p className="text-xs text-white/30">
              {mode === 'login' ? "Don't have an account?" : "Already registered?"}
              <button
                type="button"
                onClick={switchMode}
                className="text-white font-semibold ml-2 hover:underline hover:underline-offset-4 transition-all"
              >
                {mode === 'login' ? 'Create Account' : 'Sign In'}
              </button>
            </p>
          </div>

          {/* Demo credentials hint */}
          {mode === 'login' && (
            <div className="mt-4 text-center relative z-10">
              <button
                type="button"
                onClick={() => { setEmail('alex@stashly.inf'); setPassword('password123'); }}
                className="text-[10px] text-white/20 hover:text-white/40 transition-colors underline underline-offset-4 decoration-white/10"
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
