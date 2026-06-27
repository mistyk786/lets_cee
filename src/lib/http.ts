/**
 * Thin HTTP client for the SLOTH backend.
 * Falls back to mock data when the backend is unreachable or unset.
 */

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
const FORCE_MOCK = import.meta.env.VITE_USE_MOCK_API === "true";

export function isBackendConfigured(): boolean {
  return Boolean(API_BASE) && !FORCE_MOCK;
}

export function getApiBaseUrl(): string {
  return API_BASE;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly path: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type FetchOptions<T> = Omit<RequestInit, "body"> & {
  body?: unknown;
  /** Transform raw JSON from the backend into the frontend type. */
  map?: (raw: unknown) => T;
};

/**
 * Attempts a real fetch against the backend. On failure (network, 4xx, 5xx,
 * or when VITE_USE_MOCK_API=true / no base URL), runs `mockFallback`.
 */
export async function fetchWithFallback<T>(
  path: string,
  mockFallback: () => T | Promise<T>,
  options: FetchOptions<T> = {}
): Promise<T> {
  if (!isBackendConfigured()) {
    return mockFallback();
  }

  const { body, headers, map, ...rest } = options;
  const init: RequestInit = {
    ...rest,
    headers: {
      Accept: "application/json",
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  };

  try {
    const res = await fetch(`${API_BASE}${path}`, init);
    if (!res.ok) {
      throw new ApiError(
        `Request failed: ${res.status} ${res.statusText}`,
        res.status,
        path
      );
    }
    if (res.status === 204) {
      return undefined as T;
    }
    const raw: unknown = await res.json();
    return map ? map(raw) : (raw as T);
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn(
        `[SLOTH api] ${path} unavailable — using mock fallback.`,
        err
      );
    }
    return mockFallback();
  }
}

type LiveFetchOptions<T> = Omit<RequestInit, "body"> & {
  body?: unknown;
  map?: (raw: unknown) => T;
};

/**
 * Live-only fetch — throws on failure. Use when VITE_API_BASE_URL is set and
 * mock fallbacks must not be used.
 */
export async function fetchLive<T>(
  path: string,
  options: LiveFetchOptions<T> = {}
): Promise<T> {
  if (!isBackendConfigured()) {
    throw new ApiError("Backend not configured", 0, path);
  }

  const { body, headers, map, ...rest } = options;
  const init: RequestInit = {
    ...rest,
    headers: {
      Accept: "application/json",
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  };

  const res = await fetch(`${API_BASE}${path}`, init);
  if (!res.ok) {
    const raw = await res.text().catch(() => "");
    let message = raw || `Request failed: ${res.status} ${res.statusText}`;
    try {
      const parsed = JSON.parse(raw) as { detail?: string };
      if (typeof parsed.detail === "string") message = parsed.detail;
    } catch {
      /* plain text body */
    }
    throw new ApiError(message, res.status, path);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  const raw: unknown = await res.json();
  return map ? map(raw) : (raw as T);
}
