"use client";

const TOKEN_STORAGE_KEY = "billiards-api-token";

export function isBrowser() {
  return typeof window !== "undefined";
}

export function getStoredAuthToken() {
  if (!isBrowser()) {
    return null;
  }

  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setStoredAuthToken(token: string) {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function clearStoredAuthToken() {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
}
