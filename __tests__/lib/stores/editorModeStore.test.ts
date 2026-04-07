import { describe, expect, it, beforeEach, vi } from "vitest";

// vi.hoisted runs before any imports — needed because the store's module-level
// code calls window.matchMedia(...).addEventListener(...)
const { mockMatchMedia } = vi.hoisted(() => {
  const mockMatchMedia = vi.fn().mockReturnValue({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
  // In jsdom, window === globalThis
  (globalThis as Record<string, unknown>).matchMedia = mockMatchMedia;
  return { mockMatchMedia };
});

import { useEditorModeStore, applyThemeToDOM } from "@/lib/stores/editorModeStore";

describe("applyThemeToDOM", () => {
  let addSpy: ReturnType<typeof vi.fn>;
  let removeSpy: ReturnType<typeof vi.fn>;
  let toggleSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    addSpy = vi.fn();
    removeSpy = vi.fn();
    toggleSpy = vi.fn();
    Object.defineProperty(document.documentElement, "classList", {
      value: { add: addSpy, remove: removeSpy, toggle: toggleSpy },
      writable: true,
      configurable: true,
    });
  });

  it("adds 'dark' class for dark theme", () => {
    applyThemeToDOM("dark");
    expect(addSpy).toHaveBeenCalledWith("dark");
  });

  it("removes 'dark' class for light theme", () => {
    applyThemeToDOM("light");
    expect(removeSpy).toHaveBeenCalledWith("dark");
  });

  it("toggles 'dark' class based on OS preference for system theme", () => {
    // Mock matchMedia to return prefersDark = true
    Object.defineProperty(window, "matchMedia", {
      value: vi.fn().mockReturnValue({ matches: true }),
      writable: true,
      configurable: true,
    });

    applyThemeToDOM("system");
    expect(toggleSpy).toHaveBeenCalledWith("dark", true);
  });

  it("toggles off 'dark' class when OS prefers light", () => {
    Object.defineProperty(window, "matchMedia", {
      value: vi.fn().mockReturnValue({ matches: false }),
      writable: true,
      configurable: true,
    });

    applyThemeToDOM("system");
    expect(toggleSpy).toHaveBeenCalledWith("dark", false);
  });
});

describe("useEditorModeStore", () => {
  beforeEach(() => {
    useEditorModeStore.setState({
      editorMode: "standard",
      theme: "system",
      continuousEditing: false,
      hideSaveButton: false,
    });
  });

  describe("defaults", () => {
    it("has correct initial state", () => {
      const state = useEditorModeStore.getState();
      expect(state.editorMode).toBe("standard");
      expect(state.theme).toBe("system");
      expect(state.continuousEditing).toBe(false);
      expect(state.hideSaveButton).toBe(false);
    });
  });

  describe("setEditorMode", () => {
    it("switches to developer mode", () => {
      useEditorModeStore.getState().setEditorMode("developer");
      expect(useEditorModeStore.getState().editorMode).toBe("developer");
    });

    it("switches back to standard mode", () => {
      useEditorModeStore.getState().setEditorMode("developer");
      useEditorModeStore.getState().setEditorMode("standard");
      expect(useEditorModeStore.getState().editorMode).toBe("standard");
    });
  });

  describe("setTheme", () => {
    it("sets the theme to dark", () => {
      // Stub classList to avoid errors in applyThemeToDOM
      Object.defineProperty(document.documentElement, "classList", {
        value: { add: vi.fn(), remove: vi.fn(), toggle: vi.fn() },
        writable: true,
        configurable: true,
      });

      useEditorModeStore.getState().setTheme("dark");
      expect(useEditorModeStore.getState().theme).toBe("dark");
    });

    it("sets the theme to light", () => {
      Object.defineProperty(document.documentElement, "classList", {
        value: { add: vi.fn(), remove: vi.fn(), toggle: vi.fn() },
        writable: true,
        configurable: true,
      });

      useEditorModeStore.getState().setTheme("light");
      expect(useEditorModeStore.getState().theme).toBe("light");
    });
  });

  describe("setContinuousEditing", () => {
    it("enables continuous editing", () => {
      useEditorModeStore.getState().setContinuousEditing(true);
      expect(useEditorModeStore.getState().continuousEditing).toBe(true);
    });

    it("disables continuous editing", () => {
      useEditorModeStore.getState().setContinuousEditing(true);
      useEditorModeStore.getState().setContinuousEditing(false);
      expect(useEditorModeStore.getState().continuousEditing).toBe(false);
    });
  });

  describe("setHideSaveButton", () => {
    it("hides the save button", () => {
      useEditorModeStore.getState().setHideSaveButton(true);
      expect(useEditorModeStore.getState().hideSaveButton).toBe(true);
    });

    it("shows the save button again", () => {
      useEditorModeStore.getState().setHideSaveButton(true);
      useEditorModeStore.getState().setHideSaveButton(false);
      expect(useEditorModeStore.getState().hideSaveButton).toBe(false);
    });
  });
});
