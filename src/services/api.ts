export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}
export async function api<T>(path: string, method = 'GET', data?: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(path, {
    method,
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', 'X-Kora-Request': '1' },
    body: data === undefined ? undefined : JSON.stringify(data),
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000),
  });
  const result = await response.json();
  if (!response.ok) throw new ApiError(result.error || `HTTP ${response.status}`, response.status);
  return result as T;
}
export interface ManagedAsset {
  archived?: number;
  id: string;
  name: string;
  kind: 'model' | 'image' | 'audio';
  bytes: number;
  url: string;
  sha256: string;
  metadata: {
    author: string;
    license: string;
    sourceUrl: string;
    clips?: string[];
    triangles?: number;
    skins?: number;
    duration?: number;
    sampleRate?: number;
    channels?: number;
    width?: number;
    height?: number;
  };
}
