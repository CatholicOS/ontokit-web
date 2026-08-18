"use client";

import { useSyncExternalStore } from "react";

const DARK_SCHEME_QUERY = "(prefers-color-scheme: dark)";

function getMediaQueryList(): MediaQueryList | null {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return null;
  }
  return window.matchMedia(DARK_SCHEME_QUERY);
}

function subscribe(onStoreChange: () => void): () => void {
  const mql = getMediaQueryList();
  if (!mql) return () => {};
  mql.addEventListener("change", onStoreChange);
  return () => mql.removeEventListener("change", onStoreChange);
}

function getSnapshot(): boolean {
  return getMediaQueryList()?.matches ?? false;
}

/**
 * The server has no way of knowing the visitor's OS preference, so it always
 * reports light. React swaps to the real value straight after hydration.
 */
function getServerSnapshot(): boolean {
  return false;
}

/**
 * Tracks the OS-level `prefers-color-scheme: dark` setting.
 *
 * `matchMedia` is an external store, so it is read through
 * `useSyncExternalStore` rather than mirrored into state from an effect. That
 * keeps the value correct on the first committed render instead of light-first
 * then corrected, and avoids tearing if several components read it at once.
 */
export function usePrefersDarkMode(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
