import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import type {
  ViewType,
  Wallet,
  Category,
  Journal,
  IncomeSource,
  FixedExpense,
  WalletAllocation,
  Goal,
} from '../lib/types';
import { generateId } from '../lib/types';
import { walletApi, categoryApi, journalApi, budgetApi, goalsApi, systemApi, authApi, setToken, clearToken, type AuthUser } from '../lib/api';
import { translations, Language } from '../lib/i18n';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export type ThemeMode = 'dark' | 'light';

interface AppContextType {
  // Auth
  isAuthenticated: boolean;
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  updateProfile: (data: Partial<AuthUser>) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;

  // Theme & Language
  theme: ThemeMode;
  toggleTheme: () => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  appName: string;
  setAppName: (name: string) => void;
  appLogo: string;
  setAppLogo: (logo: string) => void;
  isSensored: boolean;
  toggleSensored: () => void;

  // Navigation
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;
  isQuickEntryOpen: boolean;
  setIsQuickEntryOpen: (open: boolean) => void;
  isMobileSidebarOpen: boolean;
  setIsMobileSidebarOpen: (open: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Loading
  isLoading: boolean;
  authLoading: boolean;

  // Data
  wallets: Wallet[];
  categories: Category[];
  journals: Journal[];
  goals: Goal[];
  budget: {
    incomeSources: IncomeSource[];
    fixedExpenses: FixedExpense[];
    walletAllocations: WalletAllocation[];
  };

  // Wallet CRUD
  addWallet: (wallet: Omit<Wallet, 'id' | 'createdAt'>) => void;
  updateWallet: (id: string, updates: Partial<Wallet>) => void;
  deleteWallet: (id: string) => void;

  // Category CRUD
  addCategory: (category: Omit<Category, 'id' | 'createdAt'>) => void;
  updateCategory: (id: string, updates: Partial<Category>) => void;
  deleteCategory: (id: string) => void;

  // Journal CRUD
  addJournal: (payload: any) => void;
  updateJournal: (id: string, updates: Partial<Journal>) => void;
  deleteJournal: (id: string) => void;

  // Budget CRUD
  addIncomeSource: (source: Omit<IncomeSource, 'id'>) => void;
  updateIncomeSource: (id: string, updates: Partial<IncomeSource>) => void;
  deleteIncomeSource: (id: string) => void;
  addFixedExpense: (expense: Omit<FixedExpense, 'id'>) => void;
  updateFixedExpense: (id: string, updates: Partial<FixedExpense>) => void;
  deleteFixedExpense: (id: string) => void;
  addWalletAllocation: (allocation: Omit<WalletAllocation, 'id'>) => void;
  updateWalletAllocation: (id: string, updates: Partial<WalletAllocation>) => void;
  deleteWalletAllocation: (id: string) => void;

  // Goals CRUD
  addGoal: (goal: Omit<Goal, 'id' | 'createdAt'>) => void;
  updateGoal: (id: string, updates: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;

  // Computed
  totalBalance: number;
  totalIncome: number;
  totalExpenses: number;
  getCategorySpent: (categoryId: string) => number;
  getWalletById: (id: string) => Wallet | undefined;
  getCategoryById: (id: string) => Category | undefined;

  // Toast
  toasts: Toast[];
  addToast: (message: string, type?: Toast['type']) => void;
  removeToast: (id: string) => void;

  // Reset
  resetAllData: () => void;
  reloadData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Theme & Language state
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('wm_theme') as ThemeMode | null;
    return saved || 'dark';
  });
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('wm_language') as Language | null;
    return saved || 'en';
  });
  const [appName, setAppName] = useState(() => localStorage.getItem('wm_appName') || 'Wealth');
  const [appLogo, setAppLogo] = useState(() => localStorage.getItem('wm_appLogo') || 'CircleGauge');

  // Sensor state
  const [isSensored, setIsSensored] = useState<boolean>(() => {
    return localStorage.getItem('wm_is_sensored') === 'true';
  });

  const toggleSensored = useCallback(() => {
    setIsSensored(prev => {
      const next = !prev;
      localStorage.setItem('wm_is_sensored', String(next));
      return next;
    });
  }, []);

  // Navigation
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [isQuickEntryOpen, setIsQuickEntryOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Data state
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [journals, setJournals] = useState<Journal[]>([]);
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([]);
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([]);
  const [walletAllocations, setWalletAllocations] = useState<WalletAllocation[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);

  // ===================== THEME & LANGUAGE =====================
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('wm_theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('wm_language', language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem('wm_appName', appName);
    document.title = `${appName} — Personal Finance`;
  }, [appName]);

  useEffect(() => {
    localStorage.setItem('wm_appLogo', appLogo);
  }, [appLogo]);

  const t = useCallback((key: string) => {
    return translations[language][key] || key;
  }, [language]);

  const toggleTheme = useCallback(() => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    // Persist to server if authenticated
    if (isAuthenticated) {
      authApi.updateProfile({ theme: newTheme }).catch(() => {});
    }
  }, [theme, isAuthenticated]);

  // ===================== TOAST =====================
  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = setTimeout(() => setToasts(prev => prev.slice(1)), 3000);
    return () => clearTimeout(timer);
  }, [toasts]);

  const addToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    setToasts(prev => [...prev, { id: generateId(), message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // ===================== AUTH =====================
  // Try to restore session on mount
  useEffect(() => {
    const token = localStorage.getItem('wm_token');
    if (!token) {
      setAuthLoading(false);
      return;
    }
    authApi.me()
      .then((u) => {
        setUser(u);
        setIsAuthenticated(true);
        setTheme((u.theme as ThemeMode) || 'dark');
      })
      .catch(() => {
        clearToken();
      })
      .finally(() => setAuthLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login({ email, password });
    setToken(res.token);
    setUser(res.user);
    setIsAuthenticated(true);
    setTheme((res.user.theme as ThemeMode) || 'dark');
    addToast(`Welcome back, ${res.user.name}!`);
  }, [addToast]);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const res = await authApi.register({ name, email, password });
    setToken(res.token);
    setUser(res.user);
    setIsAuthenticated(true);
    setTheme('dark');
    addToast(`Welcome, ${res.user.name}! Your account has been created.`);
  }, [addToast]);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
    setIsAuthenticated(false);
    setWallets([]);
    setCategories([]);
    setJournals([]);
    setIncomeSources([]);
    setFixedExpenses([]);
    setWalletAllocations([]);
    setGoals([]);
    setCurrentView('dashboard');
    addToast('Signed out successfully', 'info');
  }, [addToast]);

  const updateProfile = useCallback(async (data: Partial<AuthUser>) => {
    const updated = await authApi.updateProfile(data);
    setUser(updated);
    addToast('Profile updated');
  }, [addToast]);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    await authApi.changePassword({ currentPassword, newPassword });
    addToast('Password changed successfully');
  }, [addToast]);

  // ===================== LOAD DATA =====================
  const loadAllData = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setIsLoading(true);
      const [w, c, j, is, fe, wa, g] = await Promise.all([
        walletApi.getAll(),
        categoryApi.getAll(),
        journalApi.getAll(),
        budgetApi.getIncomeSources(),
        budgetApi.getFixedExpenses(),
        budgetApi.getWalletAllocations(),
        goalsApi.getAll(),
      ]);
      setWallets(w);
      setCategories(c);
      setJournals(j);
      setIncomeSources(is);
      setFixedExpenses(fe);
      setWalletAllocations(wa);
      setGoals(g);
    } catch (err: any) {
      if (err.message?.includes('401') || err.message?.includes('token')) {
        logout();
      } else {
        addToast('Failed to load data from server', 'error');
      }
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, addToast, logout]);

  useEffect(() => {
    if (isAuthenticated) loadAllData();
  }, [isAuthenticated, loadAllData]);

  const handleSetCurrentView = useCallback((view: ViewType) => {
    setCurrentView(view);
    setIsMobileSidebarOpen(false);
  }, []);

  // ===================== WALLET CRUD =====================
  const addWallet = useCallback(async (wallet: Omit<Wallet, 'id' | 'createdAt'>) => {
    try {
      const created = await walletApi.create(wallet);
      setWallets(prev => [...prev, created]);
      addToast(`Wallet "${wallet.name}" created`);
    } catch { addToast('Failed to create wallet', 'error'); }
  }, [addToast]);

  const updateWallet = useCallback(async (id: string, updates: Partial<Wallet>) => {
    try {
      const updated = await walletApi.update(id, updates);
      setWallets(prev => prev.map(w => w.id === id ? updated : w));
    } catch { addToast('Failed to update wallet', 'error'); }
  }, [addToast]);

  const deleteWallet = useCallback(async (id: string) => {
    try {
      await walletApi.delete(id);
      setWallets(prev => prev.filter(w => w.id !== id));
      setJournals(prev => prev.filter(j => !j.lines.some(l => l.walletId === id)));
      setWalletAllocations(prev => prev.filter(a => a.walletId !== id));
      addToast('Wallet deleted', 'info');
    } catch { addToast('Failed to delete wallet', 'error'); }
  }, [addToast]);

  // ===================== CATEGORY CRUD =====================
  const addCategory = useCallback(async (category: Omit<Category, 'id' | 'createdAt'>) => {
    try {
      const created = await categoryApi.create(category);
      setCategories(prev => [...prev, created]);
      addToast(`Category "${category.name}" created`);
      return created;
    } catch { 
      addToast('Failed to create category', 'error'); 
      return null;
    }
  }, [addToast]);

  const updateCategory = useCallback(async (id: string, updates: Partial<Category>) => {
    try {
      const updated = await categoryApi.update(id, updates);
      setCategories(prev => prev.map(c => c.id === id ? updated : c));
    } catch { addToast('Failed to update category', 'error'); }
  }, [addToast]);

  const deleteCategory = useCallback(async (id: string) => {
    try {
      await categoryApi.delete(id);
      setCategories(prev => prev.filter(c => c.id !== id));
      addToast('Category deleted', 'info');
    } catch { addToast('Failed to delete category', 'error'); }
  }, [addToast]);

  // ===================== JOURNAL CRUD =====================
  const addJournal = useCallback(async (payload: any) => {
    try {
      const created = await journalApi.create(payload);
      setJournals(prev => [created, ...prev]);
      
      // Update local wallet balances correctly based on journal lines
      setWallets(prev => prev.map(w => {
        let newBalance = w.balance;
        created.lines.forEach((line: any) => {
          if (line.walletId === w.id) {
            newBalance += (line.type === 'DEBIT' ? line.amount : -line.amount);
          }
        });
        return { ...w, balance: newBalance };
      }));
      addToast('Journal recorded!');
    } catch { addToast('Failed to add journal', 'error'); }
  }, [addToast]);

  const updateJournal = useCallback(async (_id: string, _updates: Partial<Journal>) => {
    try {
      addToast('Journal updated');
      await loadAllData();
    } catch { addToast('Failed to update journal', 'error'); }
  }, [addToast, loadAllData]);

  const deleteJournal = useCallback(async (id: string) => {
    try {
      await journalApi.delete(id);
      await loadAllData();
      addToast('Journal reversed successfully', 'info');
    } catch { addToast('Failed to reverse journal', 'error'); }
  }, [loadAllData, addToast]);

  // ===================== BUDGET =====================
  const addIncomeSource = useCallback(async (source: Omit<IncomeSource, 'id'>) => {
    try { const c = await budgetApi.createIncomeSource(source); setIncomeSources(prev => [...prev, c]); addToast('Income source added'); }
    catch { addToast('Failed to add income source', 'error'); }
  }, [addToast]);
  const updateIncomeSource = useCallback(async (id: string, updates: Partial<IncomeSource>) => {
    try { const u = await budgetApi.updateIncomeSource(id, updates); setIncomeSources(prev => prev.map(s => s.id === id ? u : s)); }
    catch { addToast('Failed to update income source', 'error'); }
  }, [addToast]);
  const deleteIncomeSource = useCallback(async (id: string) => {
    try { await budgetApi.deleteIncomeSource(id); setIncomeSources(prev => prev.filter(s => s.id !== id)); addToast('Income source removed', 'info'); }
    catch { addToast('Failed to delete income source', 'error'); }
  }, [addToast]);

  const addFixedExpense = useCallback(async (expense: Omit<FixedExpense, 'id'>) => {
    try { const c = await budgetApi.createFixedExpense(expense); setFixedExpenses(prev => [...prev, c]); addToast('Fixed expense added'); }
    catch { addToast('Failed to add fixed expense', 'error'); }
  }, [addToast]);
  const updateFixedExpense = useCallback(async (id: string, updates: Partial<FixedExpense>) => {
    try { const u = await budgetApi.updateFixedExpense(id, updates); setFixedExpenses(prev => prev.map(e => e.id === id ? u : e)); }
    catch { addToast('Failed to update fixed expense', 'error'); }
  }, [addToast]);
  const deleteFixedExpense = useCallback(async (id: string) => {
    try { await budgetApi.deleteFixedExpense(id); setFixedExpenses(prev => prev.filter(e => e.id !== id)); addToast('Fixed expense removed', 'info'); }
    catch { addToast('Failed to delete fixed expense', 'error'); }
  }, [addToast]);

  const addWalletAllocation = useCallback(async (allocation: Omit<WalletAllocation, 'id'>) => {
    try { const c = await budgetApi.createWalletAllocation(allocation); setWalletAllocations(prev => [...prev, c]); }
    catch { addToast('Failed to add allocation', 'error'); }
  }, [addToast]);
  const updateWalletAllocation = useCallback(async (id: string, updates: Partial<WalletAllocation>) => {
    try { const u = await budgetApi.updateWalletAllocation(id, updates); setWalletAllocations(prev => prev.map(a => a.id === id ? u : a)); }
    catch { addToast('Failed to update allocation', 'error'); }
  }, [addToast]);
  const deleteWalletAllocation = useCallback(async (id: string) => {
    try { await budgetApi.deleteWalletAllocation(id); setWalletAllocations(prev => prev.filter(a => a.id !== id)); }
    catch { addToast('Failed to delete allocation', 'error'); }
  }, [addToast]);

  // ===================== GOALS =====================
  const addGoal = useCallback(async (goal: Omit<Goal, 'id' | 'createdAt'>) => {
    try { const c = await goalsApi.create(goal); setGoals(prev => [c, ...prev]); addToast(`Goal "${goal.name}" created`); }
    catch { addToast('Failed to create goal', 'error'); }
  }, [addToast]);

  const updateGoal = useCallback(async (id: string, updates: Partial<Goal>) => {
    try { const u = await goalsApi.update(id, updates); setGoals(prev => prev.map(g => g.id === id ? u : g)); }
    catch { addToast('Failed to update goal', 'error'); }
  }, [addToast]);

  const deleteGoal = useCallback(async (id: string) => {
    try { await goalsApi.delete(id); setGoals(prev => prev.filter(g => g.id !== id)); addToast('Goal deleted', 'info'); }
    catch { addToast('Failed to delete goal', 'error'); }
  }, [addToast]);

  // ===================== COMPUTED =====================
  const totalBalance = useMemo(() => wallets.reduce((s, w) => s + w.balance, 0), [wallets]);
  const now = new Date();
  const monthlyJournals = useMemo(() => {
    return journals.filter(j => {
      if (j.isReversed || j.description.startsWith('[REVERSAL]')) return false;
      const d = new Date(j.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
  }, [journals]);

  const totalIncome = useMemo(() => monthlyJournals.reduce((sum, j) => {
    const incomeLine = j.lines.find(l => l.categoryId && l.type === 'CREDIT');
    return sum + (incomeLine ? incomeLine.amount : 0);
  }, 0), [monthlyJournals]);

  const totalExpenses = useMemo(() => monthlyJournals.reduce((sum, j) => {
    const expenseLine = j.lines.find(l => l.categoryId && l.type === 'DEBIT');
    return sum + (expenseLine ? expenseLine.amount : 0);
  }, 0), [monthlyJournals]);

  const getCategorySpent = useCallback((categoryId: string) => monthlyJournals.reduce((sum, j) => {
    const expenseLine = j.lines.find(l => l.categoryId === categoryId && l.type === 'DEBIT');
    return sum + (expenseLine ? expenseLine.amount : 0);
  }, 0), [monthlyJournals]);

  const getWalletById = useCallback((id: string) => wallets.find(w => w.id === id), [wallets]);
  const getCategoryById = useCallback((id: string) => categories.find(c => c.id === id), [categories]);

  const handleResetAllData = useCallback(async () => {
    try {
      await systemApi.reset();
      await loadAllData();
      addToast('All data reset.', 'info');
    } catch { addToast('Failed to reset data', 'error'); }
  }, [addToast, loadAllData]);

  return (
    <AppContext.Provider value={{
      isAuthenticated, user, login, register, logout, updateProfile, changePassword,
      theme, toggleTheme, language, setLanguage, t,
      appName, setAppName, appLogo, setAppLogo,
      isSensored, toggleSensored,
      currentView, setCurrentView: handleSetCurrentView,
      isQuickEntryOpen, setIsQuickEntryOpen,
      isMobileSidebarOpen, setIsMobileSidebarOpen,
      searchQuery, setSearchQuery,
      isLoading, authLoading,
      wallets, categories, journals, goals,
      budget: { incomeSources, fixedExpenses, walletAllocations },
      addWallet, updateWallet, deleteWallet,
      addCategory, updateCategory, deleteCategory,
      addJournal, updateJournal, deleteJournal,
      addIncomeSource, updateIncomeSource, deleteIncomeSource,
      addFixedExpense, updateFixedExpense, deleteFixedExpense,
      addWalletAllocation, updateWalletAllocation, deleteWalletAllocation,
      addGoal, updateGoal, deleteGoal,
      totalBalance, totalIncome, totalExpenses,
      getCategorySpent, getWalletById, getCategoryById,
      toasts, addToast, removeToast,
      resetAllData: handleResetAllData, reloadData: loadAllData,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
