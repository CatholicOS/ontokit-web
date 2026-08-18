import { describe, expect, it, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePrefersDarkMode } from "@/lib/hooks/usePrefersDarkMode";

const originalMatchMedia = window.matchMedia;

/** Minimal MediaQueryList stub whose `matches` can be flipped from a test. */
function installMatchMedia(initialMatches: boolean) {
  const listeners = new Set<() => void>();
  const mql = {
    matches: initialMatches,
    media: "(prefers-color-scheme: dark)",
    addEventListener: (_: string, cb: () => void) => {
      listeners.add(cb);
    },
    removeEventListener: (_: string, cb: () => void) => {
      listeners.delete(cb);
    },
  };
  const matchMedia = vi.fn(() => mql);
  Object.defineProperty(window, "matchMedia", { value: matchMedia, configurable: true, writable: true });
  return {
    matchMedia,
    listeners,
    setMatches(next: boolean) {
      mql.matches = next;
      for (const cb of listeners) cb();
    },
  };
}

afterEach(() => {
  Object.defineProperty(window, "matchMedia", {
    value: originalMatchMedia,
    configurable: true,
    writable: true,
  });
  vi.restoreAllMocks();
});

describe("usePrefersDarkMode", () => {
  it("reports the current preference on the first render, with no effect pass", () => {
    installMatchMedia(true);
    const { result } = renderHook(() => usePrefersDarkMode());
    // Previously this started as light and was corrected by an effect; reading
    // the store directly means the very first committed value is already right.
    expect(result.current).toBe(true);
  });

  it("reports false when the OS prefers light", () => {
    installMatchMedia(false);
    const { result } = renderHook(() => usePrefersDarkMode());
    expect(result.current).toBe(false);
  });

  it("updates when the OS preference changes", () => {
    const mm = installMatchMedia(false);
    const { result } = renderHook(() => usePrefersDarkMode());
    expect(result.current).toBe(false);

    act(() => mm.setMatches(true));
    expect(result.current).toBe(true);

    act(() => mm.setMatches(false));
    expect(result.current).toBe(false);
  });

  it("unsubscribes on unmount", () => {
    const mm = installMatchMedia(true);
    const { unmount } = renderHook(() => usePrefersDarkMode());
    expect(mm.listeners.size).toBe(1);
    unmount();
    expect(mm.listeners.size).toBe(0);
  });

  it("falls back to light when matchMedia is unavailable", () => {
    Object.defineProperty(window, "matchMedia", { value: undefined, configurable: true, writable: true });
    const { result } = renderHook(() => usePrefersDarkMode());
    expect(result.current).toBe(false);
  });
});
