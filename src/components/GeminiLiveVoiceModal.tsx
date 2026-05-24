import React, { useEffect, useState, useRef } from 'react';
import { Mic, MicOff, X, Loader2, Volume2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GeminiLiveClient } from '../lib/geminiLive';
import { useApp } from '../context/AppContext';

interface GeminiLiveVoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onActionExecute?: (actionText: string, autoConfirm: boolean) => Promise<any>;
  onActionConfirm?: () => void;
}

export default function GeminiLiveVoiceModal({ isOpen, onClose, onActionExecute, onActionConfirm }: GeminiLiveVoiceModalProps) {
  const { language } = useApp();
  const [state, setState] = useState<'disconnected' | 'connecting' | 'connected' | 'listening'>('disconnected');
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [pendingData, setPendingData] = useState<any>(null);
  const clientRef = useRef<GeminiLiveClient | null>(null);

  useEffect(() => {
    if (isOpen) {
      const client = new GeminiLiveClient();
      client.onStateChange = (s) => setState(s);
      client.onAiSpeakingStateChange = (speaking) => setIsAiSpeaking(speaking);
      client.onFunctionCall = async (call, respond) => {
        if (call.name === 'stage_transaction' && onActionExecute) {
          try {
            const result = await onActionExecute(call.args.action_text, false);
            setPendingData(result);
            respond({ result: result || "Success, UI updated." });
          } catch (e: any) {
            respond({ error: e.message || "Failed to process" });
          }
        } else if (call.name === 'confirm_transaction' && onActionConfirm) {
          onActionConfirm();
          setPendingData(null);
          respond({ result: "Transaction confirmed and saved." });
        } else {
          respond({ error: "Unknown function" });
        }
      };
      
      const token = localStorage.getItem('wm_token');
      if (token) {
        client.connect(token);
      }
      clientRef.current = client;
    } else {
      clientRef.current?.stop();
      clientRef.current = null;
      setState('disconnected');
      setIsAiSpeaking(false);
      setPendingData(null);
    }
    return () => {
      clientRef.current?.stop();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-6"
      >
        <button
          onClick={onClose}
          className="absolute top-8 right-8 w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-all cursor-pointer"
        >
          <X size={24} />
        </button>

        <div className="flex-1 flex flex-col items-center justify-center w-full max-w-md gap-12">
          {/* Avatar / Visualizer */}
          <div className="relative flex items-center justify-center w-48 h-48">
            <motion.div
              animate={{
                scale: isAiSpeaking ? [1, 1.2, 1] : state === 'listening' ? [1, 1.05, 1] : 1,
                opacity: isAiSpeaking ? [0.5, 0.8, 0.5] : 0.2
              }}
              transition={{ repeat: Infinity, duration: isAiSpeaking ? 1 : 2 }}
              className="absolute inset-0 rounded-full bg-primary blur-3xl"
            />
            
            <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-2xl shadow-primary/20">
              {state === 'connecting' ? (
                <Loader2 size={40} className="text-white animate-spin" />
              ) : isAiSpeaking ? (
                <Volume2 size={40} className="text-white animate-pulse" />
              ) : (
                <Mic size={40} className="text-white" />
              )}
            </div>

            {/* Orbiting particles when listening */}
            {state === 'listening' && !isAiSpeaking && (
              <>
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 4, ease: "linear" }} className="absolute inset-0">
                  <div className="w-3 h-3 rounded-full bg-secondary absolute -top-1.5 left-1/2 -translate-x-1/2" />
                </motion.div>
                <motion.div animate={{ rotate: -360 }} transition={{ repeat: Infinity, duration: 3, ease: "linear" }} className="absolute inset-4">
                  <div className="w-2 h-2 rounded-full bg-primary absolute top-1/2 -right-1 -translate-y-1/2" />
                </motion.div>
              </>
            )}
          </div>

          {/* Status Text */}
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-display font-bold text-white tracking-tight">
              {state === 'connecting' && (language === 'id' ? 'Menghubungkan...' : 'Connecting...')}
              {state === 'listening' && !isAiSpeaking && (language === 'id' ? 'Mendengarkan...' : 'Listening...')}
              {isAiSpeaking && (language === 'id' ? 'AI Berbicara...' : 'AI Speaking...')}
              {state === 'disconnected' && (language === 'id' ? 'Terputus' : 'Disconnected')}
            </h2>
            <p className="text-white/50 text-sm max-w-[280px] mx-auto">
              {state === 'listening' 
                ? (language === 'id' ? 'Silakan bicara. AI langsung mengerti suara Anda tanpa perlu mengetik.' : 'Please speak. AI understands you directly without typing.')
                : ''}
            </p>
          </div>

          {/* Pending Data Preview */}
          {pendingData && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-sm bg-white/10 rounded-2xl p-4 space-y-3 backdrop-blur-md border border-white/20"
            >
              <div className="text-[10px] font-bold uppercase tracking-widest text-primary/80 border-b border-white/10 pb-2">
                {language === 'id' ? 'KONFIRMASI TRANSAKSI' : 'CONFIRM TRANSACTION'}
              </div>
              {pendingData.action === 'create_transactions' && pendingData.transactions?.map((tx: any, idx: number) => (
                <div key={idx} className="bg-white/5 p-3 rounded-xl border border-white/10 space-y-1">
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-white text-sm">{tx.description}</span>
                    <span className={`font-bold text-sm ${tx.type === 'expense' ? 'text-red-400' : 'text-green-400'}`}>
                      {tx.type === 'expense' ? '-' : '+'} Rp {tx.amount.toLocaleString('id-ID')}
                    </span>
                  </div>
                  <div className="text-xs text-white/50">
                    {tx.walletId ? tx.walletId : 'Dompet'}
                  </div>
                </div>
              ))}
              <div className="text-xs text-center text-white/60 pt-2">
                {language === 'id' ? 'Jawab "Ya, sudah benar" untuk menyimpan.' : 'Say "Yes, correct" to save.'}
              </div>
            </motion.div>
          )}
        </div>

        {/* Controls */}
        <div className="pb-12 w-full flex justify-center gap-6">
          <button
            onClick={onClose}
            className="w-16 h-16 rounded-full bg-error text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl shadow-error/20"
          >
            <MicOff size={24} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
