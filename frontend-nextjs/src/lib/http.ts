import type { ApiResult } from "./types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1";
const TOKEN_KEY = "reseplaba.token";

let authToken: string | null =
  typeof window !== "undefined" ? window.localStorage.getItem(TOKEN_KEY) : null;
let ownerPin: string | null = null;

type UnauthorizedHandler = () => void;
let unauthorizedHandler: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  unauthorizedHandler = handler;
}

export function setOwnerPin(pin: string | null) {
  ownerPin = pin;
}

export function getAuthToken(): string | null {
  return authToken;
}

export function hasAuthToken(): boolean {
  return authToken !== null;
}

function persistToken(token: string | null) {
  authToken = token;
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}

export function clearAuth() {
  persistToken(null);
  ownerPin = null;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<ApiResult<T>> {
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  if (ownerPin) headers["X-Owner-PIN"] = ownerPin;
  if (body !== undefined && !isFormData) headers["Content-Type"] = "application/json";

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
    });
  } catch {
    return {
      success: false,
      message: "Tidak bisa terhubung ke server. Cek koneksi backend.",
      data: null,
      warnings: [],
    };
  }

  const tokenHeader = response.headers.get("Authorization");
  if (tokenHeader) persistToken(tokenHeader.replace(/^Bearer\s+/i, ""));

  if (response.status === 401) {
    clearAuth();
    unauthorizedHandler?.();
    return {
      success: false,
      message: "Sesi berakhir. Silakan masuk lagi.",
      data: null,
      warnings: [],
    };
  }

  let payload: ApiResult<T> | null = null;
  try {
    payload = (await response.json()) as ApiResult<T>;
  } catch {
    // fall through to generic error below
  }

  if (!payload) {
    return {
      success: false,
      message: `Server merespons tidak terduga (HTTP ${response.status}).`,
      data: null,
      warnings: [],
    };
  }

  return payload;
}

export const http = {
  get<T>(path: string): Promise<ApiResult<T>> {
    return request<T>("GET", path);
  },
  post<T>(path: string, body?: unknown): Promise<ApiResult<T>> {
    return request<T>("POST", path, body);
  },
  put<T>(path: string, body?: unknown): Promise<ApiResult<T>> {
    return request<T>("PUT", path, body);
  },
  patch<T>(path: string, body?: unknown): Promise<ApiResult<T>> {
    return request<T>("PATCH", path, body);
  },
  delete<T>(path: string): Promise<ApiResult<T>> {
    return request<T>("DELETE", path);
  },
};