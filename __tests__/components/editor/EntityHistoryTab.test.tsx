import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/lib/hooks/useEntityHistory", () => ({
  useEntityHistory: vi.fn(),
}));

import { EntityHistoryTab } from "@/components/editor/EntityHistoryTab";
import { useEntityHistory } from "@/lib/hooks/useEntityHistory";

const mockUseEntityHistory = vi.mocked(useEntityHistory);

describe("EntityHistoryTab", () => {
  it("returns null when entityIri is null", () => {
    mockUseEntityHistory.mockReturnValue({ data: undefined, isLoading: false, error: null } as ReturnType<typeof useEntityHistory>);
    const { container } = render(
      <EntityHistoryTab projectId="p1" entityIri={null} />
    );
    expect(container.innerHTML).toBe("");
  });

  it("returns null when not loading and no events", () => {
    mockUseEntityHistory.mockReturnValue({
      data: { events: [], total: 0 },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useEntityHistory>);
    const { container } = render(
      <EntityHistoryTab projectId="p1" entityIri="http://example.org/A" />
    );
    expect(container.innerHTML).toBe("");
  });

  it("shows loading state", () => {
    mockUseEntityHistory.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as ReturnType<typeof useEntityHistory>);
    render(
      <EntityHistoryTab projectId="p1" entityIri="http://example.org/A" />
    );
    expect(screen.getByText("History (...)")).toBeDefined();
  });

  it("shows error message", () => {
    mockUseEntityHistory.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("fail"),
    } as unknown as ReturnType<typeof useEntityHistory>);
    render(
      <EntityHistoryTab projectId="p1" entityIri="http://example.org/A" />
    );
    expect(screen.getByText("Failed to load history")).toBeDefined();
  });

  it("shows total count and expands events on click", async () => {
    mockUseEntityHistory.mockReturnValue({
      data: {
        events: [
          {
            id: "e1",
            event_type: "create",
            user_name: "Alice",
            changed_fields: [],
            created_at: new Date().toISOString(),
          },
        ],
        total: 1,
      },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useEntityHistory>);
    render(
      <EntityHistoryTab projectId="p1" entityIri="http://example.org/A" />
    );
    expect(screen.getByText("History (1)")).toBeDefined();
    await userEvent.click(screen.getByText("History (1)"));
    expect(screen.getByText("Alice")).toBeDefined();
    expect(screen.getByText("created")).toBeDefined();
  });

  it("displays changed fields when present", async () => {
    mockUseEntityHistory.mockReturnValue({
      data: {
        events: [
          {
            id: "e2",
            event_type: "update",
            user_name: "Bob",
            changed_fields: ["label", "comment"],
            created_at: new Date().toISOString(),
          },
        ],
        total: 1,
      },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useEntityHistory>);
    render(
      <EntityHistoryTab projectId="p1" entityIri="http://example.org/A" />
    );
    await userEvent.click(screen.getByText("History (1)"));
    expect(screen.getByText("(label, comment)")).toBeDefined();
  });
});
