import { env } from '../config/env';
import { logger } from '../utils/logger';

type ApiMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

type RequestOptions = {
  method?: ApiMethod;
  token?: string;
  body?: unknown;
};

export type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  meta?: Record<string, unknown>;
};

const toUrl = (path: string): string => {
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const cleanBase = env.apiBaseUrl.replace(/\/+$/, '');
  const cleanPath = path.replace(/^\/+/, '');
  return `${cleanBase}/${cleanPath}`;
};

export const request = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  const method = options.method ?? 'GET';
  const token = options.token ?? env.authToken;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  let response: Response;
  try {
    response = await fetch(toUrl(path), {
      method,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch (error) {
    logger.error('Network request failed', { path, method, error });
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return {} as T;
  }

  const payload = (await response.json()) as ApiEnvelope<T> | T;

  if (typeof payload === 'object' && payload && 'success' in payload) {
    const envelope = payload as ApiEnvelope<T>;
    if (!envelope.success) throw new Error('API returned success: false');
    return envelope.data;
  }

  return payload as T;
};
