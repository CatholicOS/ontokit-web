import { describe, it, expect } from "vitest";
import { ensureTrailingPlaceholder } from "@/lib/ontology/annotationCardinality";
import { getAnnotationCardinality } from "@/lib/ontology/annotationProperties";

// ── ensureTrailingPlaceholder — "multiple" ────────────────────────────────

describe('ensureTrailingPlaceholder — "multiple"', () => {
  it("appends empty row to empty array", () => {
    expect(ensureTrailingPlaceholder([], "multiple")).toEqual([{ value: "", lang: "en" }]);
  });

  it("appends empty row when last item has a value", () => {
    const result = ensureTrailingPlaceholder([{ value: "hello", lang: "en" }], "multiple");
    expect(result).toHaveLength(2);
    expect(result[1]).toEqual({ value: "", lang: "en" });
  });

  it("does not append when last item is already empty", () => {
    const input = [{ value: "hello", lang: "en" }, { value: "", lang: "en" }];
    expect(ensureTrailingPlaceholder(input, "multiple")).toHaveLength(2);
  });

  it("does not append when last item is whitespace-only", () => {
    expect(ensureTrailingPlaceholder([{ value: "  ", lang: "en" }], "multiple")).toHaveLength(1);
  });
});

// ── ensureTrailingPlaceholder — "single-per-lang" ────────────────────────

describe('ensureTrailingPlaceholder — "single-per-lang"', () => {
  it("adds an @en placeholder for an empty array", () => {
    const result = ensureTrailingPlaceholder([], "single-per-lang");
    expect(result).toEqual([{ value: "", lang: "en" }]);
  });

  it("does NOT add a second @en placeholder when @en is already filled (SKOS S14)", () => {
    const input = [{ value: "Foo", lang: "en" }];
    const result = ensureTrailingPlaceholder(input, "single-per-lang");
    // The placeholder lang must differ from "en"
    expect(result).toHaveLength(2);
    expect(result[1].value).toBe("");
    expect(result[1].lang).not.toBe("en");
  });

  it("adds a placeholder with the next uncovered language when @en is filled", () => {
    const result = ensureTrailingPlaceholder([{ value: "Foo", lang: "en" }], "single-per-lang");
    expect(result[1].lang).toBe("pt");
  });

  it("keeps an existing trailing empty placeholder as-is", () => {
    const input = [{ value: "Foo", lang: "en" }, { value: "", lang: "pt" }];
    expect(ensureTrailingPlaceholder(input, "single-per-lang")).toStrictEqual(input);
  });

  it("adds no placeholder when all common languages are already filled", () => {
    const input = [
      { value: "A", lang: "en" },
      { value: "B", lang: "pt" },
      { value: "C", lang: "es" },
      { value: "D", lang: "fr" },
      { value: "E", lang: "de" },
      { value: "F", lang: "it" },
    ];
    expect(ensureTrailingPlaceholder(input, "single-per-lang")).toStrictEqual(input);
  });

  it("skips covered languages and finds the next available one", () => {
    const input = [{ value: "Foo", lang: "en" }, { value: "Bar", lang: "pt" }];
    const result = ensureTrailingPlaceholder(input, "single-per-lang");
    expect(result).toHaveLength(3);
    expect(result[2].lang).toBe("es");
  });
});

// ── ensureTrailingPlaceholder — "single" ─────────────────────────────────

describe('ensureTrailingPlaceholder — "single"', () => {
  it("returns one empty placeholder for an empty array", () => {
    expect(ensureTrailingPlaceholder([], "single")).toEqual([{ value: "", lang: "en" }]);
  });

  it("returns the filled value with no trailing empty once a value exists", () => {
    const input = [{ value: "2024-01-01", lang: "en" }];
    expect(ensureTrailingPlaceholder(input, "single")).toStrictEqual(input);
  });

  it("strips any trailing empty when a value is present", () => {
    const input = [{ value: "ABC", lang: "en" }, { value: "", lang: "en" }];
    const result = ensureTrailingPlaceholder(input, "single");
    expect(result).toEqual([{ value: "ABC", lang: "en" }]);
  });

  it("keeps the empty placeholder while the user is still typing (value is non-empty)", () => {
    const input = [{ value: "2024", lang: "en" }];
    expect(ensureTrailingPlaceholder(input, "single")).toStrictEqual(input);
  });
});

// ── getAnnotationCardinality ──────────────────────────────────────────────

describe("getAnnotationCardinality", () => {
  it("returns single-per-lang for skos:prefLabel", () => {
    expect(getAnnotationCardinality("http://www.w3.org/2004/02/skos/core#prefLabel")).toBe("single-per-lang");
  });

  it("returns single-per-lang for skos:definition", () => {
    expect(getAnnotationCardinality("http://www.w3.org/2004/02/skos/core#definition")).toBe("single-per-lang");
  });

  it("returns single for skos:notation", () => {
    expect(getAnnotationCardinality("http://www.w3.org/2004/02/skos/core#notation")).toBe("single");
  });

  it("returns single for dcterms:created", () => {
    expect(getAnnotationCardinality("http://purl.org/dc/terms/created")).toBe("single");
  });

  it("returns single for dcterms:modified", () => {
    expect(getAnnotationCardinality("http://purl.org/dc/terms/modified")).toBe("single");
  });

  it("returns multiple for skos:altLabel", () => {
    expect(getAnnotationCardinality("http://www.w3.org/2004/02/skos/core#altLabel")).toBe("multiple");
  });

  it("returns multiple for rdfs:comment (COMMENT_IRI)", () => {
    expect(getAnnotationCardinality("http://www.w3.org/2000/01/rdf-schema#comment")).toBe("multiple");
  });

  it("returns single-per-lang for rdfs:label (LABEL_IRI)", () => {
    expect(getAnnotationCardinality("http://www.w3.org/2000/01/rdf-schema#label")).toBe("single-per-lang");
  });

  it("defaults to multiple for unknown IRIs", () => {
    expect(getAnnotationCardinality("http://example.org/custom#prop")).toBe("multiple");
  });
});
