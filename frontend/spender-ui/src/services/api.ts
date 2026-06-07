import type {
  Transaction,
  Category,
  Person,
  DebtSummary,
  CreateTransactionRequest,
  UpdateTransactionRequest,
  CreateCategoryRequest,
  UpdateCategoryRequest,
  MonthlySummary,
} from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5020';

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${endpoint}`;

  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new ApiError(response.status, errorText || `HTTP ${response.status}`);
  }

  return response.json();
}

// Transaction API
export const transactionApi = {
  getAll: (): Promise<Transaction[]> =>
    fetchApi('/api/transactions'),

  getById: (id: number): Promise<Transaction> =>
    fetchApi(`/api/transactions/${id}`),

  create: (data: CreateTransactionRequest): Promise<Transaction> =>
    fetchApi('/api/transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: number, data: UpdateTransactionRequest): Promise<Transaction> =>
    fetchApi(`/api/transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: number): Promise<void> =>
    fetchApi(`/api/transactions/${id}`, {
      method: 'DELETE',
    }),
};

// Category API
export const categoryApi = {
  getAll: (): Promise<Category[]> =>
    fetchApi('/api/categories'),

  getById: (id: number): Promise<Category> =>
    fetchApi(`/api/categories/${id}`),

  create: (data: CreateCategoryRequest): Promise<Category> =>
    fetchApi('/api/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: number, data: UpdateCategoryRequest): Promise<Category> =>
    fetchApi(`/api/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: number): Promise<void> =>
    fetchApi(`/api/categories/${id}`, {
      method: 'DELETE',
    }),
};

// People API
export const personApi = {
  getAll: (): Promise<Person[]> =>
    fetchApi('/api/people'),
};

// Analytics API
export const analyticsApi = {
  getMonthlySummary: (year?: number, month?: number): Promise<MonthlySummary> => {
    const params = new URLSearchParams();
    if (year) params.append('year', year.toString());
    if (month) params.append('month', month.toString());

    return fetchApi(`/api/analytics/monthly${params.toString() ? `?${params}` : ''}`);
  },

  getYearlySummary: (year?: number): Promise<MonthlySummary[]> => {
    const params = new URLSearchParams();
    if (year) params.append('year', year.toString());

    return fetchApi(`/api/analytics/yearly${params.toString() ? `?${params}` : ''}`);
  },

  getDebtSummary: (perspectiveId: number, from?: string, to?: string): Promise<DebtSummary> => {
    const params = new URLSearchParams({ perspectiveId: String(perspectiveId) });
    if (from) params.append('from', from);
    if (to)   params.append('to',   to);
    return fetchApi(`/api/analytics/debt?${params}`);
  },
};