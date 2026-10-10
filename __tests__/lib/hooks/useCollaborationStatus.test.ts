import { describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import { useCollaborationStatus } from "@/lib/hooks/useCollaborationStatus";

describe("useCollaborationStatus", () => {
  it("returns disabled status (stub — collab endpoint not yet implemented)", () => {
    const { result } = renderHook(() =>
      useCollaborationStatus({ projectId: "proj-1" }),
    );

    expect(result.current.status).toBe("disabled");
    expect(result.current.isConnected).toBe(false);
  });

  it("returns the collab endpoint path", () => {
    const { result } = renderHook(() =>
      useCollaborationStatus({ projectId: "proj-1" }),
    );

    expect(result.current.endpoint).toBe("/api/v1/collab/ws");
  });

  it("returns the purpose description", () => {
    const { result } = renderHook(() =>
      useCollaborationStatus({ projectId: "proj-1" }),
    );

    expect(result.current.purpose).toBe("Real-time collaboration (coming soon)");
  });
});
