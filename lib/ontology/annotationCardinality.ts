import type { LocalizedString } from "@/lib/api/client";
import type { AnnotationCardinality } from "./annotationProperties";

/** Language tags to try in order when choosing a default lang for a new placeholder row. */
const COMMON_LANGS = ["en", "pt", "es", "fr", "de", "it"];

/**
 * Ensures that an array of localized strings has an appropriate trailing
 * placeholder row, respecting the annotation property's cardinality:
 *
 * - "multiple": always one trailing empty row (original behaviour).
 * - "single-per-lang": placeholder lang is the first common language not yet
 *   covered by a filled value; no placeholder when all common langs are filled.
 * - "single": no placeholder once any value is filled; one empty row when empty.
 */
export function ensureTrailingPlaceholder(
  values: LocalizedString[],
  cardinality: AnnotationCardinality,
): LocalizedString[] {
  switch (cardinality) {
    case "single": {
      const hasFilled = values.some((v) => v.value.trim() !== "");
      if (hasFilled) return values.filter((v) => v.value.trim() !== "");
      return [{ value: "", lang: "en" }];
    }

    case "single-per-lang": {
      // Keep any existing trailing empty placeholder as-is.
      if (values.length > 0 && values[values.length - 1].value.trim() === "") return values;
      // Append a placeholder whose lang is the first common language not yet
      // covered by a filled value. This prevents offering a duplicate @en row
      // when the annotation already has an English value (SKOS S14 / rdfs:label
      // convention). If all common languages are already present, no placeholder.
      const filledLangs = new Set(values.filter((v) => v.value.trim()).map((v) => v.lang));
      const nextLang = COMMON_LANGS.find((l) => !filledLangs.has(l));
      if (nextLang === undefined) return values;
      return [...values, { value: "", lang: nextLang }];
    }

    case "multiple":
    default: {
      if (values.length === 0 || values[values.length - 1].value.trim() !== "") {
        return [...values, { value: "", lang: "en" }];
      }
      return values;
    }
  }
}
