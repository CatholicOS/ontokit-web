import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

// Provide localStorage polyfill
vi.hoisted(() => {
  if (!globalThis.localStorage || typeof globalThis.localStorage.setItem !== "function") {
    const store = new Map<string, string>();
    (globalThis as Record<string, unknown>).localStorage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
      clear: () => store.clear(),
      get length() { return store.size; },
      key: (index: number) => [...store.keys()][index] ?? null,
    };
  }
});

// --- Mocks ---

vi.mock("next/dynamic", () => ({
  __esModule: true,
  default: () => () => <div data-testid="dynamic-component" />,
}));

vi.mock("@/components/editor/ClassTree", () => ({
  ClassTree: (props: Record<string, unknown>) => (
    <div data-testid="class-tree" data-selected={props.selectedIri as string} />
  ),
}));

vi.mock("@/components/editor/ClassDetailPanel", () => ({
  ClassDetailPanel: (props: Record<string, unknown>) => (
    <div data-testid="class-detail-panel" data-class-iri={props.classIri as string} />
  ),
}));

vi.mock("@/components/editor/HealthCheckPanel", () => ({
  HealthCheckPanel: () => <div data-testid="health-check-panel" />,
}));

vi.mock("@/components/editor/ResizablePanelDivider", () => ({
  ResizablePanelDivider: () => <div data-testid="panel-divider" />,
}));

vi.mock("@/components/editor/standard/EntityTabBar", () => ({
  EntityTabBar: (props: Record<string, unknown>) => (
    <div data-testid="entity-tab-bar">
      <button onClick={() => (props.onTabChange as (id: string) => void)?.("classes")}>Classes</button>
      <button onClick={() => (props.onTabChange as (id: string) => void)?.("properties")}>Properties</button>
      <button onClick={() => (props.onTabChange as (id: string) => void)?.("individuals")}>Individuals</button>
    </div>
  ),
}));

vi.mock("@/components/editor/standard/PropertyTree", () => ({
  PropertyTree: () => <div data-testid="property-tree" />,
}));

vi.mock("@/components/editor/standard/IndividualList", () => ({
  IndividualList: () => <div data-testid="individual-list" />,
}));

vi.mock("@/components/editor/PropertyDetailPanel", () => ({
  PropertyDetailPanel: () => <div data-testid="property-detail-panel" />,
}));

vi.mock("@/components/editor/IndividualDetailPanel", () => ({
  IndividualDetailPanel: () => <div data-testid="individual-detail-panel" />,
}));

vi.mock("@/components/editor/shared/EntityTreeToolbar", () => ({
  EntityTreeToolbar: () => <div data-testid="entity-tree-toolbar" />,
}));

vi.mock("@/components/editor/shared/DraggableTreeWrapper", () => ({
  DraggableTreeWrapper: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="draggable-wrapper">{children}</div>
  ),
}));

vi.mock("@/lib/hooks/useTreeSearch", () => ({
  useTreeSearch: () => ({
    showSearch: false,
    searchQuery: "",
    searchResults: [],
    isSearching: false,
    searchInputRef: { current: null },
    toggleSearch: vi.fn(),
    closeSearch: vi.fn(),
    setSearchQuery: vi.fn(),
    handleSearchSelect: vi.fn(),
  }),
}));

vi.mock("@/lib/hooks/useFilteredTree", () => ({
  useFilteredTree: () => ({
    filteredNodes: null,
    isBuilding: false,
    truncated: false,
  }),
}));

vi.mock("@/lib/hooks/useTreeDragDrop", () => ({
  useTreeDragDrop: () => ({
    dragState: {
      draggedIri: null,
      draggedLabel: null,
      dropTargetIri: null,
      isValidDropTarget: false,
      isDragActive: false,
      dragMode: "move",
    },
    undoAction: null,
    handleDragStart: vi.fn(),
    handleDragOver: vi.fn(),
    handleDragEnd: vi.fn(),
    handleDragCancel: vi.fn(),
    handleUndo: vi.fn(),
    clearUndo: vi.fn(),
    handleDragEnterNode: vi.fn(),
    handleDragLeaveNode: vi.fn(),
  }),
}));

vi.mock("@/lib/context/ToastContext", () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    addToast: vi.fn(),
  }),
}));

vi.mock("@/lib/stores/draftStore", () => ({
  useDraftStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      getDraftIris: () => [],
      drafts: {},
      getDraft: vi.fn(),
      setDraft: vi.fn(),
      removeDraft: vi.fn(),
      hasDraft: vi.fn(() => false),
    }),
}));

vi.mock("@/lib/graph/buildGraphData", () => ({
  extractTreeLabelMap: vi.fn(() => new Map()),
}));

vi.mock("@/components/ui/ScreenReaderAnnouncer", () => ({
  useAnnounce: () => ({ announce: vi.fn() }),
}));

import {
  DeveloperEditorLayout,
  type DeveloperEditorLayoutProps,
} from "@/components/editor/developer/DeveloperEditorLayout";
import type { ClassTreeNode } from "@/lib/ontology/types";

// --- Helper ---

function defaultProps(
  overrides: Partial<DeveloperEditorLayoutProps> = {},
): DeveloperEditorLayoutProps {
  return {
    projectId: "proj-1",
    accessToken: "token-123",
    activeBranch: "main",
    canEdit: false,
    canManage: false,
    nodes: [],
    isTreeLoading: false,
    treeError: null,
    selectedIri: null,
    selectNode: vi.fn(),
    expandNode: vi.fn(),
    collapseNode: vi.fn(),
    expandOneLevel: vi.fn().mockResolvedValue(undefined),
    expandAllFully: vi.fn().mockResolvedValue(undefined),
    collapseAll: vi.fn(),
    collapseOneLevel: vi.fn(),
    hasExpandableNodes: false,
    hasExpandedNodes: false,
    isExpandingAll: false,
    navigateToNode: vi.fn().mockResolvedValue(undefined),
    sourceContent: "",
    setSourceContent: vi.fn(),
    isLoadingSource: false,
    sourceError: null,
    isPreloading: false,
    loadSourceContent: vi.fn().mockResolvedValue(undefined),
    sourceIriIndex: new Map(),
    pendingScrollIri: null,
    setPendingScrollIri: vi.fn(),
    sourceEditorRef: { current: null },
    onSaveSource: vi.fn().mockResolvedValue(undefined),
    onAddEntity: vi.fn(),
    selectedNodeFallback: null,
    showHealthCheck: false,
    onCloseHealthCheck: vi.fn(),
    ...overrides,
  };
}

function makeNode(overrides: Partial<ClassTreeNode> = {}): ClassTreeNode {
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

describe("DeveloperEditorLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- Rendering ---

  it("renders view mode tabs (Tree, Source, Graph)", () => {
    render(<DeveloperEditorLayout {...defaultProps()} />);
    expect(screen.getByText("Tree")).toBeDefined();
    expect(screen.getByText("Source")).toBeDefined();
    expect(screen.getByText("Graph")).toBeDefined();
  });

  it("starts in tree view mode showing entity tab bar", () => {
    render(<DeveloperEditorLayout {...defaultProps()} />);
    expect(screen.getByTestId("entity-tab-bar")).toBeDefined();
  });

  it("shows ClassTree when nodes exist", () => {
    render(
      <DeveloperEditorLayout {...defaultProps({ nodes: [makeNode()] })} />,
    );
    expect(screen.getByTestId("class-tree")).toBeDefined();
  });

  it("does not show ClassTree when tree is loading with no nodes", () => {
    render(
      <DeveloperEditorLayout {...defaultProps({ isTreeLoading: true, nodes: [] })} />,
    );
    expect(screen.queryByTestId("class-tree")).toBeNull();
  });

  it("shows error message when treeError is set", () => {
    render(
      <DeveloperEditorLayout {...defaultProps({ treeError: "Failed to load tree" })} />,
    );
    expect(screen.getByText("Failed to load tree")).toBeDefined();
  });

  it("shows empty state when nodes array is empty", () => {
    render(<DeveloperEditorLayout {...defaultProps()} />);
    expect(screen.getByText("No classes found in this ontology")).toBeDefined();
  });

  // --- View Mode Switching ---

  it("hides entity tab bar in source view", () => {
    render(
      <DeveloperEditorLayout
        {...defaultProps({ sourceContent: "@prefix : <http://ex.org/> ." })}
      />,
    );
    fireEvent.click(screen.getByText("Source"));
    expect(screen.queryByTestId("entity-tab-bar")).toBeNull();
  });

  it("shows loading state in source view when isLoadingSource", () => {
    render(
      <DeveloperEditorLayout {...defaultProps({ isLoadingSource: true })} />,
    );
    fireEvent.click(screen.getByText("Source"));
    expect(screen.getByText("Loading source...")).toBeDefined();
  });

  it("shows error state in source view with retry button", () => {
    const loadSourceContent = vi.fn();
    render(
      <DeveloperEditorLayout
        {...defaultProps({ sourceError: "Network error", loadSourceContent })}
      />,
    );
    fireEvent.click(screen.getByText("Source"));
    expect(screen.getByText("Failed to load source")).toBeDefined();
    expect(screen.getByText("Network error")).toBeDefined();
    fireEvent.click(screen.getByText("Try Again"));
    expect(loadSourceContent).toHaveBeenCalledWith(false);
  });

  it("switches to graph view when Graph tab is clicked", () => {
    render(<DeveloperEditorLayout {...defaultProps()} />);
    fireEvent.click(screen.getByText("Graph"));
    expect(screen.getByTestId("dynamic-component")).toBeDefined();
    expect(screen.queryByTestId("entity-tab-bar")).toBeNull();
  });

  it("switches back to tree view from source", () => {
    render(
      <DeveloperEditorLayout
        {...defaultProps({ nodes: [makeNode()], sourceContent: "content" })}
      />,
    );
    fireEvent.click(screen.getByText("Source"));
    expect(screen.queryByTestId("class-tree")).toBeNull();
    fireEvent.click(screen.getByText("Tree"));
    expect(screen.getByTestId("class-tree")).toBeDefined();
  });

  // --- Entity Tab Switching ---

  it("shows PropertyTree when properties tab is selected", () => {
    render(
      <DeveloperEditorLayout {...defaultProps({ nodes: [makeNode()] })} />,
    );
    fireEvent.click(screen.getByText("Properties"));
    expect(screen.getByTestId("property-tree")).toBeDefined();
  });

  it("shows IndividualList when individuals tab is selected", () => {
    render(
      <DeveloperEditorLayout {...defaultProps({ nodes: [makeNode()] })} />,
    );
    fireEvent.click(screen.getByText("Individuals"));
    expect(screen.getByTestId("individual-list")).toBeDefined();
  });

  it("shows PropertyDetailPanel when properties tab is selected", () => {
    render(
      <DeveloperEditorLayout {...defaultProps({ nodes: [makeNode()] })} />,
    );
    fireEvent.click(screen.getByText("Properties"));
    expect(screen.getByTestId("property-detail-panel")).toBeDefined();
  });

  it("shows IndividualDetailPanel when individuals tab is selected", () => {
    render(
      <DeveloperEditorLayout {...defaultProps({ nodes: [makeNode()] })} />,
    );
    fireEvent.click(screen.getByText("Individuals"));
    expect(screen.getByTestId("individual-detail-panel")).toBeDefined();
  });

  // --- Health Check ---

  it("shows health check panel when showHealthCheck is true", () => {
    render(
      <DeveloperEditorLayout
        {...defaultProps({ showHealthCheck: true, nodes: [makeNode()] })}
      />,
    );
    expect(screen.getByTestId("health-check-panel")).toBeDefined();
  });

  it("does not show health check panel by default", () => {
    render(
      <DeveloperEditorLayout {...defaultProps({ nodes: [makeNode()] })} />,
    );
    expect(screen.queryByTestId("health-check-panel")).toBeNull();
  });

  // --- Detail Panel ---

  it("renders ClassDetailPanel with selectedIri in tree view", () => {
    render(
      <DeveloperEditorLayout
        {...defaultProps({ nodes: [makeNode()], selectedIri: "http://example.org/Class1" })}
      />,
    );
    const panel = screen.getByTestId("class-detail-panel");
    expect(panel.getAttribute("data-class-iri")).toBe("http://example.org/Class1");
  });

  // --- DraggableTreeWrapper ---

  it("wraps class tree in DraggableTreeWrapper", () => {
    render(
      <DeveloperEditorLayout {...defaultProps({ nodes: [makeNode()] })} />,
    );
    expect(screen.getByTestId("draggable-wrapper")).toBeDefined();
    expect(screen.getByTestId("class-tree")).toBeDefined();
  });

  // --- Panel Divider ---

  it("renders panel divider in tree view", () => {
    render(
      <DeveloperEditorLayout {...defaultProps({ nodes: [makeNode()] })} />,
    );
    expect(screen.getByTestId("panel-divider")).toBeDefined();
  });
});
