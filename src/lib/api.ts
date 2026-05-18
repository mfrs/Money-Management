const API_BASE = import.meta.env.DEV ? 'http://localhost:3001/api' : '/api';

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

// ===================== ADMIN =====================
export const adminApi = {
  getUsers: () => request<any[]>('/admin/users'),
  getUserData: (userId: string) => request<any>(`/admin/users/${userId}/data`),
};
