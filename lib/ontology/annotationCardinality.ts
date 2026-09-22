import type { LocalizedString } from "@/lib/api/client";
import type { AnnotationCardinality } from "./annotationProperties";

/**
 * Ensures that an array of localized strings has an appropriate trailing
 * placeholder row, respecting the annotation property's cardinality:
 *
 * - `"single"`: no placeholder once a value is filled; one empty row when empty.
 * - `"single-per-lang"`: one trailing empty row, but with no preset language —
 *   the user picks from a list that excludes the languages already present
 *   (see {@link usedLanguages} and `LanguagePicker`'s `excludeCodes`). Only when
 *   nothing is filled yet does the row default to `en`, since there is nothing
 *   to collide with.
 * - `"multiple"`: always one trailing empty row defaulting to `en`.
 */
export function ensureTrailingPlaceholder(
  values: LocalizedString[],
  cardinality: AnnotationCardinality,
): LocalizedString[] {
  const hasFilled = values.some((v) => v.value.trim() !== "");

  switch (cardinality) {
    case "single":
      // At most one value: drop stray empty rows once something is filled.
      return hasFilled ? values.filter((v) => v.value.trim() !== "") : [{ value: "", lang: "en" }];

    case "single-per-lang":
      if (values.length > 0 && values[values.length - 1].value.trim() === "") return values;
      // Blank lang forces an explicit pick from the filtered picker, so the
      // user can't silently re-use a language that already has a value.
      return [...values, { value: "", lang: hasFilled ? "" : "en" }];

    case "multiple":
    default:
      if (values.length === 0 || values[values.length - 1].value.trim() !== "") {
        return [...values, { value: "", lang: "en" }];
      }
      return values;
  }
}

/**
 * Language tags already carrying a value in `values`, normalized to lowercase.
 *
 * Passed to `LanguagePicker`'s `excludeCodes` for `single-per-lang` annotations
 * so the picker can't offer a language that would violate the cardinality
 * constraint. Returns an empty array for other cardinalities — `multiple`
 * annotations show the unfiltered language list.
 */
export function usedLanguages(
  values: LocalizedString[],
  cardinality: AnnotationCardinality,
): string[] {
  if (cardinality !== "single-per-lang") return [];
  return values
    .filter((v) => v.value.trim() !== "")
    .map((v) => v.lang.trim().toLowerCase())
    .filter(Boolean);
}
