import { describe, expect, it, vi, beforeEach } from "vitest";
import { waitFor } from "@testing-library/react";
import { renderHookWithQueryClient } from "@/__tests__/helpers/renderWithProviders";

vi.mock("@/lib/api/suggestions", () => ({
  suggestionsApi: { listSessions: vi.fn() },
}));

import { useSuggestionSessions } from "@/lib/hooks/useSuggestionSessions";
import { suggestionsApi } from "@/lib/api/suggestions";

const mockedList = vi.mocked(suggestionsApi.listSessions);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useSuggestionSessions", () => {
  it("returns the session list once the request resolves", async () => {
    const items = [{ id: "s1" }, { id: "s2" }];
    mockedList.mockResolvedValue({ items } as never);

    const { result } = renderHookWithQueryClient(() => useSuggestionSessions("p1", "tok"));

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.sessions).toEqual(items);
    expect(result.current.error).toBeNull();
    expect(mockedList).toHaveBeenCalledWith("p1", "tok");
  });

  it("does not fetch and does not report loading without an access token", async () => {
    const { result } = renderHookWithQueryClient(() => useSuggestionSessions("p1", undefined));

    // A disabled React Query stays "pending" indefinitely; the hook must not
    // pass that through, or the page would spin forever for signed-out users.
    expect(result.current.isLoading).toBe(false);
    expect(result.current.sessions).toEqual([]);
    expect(mockedList).not.toHaveBeenCalled();
  });

  it("does not fetch without a project id", () => {
    const { result } = renderHookWithQueryClient(() => useSuggestionSessions("", "tok"));
    expect(result.current.isLoading).toBe(false);
    expect(mockedList).not.toHaveBeenCalled();
  });

  it("surfaces the error message when the request fails", async () => {
    mockedList.mockRejectedValue(new Error("boom"));

    const { result } = renderHookWithQueryClient(() => useSuggestionSessions("p1", "tok"));

    await waitFor(() => expect(result.current.error).toBe("boom"));
    expect(result.current.sessions).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it("falls back to a generic message for a non-Error rejection", async () => {
    mockedList.mockRejectedValue("nope");

    const { result } = renderHookWithQueryClient(() => useSuggestionSessions("p1", "tok"));

    await waitFor(() => expect(result.current.error).toBe("Failed to load suggestions"));
  });
});
