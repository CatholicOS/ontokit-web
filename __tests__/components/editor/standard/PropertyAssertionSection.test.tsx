import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PropertyAssertionSection } from "@/components/editor/standard/PropertyAssertionSection";
import type { PropertyAssertion } from "@/lib/ontology/entityDetailExtractors";

vi.mock("@/lib/api/client", () => ({
  projectOntologyApi: {
    searchEntities: vi.fn().mockResolvedValue({ results: [], total: 0 }),
  },
}));

vi.mock("@/lib/utils", () => ({
  getLocalName: (iri: string) => {
    if (iri.includes("#")) return iri.split("#").pop() || iri;
    return iri.split("/").pop() || iri;
  },
  langToFlag: (lang: string) => (lang === "en" ? "\u{1F1EC}\u{1F1E7}" : null),
}));

vi.mock("@/components/editor/LanguageFlag", () => ({
  LanguageFlag: ({ lang }: { lang: string }) => (
    <span data-testid={`lang-flag-${lang}`}>{lang}</span>
  ),
}));

describe("PropertyAssertionSection", () => {
  const baseProps = {
    assertions: [] as PropertyAssertion[],
    assertionType: "object" as const,
    isEditing: false,
    projectId: "proj-1",
    accessToken: "token",
    branch: "main",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when not editing and no assertions", () => {
    const { container } = render(<PropertyAssertionSection {...baseProps} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders object assertions with navigation buttons", () => {
    const onNavigate = vi.fn();
    const assertions: PropertyAssertion[] = [
      {
        propertyIri: "http://example.org/ontology#hasPart",
        targetIri: "http://example.org/ontology#Wheel",
      },
    ];

    render(
      <PropertyAssertionSection
        {...baseProps}
        assertions={assertions}
        onNavigateToEntity={onNavigate}
      />
    );

    expect(screen.getByText("hasPart")).toBeDefined();
    expect(screen.getByText("Wheel")).toBeDefined();

    fireEvent.click(screen.getByText("Wheel"));
    expect(onNavigate).toHaveBeenCalledWith(
      "http://example.org/ontology#Wheel"
    );
  });

  it("renders data assertions with value and language flag", () => {
    const assertions: PropertyAssertion[] = [
      {
        propertyIri: "http://example.org/ontology#label",
        value: "Hello World",
        lang: "en",
      },
    ];

    render(
      <PropertyAssertionSection
        {...baseProps}
        assertionType="data"
        assertions={assertions}
      />
    );

    expect(screen.getByText("label")).toBeDefined();
    expect(screen.getByText("Hello World")).toBeDefined();
    expect(screen.getByTestId("lang-flag-en")).toBeDefined();
  });

  it("renders datatype badge when present", () => {
    const assertions: PropertyAssertion[] = [
      {
        propertyIri: "http://example.org/ontology#age",
        value: "42",
        datatype: "http://www.w3.org/2001/XMLSchema#integer",
      },
    ];

    render(
      <PropertyAssertionSection
        {...baseProps}
        assertionType="data"
        assertions={assertions}
      />
    );

    expect(screen.getByText("42")).toBeDefined();
    expect(screen.getByText("integer")).toBeDefined();
  });

  it("uses resolved labels when available", () => {
    const assertions: PropertyAssertion[] = [
      {
        propertyIri: "http://example.org/ontology#hasPart",
        targetIri: "http://example.org/ontology#Wheel",
      },
    ];

    render(
      <PropertyAssertionSection
        {...baseProps}
        assertions={assertions}
        resolvedLabels={{
          "http://example.org/ontology#hasPart": "Has Part",
          "http://example.org/ontology#Wheel": "Wheel Component",
        }}
      />
    );

    expect(screen.getByText("Has Part")).toBeDefined();
    expect(screen.getByText("Wheel Component")).toBeDefined();
  });

  it("shows remove button when editing", () => {
    const onRemove = vi.fn();
    const onSaveNeeded = vi.fn();
    const assertions: PropertyAssertion[] = [
      {
        propertyIri: "http://example.org/ontology#hasPart",
        targetIri: "http://example.org/ontology#Wheel",
      },
    ];

    render(
      <PropertyAssertionSection
        {...baseProps}
        assertions={assertions}
        isEditing={true}
        onRemove={onRemove}
        onSaveNeeded={onSaveNeeded}
      />
    );

    const removeBtn = screen.getByTitle("Remove");
    fireEvent.click(removeBtn);
    expect(onRemove).toHaveBeenCalledWith(0);
    expect(onSaveNeeded).toHaveBeenCalled();
  });

  it("does not show remove button when not editing", () => {
    const assertions: PropertyAssertion[] = [
      {
        propertyIri: "http://example.org/ontology#hasPart",
        targetIri: "http://example.org/ontology#Wheel",
      },
    ];

    render(
      <PropertyAssertionSection
        {...baseProps}
        assertions={assertions}
        isEditing={false}
      />
    );

    expect(screen.queryByTitle("Remove")).toBeNull();
  });

  it("renders adder row when editing with onAdd", () => {
    render(
      <PropertyAssertionSection
        {...baseProps}
        isEditing={true}
        onAdd={vi.fn()}
      />
    );

    expect(screen.getByPlaceholderText("Select property...")).toBeDefined();
  });

  it("renders object value input placeholder when no property selected", () => {
    render(
      <PropertyAssertionSection
        {...baseProps}
        isEditing={true}
        onAdd={vi.fn()}
      />
    );

    const valueInput = screen.getByPlaceholderText("Select a property first");
    expect((valueInput as HTMLInputElement).disabled).toBe(true);
  });

  it("renders data assertion adder when assertionType is data", () => {
    render(
      <PropertyAssertionSection
        {...baseProps}
        assertionType="data"
        isEditing={true}
        onAdd={vi.fn()}
      />
    );

    expect(screen.getByPlaceholderText("Select property...")).toBeDefined();
    expect(screen.getByPlaceholderText("Select a property first")).toBeDefined();
  });
});
