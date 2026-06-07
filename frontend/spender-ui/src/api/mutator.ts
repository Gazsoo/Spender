const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5020';

export const customFetch = async <T>(url: string, options?: RequestInit): Promise<T> => {
  const response = await fetch(`${API_BASE}${url}`, options);

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(text || `HTTP ${response.status}`);
  }

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const data = response.status === 204 || !isJson ? undefined : await response.json();

  return { data, status: response.status, headers: response.headers } as T;
};
