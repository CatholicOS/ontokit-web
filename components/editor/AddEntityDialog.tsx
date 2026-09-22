"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Plus, ChevronDown, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  type EntityType,
  type IriSuffixPattern,
  labelToLocalName,
  uuidToBase62,
} from "@/lib/ontology/iriGeneration";

// ── Types ────────────────────────────────────────────────────────────

export interface NewEntityInfo {
  iri: string;
  label: string;
  entityType: EntityType;
  parentIri?: string;
}

interface AddEntityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (entity: NewEntityInfo) => void;
  iriPattern: IriSuffixPattern;
  nextNumeric?: number;
  ontologyNamespace: string;
  parentIri?: string;
  /** Human-readable label for the parent entity (shown in dialog description) */
  parentLabel?: string;
}

// ── Constants ────────────────────────────────────────────────────────

const ENTITY_TYPE_OPTIONS: { value: EntityType; label: string }[] = [
  { value: "class", label: "Class" },
  { value: "objectProperty", label: "Object Property" },
  { value: "dataProperty", label: "Data Property" },
  { value: "annotationProperty", label: "Annotation Property" },
  { value: "individual", label: "Individual" },
];

// ── Component ────────────────────────────────────────────────────────

/**
 * Thin wrapper: all form state lives in `AddEntityForm`, which Radix unmounts
 * whenever the dialog closes. Each opening therefore mounts a fresh form with
 * fresh state — the React-canonical reset-on-prop-change pattern — instead of
 * an effect that reaches back in and clears state after the fact.
 */
export function AddEntityDialog({
  open,
  onOpenChange,
  onConfirm,
  iriPattern,
  nextNumeric,
  ontologyNamespace,
  parentIri,
  parentLabel,
}: AddEntityDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <AddEntityForm
          onOpenChange={onOpenChange}
          onConfirm={onConfirm}
          iriPattern={iriPattern}
          nextNumeric={nextNumeric}
          ontologyNamespace={ontologyNamespace}
          parentIri={parentIri}
          parentLabel={parentLabel}
        />
      </DialogContent>
    </Dialog>
  );
}

type AddEntityFormProps = Omit<AddEntityDialogProps, "open">;

function AddEntityForm({
  onOpenChange,
  onConfirm,
  iriPattern,
  nextNumeric,
  ontologyNamespace,
  parentIri,
  parentLabel,
}: AddEntityFormProps) {
  const [label, setLabel] = useState("");
  const [entityType, setEntityType] = useState<EntityType>("class");
  const [showAdvanced, setShowAdvanced] = useState(false);
  /** Set only when the user hand-edits the IRI field; otherwise the IRI is derived. */
  const [iriOverride, setIriOverride] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // One stable UUID per dialog session. The lazy initializer runs once per
  // mount, and a mount is exactly one opening of the dialog.
  const [stableUuidIri] = useState(() => ontologyNamespace + uuidToBase62());

  const generatedIri = useMemo(() => {
    switch (iriPattern) {
      case "named":
        return label.trim()
          ? ontologyNamespace + labelToLocalName(label)
          : ontologyNamespace + "...";
      case "numeric":
        return ontologyNamespace + String(nextNumeric ?? 1);
      case "uuid":
      default:
        return stableUuidIri;
    }
  }, [iriPattern, label, nextNumeric, ontologyNamespace, stableUuidIri]);

  const iri = iriOverride ?? generatedIri;

  // Focus the label input once the dialog content is on screen. This is a DOM
  // side effect, not derived state, so an effect is the right tool.
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedLabel = label.trim();
    const trimmedIri = iri.trim();
    if (!trimmedLabel || !trimmedIri) return;

    onConfirm({
      iri: trimmedIri,
      label: trimmedLabel,
      entityType,
      parentIri,
    });
    onOpenChange(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const parentDisplayName = parentLabel || (parentIri
    ? parentIri.includes("#")
      ? parentIri.split("#").pop()
      : parentIri.split("/").pop()
    : null);

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Add Entity
        </DialogTitle>
        <DialogDescription asChild>
          <p>
            {parentIri ? (
              <>
                Create a new subclass of{" "}
                <span className="inline-flex items-center rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                  {parentDisplayName}
                </span>
              </>
            ) : (
              "Create a new entity in this ontology"
            )}
          </p>
        </DialogDescription>
      </DialogHeader>

      <div className="my-4 space-y-4">
        {/* Label input */}
        <div>
          <label
            htmlFor="entity-label"
            className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Label
          </label>
          <input
            ref={inputRef}
            id="entity-label"
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g., Privileged Altar"
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-primary-500 focus:outline-hidden focus:ring-1 focus:ring-primary-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-500"
            autoComplete="off"
          />
        </div>

        {/* Entity type select */}
        <div>
          <label
            htmlFor="entity-type"
            className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Type
          </label>
          <select
            id="entity-type"
            value={entityType}
            onChange={(e) => setEntityType(e.target.value as EntityType)}
            disabled={!!parentIri}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-hidden focus:ring-1 focus:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
          >
            {ENTITY_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {parentIri && (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Type is locked to Class when creating a subclass.
            </p>
          )}
        </div>

        {/* Advanced: IRI */}
        <div>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            {showAdvanced ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            Advanced
          </button>
          {showAdvanced && (
            <div className="mt-2">
              <label
                htmlFor="entity-iri"
                className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                IRI
              </label>
              <input
                id="entity-iri"
                type="text"
                value={iri}
                onChange={(e) => setIriOverride(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-xs placeholder:text-slate-400 focus:border-primary-500 focus:outline-hidden focus:ring-1 focus:ring-primary-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-500"
              />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {iriPattern === "uuid" && "Auto-generated UUID-based IRI"}
                {iriPattern === "numeric" && `Sequential numeric IRI (next: ${nextNumeric ?? 1})`}
                {iriPattern === "named" && "Derived from label"}
              </p>
            </div>
          )}
        </div>
      </div>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={!label.trim()}>
          Create
        </Button>
      </DialogFooter>
    </form>
  );
}
