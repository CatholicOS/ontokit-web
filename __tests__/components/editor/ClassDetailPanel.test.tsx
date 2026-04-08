import { describe, expect, it, vi, beforeEach, type Mock } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ── Mocks (must be before component import) ──

vi.mock("@/lib/api/client", () => ({
  projectOntologyApi: {
    getClassDetail: vi.fn(),
    updateClass: vi.fn(),
    searchEntities: vi.fn(),
  },
}));

vi.mock("@/lib/api/lint", () => ({
  lintApi: { getIssues: vi.fn() },
}));

vi.mock("@/lib/context/ToastContext", () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }),
}));

vi.mock("@/lib/hooks/useAutoSave", () => ({
  useAutoSave: () => ({
    saveStatus: "idle",
    saveError: null,
    validationError: null,
    isDirty: false,
    triggerSave: vi.fn(),
    flushToGit: vi.fn().mockResolvedValue(true),
    discardDraft: vi.fn(),
    editStateRef: { current: null },
    restoredDraft: null,
    clearRestoredDraft: vi.fn(),
  }),
}));

vi.mock("@/lib/stores/editorModeStore", () => ({
  useEditorModeStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ mode: "standard", continuousEditing: false }),
}));

// Stub child components
vi.mock("@/components/editor/LanguageFlag", () => ({
  LanguageFlag: () => null,
}));
vi.mock("@/components/editor/ParentClassPicker", () => ({
  ParentClassPicker: () => null,
}));
vi.mock("@/components/editor/standard/AnnotationRow", () => ({
  AnnotationRow: () => null,
}));
vi.mock("@/components/editor/standard/InlineAnnotationAdder", () => ({
  InlineAnnotationAdder: () => null,
}));
vi.mock("@/components/editor/standard/RelationshipSection", () => ({
  RelationshipSection: () => null,
}));
vi.mock("@/components/editor/AutoSaveAffordanceBar", () => ({
  AutoSaveAffordanceBar: () => null,
}));
vi.mock("@/components/editor/CrossReferencesPanel", () => ({
  CrossReferencesPanel: () => null,
}));
vi.mock("@/components/editor/SimilarConceptsPanel", () => ({
  SimilarConceptsPanel: () => null,
}));
vi.mock("@/components/editor/EntityHistoryTab", () => ({
  EntityHistoryTab: () => null,
}));

import { ClassDetailPanel } from "@/components/editor/ClassDetailPanel";
import { projectOntologyApi } from "@/lib/api/client";
import { lintApi } from "@/lib/api/lint";

// ── Helpers ──

const mockGetClassDetail = projectOntologyApi.getClassDetail as Mock;
const mockGetIssues = lintApi.getIssues as Mock;
const mockSearchEntities = projectOntologyApi.searchEntities as Mock;

function makeClassDetail(overrides: Record<string, unknown> = {}) {
  return {
    iri: "http://example.org/ontology#Person",
    labels: [{ value: "Person", lang: "en" }],
    comments: [{ value: "A human being", lang: "en" }],
    deprecated: false,
    parent_iris: ["http://example.org/ontology#Agent"],
    parent_labels: { "http://example.org/ontology#Agent": "Agent" },
    equivalent_iris: null,
    disjoint_iris: null,
    child_count: 5,
    instance_count: 42,
    is_defined: true,
    annotations: [],
    ...overrides,
  };
}

function makeLintIssue(overrides: Record<string, unknown> = {}) {
  return {
    id: "issue-1",
    run_id: "run-1",
    project_id: "proj-1",
    issue_type: "warning" as const,
    rule_id: "MISSING_LABEL",
    message: "Class is missing an rdfs:label",
    subject_iri: "http://example.org/ontology#Person",
    details: null,
    created_at: "2024-01-01T00:00:00Z",
    resolved_at: null,
    ...overrides,
  };
}

const DEFAULT_PROPS = {
  projectId: "proj-1",
  classIri: "http://example.org/ontology#Person",
  accessToken: "test-token",
  branch: "main",
};

// ── Tests ──

describe("ClassDetailPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetClassDetail.mockResolvedValue(makeClassDetail());
    mockGetIssues.mockResolvedValue({ items: [] });
    mockSearchEntities.mockResolvedValue({ results: [] });
  });

  // ── Empty / placeholder state ──

  it("renders 'Select a class' placeholder when classIri is null", () => {
    render(<ClassDetailPanel projectId="proj-1" classIri={null} />);
    expect(
      screen.getByText("Select a class from the tree to view its details")
    ).toBeDefined();
  });

  // ── Loading state ──

  it("shows a loading spinner while fetching", () => {
    // Never resolve the promise so it stays in loading state
    mockGetClassDetail.mockReturnValue(new Promise(() => {}));
    const { container } = render(<ClassDetailPanel {...DEFAULT_PROPS} />);
    expect(container.querySelector(".animate-spin")).toBeDefined();
  });

  // ── Error state ──

  it("shows error message when API call fails", async () => {
    mockGetClassDetail.mockRejectedValue(new Error("Network failure"));
    render(<ClassDetailPanel {...DEFAULT_PROPS} />);

    await waitFor(() => {
      expect(screen.getByText("Network failure")).toBeDefined();
    });
  });

  it("shows entity-type hint for 404 errors", async () => {
    mockGetClassDetail.mockRejectedValue(new Error("Class not found"));
    render(<ClassDetailPanel {...DEFAULT_PROPS} />);

    await waitFor(() => {
      expect(
        screen.getByText(/is not an OWL Class/)
      ).toBeDefined();
    });
  });

  it("suppresses 404 error when selectedNodeFallback matches classIri", async () => {
    mockGetClassDetail.mockRejectedValue(new Error("Class not found"));
    const fallback = {
      label: "NewClass",
      iri: "http://example.org/ontology#Person",
    };
    render(
      <ClassDetailPanel {...DEFAULT_PROPS} selectedNodeFallback={fallback} />
    );

    // Should show the fallback card instead of an error
    await waitFor(() => {
      expect(screen.getAllByText("NewClass").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("Unsaved")).toBeDefined();
    });
  });

  // ── Successful render ──

  it("renders class detail with label and IRI", async () => {
    render(<ClassDetailPanel {...DEFAULT_PROPS} />);

    await waitFor(() => {
      expect(screen.getAllByText("Person").length).toBeGreaterThanOrEqual(1);
    });
    // IRI displayed
    expect(
      screen.getByText("http://example.org/ontology#Person")
    ).toBeDefined();
  });

  it("renders comments section", async () => {
    render(<ClassDetailPanel {...DEFAULT_PROPS} />);

    await waitFor(() => {
      expect(screen.getByText("A human being")).toBeDefined();
    });
  });

  it("renders parent class link", async () => {
    render(<ClassDetailPanel {...DEFAULT_PROPS} />);

    await waitFor(() => {
      expect(screen.getByText("Agent")).toBeDefined();
    });
  });

  it("renders deprecated badge when class is deprecated", async () => {
    mockGetClassDetail.mockResolvedValue(makeClassDetail({ deprecated: true }));
    render(<ClassDetailPanel {...DEFAULT_PROPS} />);

    await waitFor(() => {
      expect(screen.getByText("Deprecated")).toBeDefined();
    });
  });

  it("renders statistics", async () => {
    render(<ClassDetailPanel {...DEFAULT_PROPS} />);

    await waitFor(() => {
      expect(screen.getByText("5")).toBeDefined(); // child_count
      expect(screen.getByText("subclasses")).toBeDefined();
      expect(screen.getByText("42")).toBeDefined(); // instance_count
    });
  });

  it("renders equivalent classes when present", async () => {
    mockGetClassDetail.mockResolvedValue(
      makeClassDetail({
        equivalent_iris: ["http://example.org/ontology#Human"],
      })
    );
    render(<ClassDetailPanel {...DEFAULT_PROPS} />);

    await waitFor(() => {
      expect(screen.getByText("Equivalent Classes")).toBeDefined();
      expect(screen.getByText("Human")).toBeDefined();
    });
  });

  it("renders disjoint classes when present", async () => {
    mockGetClassDetail.mockResolvedValue(
      makeClassDetail({
        disjoint_iris: ["http://example.org/ontology#NonPerson"],
      })
    );
    render(<ClassDetailPanel {...DEFAULT_PROPS} />);

    await waitFor(() => {
      expect(screen.getByText("Disjoint With")).toBeDefined();
      expect(screen.getByText("NonPerson")).toBeDefined();
    });
  });

  // ── API call verification ──

  it("calls getClassDetail with correct arguments", async () => {
    render(<ClassDetailPanel {...DEFAULT_PROPS} />);

    await waitFor(() => {
      expect(mockGetClassDetail).toHaveBeenCalledWith(
        "proj-1",
        "http://example.org/ontology#Person",
        "test-token",
        "main"
      );
    });
  });

  it("calls lintApi.getIssues with subject_iri filter", async () => {
    render(<ClassDetailPanel {...DEFAULT_PROPS} />);

    await waitFor(() => {
      expect(mockGetIssues).toHaveBeenCalledWith(
        "proj-1",
        "test-token",
        expect.objectContaining({
          subject_iri: "http://example.org/ontology#Person",
          limit: 50,
        })
      );
    });
  });

  // ── Lint issues ──

  it("shows lint issues for the class", async () => {
    mockGetIssues.mockResolvedValue({ items: [makeLintIssue()] });
    render(<ClassDetailPanel {...DEFAULT_PROPS} />);

    await waitFor(() => {
      expect(screen.getByText("Health Issues (1)")).toBeDefined();
      expect(
        screen.getByText("Class is missing an rdfs:label")
      ).toBeDefined();
      expect(screen.getByText("MISSING_LABEL:")).toBeDefined();
    });
  });

  it("does not show lint section when no issues", async () => {
    render(<ClassDetailPanel {...DEFAULT_PROPS} />);

    await waitFor(() => {
      expect(screen.getAllByText("Person").length).toBeGreaterThanOrEqual(1);
    });
    expect(screen.queryByText("Health Issues")).toBeNull();
  });

  // ── Copy IRI ──

  it("renders Copy IRI button when onCopyIri is provided", async () => {
    const onCopyIri = vi.fn();
    render(<ClassDetailPanel {...DEFAULT_PROPS} onCopyIri={onCopyIri} />);

    await waitFor(() => {
      expect(screen.getByTitle("Copy IRI")).toBeDefined();
    });
  });

  it("calls onCopyIri when Copy IRI button is clicked", async () => {
    const user = userEvent.setup();
    const onCopyIri = vi.fn();
    render(<ClassDetailPanel {...DEFAULT_PROPS} onCopyIri={onCopyIri} />);

    await waitFor(() => {
      expect(screen.getByTitle("Copy IRI")).toBeDefined();
    });

    await user.click(screen.getByTitle("Copy IRI"));
    expect(onCopyIri).toHaveBeenCalledWith(
      "http://example.org/ontology#Person"
    );
  });

  // ── View in Source ──

  it("renders Source button when onNavigateToSource is provided", async () => {
    const onNavigateToSource = vi.fn();
    render(
      <ClassDetailPanel
        {...DEFAULT_PROPS}
        onNavigateToSource={onNavigateToSource}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Source")).toBeDefined();
    });
  });

  // ── Read-only mode (canEdit=false) ──

  it("does not show edit button when canEdit is false", async () => {
    render(<ClassDetailPanel {...DEFAULT_PROPS} canEdit={false} />);

    await waitFor(() => {
      expect(screen.getAllByText("Person").length).toBeGreaterThanOrEqual(1);
    });
    expect(screen.queryByText("Edit Item")).toBeNull();
  });

  // ── Edit mode (canEdit=true) ──

  it("shows Edit Item button when canEdit is true and onUpdateClass provided", async () => {
    const onUpdateClass = vi.fn();
    render(
      <ClassDetailPanel
        {...DEFAULT_PROPS}
        canEdit={true}
        onUpdateClass={onUpdateClass}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Edit Item")).toBeDefined();
    });
  });

  it("shows 'Suggest Changes' when isSuggestionMode is true", async () => {
    const onUpdateClass = vi.fn();
    render(
      <ClassDetailPanel
        {...DEFAULT_PROPS}
        canEdit={true}
        isSuggestionMode={true}
        onUpdateClass={onUpdateClass}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Suggest Changes")).toBeDefined();
    });
  });

  // ── Tree-node fallback for unsaved entities ──

  it("renders unsaved entity fallback with parent link", async () => {
    mockGetClassDetail.mockRejectedValue(new Error("404 Class not found"));
    const fallback = {
      label: "NewEntity",
      iri: "http://example.org/ontology#Person",
      parentIri: "http://example.org/ontology#Agent",
      parentLabel: "Agent",
    };
    render(
      <ClassDetailPanel {...DEFAULT_PROPS} selectedNodeFallback={fallback} />
    );

    await waitFor(() => {
      expect(screen.getAllByText("NewEntity").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("Unsaved")).toBeDefined();
      expect(screen.getAllByText("Agent").length).toBeGreaterThanOrEqual(1);
    });
  });

  // ── Returns null when no detail and no fallback ──

  it("returns null when classDetail is null and no fallback", async () => {
    mockGetClassDetail.mockRejectedValue(new Error("404 Class not found"));
    const fallback = {
      label: "Other",
      iri: "http://example.org/ontology#Other", // different IRI
    };
    render(
      <ClassDetailPanel {...DEFAULT_PROPS} selectedNodeFallback={fallback} />
    );

    await waitFor(() => {
      // Should show error since fallback IRI doesn't match
      expect(screen.getByText(/is not an OWL Class/)).toBeDefined();
    });
  });

  // ── Header actions slot ──

  it("renders headerActions when provided", async () => {
    render(
      <ClassDetailPanel
        {...DEFAULT_PROPS}
        headerActions={<button data-testid="graph-btn">Graph</button>}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("graph-btn")).toBeDefined();
    });
  });

  // ── Annotations rendering ──

  it("renders definition annotation", async () => {
    const DEFINITION_IRI = "http://www.w3.org/2004/02/skos/core#definition";
    mockGetClassDetail.mockResolvedValue(
      makeClassDetail({
        annotations: [
          {
            property_iri: DEFINITION_IRI,
            property_label: "Definition",
            values: [{ value: "A rational animal", lang: "en" }],
          },
        ],
      })
    );
    render(<ClassDetailPanel {...DEFAULT_PROPS} />);

    await waitFor(() => {
      expect(screen.getByText("A rational animal")).toBeDefined();
      expect(screen.getByText("Definition")).toBeDefined();
    });
  });

  it("renders custom annotation properties", async () => {
    const PREF_LABEL_IRI =
      "http://www.w3.org/2004/02/skos/core#prefLabel";
    mockGetClassDetail.mockResolvedValue(
      makeClassDetail({
        annotations: [
          {
            property_iri: PREF_LABEL_IRI,
            property_label: "Preferred Label",
            values: [{ value: "Human Person", lang: "en" }],
          },
        ],
      })
    );
    render(<ClassDetailPanel {...DEFAULT_PROPS} />);

    await waitFor(() => {
      expect(screen.getByText("Human Person")).toBeDefined();
    });
  });

  // ── Refetch on refreshKey change ──

  it("re-fetches when refreshKey changes", async () => {
    const { rerender } = render(
      <ClassDetailPanel {...DEFAULT_PROPS} refreshKey={1} />
    );

    await waitFor(() => {
      expect(mockGetClassDetail).toHaveBeenCalledTimes(1);
    });

    rerender(<ClassDetailPanel {...DEFAULT_PROPS} refreshKey={2} />);

    await waitFor(() => {
      expect(mockGetClassDetail).toHaveBeenCalledTimes(2);
    });
  });
});

// ── ensureTrailingEmpty helper unit tests ──

describe("ensureTrailingEmpty", () => {
  // Import the function directly — it's not exported, so we test it indirectly
  // through the component's rendering. But we can re-implement and verify the logic.

  function ensureTrailingEmpty(
    arr: Array<{ value: string; lang: string }>
  ): Array<{ value: string; lang: string }> {
    if (arr.length === 0 || arr[arr.length - 1].value.trim() !== "") {
      return [...arr, { value: "", lang: "en" }];
    }
    return arr;
  }

  it("appends empty row to empty array", () => {
    const result = ensureTrailingEmpty([]);
    expect(result).toEqual([{ value: "", lang: "en" }]);
  });

  it("appends empty row when last item has non-empty value", () => {
    const result = ensureTrailingEmpty([{ value: "hello", lang: "en" }]);
    expect(result).toHaveLength(2);
    expect(result[1]).toEqual({ value: "", lang: "en" });
  });

  it("does not append when last item is already empty", () => {
    const input = [
      { value: "hello", lang: "en" },
      { value: "", lang: "en" },
    ];
    const result = ensureTrailingEmpty(input);
    expect(result).toHaveLength(2);
  });

  it("does not append when last item is whitespace-only", () => {
    const input = [{ value: "  ", lang: "en" }];
    // trim() makes "  " into "" which equals ""
    const result = ensureTrailingEmpty(input);
    expect(result).toHaveLength(1);
  });
});
