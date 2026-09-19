import { useSyncExternalStore } from "react";

/**
 * "Hide email addresses": a per-browser switch for screen recordings and demos.
 * Stored on this device only, so it never changes what anyone else sees.
 */
const KEY = "plusone:hide-emails";
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
export const MASKED_EMAIL = "xxx@xxx.xxx";

const listeners = new Set<() => void>();

function read(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function setHideEmails(on: boolean): void {
  try {
    localStorage.setItem(KEY, on ? "1" : "0");
  } catch {
    // Private windows can refuse storage; the switch then lasts only until reload.
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => e.key === KEY && listener();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useHideEmails(): boolean {
  return useSyncExternalStore(subscribe, read, () => false);
}

/** `email()` for a lone address, `text()` for anything that might contain one. */
export function usePrivacy() {
  const hide = useHideEmails();
  return {
    hide,
    email: (value: string | null | undefined): string | undefined => (value && hide ? MASKED_EMAIL : (value ?? undefined)),
    text: (value: string): string => (hide ? value.replace(EMAIL_RE, MASKED_EMAIL) : value),
  };
}
