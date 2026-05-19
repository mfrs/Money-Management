import { AppData, generateId } from './types';

const now = new Date();
const today = now.toISOString().split('T')[0];
const yesterday = new Date(now.getTime() - 86400000).toISOString().split('T')[0];
const twoDaysAgo = new Date(now.getTime() - 172800000).toISOString().split('T')[0];
const threeDaysAgo = new Date(now.getTime() - 259200000).toISOString().split('T')[0];
const fiveDaysAgo = new Date(now.getTime() - 432000000).toISOString().split('T')[0];
const weekAgo = new Date(now.getTime() - 604800000).toISOString().split('T')[0];
const twoWeeksAgo = new Date(now.getTime() - 1209600000).toISOString().split('T')[0];
const threeWeeksAgo = new Date(now.getTime() - 1814400000).toISOString().split('T')[0];
const monthAgo = new Date(now.getTime() - 2592000000).toISOString().split('T')[0];

export const WALLET_IDS = {
  bca: 'w_bca_primary',
  gopay: 'w_gopay',
  cash: 'w_cash',
  mandiri: 'w_mandiri_savings',
};

export const CATEGORY_IDS = {
  food: 'c_food',
  transport: 'c_transport',
  entertainment: 'c_entertainment',
  groceries: 'c_groceries',
  utilities: 'c_utilities',
  housing: 'c_housing',
  health: 'c_health',
  education: 'c_education',
  salary: 'c_salary',
  freelance: 'c_freelance',
  investment: 'c_investment',
  shopping: 'c_shopping',
};

export const seedData: any = {
  wallets: [
    {
      id: WALLET_IDS.bca,
      name: 'BCA Primary',
      type: 'bank',
      account: '**** 1234',
      balance: 35_200_000,
      icon: 'Landmark',
      color: '#005AA9',
      createdAt: monthAgo,
    },
    {
      id: WALLET_IDS.gopay,
      name: 'Gopay',
      type: 'ewallet',
      account: '+62 812***',
      balance: 1_450_000,
      icon: 'Smartphone',
      color: '#00A5CF',
      createdAt: monthAgo,
    },
    {
      id: WALLET_IDS.cash,
      name: 'Physical Cash',
      type: 'cash',
      account: 'Wallet / Safe',
      balance: 800_000,
      icon: 'Wallet',
      color: '#9CA3AF',
      createdAt: monthAgo,
    },
    {
      id: WALLET_IDS.mandiri,
      name: 'Mandiri Savings',
      type: 'savings',
      account: '**** 8890',
      balance: 91_000_000,
      icon: 'PiggyBank',
      color: '#F2A900',
      goal: 120_000_000,
      createdAt: monthAgo,
    },
  ],
  categories: [
    { id: CATEGORY_IDS.food, name: 'Makan', type: 'expense', icon: 'Utensils', color: '#EF4444', budgetLimit: 3_000_000, createdAt: monthAgo },
    { id: CATEGORY_IDS.transport, name: 'Transport', type: 'expense', icon: 'Car', color: '#F59E0B', budgetLimit: 2_000_000, createdAt: monthAgo },
    { id: CATEGORY_IDS.entertainment, name: 'Entertainment', type: 'expense', icon: 'Clapperboard', color: '#4EDEA3', budgetLimit: 1_500_000, createdAt: monthAgo },
    { id: CATEGORY_IDS.groceries, name: 'Groceries', type: 'expense', icon: 'ShoppingBag', color: '#8B5CF6', budgetLimit: 2_500_000, createdAt: monthAgo },
    { id: CATEGORY_IDS.utilities, name: 'Utilities', type: 'expense', icon: 'Bolt', color: '#06B6D4', budgetLimit: 1_000_000, createdAt: monthAgo },
    { id: CATEGORY_IDS.housing, name: 'Housing', type: 'expense', icon: 'Home', color: '#3B82F6', budgetLimit: 5_000_000, createdAt: monthAgo },
    { id: CATEGORY_IDS.health, name: 'Health', type: 'expense', icon: 'Heart', color: '#EC4899', budgetLimit: 1_000_000, createdAt: monthAgo },
    { id: CATEGORY_IDS.shopping, name: 'Shopping', type: 'expense', icon: 'ShoppingCart', color: '#F97316', budgetLimit: 1_500_000, createdAt: monthAgo },
    { id: CATEGORY_IDS.salary, name: 'Salary', type: 'income', icon: 'Banknote', color: '#22C55E', budgetLimit: 0, createdAt: monthAgo },
    { id: CATEGORY_IDS.freelance, name: 'Freelance', type: 'income', icon: 'Laptop', color: '#14B8A6', budgetLimit: 0, createdAt: monthAgo },
    { id: CATEGORY_IDS.investment, name: 'Investment', type: 'income', icon: 'TrendingUp', color: '#6366F1', budgetLimit: 0, createdAt: monthAgo },
  ],
  transactions: [
    { id: generateId(), description: 'Warung Nasi Padang', amount: 45_000, type: 'expense', categoryId: CATEGORY_IDS.food, walletId: WALLET_IDS.gopay, date: `${today}T12:30:00`, note: 'Lunch', createdAt: `${today}T12:30:00` },
    { id: generateId(), description: 'Salary Deposit', amount: 12_500_000, type: 'income', categoryId: CATEGORY_IDS.salary, walletId: WALLET_IDS.bca, date: `${yesterday}T09:00:00`, note: 'Monthly salary', createdAt: `${yesterday}T09:00:00` },
    { id: generateId(), description: 'Pertamina SPBU', amount: 300_000, type: 'expense', categoryId: CATEGORY_IDS.transport, walletId: WALLET_IDS.bca, date: `${twoDaysAgo}T18:15:00`, note: 'Full tank', createdAt: `${twoDaysAgo}T18:15:00` },
    { id: generateId(), description: 'Cinema XXI', amount: 150_000, type: 'expense', categoryId: CATEGORY_IDS.entertainment, walletId: WALLET_IDS.gopay, date: `${threeDaysAgo}T20:00:00`, note: 'Movie night', createdAt: `${threeDaysAgo}T20:00:00` },
    { id: generateId(), description: 'Superindo', amount: 850_000, type: 'expense', categoryId: CATEGORY_IDS.groceries, walletId: WALLET_IDS.bca, date: `${fiveDaysAgo}T10:45:00`, note: 'Weekly groceries', createdAt: `${fiveDaysAgo}T10:45:00` },
    { id: generateId(), description: 'PLN Token Listrik', amount: 500_000, type: 'expense', categoryId: CATEGORY_IDS.utilities, walletId: WALLET_IDS.bca, date: `${weekAgo}T14:00:00`, note: 'Electricity', createdAt: `${weekAgo}T14:00:00` },
    { id: generateId(), description: 'Grab Car', amount: 85_000, type: 'expense', categoryId: CATEGORY_IDS.transport, walletId: WALLET_IDS.gopay, date: `${weekAgo}T08:30:00`, note: 'To office', createdAt: `${weekAgo}T08:30:00` },
    { id: generateId(), description: 'GoFood - McDonalds', amount: 78_000, type: 'expense', categoryId: CATEGORY_IDS.food, walletId: WALLET_IDS.gopay, date: `${weekAgo}T19:00:00`, note: 'Dinner', createdAt: `${weekAgo}T19:00:00` },
    { id: generateId(), description: 'Freelance Web Design', amount: 3_500_000, type: 'income', categoryId: CATEGORY_IDS.freelance, walletId: WALLET_IDS.bca, date: `${twoWeeksAgo}T10:00:00`, note: 'Project Alpha', createdAt: `${twoWeeksAgo}T10:00:00` },
    { id: generateId(), description: 'Kost / Rent', amount: 3_500_000, type: 'expense', categoryId: CATEGORY_IDS.housing, walletId: WALLET_IDS.bca, date: `${twoWeeksAgo}T08:00:00`, note: 'Monthly rent', createdAt: `${twoWeeksAgo}T08:00:00` },
    { id: generateId(), description: 'Apotek K-24', amount: 125_000, type: 'expense', categoryId: CATEGORY_IDS.health, walletId: WALLET_IDS.cash, date: `${threeWeeksAgo}T16:30:00`, note: 'Medicine', createdAt: `${threeWeeksAgo}T16:30:00` },
    { id: generateId(), description: 'Uniqlo', amount: 450_000, type: 'expense', categoryId: CATEGORY_IDS.shopping, walletId: WALLET_IDS.bca, date: `${threeWeeksAgo}T13:00:00`, note: 'New shirts', createdAt: `${threeWeeksAgo}T13:00:00` },
    { id: generateId(), description: 'Dividen Saham', amount: 750_000, type: 'income', categoryId: CATEGORY_IDS.investment, walletId: WALLET_IDS.mandiri, date: `${monthAgo}T09:00:00`, note: 'Quarterly dividend', createdAt: `${monthAgo}T09:00:00` },
    { id: generateId(), description: 'Indomaret', amount: 185_000, type: 'expense', categoryId: CATEGORY_IDS.groceries, walletId: WALLET_IDS.cash, date: `${monthAgo}T11:00:00`, note: 'Snacks & drinks', createdAt: `${monthAgo}T11:00:00` },
  ],
  budget: {
    incomeSources: [
      { id: generateId(), name: 'Primary Salary', amount: 12_500_000 },
      { id: generateId(), name: 'Freelance (Design)', amount: 3_500_000 },
    ],
    fixedExpenses: [
      { id: generateId(), name: 'Rent / Kost', amount: 3_500_000, term: '01-MONTH', icon: 'Building2', autoPay: true },
      { id: generateId(), name: 'Internet IndiHome', amount: 450_000, term: '12-MONTH', icon: 'Wifi', autoPay: true },
      { id: generateId(), name: 'Spotify Premium', amount: 55_000, term: '01-MONTH', icon: 'Music', autoPay: false },
    ],
    walletAllocations: [
      { id: generateId(), walletId: WALLET_IDS.mandiri, amount: 3_000_000 },
    ],
  },
};

const STORAGE_KEY = 'wealthmanager_data';

export function loadData(): AppData {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as AppData;
    }
  } catch (e) {
    console.warn('Failed to load data from localStorage', e);
  }
  // First time — save seed data
  saveData(seedData);
  return seedData;
}

export function saveData(data: AppData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to save data to localStorage', e);
  }
}

export function resetData(): AppData {
  localStorage.removeItem(STORAGE_KEY);
  saveData(seedData);
  return seedData;
}
