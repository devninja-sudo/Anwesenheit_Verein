const fallbackHost = 'http://192.168.178.146:4000';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? fallbackHost;

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  token?: string;
  body?: unknown;
  responseType?: 'json' | 'text';
};

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const data = (await response.json()) as { message?: string };
      if (data?.message) {
        message = data.message;
      }
    } catch {
      // ignore parsing error
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  if (options.responseType === 'text') {
    return (await response.text()) as T;
  }

  return (await response.json()) as T;
}
