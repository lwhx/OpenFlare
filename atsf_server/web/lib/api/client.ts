import { publicEnv } from '@/lib/env/public-env';
import type { ApiEnvelope } from '@/types/api';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function getApiUrl(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${publicEnv.apiBaseUrl}${normalizedPath}`;
}

export async function apiRequest<T>(path: string, init?: RequestInit) {
  const response = await fetch(getApiUrl(path), {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    throw new ApiError(`请求失败（${response.status}）`, response.status);
  }

  const payload = (await response.json()) as ApiEnvelope<T>;

  if (!payload.success) {
    throw new ApiError(payload.message || '请求失败', response.status);
  }

  return payload.data;
}
