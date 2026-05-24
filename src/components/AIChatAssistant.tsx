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
  Camera,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  HandCoins,
  CreditCard,
  PenLine
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';
import { toolsApi } from '../lib/api';
import { cn, compressImage, formatCurrency, getLocalDateString } from '../lib/utils';
import { Camera as CapacitorCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import GeminiLiveVoiceModal from './GeminiLiveVoiceModal';

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
  const { 
    wallets, categories, goals, assets, debts, budget, user, language,
    addJournal, deleteJournal, updateWallet, updateGoal, addCategory, addToast, 
    addDebt, payDebt,
    addWallet, addGoal, addAsset, addFixedExpense, addIncomeSource
  } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [categoryLimits, setCategoryLimits] = useState<Record<string, string>>({});
  const [isTyping, setIsTyping] = useState(false);
  const [showSourcePicker, setShowSourcePicker] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Edit Mode State
  const [editingData, setEditingData] = useState<Record<string, boolean>>({});
  
  const handleEditItem = (messageId: string, index: number, field: string, value: any, listKey: 'transactions' | 'wallets') => {
    setMessages(prev => prev.map(m => {
      if (m.id === messageId && m.parsedData) {
        const newList = [...(m.parsedData[listKey] || [])];
        newList[index] = { ...newList[index], [field]: value };
        return { ...m, parsedData: { ...m.parsedData, [listKey]: newList } };
      }
      return m;
    }));
  };
  
  const toggleEditMode = (messageId: string, index: number) => {
    const key = `${messageId}-${index}`;
    setEditingData(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // AI Voice & Speech Recognition state
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);

  const toggleListening = () => {
    setIsVoiceModalOpen(true);
  };

  // Text-To-Speech function
  const speakText = (text: string) => {
    // Disabled in chat mode since Voice Modal handles its own speaking
    return;

    // Stop current speaking
    window.speechSynthesis.cancel();

    // Clean up markdown & symbols for natural voice narration
    const cleanedText = text
      .replace(/[\*\#\`\_]/g, '')
      .replace(/Rp\s?([0-9\.\,]+)/g, '$1 Rupiah')
      .replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDC00-\uDFFF]/g, '')
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanedText);
    utterance.lang = language === 'id' ? 'id-ID' : 'en-US';

    const voices = window.speechSynthesis.getVoices();
    const voiceLang = language === 'id' ? 'id' : 'en';
    const matchedVoice = voices.find(v => v.lang.startsWith(voiceLang));
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    window.speechSynthesis.speak(utterance);
  };

  const formatCurrency = (val: any) => {
    const num = typeof val === 'number' ? val : parseFloat(val);
    if (isNaN(num)) return language === 'id' ? 'Rp 0' : '$0';
    return new Intl.NumberFormat(language === 'id' ? 'id-ID' : 'en-US', {
      style: 'currency',
      currency: user?.currency || 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num);
  };

  const processImageFile = async (file: File) => {
    // Add user message with image preview placeholder
    const userMsgId = Math.random().toString();
    setIsTyping(true);

    try {
      // Compress and resize client-side to < 150KB
      addToast(language === 'id' ? 'Mengompresi gambar...' : 'Compressing image...', 'info');
      const { dataUrl, base64: base64Content } = await compressImage(file);
      const mimeType = 'image/jpeg'; // always jpeg after canvas export

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

      // 1. Call receipt scanner API
      addToast(language === 'id' ? 'Memproses struk...' : 'Processing receipt...', 'info');
      const receipt = await toolsApi.scanReceipt(base64Content, mimeType);

      if (!receipt || (!receipt.merchantName && !receipt.totalAmount)) {
        throw new Error('Could not read receipt data');
      }

      // 2. Generate natural language command to call our chatEntry API
      const dateStr = receipt.date || getLocalDateString();
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
        new Date().toISOString(),
        {
          assets: assets.map(a => ({ id: a.id, name: a.name, type: a.type, purchasePrice: a.purchasePrice, currentPrice: a.currentPrice })),
          debts: debts.map(d => ({ id: d.id, title: d.title, type: d.type, contact: d.contact, amount: d.amount, remainingAmount: d.remainingAmount, dueDate: d.dueDate, interestRate: d.interestRate, status: d.status })),
          fixedExpenses: budget.fixedExpenses.map(fe => ({ name: fe.name, amount: fe.amount, dueDate: fe.dueDate, status: fe.status, lastPaid: fe.lastPaid })),
          incomeSources: budget.incomeSources.map(is => ({ name: is.name, amount: is.amount }))
        }
      );

      // Prepend receipt scanning success text
      let msgText = language === 'id'
        ? `Struk terdeteksi dari *${merchant}* sebesar *${formatCurrency(amount)}*.\nApakah Anda ingin mencatat pengeluaran ini?`
        : `Receipt detected from *${merchant}* for *${formatCurrency(amount)}*.\nWould you like to record this expense?`;

      if (data.duplicateAlert) {
        msgText = `${data.duplicateAlert}\n\n${msgText}`;
      }

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

      if (isVoiceEnabled) {
        let spokenAlerts = "";
        if (data.duplicateAlert) spokenAlerts += data.duplicateAlert + ". ";
        if (data.budgetAlert) spokenAlerts += data.budgetAlert + ". ";
        const baseSpoken = language === 'id'
          ? `Struk terdeteksi dari ${merchant} sebesar ${amount} Rupiah. Apakah Anda ingin mencatat pengeluaran ini?`
          : `Receipt detected from ${merchant} for ${formatCurrency(amount)}. Would you like to record this expense?`;
        speakText(spokenAlerts + baseSpoken);
      }
    } catch (err: any) {
      console.error('Failed to scan receipt in chat:', err);
      const errText = language === 'id'
        ? "Maaf, saya kesulitan memindai struk tersebut. Pastikan foto struk terlihat jelas dan coba lagi ya."
        : "Sorry, I had trouble scanning that receipt. Please ensure the photo is clear and try again.";
      setMessages(prev => [
        ...prev,
        {
          id: Math.random().toString(),
          sender: 'ai',
          text: errText,
          timestamp: new Date()
        }
      ]);
      addToast(language === 'id' ? 'Gagal memindai struk' : 'Failed to scan receipt', 'error');
      if (isVoiceEnabled) {
        speakText(errText);
      }
    } finally {
      setIsTyping(false);
      // Clear input value
      if (galleryInputRef.current) galleryInputRef.current.value = '';
      setShowSourcePicker(false);
    }
  };
  const handleNativeCamera = async () => {
    setShowSourcePicker(false);
    
    try {
      const image = await CapacitorCamera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera
      });

      if (!image.base64String) return;

      const userMsgId = Math.random().toString();
      setIsTyping(true);

      const dataUrl = `data:image/${image.format || 'jpeg'};base64,${image.base64String}`;
      
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

      addToast(language === 'id' ? 'Memproses struk...' : 'Processing receipt...', 'info');
      const mimeType = `image/${image.format || 'jpeg'}`;
      const receipt = await toolsApi.scanReceipt(image.base64String, mimeType);

      if (!receipt || (!receipt.merchantName && !receipt.totalAmount)) {
        throw new Error('Could not read receipt data');
      }

      const dateStr = receipt.date || getLocalDateString();
      const merchant = receipt.merchantName || 'Merchant';
      const amount = receipt.totalAmount || 0;

      const generatedCommand = language === 'id'
        ? `Beli ${merchant} sebesar ${amount} tanggal ${dateStr}`
        : `Bought ${merchant} for ${amount} on ${dateStr}`;

      const data = await toolsApi.chatEntry(
        generatedCommand,
        wallets.map(w => ({ id: w.id, name: w.name, balance: w.balance })),
        categories.map(c => ({ id: c.id, name: c.name, type: c.type, budgetLimit: c.budgetLimit })),
        goals.map(g => ({ id: g.id, name: g.name, currentAmount: g.currentAmount, targetAmount: g.targetAmount })),
        new Date().toISOString(),
        {
          assets: assets.map(a => ({ id: a.id, name: a.name, type: a.type, purchasePrice: a.purchasePrice, currentPrice: a.currentPrice })),
          debts: debts.map(d => ({ id: d.id, title: d.title, type: d.type, contact: d.contact, amount: d.amount, remainingAmount: d.remainingAmount, dueDate: d.dueDate, interestRate: d.interestRate, status: d.status })),
          fixedExpenses: budget.fixedExpenses.map(fe => ({ name: fe.name, amount: fe.amount, dueDate: fe.dueDate, status: fe.status, lastPaid: fe.lastPaid })),
          incomeSources: budget.incomeSources.map(is => ({ name: is.name, amount: is.amount }))
        }
      );

      let msgText = language === 'id'
        ? `Struk terdeteksi dari *${merchant}* sebesar *${formatCurrency(amount)}*.\nApakah Anda ingin mencatat pengeluaran ini?`
        : `Receipt detected from *${merchant}* for *${formatCurrency(amount)}*.\nWould you like to record this expense?`;

      if (data.duplicateAlert) msgText = `${data.duplicateAlert}\n\n${msgText}`;
      if (data.budgetAlert) msgText = `${data.budgetAlert}\n\n${msgText}`;

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

      if (isVoiceEnabled) {
        let spokenAlerts = "";
        if (data.duplicateAlert) spokenAlerts += data.duplicateAlert + ". ";
        if (data.budgetAlert) spokenAlerts += data.budgetAlert + ". ";
        const baseSpoken = language === 'id'
          ? `Struk terdeteksi dari ${merchant} sebesar ${amount} Rupiah. Apakah Anda ingin mencatat pengeluaran ini?`
          : `Receipt detected from ${merchant} for ${formatCurrency(amount)}. Would you like to record this expense?`;
        speakText(spokenAlerts + baseSpoken);
      }
    } catch (err: any) {
      if (!err.message?.includes('User cancelled') && !err.message?.includes('cancelled')) {
        console.error('Failed to scan receipt in chat:', err);
        const errText = language === 'id'
          ? "Maaf, saya kesulitan memindai struk tersebut. Pastikan foto struk terlihat jelas dan coba lagi ya."
          : "Sorry, I had trouble scanning that receipt. Please ensure the photo is clear and try again.";
        setMessages(prev => [
          ...prev,
          {
            id: Math.random().toString(),
            sender: 'ai',
            text: errText,
            timestamp: new Date()
          }
        ]);
        addToast(language === 'id' ? 'Gagal memindai struk' : 'Failed to scan receipt', 'error');
        if (isVoiceEnabled) speakText(errText);
      }
    } finally {
      setIsTyping(false);
    }
  };


  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processImageFile(file);
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLInputElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          await processImageFile(file);
          break;
        }
      }
    }
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

  const executeActionText = async (userText: string, autoConfirm: boolean = false) => {
    if (!userText || isTyping) return;

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
        new Date().toISOString(),
        {
          assets: assets.map(a => ({ id: a.id, name: a.name, type: a.type, purchasePrice: a.purchasePrice, currentPrice: a.currentPrice })),
          debts: debts.map(d => ({ id: d.id, title: d.title, type: d.type, contact: d.contact, amount: d.amount, remainingAmount: d.remainingAmount, dueDate: d.dueDate, interestRate: d.interestRate, status: d.status })),
          fixedExpenses: budget.fixedExpenses.map(fe => ({ name: fe.name, amount: fe.amount, dueDate: fe.dueDate, status: fe.status, lastPaid: fe.lastPaid })),
          incomeSources: budget.incomeSources.map(is => ({ name: is.name, amount: is.amount }))
        }
      );

      let spokenText = "";
      const aiMsgId = Math.random().toString();

      if (data.action === 'answer') {
        spokenText = data.message;
        setMessages(prev => [
          ...prev,
          {
            id: aiMsgId,
            sender: 'ai',
            text: data.message,
            timestamp: new Date()
          }
        ]);
      } else if (data.action === 'delete_not_found') {
        spokenText = data.message || (language === 'id' ? "Transaksi tidak ditemukan." : "Transaction not found.");
        setMessages(prev => [
          ...prev,
          {
            id: aiMsgId,
            sender: 'ai',
            text: spokenText,
            timestamp: new Date()
          }
        ]);
      } else if (data.action === 'create_category') {
        spokenText = data.message || (language === 'id' 
          ? `Kategori "${data.categoryName}" belum terdaftar. Apakah Anda ingin membuatnya?` 
          : `Category "${data.categoryName}" is not registered. Would you like to create it?`);
        setMessages(prev => [
          ...prev,
          {
            id: aiMsgId,
            sender: 'ai',
            text: spokenText,
            timestamp: new Date(),
            parsedData: data,
            status: 'pending'
          }
        ]);
      } else if (data.action === 'delete') {
        spokenText = language === 'id'
          ? "Saya menemukan transaksi berikut untuk dihapus/dibatalkan. Apakah Anda yakin ingin membatalkannya?"
          : "I found the following transaction to cancel/delete. Are you sure you want to cancel it?";
        setMessages(prev => [
          ...prev,
          {
            id: aiMsgId,
            sender: 'ai',
            text: spokenText,
            timestamp: new Date(),
            parsedData: data,
            status: 'pending'
          }
        ]);
      } else if (data.action === 'allocate_goal') {
        spokenText = language === 'id'
          ? "Saya mendeteksi niat menabung. Apakah Anda ingin menyisihkan uang Anda ke sasaran tabungan ini?"
          : "I detected a savings contribution goal. Would you like to allocate money towards this goal?";
        setMessages(prev => [
          ...prev,
          {
            id: aiMsgId,
            sender: 'ai',
            text: spokenText,
            timestamp: new Date(),
            parsedData: data,
            status: 'pending'
          }
        ]);
      } else if (data.action === 'create_debt') {
        spokenText = language === 'id'
          ? `Saya mendeteksi pencatatan ${data.type === 'DEBT' ? 'hutang' : 'piutang'} baru. Apakah Anda ingin mencatatnya?`
          : `I detected a new ${data.type === 'DEBT' ? 'debt' : 'receivable'} entry. Would you like to record it?`;
        setMessages(prev => [
          ...prev,
          {
            id: aiMsgId,
            sender: 'ai',
            text: spokenText,
            timestamp: new Date(),
            parsedData: data,
            status: 'pending'
          }
        ]);
      } else if (data.action === 'pay_debt') {
        spokenText = language === 'id'
          ? `Saya mendeteksi pembayaran ${data.debtTitle ? `"${data.debtTitle}"` : 'hutang/piutang'}. Apakah Anda ingin memprosesnya?`
          : `I detected a payment for ${data.debtTitle ? `"${data.debtTitle}"` : 'debt/receivable'}. Would you like to process it?`;
        setMessages(prev => [
          ...prev,
          {
            id: aiMsgId,
            sender: 'ai',
            text: spokenText,
            timestamp: new Date(),
            parsedData: data,
            status: 'pending'
          }
        ]);
      } else if (data.action === 'debt_not_found') {
        spokenText = data.message || (language === 'id' ? "Hutang/piutang tidak ditemukan." : "Debt/receivable not found.");
        setMessages(prev => [
          ...prev,
          {
            id: aiMsgId,
            sender: 'ai',
            text: spokenText,
            timestamp: new Date()
          }
        ]);
      } else if (data.action === 'create_wallets') {
        spokenText = language === 'id'
          ? `Saya mendeteksi permintaan untuk membuat ${data.wallets?.length || 1} dompet baru. Apakah Anda ingin membuatnya?`
          : `I detected a request to create ${data.wallets?.length || 1} new wallets. Would you like to create them?`;
        setMessages(prev => [...prev, { id: aiMsgId, sender: 'ai', text: spokenText, timestamp: new Date(), parsedData: data, status: 'pending' }]);
      } else if (data.action === 'create_goal') {
        spokenText = language === 'id'
          ? `Saya mendeteksi sasaran tabungan baru "${data.name}" dengan target ${formatCurrency(data.targetAmount)}. Apakah Anda ingin membuatnya?`
          : `I detected a new savings goal "${data.name}" for ${formatCurrency(data.targetAmount)}. Would you like to create it?`;
        setMessages(prev => [...prev, { id: aiMsgId, sender: 'ai', text: spokenText, timestamp: new Date(), parsedData: data, status: 'pending' }]);
      } else if (data.action === 'create_asset') {
        spokenText = language === 'id'
          ? `Saya mendeteksi pembelian aset "${data.name}" seharga ${formatCurrency(data.purchasePrice)}. Apakah Anda ingin mencatatnya?`
          : `I detected an asset purchase "${data.name}" for ${formatCurrency(data.purchasePrice)}. Would you like to record it?`;
        setMessages(prev => [...prev, { id: aiMsgId, sender: 'ai', text: spokenText, timestamp: new Date(), parsedData: data, status: 'pending' }]);
      } else if (data.action === 'create_income_source') {
        spokenText = language === 'id'
          ? `Saya mendeteksi sumber pemasukan baru "${data.name}" sebesar ${formatCurrency(data.amount)}. Apakah Anda ingin menambahkannya?`
          : `I detected a new income source "${data.name}" for ${formatCurrency(data.amount)}. Would you like to add it?`;
        setMessages(prev => [...prev, { id: aiMsgId, sender: 'ai', text: spokenText, timestamp: new Date(), parsedData: data, status: 'pending' }]);
      } else if (data.action === 'create_fixed_expense') {
        spokenText = language === 'id'
          ? `Saya mendeteksi pengeluaran rutin "${data.name}" sebesar ${formatCurrency(data.amount)} tiap tanggal ${data.dueDate || 1}. Apakah Anda ingin menambahkannya?`
          : `I detected a new fixed expense "${data.name}" for ${formatCurrency(data.amount)} due on the ${data.dueDate || 1}. Would you like to add it?`;
        setMessages(prev => [...prev, { id: aiMsgId, sender: 'ai', text: spokenText, timestamp: new Date(), parsedData: data, status: 'pending' }]);
      } else if (data.action === 'create_transactions') {
        let msgText = language === 'id'
          ? `Saya mendeteksi rincian ${data.transactions?.length || 1} transaksi berikut. Apakah datanya sudah sesuai?`
          : `I detected the following ${data.transactions?.length || 1} transaction details. Does this look correct?`;

        let spokenAlerts = "";
        data.transactions?.forEach((tx: any, idx: number) => {
          if (tx.duplicateAlert) {
            msgText = `Transaksi ${idx + 1}: ${tx.duplicateAlert}\n\n${msgText}`;
            spokenAlerts += tx.duplicateAlert + ". ";
          }
          if (tx.budgetAlert) {
            msgText = `Transaksi ${idx + 1}: ${tx.budgetAlert}\n\n${msgText}`;
            spokenAlerts += tx.budgetAlert + ". ";
          }
        });

        spokenText = spokenAlerts + (language === 'id'
          ? `Saya mendeteksi rincian ${data.transactions?.length || 1} transaksi. Apakah sudah sesuai?`
          : `I detected transaction details for ${data.transactions?.length || 1} items. Is it correct?`);

        setMessages(prev => [
          ...prev,
          {
            id: aiMsgId,
            sender: 'ai',
            text: msgText,
            timestamp: new Date(),
            parsedData: data,
            status: 'pending'
          }
        ]);
      }

      // Vocalize AI response if voice mode is enabled
      if (isVoiceEnabled && spokenText) {
        speakText(spokenText);
      }

      // Automatically execute if requested via voice
      if (autoConfirm && data.action !== 'answer' && data.action !== 'delete_not_found') {
        setTimeout(() => handleConfirm(aiMsgId, data), 100);
      }
    } catch (err: any) {
      console.error('Chat AI Assistant Error:', err);
      const errText = language === 'id'
        ? "Maaf, saya kesulitan memahami transaksi tersebut. Bisa tolong ulangi dengan kalimat yang lebih jelas?"
        : "Sorry, I had trouble parsing that. Could you please rephrase it more clearly?";
      setMessages(prev => [
        ...prev,
        {
          id: Math.random().toString(),
          sender: 'ai',
          text: errText,
          timestamp: new Date()
        }
      ]);
      if (isVoiceEnabled) {
        speakText(errText);
      }
    } finally {
      setIsTyping(false);
    }
  };

  const handleSend = () => {
    if (!input.trim() || isTyping) return;
    const text = input.trim();
    setInput('');
    executeActionText(text);
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
      } else if (parsedData.action === 'create_category') {
        const limitStr = categoryLimits[messageId] || '0';
        const limitNum = parseFloat(limitStr) || 0;

        // 1. Create the category
        const newCategory = await addCategory({
          name: parsedData.categoryName,
          type: parsedData.type || 'expense',
          color: parsedData.color || '#3B82F6',
          icon: parsedData.icon || 'Tag',
          budgetLimit: limitNum > 0 ? limitNum : undefined
        });

        if (!newCategory) {
          throw new Error('Failed to create category');
        }

        // Update message status
        setMessages(prev =>
          prev.map(m => (m.id === messageId ? { ...m, status: 'confirmed' } : m))
        );

        // Success message for category creation
        const limitText = limitNum > 0 ? formatCurrency(limitNum) : (language === 'id' ? 'Tanpa Limit' : 'No Limit');
        setMessages(prev => [
          ...prev,
          {
            id: Math.random().toString(),
            sender: 'ai',
            text: language === 'id'
              ? `Kategori "${parsedData.categoryName}" berhasil dibuat dengan alokasi ${limitText}! 🏷️`
              : `Category "${parsedData.categoryName}" successfully created with budget of ${limitText}! 🏷️`,
            timestamp: new Date()
          }
        ]);

        // 2. If there is a pending transaction, automatically log it using the new category ID!
        if (parsedData.pendingTransaction) {
          const pending = parsedData.pendingTransaction;
          
          await addJournal({
            description: pending.description,
            amount: pending.amount,
            type: pending.type || 'expense',
            categoryId: newCategory.id, // use the newly created category ID!
            walletId: pending.walletId,
            date: pending.date,
            note: `Recorded via AI Assistant (Auto-Created Category)`
          });

          setMessages(prev => [
            ...prev,
            {
              id: Math.random().toString(),
              sender: 'ai',
              text: language === 'id'
                ? `Mantap! Transaksi "${pending.description}" sebesar ${formatCurrency(pending.amount)} berhasil dicatat di kategori "${parsedData.categoryName}"! 🎉`
                : `Success! Transaction "${pending.description}" of ${formatCurrency(pending.amount)} has been recorded under "${parsedData.categoryName}"! 🎉`,
              timestamp: new Date()
            }
          ]);
          addToast(language === 'id' ? 'Transaksi & Kategori dicatat!' : 'Transaction & Category recorded!', 'success');
        } else {
          addToast(language === 'id' ? 'Kategori berhasil dibuat!' : 'Category created!', 'success');
        }
      } else if (parsedData.action === 'create_transactions') {
        // Create multiple transactions
        parsedData.transactions.forEach((tx: any) => {
          addJournal({
            description: tx.description,
            amount: tx.amount,
            type: tx.type || 'expense',
            categoryId: tx.type === 'transfer' ? undefined : tx.categoryId,
            walletId: tx.walletId,
            toWalletId: tx.type === 'transfer' ? tx.toWalletId : undefined,
            date: tx.date,
            note: `Recorded via AI Assistant Chat`,
          });
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
              ? `Mantap! ${parsedData.transactions.length} transaksi berhasil disimpan ke dompet Anda! 🎉`
              : `Success! ${parsedData.transactions.length} transactions have been recorded! 🎉`,
            timestamp: new Date()
          }
        ]);
        addToast(language === 'id' ? 'Transaksi dicatat!' : 'Transactions recorded!', 'success');
      } else if (!parsedData.action || parsedData.action === 'create') {
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
      } else if (parsedData.action === 'create_debt') {
        // Create debt/receivable
        await addDebt({
          title: parsedData.title,
          type: parsedData.type,
          contact: parsedData.contact,
          amount: parsedData.amount,
          dueDate: parsedData.dueDate || undefined,
          interestRate: parsedData.interestRate || 0,
          notes: parsedData.notes || 'Via AI Chat',
          walletId: parsedData.walletId || undefined
        });

        setMessages(prev =>
          prev.map(m => (m.id === messageId ? { ...m, status: 'confirmed' } : m))
        );

        const debtLabel = parsedData.type === 'DEBT'
          ? (language === 'id' ? 'Hutang' : 'Debt')
          : (language === 'id' ? 'Piutang' : 'Receivable');

        setMessages(prev => [
          ...prev,
          {
            id: Math.random().toString(),
            sender: 'ai',
            text: language === 'id'
              ? `${debtLabel} "${parsedData.title}" sebesar ${formatCurrency(parsedData.amount)} ke ${parsedData.contact} berhasil dicatat! 📝`
              : `${debtLabel} "${parsedData.title}" of ${formatCurrency(parsedData.amount)} with ${parsedData.contact} has been recorded! 📝`,
            timestamp: new Date()
          }
        ]);
        addToast(language === 'id' ? `${debtLabel} dicatat!` : `${debtLabel} recorded!`, 'success');
      } else if (parsedData.action === 'pay_debt') {
        // Pay debt
        await payDebt(parsedData.debtId, {
          walletId: parsedData.walletId,
          amount: parsedData.amount,
          note: 'Paid via AI Chat'
        });

        setMessages(prev =>
          prev.map(m => (m.id === messageId ? { ...m, status: 'confirmed' } : m))
        );

        setMessages(prev => [
          ...prev,
          {
            id: Math.random().toString(),
            sender: 'ai',
            text: language === 'id'
              ? `Pembayaran ${formatCurrency(parsedData.amount)} untuk "${parsedData.debtTitle}" berhasil diproses dari dompet ${parsedData.walletName}! 💰`
              : `Payment of ${formatCurrency(parsedData.amount)} for "${parsedData.debtTitle}" has been processed from ${parsedData.walletName}! 💰`,
            timestamp: new Date()
          }
        ]);
        addToast(language === 'id' ? 'Pembayaran berhasil!' : 'Payment successful!', 'success');
      } else if (parsedData.action === 'create_wallets') {
        parsedData.wallets.forEach((w: any) => {
          addWallet({ name: w.name, type: 'cash', account: '', balance: w.balance || 0, color: '#10B981', icon: 'Wallet' });
        });
        setMessages(prev => prev.map(m => (m.id === messageId ? { ...m, status: 'confirmed' } : m)));
        setMessages(prev => [...prev, { id: Math.random().toString(), sender: 'ai', text: language === 'id' ? `${parsedData.wallets.length} dompet berhasil dibuat! 💳` : `${parsedData.wallets.length} wallets created successfully! 💳`, timestamp: new Date() }]);
        addToast(language === 'id' ? 'Dompet dibuat!' : 'Wallets created!', 'success');
      } else if (parsedData.action === 'create_goal') {
        addGoal({ name: parsedData.name, targetAmount: parsedData.targetAmount, currentAmount: parsedData.currentAmount || 0, color: '#3B82F6', icon: 'Target', deadline: parsedData.deadline || undefined });
        setMessages(prev => prev.map(m => (m.id === messageId ? { ...m, status: 'confirmed' } : m)));
        setMessages(prev => [...prev, { id: Math.random().toString(), sender: 'ai', text: language === 'id' ? `Target tabungan "${parsedData.name}" berhasil dibuat! 🎯` : `Savings goal "${parsedData.name}" created successfully! 🎯`, timestamp: new Date() }]);
        addToast(language === 'id' ? 'Target tabungan dibuat!' : 'Goal created!', 'success');
      } else if (parsedData.action === 'create_asset') {
        await addAsset({ name: parsedData.name, type: parsedData.type || 'OTHER', purchasePrice: parsedData.purchasePrice, currentPrice: parsedData.purchasePrice, purchaseDate: new Date().toISOString(), notes: 'Via AI Chat' });
        if (parsedData.walletId) {
          const w = wallets.find(ww => ww.id === parsedData.walletId);
          if (w) await updateWallet(w.id, { balance: w.balance - parsedData.purchasePrice });
        }
        setMessages(prev => prev.map(m => (m.id === messageId ? { ...m, status: 'confirmed' } : m)));
        setMessages(prev => [...prev, { id: Math.random().toString(), sender: 'ai', text: language === 'id' ? `Aset "${parsedData.name}" berhasil dicatat! 📈` : `Asset "${parsedData.name}" recorded successfully! 📈`, timestamp: new Date() }]);
        addToast(language === 'id' ? 'Aset dicatat!' : 'Asset recorded!', 'success');
      } else if (parsedData.action === 'create_income_source') {
        addIncomeSource({ name: parsedData.name, amount: parsedData.amount });
        setMessages(prev => prev.map(m => (m.id === messageId ? { ...m, status: 'confirmed' } : m)));
        setMessages(prev => [...prev, { id: Math.random().toString(), sender: 'ai', text: language === 'id' ? `Sumber pemasukan "${parsedData.name}" berhasil ditambahkan! 💵` : `Income source "${parsedData.name}" added successfully! 💵`, timestamp: new Date() }]);
        addToast(language === 'id' ? 'Pemasukan ditambahkan!' : 'Income source added!', 'success');
      } else if (parsedData.action === 'create_fixed_expense') {
        addFixedExpense({ name: parsedData.name, amount: parsedData.amount, dueDate: parsedData.dueDate || 1, status: 'ACTIVE' });
        setMessages(prev => prev.map(m => (m.id === messageId ? { ...m, status: 'confirmed' } : m)));
        setMessages(prev => [...prev, { id: Math.random().toString(), sender: 'ai', text: language === 'id' ? `Pengeluaran rutin "${parsedData.name}" berhasil ditambahkan! 🗓️` : `Fixed expense "${parsedData.name}" added successfully! 🗓️`, timestamp: new Date() }]);
        addToast(language === 'id' ? 'Pengeluaran rutin ditambahkan!' : 'Fixed expense added!', 'success');
      }
    } catch (err) {
      console.error(err);
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
        className="fixed bottom-[160px] right-6 lg:bottom-8 lg:right-8 z-[80] w-14 h-14 rounded-full bg-gradient-to-tr from-secondary to-primary flex items-center justify-center text-white shadow-[0_8px_30px_rgb(139,92,246,0.3)] hover:scale-110 active:scale-95 transition-all cursor-pointer group"
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
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/80 z-[90] sm:hidden"
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="modal"
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ type: "tween", ease: [0.32, 0.72, 0, 1], duration: 0.3 }}
            className="fixed bottom-0 left-0 right-0 z-[100] w-full h-[85dvh] sm:bottom-[164px] sm:right-6 sm:left-auto lg:bottom-28 lg:right-8 sm:w-[400px] sm:h-[600px] rounded-t-[32px] sm:rounded-[30px] border-t border-l border-r sm:border border-on-surface/10 flex flex-col overflow-hidden shadow-2xl bg-[#12141c] will-change-transform"
          >
            {/* Header */}
            <div className="px-6 py-5 flex items-center justify-between border-b border-on-surface/5 bg-on-surface/5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-secondary/15 flex items-center justify-center text-secondary border border-secondary/20">
                  <Sparkles size={18} className="animate-pulse" />
                </div>
                <div>
                  <h4 className="font-display text-sm font-bold text-on-surface tracking-tight">Stashly AI Assistant</h4>
                  <p className="text-[10px] text-on-surface/40 uppercase tracking-widest font-bold">Online</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsVoiceModalOpen(true)}
                  title={language === 'id' ? "Panggilan Suara AI" : "AI Voice Call"}
                  className="p-2 rounded-xl transition-all bg-secondary/10 text-secondary hover:bg-secondary/20 flex items-center gap-2"
                >
                  <Mic size={16} />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-on-surface/5 rounded-xl transition-all"
                >
                  <X size={18} className="text-on-surface/40" />
                </button>
              </div>
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
                  <div className="relative group/bubble w-full">
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


                  </div>

                  {/* Parse Data Card Preview */}
                  {msg.parsedData && msg.status === 'pending' && (
                    msg.parsedData.action === 'create_category' ? (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="w-full bg-on-surface/5 rounded-2xl p-4 mt-2 space-y-4 shadow-md border border-primary/30 transition-all"
                      >
                        <div className="flex items-center gap-2 border-b border-on-surface/5 pb-2">
                          <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30 text-primary">
                            <Tag size={16} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-[9px] font-bold uppercase tracking-widest text-primary flex items-center gap-1.5">
                              {language === 'id' ? 'BUAT KATEGORI BARU' : 'CREATE NEW CATEGORY'}
                            </span>
                            <h4 className="text-xs font-bold text-on-surface truncate">
                              {msg.parsedData.categoryName}
                            </h4>
                          </div>
                        </div>

                        {/* Description message */}
                        <p className="text-[11px] text-on-surface/75 leading-relaxed">
                          {language === 'id' 
                            ? `Kategori "${msg.parsedData.categoryName}" (${msg.parsedData.type === 'expense' ? 'Pengeluaran' : 'Pemasukan'}) belum terdaftar. Silakan tentukan alokasi anggaran bulanan untuk kategori ini:` 
                            : `Category "${msg.parsedData.categoryName}" (${msg.parsedData.type || 'expense'}) is not registered yet. Please specify the monthly budget limit:`}
                        </p>

                        {/* Budget Limit Input */}
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-bold uppercase tracking-wider text-on-surface/40 flex justify-between">
                            <span>{language === 'id' ? 'Alokasi Limit Bulanan' : 'Monthly Budget Limit'}</span>
                            <span className="text-primary font-semibold text-[10px]">
                              {categoryLimits[msg.id] && parseFloat(categoryLimits[msg.id]) > 0
                                ? formatCurrency(parseFloat(categoryLimits[msg.id]))
                                : (language === 'id' ? 'Tanpa Limit (Rp 0)' : 'No Limit ($0)')}
                            </span>
                          </label>
                          <div className="relative flex items-center">
                            <div className="absolute left-3 text-xs font-semibold text-on-surface/40">Rp</div>
                            <input
                              type="number"
                              min="0"
                              placeholder={language === 'id' ? "0 (Tanpa limit)" : "0 (No limit)"}
                              value={categoryLimits[msg.id] || ''}
                              onChange={(e) => setCategoryLimits(prev => ({ ...prev, [msg.id]: e.target.value }))}
                              className="w-full pl-9 pr-4 py-2 text-xs bg-on-surface/5 hover:bg-on-surface/10 focus:bg-on-surface/10 rounded-xl border border-on-surface/5 focus:border-primary/50 text-on-surface font-semibold placeholder:text-on-surface/20 outline-none transition-all"
                            />
                          </div>
                        </div>

                        {/* Pending Transaction preview if present */}
                        {msg.parsedData.pendingTransaction && (
                          <div className="p-2.5 rounded-xl bg-on-surface/5 border border-on-surface/5 space-y-1">
                            <span className="text-[8px] font-bold text-on-surface/30 uppercase tracking-widest">
                              {language === 'id' ? 'TRANSAKSI TERTUNDA' : 'PENDING TRANSACTION'}
                            </span>
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-semibold text-on-surface/80">{msg.parsedData.pendingTransaction.description}</span>
                              <span className="font-bold text-on-surface">{formatCurrency(msg.parsedData.pendingTransaction.amount)}</span>
                            </div>
                          </div>
                        )}

                        {/* Confirmation Buttons */}
                        <div className="flex gap-2 pt-2">
                          <button
                            onClick={() => handleConfirm(msg.id, msg.parsedData)}
                            className="flex-1 py-2 rounded-xl bg-success text-white font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                          >
                            <Check size={12} />
                            {language === 'id' ? 'Buat Kategori' : 'Create Category'}
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
                    ) : msg.parsedData.action === 'create_transactions' ? (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="w-full bg-on-surface/5 rounded-2xl p-4 mt-2 space-y-3 shadow-md border border-secondary/25 transition-all"
                      >
                        <div className="flex items-center gap-1.5 border-b border-on-surface/5 pb-2 text-[10px] font-bold uppercase tracking-widest text-secondary">
                          <Check size={12} />
                          {language === 'id' ? `KONFIRMASI ${msg.parsedData.transactions?.length || 0} TRANSAKSI` : `CONFIRM ${msg.parsedData.transactions?.length || 0} TRANSACTIONS`}
                        </div>
                        
                        <div className="space-y-3">
                          {msg.parsedData.transactions?.map((tx: any, idx: number) => {
                            const editKey = `${msg.id}-${idx}`;
                            const isEditing = editingData[editKey];
                            return (
                              <div key={idx} className={cn("p-3 rounded-xl border relative", tx.budgetAlert || tx.duplicateAlert ? "border-amber-500/40 bg-amber-500/5" : "border-on-surface/10 bg-on-surface/5")}>
                                {/* Header / Actions */}
                                <div className="absolute top-2 right-2 flex gap-1">
                                  <button onClick={() => toggleEditMode(msg.id, idx)} className="p-1.5 rounded-lg bg-surface text-on-surface/50 hover:text-primary hover:bg-primary/10 transition-colors shadow-sm">
                                    <PenLine size={12} />
                                  </button>
                                </div>

                                {isEditing ? (
                                  <div className="space-y-2 pr-8 mt-1">
                                    <div className="flex gap-2">
                                      <input 
                                        type="text" 
                                        value={tx.description} 
                                        onChange={(e) => handleEditItem(msg.id, idx, 'description', e.target.value, 'transactions')} 
                                        className="flex-1 px-2 py-1.5 text-xs rounded-lg border border-on-surface/10 bg-surface outline-none focus:border-primary text-on-surface"
                                        placeholder="Description"
                                      />
                                      <input 
                                        type="number" 
                                        value={tx.amount || ''} 
                                        onChange={(e) => handleEditItem(msg.id, idx, 'amount', Number(e.target.value), 'transactions')} 
                                        className="w-24 px-2 py-1.5 text-xs rounded-lg border border-on-surface/10 bg-surface outline-none focus:border-primary text-on-surface"
                                        placeholder="Amount"
                                      />
                                    </div>
                                    <select 
                                      value={tx.type} 
                                      onChange={(e) => handleEditItem(msg.id, idx, 'type', e.target.value, 'transactions')}
                                      className="w-full px-2 py-1.5 text-xs rounded-lg border border-on-surface/10 bg-surface outline-none focus:border-primary text-on-surface"
                                    >
                                      <option value="expense">Expense / Pengeluaran</option>
                                      <option value="income">Income / Pemasukan</option>
                                      <option value="transfer">Transfer</option>
                                    </select>
                                    {/* Warnings if any */}
                                    {tx.duplicateAlert && <p className="text-[9px] text-amber-500 mt-1">{tx.duplicateAlert}</p>}
                                    {tx.budgetAlert && <p className="text-[9px] text-amber-500 mt-1">{tx.budgetAlert}</p>}
                                  </div>
                                ) : (
                                  <div className="pr-8 space-y-1">
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="font-bold text-on-surface">{tx.description}</span>
                                      <span className={cn("font-bold", tx.type === 'expense' ? "text-error" : tx.type === 'income' ? "text-success" : "text-secondary")}>
                                        {formatCurrency(tx.amount)}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] text-on-surface/50">
                                      <span className="flex items-center gap-1"><Wallet size={10}/> {wallets.find(w => w.id === tx.walletId)?.name || 'Unknown'}</span>
                                      {tx.type !== 'transfer' && tx.categoryId && (
                                        <span className="flex items-center gap-1"><Tag size={10}/> {categories.find(c => c.id === tx.categoryId)?.name || 'Unknown'}</span>
                                      )}
                                    </div>
                                    {tx.duplicateAlert && <p className="text-[9px] text-amber-500 mt-1">{tx.duplicateAlert}</p>}
                                    {tx.budgetAlert && <p className="text-[9px] text-amber-500 mt-1">{tx.budgetAlert}</p>}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        
                        {/* Confirmation Buttons */}
                        <div className="flex gap-2 pt-2">
                          <button onClick={() => handleConfirm(msg.id, msg.parsedData)} className="flex-1 py-2 rounded-xl bg-success text-white font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer">
                            <Check size={12} /> {language === 'id' ? 'Simpan Semua' : 'Save All'}
                          </button>
                          <button onClick={() => handleCancel(msg.id)} className="flex-1 py-2 rounded-xl bg-error/15 text-error border border-error/20 font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer">
                            <Ban size={12} /> {language === 'id' ? 'Batal' : 'Cancel'}
                          </button>
                        </div>
                      </motion.div>
                    ) : msg.parsedData.action === 'create_wallets' ? (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="w-full bg-on-surface/5 rounded-2xl p-4 mt-2 space-y-3 shadow-md border border-primary/30 transition-all"
                      >
                        <div className="flex items-center gap-1.5 border-b border-on-surface/5 pb-2 text-[10px] font-bold uppercase tracking-widest text-primary">
                          <Wallet size={12} />
                          {language === 'id' ? `BUAT ${msg.parsedData.wallets?.length || 0} DOMPET` : `CREATE ${msg.parsedData.wallets?.length || 0} WALLETS`}
                        </div>
                        
                        <div className="space-y-3">
                          {msg.parsedData.wallets?.map((w: any, idx: number) => {
                            const editKey = `${msg.id}-${idx}`;
                            const isEditing = editingData[editKey];
                            return (
                              <div key={idx} className="p-3 rounded-xl border border-on-surface/10 bg-on-surface/5 relative">
                                <div className="absolute top-2 right-2 flex gap-1">
                                  <button onClick={() => toggleEditMode(msg.id, idx)} className="p-1.5 rounded-lg bg-surface text-on-surface/50 hover:text-primary hover:bg-primary/10 transition-colors shadow-sm">
                                    <PenLine size={12} />
                                  </button>
                                </div>

                                {isEditing ? (
                                  <div className="space-y-2 pr-8 mt-1">
                                    <div className="flex gap-2">
                                      <input 
                                        type="text" 
                                        value={w.name} 
                                        onChange={(e) => handleEditItem(msg.id, idx, 'name', e.target.value, 'wallets')} 
                                        className="flex-1 px-2 py-1.5 text-xs rounded-lg border border-on-surface/10 bg-surface outline-none focus:border-primary text-on-surface"
                                        placeholder="Wallet Name"
                                      />
                                      <input 
                                        type="number" 
                                        value={w.balance || ''} 
                                        onChange={(e) => handleEditItem(msg.id, idx, 'balance', Number(e.target.value), 'wallets')} 
                                        className="w-24 px-2 py-1.5 text-xs rounded-lg border border-on-surface/10 bg-surface outline-none focus:border-primary text-on-surface"
                                        placeholder="Balance"
                                      />
                                    </div>
                                  </div>
                                ) : (
                                  <div className="pr-8 space-y-1">
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="font-bold text-on-surface">{w.name}</span>
                                      <span className="font-bold text-success">{formatCurrency(w.balance || 0)}</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        
                        {/* Confirmation Buttons */}
                        <div className="flex gap-2 pt-2">
                          <button onClick={() => handleConfirm(msg.id, msg.parsedData)} className="flex-1 py-2 rounded-xl bg-success text-white font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer">
                            <Check size={12} /> {language === 'id' ? 'Buat Semua' : 'Create All'}
                          </button>
                          <button onClick={() => handleCancel(msg.id)} className="flex-1 py-2 rounded-xl bg-error/15 text-error border border-error/20 font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer">
                            <Ban size={12} /> {language === 'id' ? 'Batal' : 'Cancel'}
                          </button>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                          "w-full bg-on-surface/5 rounded-2xl p-4 mt-2 space-y-3 shadow-md border transition-all",
                          msg.parsedData.action === 'delete' ? "border-error/30" : 
                          msg.parsedData.action === 'allocate_goal' ? "border-success/30" : 
                          msg.parsedData.action === 'create_debt' ? "border-amber-500/30" :
                          msg.parsedData.action === 'pay_debt' ? "border-primary/30" :
                          msg.parsedData.duplicateAlert ? "border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.15)]" : 
                          msg.parsedData.budgetAlert ? "border-error/30" : 
                          "border-secondary/25"
                        )}
                      >
                        <div className="flex items-center justify-between border-b border-on-surface/5 pb-2">
                          <span className={cn(
                            "text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5",
                            msg.parsedData.action === 'delete' ? "text-error" : 
                            msg.parsedData.action === 'allocate_goal' ? "text-success" : 
                            msg.parsedData.action === 'create_debt' ? "text-amber-500" :
                            msg.parsedData.action === 'pay_debt' ? "text-primary" :
                            msg.parsedData.duplicateAlert ? "text-amber-500" : 
                            "text-secondary"
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
                            ) : msg.parsedData.action === 'create_debt' ? (
                              <>
                                <HandCoins size={12} />
                                {msg.parsedData.type === 'DEBT' ? (language === 'id' ? 'CATAT HUTANG' : 'RECORD DEBT') : (language === 'id' ? 'CATAT PIUTANG' : 'RECORD RECEIVABLE')}
                              </>
                            ) : msg.parsedData.action === 'pay_debt' ? (
                              <>
                                <CreditCard size={12} />
                                {language === 'id' ? 'BAYAR HUTANG' : 'PAY DEBT'}
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
                              : msg.parsedData.action === 'create_debt'
                              ? `${msg.parsedData.title} — ${msg.parsedData.contact}`
                              : msg.parsedData.action === 'pay_debt'
                              ? `${language === 'id' ? 'Pembayaran' : 'Payment'} "${msg.parsedData.debtTitle}" — ${msg.parsedData.contact}`
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
                    )
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
                ref={galleryInputRef}
                onChange={handleImageUpload}
                className="hidden"
              />
              <button
                onClick={() => setShowSourcePicker(true)}
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
                onPaste={handlePaste}
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
            
            {/* File Source Picker Overlay */}
            <AnimatePresence>
              {showSourcePicker && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/60 z-[110] flex items-end lg:items-center justify-center p-4 lg:p-6"
                >
                  <motion.div 
                    initial={{ y: 50, scale: 0.95 }}
                    animate={{ y: 0, scale: 1 }}
                    exit={{ y: 50, scale: 0.95 }}
                    className="w-full max-w-sm bg-surface rounded-[28px] p-6 shadow-2xl"
                  >
                    <div className="flex items-center justify-between mb-6">
                      <h4 className="font-display font-bold text-on-surface text-lg">Pilih Sumber Gambar</h4>
                      <button onClick={() => setShowSourcePicker(false)} className="p-2 bg-on-surface/5 rounded-full hover:bg-on-surface/10 transition-colors">
                        <X size={16} className="text-on-surface/60" />
                      </button>
                    </div>
                    <div className="space-y-3">
                      <button 
                        onClick={handleNativeCamera}
                        className="w-full flex items-center gap-4 p-4 rounded-2xl bg-tertiary/10 text-tertiary hover:bg-tertiary/20 transition-colors border border-tertiary/20"
                      >
                        <div className="w-10 h-10 rounded-full bg-tertiary/20 flex items-center justify-center shrink-0">
                          <Camera size={20} />
                        </div>
                        <div className="text-left">
                          <p className="font-bold text-sm">Jepret Kamera</p>
                          <p className="text-[10px] uppercase tracking-widest font-bold opacity-70">Langsung dari aplikasi</p>
                        </div>
                      </button>
                      <button 
                        onClick={() => galleryInputRef.current?.click()}
                        className="w-full flex items-center gap-4 p-4 rounded-2xl bg-secondary/10 text-secondary hover:bg-secondary/20 transition-colors border border-secondary/20"
                      >
                        <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center shrink-0">
                          <ArrowUpRight size={20} />
                        </div>
                        <div className="text-left">
                          <p className="font-bold text-sm">Pilih dari Galeri</p>
                          <p className="text-[10px] uppercase tracking-widest font-bold opacity-70">Upload file gambar</p>
                        </div>
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

    <GeminiLiveVoiceModal 
      isOpen={isVoiceModalOpen} 
      onClose={() => setIsVoiceModalOpen(false)}
      onActionExecute={(text) => executeActionText(text, true)}
    />
    </>
  );
}
