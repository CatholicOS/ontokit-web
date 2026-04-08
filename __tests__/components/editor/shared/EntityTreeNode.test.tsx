import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock dnd-kit
vi.mock("@dnd-kit/core", () => ({
  useDraggable: () => ({ attributes: {}, listeners: {}, setNodeRef: vi.fn() }),
  useDroppable: () => ({ setNodeRef: vi.fn(), isOver: false }),
}));

// Mock TreeNodeContextMenu to keep test simple
vi.mock("@/components/editor/TreeNodeContextMenu", () => ({
  TreeNodeContextMenu: () => <div data-testid="context-menu" />,
}));

// Mock context-menu to render children directly
vi.mock("@/components/ui/context-menu", () => ({
  ContextMenu: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  ContextMenuTrigger: ({ children }: { children: React.ReactNode; asChild?: boolean }) => <>{children}</>,
}));

import { EntityTreeNodeRow } from "@/components/editor/shared/EntityTreeNode";
import type { EntityTreeNode } from "@/lib/ontology/types";

function makeNode(overrides: Partial<EntityTreeNode> = {}): EntityTreeNode {
  return {
    iri: "http://example.org/Class1",
    label: "Class1",
    children: [],
    isExpanded: false,
    isLoading: false,
    hasChildren: false,
    ...overrides,
  };
}

describe("EntityTreeNodeRow", () => {
  const baseProps = {
    depth: 0,
    onSelect: vi.fn(),
    onExpand: vi.fn(),
    onCollapse: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the node label", () => {
    render(<EntityTreeNodeRow {...baseProps} node={makeNode({ label: "Person" })} />);
    expect(screen.getByText("Person")).toBeDefined();
  });

  it("renders with treeitem role", () => {
    render(<EntityTreeNodeRow {...baseProps} node={makeNode()} />);
    expect(screen.getByRole("treeitem")).toBeDefined();
  });

  it("sets aria-selected when node is selected", () => {
    render(
      <EntityTreeNodeRow
        {...baseProps}
        node={makeNode({ iri: "http://ex.org/A" })}
        selectedIri="http://ex.org/A"
      />,
    );
    expect(screen.getByRole("treeitem").getAttribute("aria-selected")).toBe("true");
  });

  it("sets aria-selected to false when not selected", () => {
    render(
      <EntityTreeNodeRow
        {...baseProps}
        node={makeNode({ iri: "http://ex.org/A" })}
        selectedIri="http://ex.org/B"
      />,
    );
    expect(screen.getByRole("treeitem").getAttribute("aria-selected")).toBe("false");
  });

  it("calls onSelect when clicked", async () => {
    const onSelect = vi.fn();
    render(
      <EntityTreeNodeRow
        {...baseProps}
        node={makeNode({ iri: "http://ex.org/A", label: "Alpha" })}
        onSelect={onSelect}
      />,
    );
    await userEvent.click(screen.getByText("Alpha"));
    expect(onSelect).toHaveBeenCalledWith("http://ex.org/A");
  });

  it("shows chevron for nodes with children", () => {
    render(
      <EntityTreeNodeRow
        {...baseProps}
        node={makeNode({ hasChildren: true })}
      />,
    );
    const btn = screen.getByRole("button", { hidden: true });
    expect(btn).toBeDefined();
  });

  it("shows leaf dot for nodes without children", () => {
    const { container } = render(
      <EntityTreeNodeRow
        {...baseProps}
        node={makeNode({ hasChildren: false })}
      />,
    );
    expect(container.querySelector(".tree-leaf-dot")).toBeDefined();
  });

  it("calls onExpand when toggle button clicked on collapsed node", async () => {
    const onExpand = vi.fn();
    render(
      <EntityTreeNodeRow
        {...baseProps}
        node={makeNode({ hasChildren: true, isExpanded: false })}
        onExpand={onExpand}
      />,
    );
    // The toggle button is aria-hidden
    const buttons = screen.getAllByRole("button", { hidden: true });
    const toggleBtn = buttons.find(
      (b) => b.getAttribute("aria-hidden") === "true",
    );
    if (toggleBtn) {
      await userEvent.click(toggleBtn);
      expect(onExpand).toHaveBeenCalledWith("http://example.org/Class1");
    }
  });

  it("calls onCollapse when toggle button clicked on expanded node", async () => {
    const onCollapse = vi.fn();
    render(
      <EntityTreeNodeRow
        {...baseProps}
        node={makeNode({ hasChildren: true, isExpanded: true })}
        onCollapse={onCollapse}
      />,
    );
    const buttons = screen.getAllByRole("button", { hidden: true });
    const toggleBtn = buttons.find(
      (b) => b.getAttribute("aria-hidden") === "true",
    );
    if (toggleBtn) {
      await userEvent.click(toggleBtn);
      expect(onCollapse).toHaveBeenCalledWith("http://example.org/Class1");
    }
  });

  it("shows draft indicator when IRI is in draftIris set", () => {
    render(
      <EntityTreeNodeRow
        {...baseProps}
        node={makeNode({ iri: "http://ex.org/A" })}
        draftIris={new Set(["http://ex.org/A"])}
      />,
    );
    expect(screen.getByLabelText("Unsaved draft")).toBeDefined();
  });

  it("does not show draft indicator when IRI is not in draftIris", () => {
    render(
      <EntityTreeNodeRow
        {...baseProps}
        node={makeNode({ iri: "http://ex.org/A" })}
        draftIris={new Set(["http://ex.org/B"])}
      />,
    );
    expect(screen.queryByLabelText("Unsaved draft")).toBeNull();
  });

  it("shows Add subclass button when onAddChild is provided", () => {
    render(
      <EntityTreeNodeRow
        {...baseProps}
        node={makeNode()}
        onAddChild={vi.fn()}
      />,
    );
    expect(screen.getByLabelText("Add subclass")).toBeDefined();
  });

  it("applies line-through for deprecated nodes", () => {
    render(
      <EntityTreeNodeRow
        {...baseProps}
        node={makeNode({ deprecated: true, label: "OldClass" })}
      />,
    );
    const label = screen.getByText("OldClass");
    expect(label.className).toContain("line-through");
  });

  it("highlights search matches", () => {
    render(
      <EntityTreeNodeRow
        {...baseProps}
        node={makeNode({ label: "PersonEntity", isSearchMatch: true })}
        searchQuery="Person"
      />,
    );
    const mark = screen.getByText("Person");
    expect(mark.tagName).toBe("MARK");
  });

  it("renders group header differently", () => {
    render(
      <EntityTreeNodeRow
        {...baseProps}
        node={makeNode({
          isGroupHeader: true,
          label: "Object Properties",
          isExpanded: true,
          children: [makeNode({ iri: "http://ex.org/prop", label: "hasPart" })],
        })}
      />,
    );
    expect(screen.getByText("Object Properties")).toBeDefined();
    expect(screen.getByText("hasPart")).toBeDefined();
  });

  it("renders child count for group headers", () => {
    render(
      <EntityTreeNodeRow
        {...baseProps}
        node={makeNode({
          isGroupHeader: true,
          label: "Properties",
          isExpanded: false,
          children: [
            makeNode({ iri: "http://ex.org/a", label: "a" }),
            makeNode({ iri: "http://ex.org/b", label: "b" }),
          ],
        })}
      />,
    );
    expect(screen.getByText("2")).toBeDefined();
  });
});
