export async function api<T>(path: string, method = 'GET', data?: unknown): Promise<T> {
  const response = await fetch(path, {
    method,
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', 'X-Kora-Request': '1' },
    body: data === undefined ? undefined : JSON.stringify(data),
    signal: AbortSignal.timeout(15000),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`);
  return result as T;
}
export interface ManagedAsset {
  archived?: number;
  id: string;
  name: string;
  kind: 'model' | 'image';
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
  };
}
