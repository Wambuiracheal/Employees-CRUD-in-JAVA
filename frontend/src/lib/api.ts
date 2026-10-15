import type { FieldErrors } from "./types";

export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080").replace(/\/$/, "");

const STORAGE_KEY = "employees.auth";

/** Error thrown for any non-2xx response, carrying the backend's message and field errors. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly fieldErrors: FieldErrors = {},
  ) {
    super(message);
    this.name = "ApiError";
  }
}

let unauthorizedHandler: (() => void) | null = null;

/** Registered by the auth provider so an expired/invalid token logs the user out globally. */
export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw).token as string) : null;
  } catch {
    return null;
  }
}

export const authStorage = {
  key: STORAGE_KEY,
  read<T>(): T | null {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  },
  write(value: unknown) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    } catch {
      /* storage unavailable (private mode) – session lasts until reload */
    }
  },
  clear() {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  },
};

/** Low-level fetch with auth header and uniform error handling. Returns the raw Response on success. */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const token = getStoredToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...init, headers });
  } catch {
    throw new ApiError(0, "Cannot reach the server. Check that the API is running.");
  }

  if (!response.ok) {
    let message = response.statusText || "Request failed";
    let fieldErrors: FieldErrors = {};
    try {
      const body = await response.json();
      message = body.message ?? message;
      fieldErrors = body.fieldErrors ?? {};
    } catch {
      /* non-JSON error body */
    }
    // A 401 on a login attempt is just bad credentials, not an expired session.
    if (response.status === 401 && token && !path.startsWith("/api/auth/")) {
      unauthorizedHandler?.();
    }
    throw new ApiError(response.status, message, fieldErrors);
  }
  return response;
}

/** JSON request helper. Resolves to `undefined` for 204 responses. */
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await apiFetch(path, init);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
