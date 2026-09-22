import { describe, expect, it } from "vitest";

import en from "@/messages/en.json";
import pt from "@/messages/pt.json";

type MessageTree = { [key: string]: string | MessageTree };

function flattenKeys(tree: MessageTree, prefix = ""): string[] {
  return Object.entries(tree).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === "string" ? [path] : flattenKeys(value, path);
  });
}

/** ICU placeholders, e.g. the `{total}` in "(of {total})". */
function placeholders(message: string): string[] {
  return [...message.matchAll(/\{(\w+)/g)].map((m) => m[1]).sort();
}

function leafEntries(tree: MessageTree, prefix = ""): [string, string][] {
  return Object.entries(tree).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === "string"
      ? ([[path, value]] as [string, string][])
      : leafEntries(value, path);
  });
}

const LOCALES = { pt } as const;

describe("message catalogs", () => {
  const enKeys = flattenKeys(en as MessageTree);
  const enByKey = new Map(leafEntries(en as MessageTree));

  it("English catalog is non-empty", () => {
    expect(enKeys.length).toBeGreaterThan(0);
  });

  for (const [locale, catalog] of Object.entries(LOCALES)) {
    describe(locale, () => {
      const keys = flattenKeys(catalog as MessageTree);

      it("has no keys missing relative to English", () => {
        expect(enKeys.filter((k) => !keys.includes(k))).toEqual([]);
      });

      it("has no keys English does not define", () => {
        expect(keys.filter((k) => !enKeys.includes(k))).toEqual([]);
      });

      it("keeps the same ICU placeholders as English", () => {
        const mismatched = leafEntries(catalog as MessageTree)
          .filter(([key, value]) => {
            const source = enByKey.get(key);
            return (
              source !== undefined &&
              placeholders(source).join(",") !== placeholders(value).join(",")
            );
          })
          .map(([key]) => key);
        expect(mismatched).toEqual([]);
      });

      it("leaves no message untranslated-by-omission (empty string)", () => {
        const empty = leafEntries(catalog as MessageTree)
          .filter(([, value]) => value.trim() === "")
          .map(([key]) => key);
        expect(empty).toEqual([]);
      });
    });
  }
});
