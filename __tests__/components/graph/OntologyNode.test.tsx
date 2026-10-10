import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { OntologyNode } from "@/components/graph/OntologyNode";
import type { OntologyNodeData } from "@/components/graph/OntologyNode";

vi.mock("@xyflow/react", () => ({
  Handle: ({ type, position }: { type: string; position: string }) => (
    <div data-testid={`handle-${type}`} data-position={position} />
  ),
  Position: { Top: "top", Bottom: "bottom", Left: "left", Right: "right" },
}));

vi.mock("@/lib/utils", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

describe("OntologyNode", () => {
  const makeProps = (data: Partial<OntologyNodeData> = {}, id = "node-1") => ({
    id,
    data: {
      label: "TestClass",
      nodeType: "class" as const,
      ...data,
    } as OntologyNodeData,
    type: "custom",
    selected: false,
    draggable: false,
    dragging: false,
    selectable: true,
    deletable: false,
    isConnectable: true,
    zIndex: 0,
    positionAbsoluteX: 0,
    positionAbsoluteY: 0,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the node label", () => {
    render(<OntologyNode {...makeProps()} />);
    expect(screen.getByText("TestClass")).toBeDefined();
  });

  it("renders target and source handles", () => {
    render(<OntologyNode {...makeProps()} />);
    expect(screen.getByTestId("handle-target")).toBeDefined();
    expect(screen.getByTestId("handle-source")).toBeDefined();
  });

  // Mouse interactions are handled by ReactFlow at the parent (onNodeClick /
  // onNodeDoubleClick), not on the inner div, to avoid double-firing. The
  // component therefore exposes ONLY keyboard handlers.

  it("Enter keydown calls onExpandNode (parity with single-click expand)", () => {
    const onExpandNode = vi.fn();
    const onNavigate = vi.fn();
    render(
      <OntologyNode {...makeProps({ nodeType: "class", onExpandNode, onNavigate })} />
    );
    fireEvent.keyDown(screen.getByRole("button"), { key: "Enter" });
    expect(onExpandNode).toHaveBeenCalledWith("node-1");
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it("Space keydown calls onExpandNode (parity with single-click expand)", () => {
    const onExpandNode = vi.fn();
    render(
      <OntologyNode {...makeProps({ nodeType: "class", onExpandNode })} />
    );
    fireEvent.keyDown(screen.getByRole("button"), { key: " " });
    expect(onExpandNode).toHaveBeenCalledWith("node-1");
  });

  it("Shift+Enter calls onNavigate (parity with double-click navigate)", () => {
    const onNavigate = vi.fn();
    const onExpandNode = vi.fn();
    render(
      <OntologyNode {...makeProps({ nodeType: "class", onNavigate, onExpandNode })} />
    );
    fireEvent.keyDown(screen.getByRole("button"), { key: "Enter", shiftKey: true });
    expect(onNavigate).toHaveBeenCalledWith("node-1");
    expect(onExpandNode).not.toHaveBeenCalled();
  });

  it("does not invoke handlers for external node type", () => {
    const onExpandNode = vi.fn();
    const onNavigate = vi.fn();
    render(
      <OntologyNode {...makeProps({ nodeType: "external", onExpandNode, onNavigate })} />
    );
    fireEvent.keyDown(screen.getByRole("button"), { key: "Enter" });
    fireEvent.keyDown(screen.getByRole("button"), { key: "Enter", shiftKey: true });
    expect(onExpandNode).not.toHaveBeenCalled();
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it("shows child count when provided and > 0", () => {
    render(<OntologyNode {...makeProps({ childCount: 5 })} />);
    expect(screen.getByText("5 children")).toBeDefined();
  });

  it("shows singular 'child' for count of 1", () => {
    render(<OntologyNode {...makeProps({ childCount: 1 })} />);
    expect(screen.getByText("1 child")).toBeDefined();
  });

  it("does not show child count for external nodes", () => {
    render(
      <OntologyNode {...makeProps({ nodeType: "external", childCount: 3 })} />
    );
    expect(screen.queryByText("3 children")).toBeNull();
  });

  it("does not show child count when 0", () => {
    render(<OntologyNode {...makeProps({ childCount: 0 })} />);
    expect(screen.queryByText(/child/)).toBeNull();
  });

  it("renders type badge for individual nodes", () => {
    render(<OntologyNode {...makeProps({ nodeType: "individual" })} />);
    expect(screen.getByText("I")).toBeDefined();
  });

  it("renders type badge for property nodes", () => {
    render(<OntologyNode {...makeProps({ nodeType: "property" })} />);
    expect(screen.getByText("P")).toBeDefined();
  });

  it("does not render type badge for class nodes", () => {
    render(<OntologyNode {...makeProps({ nodeType: "class" })} />);
    expect(screen.queryByText("I")).toBeNull();
    expect(screen.queryByText("P")).toBeNull();
  });

  it("applies deprecated styling", () => {
    render(
      <OntologyNode {...makeProps({ deprecated: true })} />
    );
    const label = screen.getByText("TestClass");
    expect(label.className).toContain("line-through");
  });

  it("sets aria-label with keyboard hint for non-external nodes", () => {
    render(<OntologyNode {...makeProps({ nodeType: "class" })} />);
    const btn = screen.getByRole("button");
    expect(btn.getAttribute("aria-label")).toContain("TestClass");
    expect(btn.getAttribute("aria-label")).toContain("Enter to expand");
    expect(btn.getAttribute("aria-label")).toContain("Shift+Enter to navigate");
  });

  it("sets bare aria-label for external nodes", () => {
    render(<OntologyNode {...makeProps({ nodeType: "external" })} />);
    const btn = screen.getByRole("button");
    expect(btn.getAttribute("aria-label")).toBe("TestClass");
  });

  it("uses Top/Bottom handle positions for TB layout (default)", () => {
    render(<OntologyNode {...makeProps()} />);
    expect(screen.getByTestId("handle-target").getAttribute("data-position")).toBe("top");
    expect(screen.getByTestId("handle-source").getAttribute("data-position")).toBe("bottom");
  });

  it("uses Left/Right handle positions for LR layout", () => {
    render(<OntologyNode {...makeProps({ layoutDirection: "LR" })} />);
    expect(screen.getByTestId("handle-target").getAttribute("data-position")).toBe("left");
    expect(screen.getByTestId("handle-source").getAttribute("data-position")).toBe("right");
  });
});
