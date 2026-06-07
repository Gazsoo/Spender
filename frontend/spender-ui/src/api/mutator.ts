const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5020';

export const UNAUTHORIZED_EVENT = 'spender:unauthorized';

export const customFetch = async <T>(url: string, options?: RequestInit): Promise<T> => {
  const response = await fetch(`${API_BASE}${url}`, {
    credentials: 'include',
    ...options,
  });

  if (response.status === 401) {
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(text || `HTTP ${response.status}`);
  }

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const data = response.status === 204 || !isJson ? undefined : await response.json();

  return { data, status: response.status, headers: response.headers } as T;
};
