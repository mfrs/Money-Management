import React, { useState, useRef, useEffect } from 'react';
import {
  MessageCircle,
  X,
  Send,
  Sparkles,
  Check,
  Ban,
  Loader2,
  TrendingDown,
  TrendingUp,
  ArrowRightLeft,
  Wallet,
  Tag,
  Trash,
  Camera
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';
import { toolsApi } from '../lib/api';
import { cn } from '../lib/utils';

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
  parsedData?: any;
  status?: 'pending' | 'confirmed' | 'cancelled';
  image?: string;
}

export default function AIChatAssistant() {
  const { wallets, categories, goals, addJournal, deleteJournal, updateWallet, updateGoal, addToast, language } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat(language === 'id' ? 'id-ID' : 'en-US', {
      style: 'currency',
      currency: wallets[0]?.user?.currency || 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(val);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Convert file to Base64
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      const base64Content = dataUrl.split(',')[1];
      const mimeType = file.type;

      // Add user message with image preview
      const userMsgId = Math.random().toString();
      setMessages(prev => [
        ...prev,
        {
          id: userMsgId,
          sender: 'user',
          text: language === 'id' ? "Memindai struk pembayaran... 🔍" : "Scanning receipt... 🔍",
          image: dataUrl,
          timestamp: new Date()
        }
      ]);

      setIsTyping(true);

      try {
        // 1. Call receipt scanner API
        addToast(language === 'id' ? 'Memproses struk...' : 'Processing receipt...', 'info');
        const receipt = await toolsApi.scanReceipt(base64Content, mimeType);

        if (!receipt || (!receipt.merchantName && !receipt.totalAmount)) {
          throw new Error('Could not read receipt data');
        }

        // 2. Generate natural language command to call our chatEntry API
        const dateStr = receipt.date || new Date().toISOString().split('T')[0];
        const merchant = receipt.merchantName || 'Merchant';
        const amount = receipt.totalAmount || 0;

        const generatedCommand = language === 'id'
          ? `Beli ${merchant} sebesar ${amount} tanggal ${dateStr}`
          : `Bought ${merchant} for ${amount} on ${dateStr}`;

        // 3. Call standard chatEntry to match wallet, category, and limits automatically!
        const data = await toolsApi.chatEntry(
          generatedCommand,
          wallets.map(w => ({ id: w.id, name: w.name, balance: w.balance })),
          categories.map(c => ({ id: c.id, name: c.name, type: c.type, budgetLimit: c.budgetLimit })),
          goals.map(g => ({ id: g.id, name: g.name, currentAmount: g.currentAmount, targetAmount: g.targetAmount })),
          new Date().toISOString()
        );

        // Prepend receipt scanning success text
        let msgText = language === 'id'
          ? `Struk terdeteksi dari *${merchant}* sebesar *${formatCurrency(amount)}*.\nApakah Anda ingin mencatat pengeluaran ini?`
          : `Receipt detected from *${merchant}* for *${formatCurrency(amount)}*.\nWould you like to record this expense?`;

        if (data.budgetAlert) {
          msgText = `${data.budgetAlert}\n\n${msgText}`;
        }

        setMessages(prev => [
          ...prev,
          {
            id: Math.random().toString(),
            sender: 'ai',
            text: msgText,
            timestamp: new Date(),
            parsedData: data,
            status: 'pending'
          }
        ]);
        addToast(language === 'id' ? 'Struk terpindai!' : 'Receipt scanned!', 'success');
      } catch (err: any) {
        console.error('Failed to scan receipt in chat:', err);
        setMessages(prev => [
          ...prev,
          {
            id: Math.random().toString(),
            sender: 'ai',
            text: language === 'id'
              ? "Maaf, saya kesulitan memindai struk tersebut. Pastikan foto struk terlihat jelas dan coba lagi ya."
              : "Sorry, I had trouble scanning that receipt. Please ensure the photo is clear and try again.",
            timestamp: new Date()
          }
        ]);
        addToast(language === 'id' ? 'Gagal memindai struk' : 'Failed to scan receipt', 'error');
      } finally {
        setIsTyping(false);
        // Clear input value
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.onerror = () => {
      addToast('Failed to read image file', 'error');
    };
    reader.readAsDataURL(file);
  };

  // Initialize with welcome message
  useEffect(() => {
    const isIndo = language === 'id';
    setMessages([
      {
        id: 'welcome',
        sender: 'ai',
        text: isIndo
          ? "Halo! Saya adalah AI Asisten Keuangan Anda. ✨\nTuliskan transaksi Anda secara santai di sini, dan saya akan membantu mencatatnya secara otomatis!\n\n*Contoh:*\n• *\"Beli nasi goreng 20rb pake BCA\"*\n• *\"Gajian masuk 5 juta ke Mandiri\"*\n• *\"Transfer 150rb dari BCA ke Gopay\"*"
          : "Hello! I am your AI Financial Assistant. ✨\nJust type your transactions naturally here, and I'll help you record them automatically!\n\n*Examples:*\n• *\"Bought coffee for 45k using Cash\"*\n• *\"Salary of 8M into Bank account\"*\n• *\"Transfer 200k from Cash to Savings\"*",
        timestamp: new Date()
      }
    ]);
  }, [language]);

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userText = input.trim();
    setInput('');

    // Add user message
    const userMsgId = Math.random().toString();
    setMessages(prev => [
      ...prev,
      {
        id: userMsgId,
        sender: 'user',
        text: userText,
        timestamp: new Date()
      }
    ]);

    setIsTyping(true);

    try {
      const data = await toolsApi.chatEntry(
        userText,
        wallets.map(w => ({ id: w.id, name: w.name, balance: w.balance })),
        categories.map(c => ({ id: c.id, name: c.name, type: c.type, budgetLimit: c.budgetLimit })),
        goals.map(g => ({ id: g.id, name: g.name, currentAmount: g.currentAmount, targetAmount: g.targetAmount })),
        new Date().toISOString()
      );

      if (data.action === 'answer') {
        setMessages(prev => [
          ...prev,
          {
            id: Math.random().toString(),
            sender: 'ai',
            text: data.message,
            timestamp: new Date()
          }
        ]);
      } else if (data.action === 'delete_not_found') {
        setMessages(prev => [
          ...prev,
          {
            id: Math.random().toString(),
            sender: 'ai',
            text: data.message || (language === 'id' ? "Transaksi tidak ditemukan." : "Transaction not found."),
            timestamp: new Date()
          }
        ]);
      } else if (data.action === 'delete') {
        setMessages(prev => [
          ...prev,
          {
            id: Math.random().toString(),
            sender: 'ai',
            text: language === 'id'
              ? "Saya menemukan transaksi berikut untuk dihapus/dibatalkan. Apakah Anda yakin ingin membatalkannya?"
              : "I found the following transaction to cancel/delete. Are you sure you want to cancel it?",
            timestamp: new Date(),
            parsedData: data,
            status: 'pending'
          }
        ]);
      } else if (data.action === 'allocate_goal') {
        setMessages(prev => [
          ...prev,
          {
            id: Math.random().toString(),
            sender: 'ai',
            text: language === 'id'
              ? "Saya mendeteksi niat menabung. Apakah Anda ingin menyisihkan uang Anda ke sasaran tabungan ini?"
              : "I detected a savings contribution goal. Would you like to allocate money towards this goal?",
            timestamp: new Date(),
            parsedData: data,
            status: 'pending'
          }
        ]);
      } else {
        // Fallback or "create" action
        let msgText = language === 'id'
          ? "Saya mendeteksi rincian transaksi berikut. Apakah datanya sudah sesuai?"
          : "I detected the following transaction details. Does this look correct?";

        if (data.budgetAlert) {
          msgText = `${data.budgetAlert}\n\n${msgText}`;
        }

        setMessages(prev => [
          ...prev,
          {
            id: Math.random().toString(),
            sender: 'ai',
            text: msgText,
            timestamp: new Date(),
            parsedData: data,
            status: 'pending'
          }
        ]);
      }
    } catch (err: any) {
      console.error('Chat AI Assistant Error:', err);
      setMessages(prev => [
        ...prev,
        {
          id: Math.random().toString(),
          sender: 'ai',
          text: language === 'id'
            ? "Maaf, saya kesulitan memahami transaksi tersebut. Bisa tolong ulangi dengan kalimat yang lebih jelas?"
            : "Sorry, I had trouble parsing that. Could you please rephrase it more clearly?",
          timestamp: new Date()
        }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleConfirm = async (messageId: string, parsedData: any) => {
    try {
      if (parsedData.action === 'delete') {
        // Delete transaction
        await deleteJournal(parsedData.journalId);

        // Update message status
        setMessages(prev =>
          prev.map(m => (m.id === messageId ? { ...m, status: 'confirmed' } : m))
        );

        // Push success message
        setMessages(prev => [
          ...prev,
          {
            id: Math.random().toString(),
            sender: 'ai',
            text: language === 'id'
              ? `Sip! Transaksi "${parsedData.description}" sebesar ${formatCurrency(parsedData.amount)} berhasil dihapus/dibatalkan! 🔄`
              : `Success! Transaction "${parsedData.description}" of ${formatCurrency(parsedData.amount)} has been deleted/reversed! 🔄`,
            timestamp: new Date()
          }
        ]);
        addToast(language === 'id' ? 'Transaksi dihapus!' : 'Transaction deleted!', 'success');
      } else if (parsedData.action === 'allocate_goal') {
        // Get wallet and goal details
        const sourceWallet = wallets.find(w => w.id === parsedData.walletId);
        const targetGoal = goals.find(g => g.id === parsedData.goalId);

        if (!sourceWallet || !targetGoal) {
          throw new Error('Wallet or Goal not found');
        }

        // 1. Deduct wallet balance
        await updateWallet(sourceWallet.id, { balance: sourceWallet.balance - parsedData.amount });
        // 2. Increase goal current amount
        await updateGoal(targetGoal.id, { currentAmount: targetGoal.currentAmount + parsedData.amount });

        // Update message status
        setMessages(prev =>
          prev.map(m => (m.id === messageId ? { ...m, status: 'confirmed' } : m))
        );

        // Push success message
        setMessages(prev => [
          ...prev,
          {
            id: Math.random().toString(),
            sender: 'ai',
            text: language === 'id'
              ? `Sip! Berhasil menabung sebesar ${formatCurrency(parsedData.amount)} untuk impian "${parsedData.goalName}" dari dompet ${sourceWallet.name}! 🎯`
              : `Successfully saved ${formatCurrency(parsedData.amount)} for your dream "${parsedData.goalName}" using your ${sourceWallet.name} wallet! 🎯`,
            timestamp: new Date()
          }
        ]);
        addToast(language === 'id' ? 'Berhasil menabung!' : 'Savings recorded!', 'success');
      } else {
        // Create transaction
        addJournal({
          description: parsedData.description,
          amount: parsedData.amount,
          type: parsedData.type || 'expense',
          categoryId: parsedData.type === 'transfer' ? undefined : parsedData.categoryId,
          walletId: parsedData.walletId,
          toWalletId: parsedData.type === 'transfer' ? parsedData.toWalletId : undefined,
          date: parsedData.date,
          note: `Recorded via AI Assistant Chat`,
        });

        // Update message status
        setMessages(prev =>
          prev.map(m => (m.id === messageId ? { ...m, status: 'confirmed' } : m))
        );

        // Push success message
        setMessages(prev => [
          ...prev,
          {
            id: Math.random().toString(),
            sender: 'ai',
            text: language === 'id'
              ? `Mantap! Transaksi "${parsedData.description}" berhasil disimpan ke dompet Anda! 🎉`
              : `Success! Transaction "${parsedData.description}" has been recorded! 🎉`,
            timestamp: new Date()
          }
        ]);
        addToast(language === 'id' ? 'Transaksi dicatat!' : 'Transaction recorded!', 'success');
      }
    } catch (err) {
      addToast(language === 'id' ? 'Gagal memproses transaksi' : 'Failed to process transaction', 'error');
    }
  };

  const handleCancel = (messageId: string) => {
    setMessages(prev =>
      prev.map(m => (m.id === messageId ? { ...m, status: 'cancelled' } : m))
    );

    setMessages(prev => [
      ...prev,
      {
        id: Math.random().toString(),
        sender: 'ai',
        text: language === 'id'
          ? "Baik, transaksi telah dibatalkan."
          : "Understood, transaction cancelled.",
        timestamp: new Date()
      }
    ]);
  };



  return (
    <>
      {/* Floating Chat Bubble Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 lg:bottom-8 lg:right-8 z-[80] w-14 h-14 rounded-full bg-gradient-to-tr from-secondary to-primary flex items-center justify-center text-white shadow-[0_8px_30px_rgb(139,92,246,0.3)] hover:scale-110 active:scale-95 transition-all cursor-pointer group"
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
            >
              <X size={24} />
            </motion.div>
          ) : (
            <motion.div
              key="chat"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="relative"
            >
              <MessageCircle size={24} />
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-tertiary rounded-full animate-ping" />
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-tertiary rounded-full" />
            </motion.div>
          )}
        </AnimatePresence>
      </button>

      {/* Chat Window Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            className="fixed bottom-24 right-6 lg:bottom-28 lg:right-8 z-[80] w-[360px] sm:w-[400px] h-[550px] rounded-[30px] border border-on-surface/10 flex flex-col overflow-hidden shadow-2xl bg-surface/95 backdrop-blur-2xl"
          >
            {/* Header */}
            <div className="px-6 py-5 flex items-center justify-between border-b border-on-surface/5 bg-on-surface/5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-secondary/15 flex items-center justify-center text-secondary border border-secondary/20">
                  <Sparkles size={18} className="animate-pulse" />
                </div>
                <div>
                  <h4 className="font-display text-sm font-bold text-on-surface tracking-tight">Wealth AI Assistant</h4>
                  <p className="text-[10px] text-on-surface/40 uppercase tracking-widest font-bold">Online</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-on-surface/5 rounded-xl transition-all"
              >
                <X size={18} className="text-on-surface/40" />
              </button>
            </div>

            {/* Messages Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex flex-col max-w-[85%] space-y-1",
                    msg.sender === 'user' ? "ml-auto items-end" : "mr-auto items-start"
                  )}
                >
                  {/* Bubble body */}
                  <div
                    className={cn(
                      "px-4 py-3 rounded-2xl text-xs sm:text-sm whitespace-pre-line leading-relaxed shadow-sm",
                      msg.sender === 'user'
                        ? "bg-secondary text-white rounded-tr-none"
                        : "bg-on-surface/5 border border-on-surface/5 text-on-surface rounded-tl-none"
                    )}
                  >
                    {msg.image && (
                      <div className="mb-2 max-w-[200px] rounded-lg overflow-hidden border border-white/10">
                        <img src={msg.image} alt="Receipt Attachment" className="w-full h-auto object-cover" />
                      </div>
                    )}
                    {msg.text}
                  </div>

                  {/* Parse Data Card Preview */}
                  {msg.parsedData && msg.status === 'pending' && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "w-full bg-on-surface/5 rounded-2xl p-4 mt-2 space-y-3 shadow-md border",
                        msg.parsedData.action === 'delete' ? "border-error/30" : msg.parsedData.action === 'allocate_goal' ? "border-success/30" : "border-secondary/25"
                      )}
                    >
                      <div className="flex items-center justify-between border-b border-on-surface/5 pb-2">
                        <span className={cn(
                          "text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5",
                          msg.parsedData.action === 'delete' ? "text-error" : msg.parsedData.action === 'allocate_goal' ? "text-success" : "text-secondary"
                        )}>
                          {msg.parsedData.action === 'delete' ? (
                            <>
                              <Trash size={12} />
                              {language === 'id' ? 'BATALKAN TRANSAKSI' : 'REVERSE TRANSACTION'}
                            </>
                          ) : msg.parsedData.action === 'allocate_goal' ? (
                            <>
                              <Sparkles size={12} className="text-success" />
                              {language === 'id' ? 'MENABUNG KE GOAL' : 'SAVE TO GOAL'}
                            </>
                          ) : (
                            <>
                              {msg.parsedData.type === 'expense' ? <TrendingDown size={12} className="text-error" /> : msg.parsedData.type === 'income' ? <TrendingUp size={12} className="text-success" /> : <ArrowRightLeft size={12} className="text-secondary" />}
                              {msg.parsedData.type}
                            </>
                          )}
                        </span>
                        <span className="text-xs font-bold text-on-surface">
                          {formatCurrency(msg.parsedData.amount)}
                        </span>
                      </div>
                      
                      <div className="space-y-1.5 text-xs text-on-surface/70">
                        <p className="font-semibold text-on-surface">
                          {msg.parsedData.action === 'allocate_goal' 
                            ? `${language === 'id' ? 'Menabung untuk' : 'Saving for'} "${msg.parsedData.goalName}"` 
                            : msg.parsedData.description}
                        </p>
                        
                        <div className="flex items-center gap-1 text-[10px] text-on-surface/40 mt-2">
                          <Wallet size={10} />
                          <span>
                            {msg.parsedData.action === 'delete' 
                              ? msg.parsedData.walletName 
                              : msg.parsedData.action === 'allocate_goal'
                              ? msg.parsedData.walletName
                              : (wallets.find(w => w.id === msg.parsedData?.walletId)?.name || 'Unknown')}
                            {msg.parsedData.type === 'transfer' && ` → ${wallets.find(w => w.id === msg.parsedData?.toWalletId)?.name || 'Unknown'}`}
                          </span>
                        </div>

                        {msg.parsedData.action !== 'delete' && msg.parsedData.action !== 'allocate_goal' && msg.parsedData.type !== 'transfer' && msg.parsedData.categoryId && (
                          <div className="flex items-center gap-1 text-[10px] text-on-surface/40">
                            <Tag size={10} />
                            <span>{categories.find(c => c.id === msg.parsedData?.categoryId)?.name || 'Unknown'}</span>
                          </div>
                        )}
                      </div>

                      {/* Confirmation Buttons */}
                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={() => handleConfirm(msg.id, msg.parsedData)}
                          className="flex-1 py-2 rounded-xl bg-success text-white font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                        >
                          <Check size={12} />
                          {language === 'id' ? 'Konfirmasi' : 'Confirm'}
                        </button>
                        <button
                          onClick={() => handleCancel(msg.id)}
                          className="flex-1 py-2 rounded-xl bg-error/15 text-error border border-error/20 font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                        >
                          <Ban size={12} />
                          {language === 'id' ? 'Batal' : 'Cancel'}
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* Confirmed / Cancelled status badge */}
                  {msg.status && msg.status !== 'pending' && (
                    <span
                      className={cn(
                        "text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border mt-1",
                        msg.status === 'confirmed'
                          ? "bg-success/15 border-success/20 text-success"
                          : "bg-error/15 border-error/20 text-error"
                      )}
                    >
                      {msg.status === 'confirmed' ? (language === 'id' ? 'Dikonfirmasi' : 'Confirmed') : (language === 'id' ? 'Dibatalkan' : 'Cancelled')}
                    </span>
                  )}
                  
                  {/* Timestamp */}
                  <span className="text-[9px] text-on-surface/30">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}

              {isTyping && (
                <div className="flex items-center gap-1.5 mr-auto pl-4">
                  <div className="w-1.5 h-1.5 bg-secondary rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <div className="w-1.5 h-1.5 bg-secondary rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <div className="w-1.5 h-1.5 bg-secondary rounded-full animate-bounce" />
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input Bar */}
            <div className="p-4 border-t border-on-surface/5 bg-on-surface/5 flex gap-2 items-center">
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleImageUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isTyping}
                title={language === 'id' ? "Unggah Foto Struk" : "Upload Receipt Image"}
                className="w-10 h-10 rounded-2xl bg-on-surface/5 border border-on-surface/10 text-on-surface/60 flex items-center justify-center hover:bg-on-surface/10 hover:text-on-surface hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:scale-100 cursor-pointer shrink-0"
              >
                <Camera size={18} />
              </button>

              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                disabled={isTyping}
                placeholder={language === 'id' ? "Ketik pesan Anda..." : "Type your message..."}
                className="flex-1 bg-surface border border-on-surface/10 rounded-2xl px-4 py-3 text-xs sm:text-sm outline-none text-on-surface placeholder:text-on-surface/30 focus:border-secondary transition-colors"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isTyping}
                className="w-10 h-10 rounded-2xl bg-secondary text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:scale-100 cursor-pointer shrink-0"
              >
                <Send size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
