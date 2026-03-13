"use client";

import { clearStoredAuthToken, getStoredAuthToken } from "@/lib/client/auth";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function isExternalApiMode() {
  return Boolean(process.env.NEXT_PUBLIC_API_BASE_URL);
}

export function getApiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "";
}

export function buildApiUrl(path: string) {
  if (/^https?:\/\//.test(path)) {
    return path;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return isExternalApiMode() ? `${getApiBaseUrl()}${normalizedPath}` : normalizedPath;
}

function buildHeaders(init?: HeadersInit) {
  const headers = new Headers(init);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (isExternalApiMode()) {
    const token = getStoredAuthToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  return headers;
}

async function parseError(response: Response) {
  const payload = (await response.json().catch(() => null)) as { message?: string } | null;
  const message = payload?.message ?? "So'rov bajarilmadi";
  if (response.status === 401 && isExternalApiMode()) {
    clearStoredAuthToken();
  }
  throw new ApiError(message, response.status);
}

export async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(buildApiUrl(path), {
    ...init,
    headers: buildHeaders(init?.headers),
    credentials: isExternalApiMode() ? "omit" : "same-origin",
    cache: "no-store",
  });

  if (!response.ok) {
    await parseError(response);
  }

  return (await response.json()) as T;
}

export async function postJson<T>(path: string, body: unknown) {
  return requestJson<T>(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function patchJson<T>(path: string, body: unknown) {
  return requestJson<T>(path, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function loginRequest(email: string, password: string) {
  return requestJson<{ operator: { id: string; email: string; name: string; mode: "database" }; token?: string }>(
    "/api/auth/login",
    {
      method: "POST",
      body: JSON.stringify({ email, password }),
    },
  );
}

export async function logoutRequest() {
  if (isExternalApiMode()) {
    clearStoredAuthToken();
    return;
  }

  await requestJson<{ ok: true }>("/api/auth/logout", {
    method: "POST",
    body: JSON.stringify({}),
  });
}
