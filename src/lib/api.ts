const API_BASE = '/api';

function getToken(): string | null {
  return localStorage.getItem('wm_token');
}

export function setToken(token: string) {
  localStorage.setItem('wm_token', token);
}

export function clearToken() {
  localStorage.removeItem('wm_token');
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  if (!res.ok) {
    if (res.status === 401) {
      clearToken();
      window.dispatchEvent(new Event('auth_unauthorized'));
    }
    const error = await res.json().catch(() => ({ error: 'Network error' }));
    throw new Error(error.error || error.message || `HTTP ${res.status}`);
  }
  return res.json();
}

// ===================== AUTH =====================
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  currency: string;
  theme: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export const authApi = {
  register: (data: { name: string; email: string; password: string }) =>
    request<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data: { email: string; password: string }) =>
    request<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  me: () => request<AuthUser>('/auth/me'),
  updateProfile: (data: Partial<AuthUser>) =>
    request<AuthUser>('/auth/profile', { method: 'PUT', body: JSON.stringify(data) }),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    request<{ success: boolean }>('/auth/password', { method: 'PUT', body: JSON.stringify(data) }),
  downloadUserBackup: async () => {
    const token = getToken();
    const res = await fetch(`${API_BASE}/auth/backup`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stashly_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },
  restoreUserBackup: (backupData: any) =>
    request<{ success: boolean; message: string }>('/auth/restore', {
      method: 'POST',
      body: JSON.stringify({ backupData })
    }),
};

// ===================== WALLETS =====================
export const walletApi = {
  getAll: () => request<any[]>('/wallets'),
  create: (data: any) => request<any>('/wallets', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => request<any>(`/wallets/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<any>(`/wallets/${id}`, { method: 'DELETE' }),
};

// ===================== CATEGORIES =====================
export const categoryApi = {
  getAll: () => request<any[]>('/categories'),
  create: (data: any) => request<any>('/categories', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => request<any>(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<any>(`/categories/${id}`, { method: 'DELETE' }),
};

// ===================== JOURNALS =====================
export const journalApi = {
  getAll: () => request<any[]>('/journals'),
  create: (data: any) => request<any>('/journals', { method: 'POST', body: JSON.stringify(data) }),
  delete: (id: string) => request<any>(`/journals/${id}`, { method: 'DELETE' }),
};

// ===================== BUDGET =====================
export const budgetApi = {
  getIncomeSources: () => request<any[]>('/budget/income-sources'),
  createIncomeSource: (data: any) => request<any>('/budget/income-sources', { method: 'POST', body: JSON.stringify(data) }),
  updateIncomeSource: (id: string, data: any) => request<any>(`/budget/income-sources/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteIncomeSource: (id: string) => request<any>(`/budget/income-sources/${id}`, { method: 'DELETE' }),

  getFixedExpenses: () => request<any[]>('/budget/fixed-expenses'),
  createFixedExpense: (data: any) => request<any>('/budget/fixed-expenses', { method: 'POST', body: JSON.stringify(data) }),
  updateFixedExpense: (id: string, data: any) => request<any>(`/budget/fixed-expenses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteFixedExpense: (id: string) => request<any>(`/budget/fixed-expenses/${id}`, { method: 'DELETE' }),

  getWalletAllocations: () => request<any[]>('/budget/wallet-allocations'),
  createWalletAllocation: (data: any) => request<any>('/budget/wallet-allocations', { method: 'POST', body: JSON.stringify(data) }),
  updateWalletAllocation: (id: string, data: any) => request<any>(`/budget/wallet-allocations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteWalletAllocation: (id: string) => request<any>(`/budget/wallet-allocations/${id}`, { method: 'DELETE' }),
};

// ===================== SYSTEM =====================
export const systemApi = {
  health: () => request<{ status: string; database: string }>('/health'),
  reset: () => request<any>('/reset', { method: 'POST' }),
};

// ===================== GOALS =====================
export const goalsApi = {
  getAll: () => request<any[]>('/goals'),
  create: (data: any) => request<any>('/goals', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => request<any>(`/goals/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<any>(`/goals/${id}`, { method: 'DELETE' }),
};

// ===================== ASSETS =====================
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

export const assetApi = {
  getAll: () => request<Asset[]>('/assets'),
  create: (data: any) => request<Asset>('/assets', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => request<Asset>(`/assets/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<any>(`/assets/${id}`, { method: 'DELETE' }),
};

// ===================== DEBTS =====================
export interface Debt {
  id: string;
  title: string;
  type: 'DEBT' | 'RECEIVABLE';
  contact: string;
  amount: number;
  remainingAmount: number;
  dueDate?: string;
  interestRate: number;
  notes: string;
  status: 'ACTIVE' | 'PAID';
  createdAt: string;
  updatedAt: string;
  userId: string;
  walletId?: string;
}

export const debtApi = {
  getAll: () => request<Debt[]>('/debts'),
  create: (data: any) => request<Debt>('/debts', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => request<Debt>(`/debts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<any>(`/debts/${id}`, { method: 'DELETE' }),
  pay: (id: string, data: { walletId: string; amount: number; note?: string; date?: string }) =>
    request<Debt>(`/debts/${id}/payments`, { method: 'POST', body: JSON.stringify(data) }),
};

// ===================== ADMIN =====================
export const adminApi = {
  getUsers: () => request<any[]>('/admin/users'),
  getUserData: (userId: string) => request<any>(`/admin/users/${userId}/data`),
  deleteUser: (userId: string) => request<any>(`/admin/users/${userId}`, { method: 'DELETE' }),
  getPGMonitorStats: () => request<any>('/admin/pgmonitor'),
  downloadBackupJSON: async () => {
    const token = getToken();
    const res = await fetch(`${API_BASE}/admin/backup/json`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wealthmanager_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },
  downloadTableCSV: async (tableName: string) => {
    const token = getToken();
    const res = await fetch(`${API_BASE}/admin/backup/csv?table=${tableName}`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wealthmanager_${tableName}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }
};

// ===================== TOOLS =====================
export const toolsApi = {
  scanReceipt: (imageBase64: string, mimeType: string) => request<any>('/scan-receipt', {
    method: 'POST',
    body: JSON.stringify({ imageBase64, mimeType })
  }),
  chatEntry: (text: string, wallets: any[], categories: any[], goals: any[], currentDate: string) => request<any>('/chat-entry', {
    method: 'POST',
    body: JSON.stringify({ text, wallets, categories, goals, currentDate })
  }),
};
