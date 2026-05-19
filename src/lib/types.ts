export interface Wallet {
  id: string;
  name: string;
  type: 'bank' | 'ewallet' | 'cash' | 'savings';
  account: string;
  balance: number;
  icon: string;
  color: string;
  goal?: number;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  type: 'expense' | 'income';
  icon: string;
  color: string;
  budgetLimit: number;
  createdAt: string;
}

export interface JournalLine {
  id: string;
  journalId: string;
  walletId?: string;
  categoryId?: string;
  amount: number;
  type: 'DEBIT' | 'CREDIT';
  createdAt: string;
}

export interface Journal {
  id: string;
  description: string;
  date: string;
  note: string;
  isReversed?: boolean;
  lines: JournalLine[];
  createdAt: string;
}

export interface IncomeSource {
  id: string;
  name: string;
  amount: number;
}

export interface FixedExpense {
  id: string;
  name: string;
  amount: number;
  term: string;
  icon: string;
  autoPay: boolean;
  dueDate?: number;
  lastPaid?: string;
  status?: string;
}

export interface WalletAllocation {
  id: string;
  walletId: string;
  amount: number;
}

export interface Budget {
  incomeSources: IncomeSource[];
  fixedExpenses: FixedExpense[];
  walletAllocations: WalletAllocation[];
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
  icon: string;
  color: string;
  createdAt: string;
}

export interface Asset {
  id: string;
  name: string;
  type: 'investment' | 'property' | 'vehicle' | 'gold' | 'other';
  purchasePrice: number;
  currentPrice: number;
  purchaseDate: string;
  estimatedRate: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
}

export type ViewType = 'dashboard' | 'wallets' | 'budget' | 'transactions' | 'reports' | 'settings' | 'goals' | 'admin' | 'ledger' | 'achievements' | 'assets';

export interface AppData {
  wallets: Wallet[];
  categories: Category[];
  journals: Journal[];
  budget: Budget;
}

export function formatCurrency(amount: number, isSensored?: boolean): string {
  if (isSensored) return 'Rp ••••••';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatCurrencyShort(amount: number, isSensored?: boolean): string {
  if (isSensored) return 'Rp ••••••';
  if (Math.abs(amount) >= 1_000_000_000) {
    return `Rp ${(amount / 1_000_000_000).toFixed(1)}B`;
  }
  if (Math.abs(amount) >= 1_000_000) {
    return `Rp ${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(amount) >= 1_000) {
    return `Rp ${(amount / 1_000).toFixed(0)}k`;
  }
  return formatCurrency(amount, isSensored);
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return `Today, ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
  }
  if (diffDays === 1) {
    return `Yesterday, ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
