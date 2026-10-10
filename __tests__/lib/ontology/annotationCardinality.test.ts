import { describe, it, expect } from "vitest";
import { ensureTrailingPlaceholder, usedLanguages } from "@/lib/ontology/annotationCardinality";
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
  it("defaults the first row to @en when nothing is filled yet", () => {
    expect(ensureTrailingPlaceholder([], "single-per-lang")).toEqual([{ value: "", lang: "en" }]);
  });

  it("does NOT offer a second @en row when @en is already filled (SKOS S14)", () => {
    const result = ensureTrailingPlaceholder([{ value: "Foo", lang: "en" }], "single-per-lang");
    expect(result).toHaveLength(2);
    expect(result[1]).toEqual({ value: "", lang: "" });
  });

  it("leaves the placeholder language blank so the filtered picker forces a choice", () => {
    const result = ensureTrailingPlaceholder(
      [{ value: "Foo", lang: "en" }, { value: "Bar", lang: "pt" }],
      "single-per-lang",
    );
    expect(result).toHaveLength(3);
    expect(result[2]).toEqual({ value: "", lang: "" });
  });

  it("keeps an existing trailing empty placeholder as-is", () => {
    const input = [{ value: "Foo", lang: "en" }, { value: "", lang: "pt" }];
    expect(ensureTrailingPlaceholder(input, "single-per-lang")).toStrictEqual(input);
  });

  it("still offers a row when many languages are already filled", () => {
    const input = [
      { value: "A", lang: "en" },
      { value: "B", lang: "pt" },
      { value: "C", lang: "es" },
      { value: "D", lang: "fr" },
      { value: "E", lang: "de" },
      { value: "F", lang: "it" },
    ];
    const result = ensureTrailingPlaceholder(input, "single-per-lang");
    expect(result).toHaveLength(7);
    expect(result[6]).toEqual({ value: "", lang: "" });
  });
});

// ── usedLanguages ─────────────────────────────────────────────────────────

describe("usedLanguages", () => {
  it("lists the languages already carrying a value for single-per-lang", () => {
    const values = [
      { value: "Foo", lang: "en" },
      { value: "Bar", lang: "PT" },
      { value: "", lang: "es" },
    ];
    expect(usedLanguages(values, "single-per-lang")).toEqual(["en", "pt"]);
  });

  it("ignores rows whose value is only whitespace", () => {
    expect(usedLanguages([{ value: "   ", lang: "en" }], "single-per-lang")).toEqual([]);
  });

  it("drops empty language tags", () => {
    const values = [{ value: "Foo", lang: "" }, { value: "Bar", lang: "de" }];
    expect(usedLanguages(values, "single-per-lang")).toEqual(["de"]);
  });

  it("excludes nothing for multiple — the picker stays unfiltered", () => {
    const values = [{ value: "Foo", lang: "en" }, { value: "Bar", lang: "fr" }];
    expect(usedLanguages(values, "multiple")).toEqual([]);
  });

  it("excludes nothing for single", () => {
    expect(usedLanguages([{ value: "Foo", lang: "en" }], "single")).toEqual([]);
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
