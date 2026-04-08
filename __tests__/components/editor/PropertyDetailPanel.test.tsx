import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ── Mocks (must be before component import) ──

const mockExtractPropertyDetail = vi.fn();
vi.mock("@/lib/ontology/entityDetailExtractors", () => ({
  extractPropertyDetail: (...args: unknown[]) => mockExtractPropertyDetail(...args),
  PROPERTY_CHARACTERISTIC_TYPES: [
    { iri: "http://www.w3.org/2002/07/owl#FunctionalProperty", label: "Functional" },
    { iri: "http://www.w3.org/2002/07/owl#InverseFunctionalProperty", label: "Inverse Functional" },
    { iri: "http://www.w3.org/2002/07/owl#TransitiveProperty", label: "Transitive" },
    { iri: "http://www.w3.org/2002/07/owl#SymmetricProperty", label: "Symmetric" },
    { iri: "http://www.w3.org/2002/07/owl#AsymmetricProperty", label: "Asymmetric" },
    { iri: "http://www.w3.org/2002/07/owl#ReflexiveProperty", label: "Reflexive" },
    { iri: "http://www.w3.org/2002/07/owl#IrreflexiveProperty", label: "Irreflexive" },
  ],
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
vi.mock("@/components/editor/AutoSaveAffordanceBar", () => ({
  AutoSaveAffordanceBar: () => <div data-testid="auto-save-bar">AutoSaveBar</div>,
}));

import { PropertyDetailPanel } from "@/components/editor/PropertyDetailPanel";

// ── Helpers ──

function makePropertyDetail(overrides: Record<string, unknown> = {}) {
  return {
    propertyType: "object" as const,
    labels: [{ value: "hasParent", lang: "en" }],
    comments: [{ value: "Relates a person to their parent", lang: "en" }],
    definitions: [{ value: "A relationship linking child to parent", lang: "en" }],
    annotations: [],
    domainIris: ["http://example.org/ontology#Person"],
    rangeIris: ["http://example.org/ontology#Person"],
    parentIris: ["http://example.org/ontology#hasRelative"],
    inverseOf: "http://example.org/ontology#hasChild",
    characteristics: ["http://www.w3.org/2002/07/owl#AsymmetricProperty"],
    deprecated: false,
    equivalentIris: [],
    disjointIris: [],
    seeAlsoIris: [],
    isDefinedByIris: [],
    ...overrides,
  };
}

const SAMPLE_SOURCE = `@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix : <http://example.org/ontology#> .
:hasParent a owl:ObjectProperty ;
  rdfs:label "hasParent"@en ;
  rdfs:comment "Relates a person to their parent"@en ;
  rdfs:domain :Person ;
  rdfs:range :Person ;
  rdfs:subPropertyOf :hasRelative ;
  owl:inverseOf :hasChild .
`;

const DEFAULT_PROPS = {
  projectId: "proj-1",
  propertyIri: "http://example.org/ontology#hasParent",
  sourceContent: SAMPLE_SOURCE,
  canEdit: false,
  accessToken: "test-token",
  branch: "main",
};

// ── Tests ──

describe("PropertyDetailPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExtractPropertyDetail.mockReturnValue(makePropertyDetail());
  });

  // ── Empty / placeholder state ──

  it("renders 'Select a property' placeholder when propertyIri is null", () => {
    render(
      <PropertyDetailPanel
        projectId="proj-1"
        propertyIri={null}
        sourceContent=""
        canEdit={false}
      />
    );
    expect(
      screen.getByText("Select a property to view its details")
    ).toBeDefined();
  });

  // ── Loading state ──

  it("shows a loading spinner when sourceContent is empty", () => {
    const { container } = render(
      <PropertyDetailPanel
        projectId="proj-1"
        propertyIri="http://example.org/ontology#hasParent"
        sourceContent=""
        canEdit={false}
      />
    );
    expect(container.querySelector(".animate-spin")).not.toBeNull();
  });

  // ── Not found state ──

  it("shows not-found message when extractPropertyDetail returns null", () => {
    mockExtractPropertyDetail.mockReturnValue(null);
    render(<PropertyDetailPanel {...DEFAULT_PROPS} />);
    expect(
      screen.getByText("Could not find this property in the ontology source.")
    ).toBeDefined();
  });

  it("shows property IRI in not-found state header", () => {
    mockExtractPropertyDetail.mockReturnValue(null);
    render(<PropertyDetailPanel {...DEFAULT_PROPS} />);
    expect(
      screen.getByText("http://example.org/ontology#hasParent")
    ).toBeDefined();
  });

  it("shows local name in not-found state header", () => {
    mockExtractPropertyDetail.mockReturnValue(null);
    render(<PropertyDetailPanel {...DEFAULT_PROPS} />);
    expect(screen.getByText("hasParent")).toBeDefined();
  });

  // ── Successful render ──

  it("renders property label and IRI", () => {
    render(<PropertyDetailPanel {...DEFAULT_PROPS} />);
    expect(screen.getAllByText("hasParent").length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText("http://example.org/ontology#hasParent")
    ).toBeDefined();
  });

  it("renders property type badge for object property", () => {
    render(<PropertyDetailPanel {...DEFAULT_PROPS} />);
    expect(screen.getByText("Object Property")).toBeDefined();
  });

  it("renders property type badge for data property", () => {
    mockExtractPropertyDetail.mockReturnValue(
      makePropertyDetail({ propertyType: "data" })
    );
    render(<PropertyDetailPanel {...DEFAULT_PROPS} />);
    expect(screen.getByText("Data Property")).toBeDefined();
  });

  it("renders property type badge for annotation property", () => {
    mockExtractPropertyDetail.mockReturnValue(
      makePropertyDetail({ propertyType: "annotation" })
    );
    render(<PropertyDetailPanel {...DEFAULT_PROPS} />);
    expect(screen.getByText("Annotation Property")).toBeDefined();
  });

  it("renders deprecated badge when property is deprecated", () => {
    mockExtractPropertyDetail.mockReturnValue(
      makePropertyDetail({ deprecated: true })
    );
    render(<PropertyDetailPanel {...DEFAULT_PROPS} />);
    expect(screen.getByText("Deprecated")).toBeDefined();
  });

  it("renders comments section", () => {
    render(<PropertyDetailPanel {...DEFAULT_PROPS} />);
    expect(
      screen.getByText("Relates a person to their parent")
    ).toBeDefined();
  });

  it("renders definitions section", () => {
    render(<PropertyDetailPanel {...DEFAULT_PROPS} />);
    expect(
      screen.getByText("A relationship linking child to parent")
    ).toBeDefined();
  });

  it("renders domain section", () => {
    render(<PropertyDetailPanel {...DEFAULT_PROPS} />);
    expect(screen.getByText("Domain")).toBeDefined();
  });

  it("renders range section", () => {
    render(<PropertyDetailPanel {...DEFAULT_PROPS} />);
    expect(screen.getByText("Range")).toBeDefined();
  });

  it("renders parent properties section", () => {
    render(<PropertyDetailPanel {...DEFAULT_PROPS} />);
    expect(screen.getByText("Parent Properties")).toBeDefined();
  });

  it("renders inverse of section for object properties", () => {
    render(<PropertyDetailPanel {...DEFAULT_PROPS} />);
    expect(screen.getByText("Inverse Of")).toBeDefined();
  });

  it("renders characteristics section for object properties", () => {
    render(<PropertyDetailPanel {...DEFAULT_PROPS} />);
    expect(screen.getByText("Characteristics")).toBeDefined();
    expect(screen.getByText("Asymmetric")).toBeDefined();
  });

  it("renders equivalent properties when present", () => {
    mockExtractPropertyDetail.mockReturnValue(
      makePropertyDetail({
        equivalentIris: ["http://example.org/ontology#hasProgenitor"],
      })
    );
    render(<PropertyDetailPanel {...DEFAULT_PROPS} />);
    expect(screen.getByText("Equivalent Properties")).toBeDefined();
  });

  it("renders disjoint properties when present", () => {
    mockExtractPropertyDetail.mockReturnValue(
      makePropertyDetail({
        disjointIris: ["http://example.org/ontology#hasEnemy"],
      })
    );
    render(<PropertyDetailPanel {...DEFAULT_PROPS} />);
    expect(screen.getByText("Disjoint Properties")).toBeDefined();
  });

  it("renders annotations when present", () => {
    mockExtractPropertyDetail.mockReturnValue(
      makePropertyDetail({
        annotations: [
          {
            property_iri: "http://www.w3.org/2004/02/skos/core#prefLabel",
            values: [{ value: "Parent Property", lang: "en" }],
          },
        ],
      })
    );
    render(<PropertyDetailPanel {...DEFAULT_PROPS} />);
    expect(screen.getByText("Parent Property")).toBeDefined();
  });

  it("does not render empty optional sections", () => {
    mockExtractPropertyDetail.mockReturnValue(
      makePropertyDetail({
        domainIris: [],
        rangeIris: [],
        parentIris: [],
        inverseOf: null,
        characteristics: [],
        equivalentIris: [],
        disjointIris: [],
      })
    );
    render(<PropertyDetailPanel {...DEFAULT_PROPS} />);
    expect(screen.queryByText("Domain")).toBeNull();
    expect(screen.queryByText("Range")).toBeNull();
    expect(screen.queryByText("Parent Properties")).toBeNull();
    expect(screen.queryByText("Equivalent Properties")).toBeNull();
    expect(screen.queryByText("Disjoint Properties")).toBeNull();
  });

  // ── Copy IRI ──

  it("renders Copy IRI button when onCopyIri is provided", () => {
    const onCopyIri = vi.fn();
    render(<PropertyDetailPanel {...DEFAULT_PROPS} onCopyIri={onCopyIri} />);
    expect(screen.getByTitle("Copy IRI")).toBeDefined();
  });

  it("calls onCopyIri when Copy IRI button is clicked", async () => {
    const user = userEvent.setup();
    const onCopyIri = vi.fn();
    render(<PropertyDetailPanel {...DEFAULT_PROPS} onCopyIri={onCopyIri} />);
    await user.click(screen.getByTitle("Copy IRI"));
    expect(onCopyIri).toHaveBeenCalledWith(
      "http://example.org/ontology#hasParent"
    );
  });

  // ── Read-only mode (canEdit=false) ──

  it("does not show edit button when canEdit is false", () => {
    render(<PropertyDetailPanel {...DEFAULT_PROPS} canEdit={false} />);
    expect(screen.queryByText("Edit Item")).toBeNull();
  });

  // ── Edit mode (canEdit=true) ──

  it("shows Edit Item button when canEdit is true and onUpdateProperty provided", () => {
    const onUpdateProperty = vi.fn();
    render(
      <PropertyDetailPanel
        {...DEFAULT_PROPS}
        canEdit={true}
        onUpdateProperty={onUpdateProperty}
      />
    );
    expect(screen.getByText("Edit Item")).toBeDefined();
  });

  it("enters edit mode when Edit Item is clicked", async () => {
    const user = userEvent.setup();
    const onUpdateProperty = vi.fn();
    render(
      <PropertyDetailPanel
        {...DEFAULT_PROPS}
        canEdit={true}
        onUpdateProperty={onUpdateProperty}
      />
    );
    await user.click(screen.getByText("Edit Item"));
    // Auto-save bar should appear
    expect(screen.getByTestId("auto-save-bar")).toBeDefined();
  });

  // ── API call verification ──

  it("calls extractPropertyDetail with sourceContent and propertyIri", () => {
    render(<PropertyDetailPanel {...DEFAULT_PROPS} />);
    expect(mockExtractPropertyDetail).toHaveBeenCalledWith(
      SAMPLE_SOURCE,
      "http://example.org/ontology#hasParent"
    );
  });

  it("re-parses when refreshKey changes", () => {
    const { rerender } = render(
      <PropertyDetailPanel {...DEFAULT_PROPS} refreshKey={1} />
    );
    expect(mockExtractPropertyDetail).toHaveBeenCalledTimes(1);

    rerender(<PropertyDetailPanel {...DEFAULT_PROPS} refreshKey={2} />);
    expect(mockExtractPropertyDetail).toHaveBeenCalledTimes(2);
  });

  // ── Falls back to local name when no labels ──

  it("renders local name when property has no labels", () => {
    mockExtractPropertyDetail.mockReturnValue(
      makePropertyDetail({ labels: [] })
    );
    render(<PropertyDetailPanel {...DEFAULT_PROPS} />);
    // The header should still show "hasParent" from getLocalName
    expect(screen.getAllByText("hasParent").length).toBeGreaterThanOrEqual(1);
  });

  // ── Relationships section ──

  it("renders relationships section when seeAlsoIris present", () => {
    mockExtractPropertyDetail.mockReturnValue(
      makePropertyDetail({
        seeAlsoIris: ["http://example.org/ontology#relatedProp"],
      })
    );
    render(<PropertyDetailPanel {...DEFAULT_PROPS} />);
    expect(screen.getByText("Relationships")).toBeDefined();
  });

  it("does not render relationships section when no seeAlso or isDefinedBy", () => {
    mockExtractPropertyDetail.mockReturnValue(
      makePropertyDetail({
        seeAlsoIris: [],
        isDefinedByIris: [],
      })
    );
    render(<PropertyDetailPanel {...DEFAULT_PROPS} canEdit={false} />);
    expect(screen.queryByText("Relationships")).toBeNull();
  });
});
