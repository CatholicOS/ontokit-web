import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

// Provide localStorage polyfill
vi.hoisted(() => {
  if (!globalThis.localStorage || typeof globalThis.localStorage.setItem !== "function") {
    const store = new Map<string, string>();
    (globalThis as Record<string, unknown>).localStorage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => { store.set(key, value); },
      removeItem: (key: string) => { store.delete(key); },
      clear: () => store.clear(),
      get length() { return store.size; },
      key: (index: number) => [...store.keys()][index] ?? null,
    };
  }
});

// --- Mocks ---

vi.mock("next/dynamic", () => ({
  __esModule: true,
  default: () => () => <div data-testid="ontology-graph" />,
}));

vi.mock("@/components/editor/ClassTree", () => ({
  ClassTree: (props: Record<string, unknown>) => <div data-testid="class-tree" data-selected={props.selectedIri} />,
}));

vi.mock("@/components/editor/ClassDetailPanel", () => ({
  ClassDetailPanel: (props: Record<string, unknown>) => (
    <div data-testid="class-detail-panel">
      {props.headerActions as React.ReactNode}
    </div>
  ),
}));

let _tabChangeHandler: ((id: string) => void) | undefined;
vi.mock("@/components/editor/standard/EntityTabBar", () => ({
  EntityTabBar: (props: Record<string, unknown>) => {
    _tabChangeHandler = props.onTabChange as (id: string) => void;
    return (
      <div data-testid="entity-tab-bar">
        <button onClick={() => (props.onTabChange as (id: string) => void)?.("classes")}>Classes</button>
        <button onClick={() => (props.onTabChange as (id: string) => void)?.("properties")}>Properties</button>
        <button onClick={() => (props.onTabChange as (id: string) => void)?.("individuals")}>Individuals</button>
      </div>
    );
  },
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

vi.mock("@/components/editor/ResizablePanelDivider", () => ({
  ResizablePanelDivider: () => <div data-testid="panel-divider" />,
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

import { StandardEditorLayout, type StandardEditorLayoutProps } from "@/components/editor/standard/StandardEditorLayout";
import type { ClassTreeNode } from "@/lib/ontology/types";

// --- Helper ---

function defaultProps(overrides: Partial<StandardEditorLayoutProps> = {}): StandardEditorLayoutProps {
  return {
    projectId: "proj-1",
    accessToken: "token-123",
    activeBranch: "main",
    canEdit: false,
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
    onAddEntity: vi.fn(),
    selectedNodeFallback: null,
    ...overrides,
  };
}

const sampleNodes: ClassTreeNode[] = [
  {
    iri: "http://example.org/ClassA",
    label: "Class A",
    children: [],
    isExpanded: false,
    isLoading: false,
    hasChildren: false,
  },
];

// --- Tests ---

describe("StandardEditorLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _tabChangeHandler = undefined;
  });

  it("renders entity tab bar", () => {
    render(<StandardEditorLayout {...defaultProps()} />);
    expect(screen.getByTestId("entity-tab-bar")).toBeDefined();
  });

  it("renders entity tree toolbar", () => {
    render(<StandardEditorLayout {...defaultProps()} />);
    expect(screen.getByTestId("entity-tree-toolbar")).toBeDefined();
  });

  it("renders panel divider", () => {
    render(<StandardEditorLayout {...defaultProps()} />);
    expect(screen.getByTestId("panel-divider")).toBeDefined();
  });

  // --- Loading state ---
  it("shows loading spinner when tree is loading and no nodes", () => {
    render(<StandardEditorLayout {...defaultProps({ isTreeLoading: true, nodes: [] })} />);
    // The spinner is an empty div with animate-spin class
    const spinner = document.querySelector(".animate-spin");
    expect(spinner).not.toBeNull();
  });

  // --- Error state ---
  it("shows error message when treeError is set", () => {
    render(<StandardEditorLayout {...defaultProps({ treeError: "Something went wrong" })} />);
    expect(screen.getByText("Something went wrong")).toBeDefined();
  });

  // --- Empty state ---
  it("shows empty message when no classes found", () => {
    render(<StandardEditorLayout {...defaultProps({ nodes: [], isTreeLoading: false })} />);
    expect(screen.getByText("No classes found in this ontology")).toBeDefined();
  });

  // --- Tree rendering ---
  it("renders class tree when nodes exist", () => {
    render(<StandardEditorLayout {...defaultProps({ nodes: sampleNodes })} />);
    expect(screen.getByTestId("class-tree")).toBeDefined();
    expect(screen.getByTestId("draggable-wrapper")).toBeDefined();
  });

  // --- Detail panel: class ---
  it("renders ClassDetailPanel when classes tab is active (default)", () => {
    render(<StandardEditorLayout {...defaultProps({ nodes: sampleNodes })} />);
    expect(screen.getByTestId("class-detail-panel")).toBeDefined();
  });

  // --- Tab switching: properties ---
  it("shows PropertyTree and PropertyDetailPanel when properties tab selected", () => {
    render(<StandardEditorLayout {...defaultProps({ nodes: sampleNodes })} />);
    fireEvent.click(screen.getByText("Properties"));
    expect(screen.getByTestId("property-tree")).toBeDefined();
    expect(screen.getByTestId("property-detail-panel")).toBeDefined();
  });

  // --- Tab switching: individuals ---
  it("shows IndividualList and IndividualDetailPanel when individuals tab selected", () => {
    render(<StandardEditorLayout {...defaultProps({ nodes: sampleNodes })} />);
    fireEvent.click(screen.getByText("Individuals"));
    expect(screen.getByTestId("individual-list")).toBeDefined();
    expect(screen.getByTestId("individual-detail-panel")).toBeDefined();
  });

  // --- Tab switching back to classes ---
  it("switches back to classes tab", () => {
    render(<StandardEditorLayout {...defaultProps({ nodes: sampleNodes })} />);
    fireEvent.click(screen.getByText("Properties"));
    expect(screen.getByTestId("property-tree")).toBeDefined();
    fireEvent.click(screen.getByText("Classes"));
    expect(screen.getByTestId("class-tree")).toBeDefined();
    expect(screen.getByTestId("class-detail-panel")).toBeDefined();
  });

  // --- Graph view toggle ---
  it("shows Graph button when a class is selected", () => {
    render(
      <StandardEditorLayout
        {...defaultProps({ nodes: sampleNodes, selectedIri: "http://example.org/ClassA" })}
      />
    );
    expect(screen.getByText("Graph")).toBeDefined();
  });

  it("toggles to graph view when Graph button clicked", () => {
    render(
      <StandardEditorLayout
        {...defaultProps({ nodes: sampleNodes, selectedIri: "http://example.org/ClassA" })}
      />
    );
    fireEvent.click(screen.getByText("Graph"));
    expect(screen.getByTestId("ontology-graph")).toBeDefined();
    expect(screen.getByText("Back to Details")).toBeDefined();
  });

  it("toggles back from graph view via Back button", () => {
    render(
      <StandardEditorLayout
        {...defaultProps({ nodes: sampleNodes, selectedIri: "http://example.org/ClassA" })}
      />
    );
    fireEvent.click(screen.getByText("Graph"));
    expect(screen.getByTestId("ontology-graph")).toBeDefined();
    fireEvent.click(screen.getByText("Back to Details"));
    expect(screen.getByTestId("class-detail-panel")).toBeDefined();
  });

  // --- Read-only vs editable ---
  it("renders without graph button when no class selected", () => {
    render(<StandardEditorLayout {...defaultProps({ nodes: sampleNodes, selectedIri: null })} />);
    expect(screen.queryByText("Graph")).toBeNull();
  });

  // --- Does not crash with minimal props ---
  it("renders with minimal props", () => {
    render(<StandardEditorLayout {...defaultProps()} />);
    // Should not crash
    expect(screen.getByTestId("entity-tab-bar")).toBeDefined();
  });

  // --- canEdit prop forwarding ---
  it("does not show tree when properties tab is active", () => {
    render(<StandardEditorLayout {...defaultProps({ nodes: sampleNodes })} />);
    fireEvent.click(screen.getByText("Properties"));
    expect(screen.queryByTestId("class-tree")).toBeNull();
  });
});
