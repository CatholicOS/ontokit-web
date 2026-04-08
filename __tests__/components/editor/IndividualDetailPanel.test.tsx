import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ── Mocks (must be before component import) ──

const mockExtractIndividualDetail = vi.fn();
vi.mock("@/lib/ontology/entityDetailExtractors", () => ({
  extractIndividualDetail: (...args: unknown[]) => mockExtractIndividualDetail(...args),
}));

vi.mock("@/lib/context/ToastContext", () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }),
}));

const mockTriggerSave = vi.fn();
const mockFlushToGit = vi.fn().mockResolvedValue(true);
const mockDiscardDraft = vi.fn();
const mockClearRestoredDraft = vi.fn();

vi.mock("@/lib/hooks/useEntityAutoSave", () => ({
  useEntityAutoSave: () => ({
    saveStatus: "idle",
    saveError: null,
    validationError: null,
    isDirty: false,
    triggerSave: mockTriggerSave,
    flushToGit: mockFlushToGit,
    discardDraft: mockDiscardDraft,
    editStateRef: { current: null },
    restoredDraft: null,
    clearRestoredDraft: mockClearRestoredDraft,
  }),
}));

vi.mock("@/lib/stores/editorModeStore", () => ({
  useEditorModeStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ mode: "standard", continuousEditing: false }),
}));

vi.mock("@/lib/hooks/useIriLabels", () => ({
  useIriLabels: () => ({}),
}));

// Stub child components
vi.mock("@/components/editor/LanguageFlag", () => ({
  LanguageFlag: () => null,
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
vi.mock("@/components/editor/standard/PropertyAssertionSection", () => ({
  PropertyAssertionSection: () => null,
}));
vi.mock("@/components/editor/AutoSaveAffordanceBar", () => ({
  AutoSaveAffordanceBar: () => <div data-testid="auto-save-bar">AutoSaveBar</div>,
}));

import { IndividualDetailPanel } from "@/components/editor/IndividualDetailPanel";

// ── Helpers ──

function makeIndividualDetail(overrides: Record<string, unknown> = {}) {
  return {
    labels: [{ value: "John Doe", lang: "en" }],
    comments: [{ value: "A sample person", lang: "en" }],
    definitions: [{ value: "An individual representing John Doe", lang: "en" }],
    annotations: [],
    typeIris: ["http://example.org/ontology#Person"],
    sameAsIris: [],
    differentFromIris: [],
    deprecated: false,
    objectPropertyAssertions: [],
    dataPropertyAssertions: [],
    seeAlsoIris: [],
    isDefinedByIris: [],
    ...overrides,
  };
}

const SAMPLE_SOURCE = `@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix : <http://example.org/ontology#> .
:JohnDoe a owl:NamedIndividual , :Person ;
  rdfs:label "John Doe"@en ;
  rdfs:comment "A sample person"@en .
`;

const DEFAULT_PROPS = {
  projectId: "proj-1",
  individualIri: "http://example.org/ontology#JohnDoe",
  sourceContent: SAMPLE_SOURCE,
  canEdit: false,
  accessToken: "test-token",
  branch: "main",
};

// ── Tests ──

describe("IndividualDetailPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExtractIndividualDetail.mockReturnValue(makeIndividualDetail());
  });

  // ── Empty / placeholder state ──

  it("renders 'Select an individual' placeholder when individualIri is null", () => {
    render(
      <IndividualDetailPanel
        projectId="proj-1"
        individualIri={null}
        sourceContent=""
        canEdit={false}
      />
    );
    expect(
      screen.getByText("Select an individual to view its details")
    ).toBeDefined();
  });

  // ── Loading state ──

  it("shows a loading spinner when sourceContent is empty", () => {
    const { container } = render(
      <IndividualDetailPanel
        projectId="proj-1"
        individualIri="http://example.org/ontology#JohnDoe"
        sourceContent=""
        canEdit={false}
      />
    );
    expect(container.querySelector(".animate-spin")).toBeDefined();
  });

  // ── Not found state ──

  it("shows not-found message when extractIndividualDetail returns null", () => {
    mockExtractIndividualDetail.mockReturnValue(null);
    render(<IndividualDetailPanel {...DEFAULT_PROPS} />);
    expect(
      screen.getByText("Could not find this individual in the ontology source.")
    ).toBeDefined();
  });

  it("shows individual IRI in not-found state header", () => {
    mockExtractIndividualDetail.mockReturnValue(null);
    render(<IndividualDetailPanel {...DEFAULT_PROPS} />);
    expect(
      screen.getByText("http://example.org/ontology#JohnDoe")
    ).toBeDefined();
  });

  it("shows local name in not-found state header", () => {
    mockExtractIndividualDetail.mockReturnValue(null);
    render(<IndividualDetailPanel {...DEFAULT_PROPS} />);
    expect(screen.getByText("JohnDoe")).toBeDefined();
  });

  // ── Successful render ──

  it("renders individual label and IRI", () => {
    render(<IndividualDetailPanel {...DEFAULT_PROPS} />);
    expect(screen.getAllByText("John Doe").length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText("http://example.org/ontology#JohnDoe")
    ).toBeDefined();
  });

  it("renders Individual type badge", () => {
    render(<IndividualDetailPanel {...DEFAULT_PROPS} />);
    expect(screen.getByText("Individual")).toBeDefined();
  });

  it("renders deprecated badge when individual is deprecated", () => {
    mockExtractIndividualDetail.mockReturnValue(
      makeIndividualDetail({ deprecated: true })
    );
    render(<IndividualDetailPanel {...DEFAULT_PROPS} />);
    expect(screen.getByText("Deprecated")).toBeDefined();
  });

  it("renders comments section", () => {
    render(<IndividualDetailPanel {...DEFAULT_PROPS} />);
    expect(screen.getByText("A sample person")).toBeDefined();
  });

  it("renders definitions section", () => {
    render(<IndividualDetailPanel {...DEFAULT_PROPS} />);
    expect(
      screen.getByText("An individual representing John Doe")
    ).toBeDefined();
  });

  it("renders types section", () => {
    render(<IndividualDetailPanel {...DEFAULT_PROPS} />);
    expect(screen.getByText("Type(s)")).toBeDefined();
  });

  it("renders same-as section when present", () => {
    mockExtractIndividualDetail.mockReturnValue(
      makeIndividualDetail({
        sameAsIris: ["http://example.org/ontology#JDoe"],
      })
    );
    render(<IndividualDetailPanel {...DEFAULT_PROPS} />);
    expect(screen.getByText("Same As")).toBeDefined();
  });

  it("renders different-from section when present", () => {
    mockExtractIndividualDetail.mockReturnValue(
      makeIndividualDetail({
        differentFromIris: ["http://example.org/ontology#JaneDoe"],
      })
    );
    render(<IndividualDetailPanel {...DEFAULT_PROPS} />);
    expect(screen.getByText("Different From")).toBeDefined();
  });

  it("renders object property assertions when present (read-only)", () => {
    mockExtractIndividualDetail.mockReturnValue(
      makeIndividualDetail({
        objectPropertyAssertions: [
          {
            propertyIri: "http://example.org/ontology#hasParent",
            targetIri: "http://example.org/ontology#JamesDoe",
          },
        ],
      })
    );
    render(<IndividualDetailPanel {...DEFAULT_PROPS} />);
    expect(screen.getByText("Object Properties")).toBeDefined();
  });

  it("renders data property assertions when present (read-only)", () => {
    mockExtractIndividualDetail.mockReturnValue(
      makeIndividualDetail({
        dataPropertyAssertions: [
          {
            propertyIri: "http://example.org/ontology#hasAge",
            value: "42",
            datatype: "http://www.w3.org/2001/XMLSchema#integer",
          },
        ],
      })
    );
    render(<IndividualDetailPanel {...DEFAULT_PROPS} />);
    expect(screen.getByText("Data Properties")).toBeDefined();
    expect(screen.getByText("42")).toBeDefined();
    expect(screen.getByText("integer")).toBeDefined();
  });

  it("renders annotations when present", () => {
    mockExtractIndividualDetail.mockReturnValue(
      makeIndividualDetail({
        annotations: [
          {
            property_iri: "http://www.w3.org/2004/02/skos/core#prefLabel",
            values: [{ value: "J. Doe", lang: "en" }],
          },
        ],
      })
    );
    render(<IndividualDetailPanel {...DEFAULT_PROPS} />);
    expect(screen.getByText("J. Doe")).toBeDefined();
  });

  it("does not render empty optional sections", () => {
    mockExtractIndividualDetail.mockReturnValue(
      makeIndividualDetail({
        typeIris: [],
        sameAsIris: [],
        differentFromIris: [],
        objectPropertyAssertions: [],
        dataPropertyAssertions: [],
      })
    );
    render(<IndividualDetailPanel {...DEFAULT_PROPS} canEdit={false} />);
    expect(screen.queryByText("Type(s)")).toBeNull();
    expect(screen.queryByText("Same As")).toBeNull();
    expect(screen.queryByText("Different From")).toBeNull();
    expect(screen.queryByText("Object Properties")).toBeNull();
    expect(screen.queryByText("Data Properties")).toBeNull();
  });

  // ── Copy IRI ──

  it("renders Copy IRI button when onCopyIri is provided", () => {
    const onCopyIri = vi.fn();
    render(<IndividualDetailPanel {...DEFAULT_PROPS} onCopyIri={onCopyIri} />);
    expect(screen.getByTitle("Copy IRI")).toBeDefined();
  });

  it("calls onCopyIri when Copy IRI button is clicked", async () => {
    const user = userEvent.setup();
    const onCopyIri = vi.fn();
    render(<IndividualDetailPanel {...DEFAULT_PROPS} onCopyIri={onCopyIri} />);
    await user.click(screen.getByTitle("Copy IRI"));
    expect(onCopyIri).toHaveBeenCalledWith(
      "http://example.org/ontology#JohnDoe"
    );
  });

  // ── Read-only mode (canEdit=false) ──

  it("does not show edit button when canEdit is false", () => {
    render(<IndividualDetailPanel {...DEFAULT_PROPS} canEdit={false} />);
    expect(screen.queryByText("Edit Item")).toBeNull();
  });

  // ── Edit mode (canEdit=true) ──

  it("shows Edit Item button when canEdit is true and onUpdateIndividual provided", () => {
    const onUpdateIndividual = vi.fn();
    render(
      <IndividualDetailPanel
        {...DEFAULT_PROPS}
        canEdit={true}
        onUpdateIndividual={onUpdateIndividual}
      />
    );
    expect(screen.getByText("Edit Item")).toBeDefined();
  });

  it("enters edit mode when Edit Item is clicked", async () => {
    const user = userEvent.setup();
    const onUpdateIndividual = vi.fn();
    render(
      <IndividualDetailPanel
        {...DEFAULT_PROPS}
        canEdit={true}
        onUpdateIndividual={onUpdateIndividual}
      />
    );
    await user.click(screen.getByText("Edit Item"));
    expect(screen.getByTestId("auto-save-bar")).toBeDefined();
  });

  // ── API call verification ──

  it("calls extractIndividualDetail with sourceContent and individualIri", () => {
    render(<IndividualDetailPanel {...DEFAULT_PROPS} />);
    expect(mockExtractIndividualDetail).toHaveBeenCalledWith(
      SAMPLE_SOURCE,
      "http://example.org/ontology#JohnDoe"
    );
  });

  it("re-parses when refreshKey changes", () => {
    const { rerender } = render(
      <IndividualDetailPanel {...DEFAULT_PROPS} refreshKey={1} />
    );
    expect(mockExtractIndividualDetail).toHaveBeenCalledTimes(1);

    rerender(<IndividualDetailPanel {...DEFAULT_PROPS} refreshKey={2} />);
    expect(mockExtractIndividualDetail).toHaveBeenCalledTimes(2);
  });

  // ── Falls back to local name when no labels ──

  it("renders local name when individual has no labels", () => {
    mockExtractIndividualDetail.mockReturnValue(
      makeIndividualDetail({ labels: [] })
    );
    render(<IndividualDetailPanel {...DEFAULT_PROPS} />);
    expect(screen.getAllByText("JohnDoe").length).toBeGreaterThanOrEqual(1);
  });

  // ── Relationships section ──

  it("renders relationships section when seeAlsoIris present", () => {
    mockExtractIndividualDetail.mockReturnValue(
      makeIndividualDetail({
        seeAlsoIris: ["http://example.org/ontology#related"],
      })
    );
    render(<IndividualDetailPanel {...DEFAULT_PROPS} />);
    expect(screen.getByText("Relationships")).toBeDefined();
  });

  it("does not render relationships section when no seeAlso or isDefinedBy", () => {
    mockExtractIndividualDetail.mockReturnValue(
      makeIndividualDetail({
        seeAlsoIris: [],
        isDefinedByIris: [],
      })
    );
    render(<IndividualDetailPanel {...DEFAULT_PROPS} canEdit={false} />);
    expect(screen.queryByText("Relationships")).toBeNull();
  });
});
