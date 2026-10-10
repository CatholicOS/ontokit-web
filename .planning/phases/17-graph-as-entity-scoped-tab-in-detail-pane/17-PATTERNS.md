# Phase 17: Graph as Entity-Scoped Tab in Detail Pane — Pattern Map

**Mapped:** 2026-05-02
**Files analyzed:** 21 (16 web + 2 api + 3 web tests)
**Analogs found:** 18 / 21 (3 api files have analogs in a separate repo, documented from RESEARCH.md)

## File Classification

### Frontend (ontokit-web) — New Files

| New File | Role | Data Flow | Closest Analog | Match Quality |
|----------|------|-----------|----------------|---------------|
| `components/editor/PaneTabStrip.tsx` | component (presentational tab strip) | event-driven | `components/editor/standard/EntityTabBar.tsx` | exact (canonical density precedent) |
| `components/editor/SourceTabBody.tsx` | component (entity-scoped Monaco snippet + toolbar) | request-response (memoized over already-loaded source) | `components/editor/PropertyDetailPanel.tsx` (`useMemo` over `sourceContent + iri` pattern) | role-match (panel that derives view from source) |
| `components/editor/FullSourceOverlay.tsx` | component (full-Monaco modal body) | request-response | `components/editor/OntologySourceEditor.tsx` (existing full-pane Monaco renderer in `DeveloperEditorLayout`) | role-match (Monaco wrapper) |
| `lib/hooks/useFullSourceOverlay.ts` | hook (local UI state machine + DOM side-effect) | event-driven | `lib/hooks/useKeyboardShortcuts.ts` (lifecycle-managed DOM side-effect with cleanup) | role-match (local-state hook with `useEffect` cleanup) |
| `lib/ontology/extractEntitySnippet.ts` | utility (Turtle text → snippet slice) | transform | `lib/ontology/turtleClassUpdater.ts` (uses `findBlock` + `lines.slice(...)` pattern) | exact |
| `__tests__/components/editor/PaneTabStrip.test.tsx` | test (component behavior) | n/a | `__tests__/components/editor/standard/EntityTabBar.test.tsx` | exact |
| `__tests__/components/editor/SourceTabBody.test.tsx` | test | n/a | `__tests__/components/editor/standard/EntityTabBar.test.tsx` + `__tests__/components/editor/ClassDetailPanel.test.tsx` | role-match |
| `__tests__/components/editor/FullSourceOverlay.test.tsx` | test | n/a | (will exist once PR #88 merges) `__tests__/components/graph/EntityGraphModal.test.tsx` per RESEARCH | role-match (post-#88) |
| `__tests__/lib/hooks/useFullSourceOverlay.test.tsx` | test (hook state machine) | n/a | `__tests__/lib/hooks/useKeyboardShortcuts.test.ts` | role-match |
| `__tests__/lib/ontology/extractEntitySnippet.test.ts` | test (transform) | n/a | `__tests__/lib/ontology/` existing turtle tests + `__tests__/lib/stores/selectionStore.test.ts` | role-match |

### Frontend (ontokit-web) — Modified Files

| Modified File | Role | Data Flow | Closest Analog (or self) | Match Quality |
|---------------|------|-----------|--------------------------|---------------|
| `lib/stores/selectionStore.ts` | store | event-driven | itself (extend existing pattern from #228 `mode` field) | exact (in-file) |
| `lib/api/graph.ts` (lands via PR #88) | api-client | request-response | sibling `lib/api/projects.ts` / `lib/api/lint.ts` (existing API client style) | role-match |
| `components/graph/EntityGraphModal.tsx` → `EntityModal.tsx` | component (modal shell) | event-driven | `components/ui/dialog.tsx` (Radix Dialog primitive in repo) | role-match |
| `components/graph/OntologyEdge.tsx` | component (edge renderer) | transform | itself (extend `edgeTypeConfig` Record) | exact (in-file) |
| `components/graph/OntologyGraph.tsx` | component (canvas) | request-response | itself (lands via PR #88) | exact (in-file) |
| `components/editor/standard/StandardEditorLayout.tsx` | layout | event-driven | itself (extend with `<PaneTabStrip>`, delete `showGraph` state + Graph icon button at lines 462-471) | exact (in-file) |
| `components/editor/developer/DeveloperEditorLayout.tsx` | layout | event-driven | itself (delete mode-strip lines 374-417, remove `viewMode` state, add right-pane tab strip) | exact (in-file) |
| `components/editor/ClassDetailPanel.tsx` | component (detail) | n/a | itself (delete `</> Source` button lines 608-617, drop `headerActions` Graph button) | exact (in-file) |
| `components/editor/PropertyDetailPanel.tsx` | component (detail) | n/a | itself (mirror `ClassDetailPanel` deletion) | exact (in-file) |
| `components/editor/IndividualDetailPanel.tsx` | component (detail) | n/a | itself (mirror `ClassDetailPanel` deletion) | exact (in-file) |
| `lib/ontology/turtleUtils.ts` | utility | n/a | itself — `findBlock` already type-agnostic per RESEARCH §Q4; **no code change needed** | exact (verify-only) |
| `lib/editor/indexWorker.ts` | utility | n/a | itself — public API confirmed at lines 4-37 | exact (verify-only) |

### Backend (ontokit-api) — Cross-Repo Files

| File | Role | Data Flow | Analog | Match Quality |
|------|------|-----------|--------|---------------|
| `ontokit/api/routes/projects.py` (new `/entity-graph` route + delegating shim) | route handler | request-response | existing `/classes/graph` route at `projects.py:660-701` (per RESEARCH) | exact (sibling-route precedent in same file) |
| `ontokit/services/ontology.py` (extend `build_entity_graph`) | service | transform (RDFLib BFS) | existing class-only `build_entity_graph` at `ontology.py:365-455` (per RESEARCH) | exact (extend) |
| `ontokit/schemas/graph.py` (extend `GraphEdgeType` Literal with 6 new values) | schema | n/a | existing 4-value Literal at `schemas/graph.py:1-58` (per RESEARCH) | exact (extend) |
| `tests/unit/test_entity_graph.py` (add property/individual/annotation focus tests) | test | n/a | existing class-focus tests (per RESEARCH; note: tests live in api repo, not in this repo) | exact (extend) |

> **Cross-repo note:** ontokit-api source is not in this working tree. Patterns for those files come from RESEARCH.md §Q6 + §Architecture Patterns + §Code Examples and from the api codebase as referenced there. The planner should resolve api file lines against the api repo at plan-execution time.

## Pattern Assignments

### `components/editor/PaneTabStrip.tsx` (component, event-driven)

**Analog:** `components/editor/standard/EntityTabBar.tsx`

**Imports + skeleton pattern** (lines 1-17):
```tsx
"use client";

import { cn } from "@/lib/utils";

export type EntityTab = "classes" | "properties" | "individuals";

interface EntityTabBarProps {
  activeTab: EntityTab;
  onTabChange: (tab: EntityTab) => void;
  classCounts?: { total: number };
}

const tabs: { id: EntityTab; label: string }[] = [
  { id: "classes", label: "Classes" },
  ...
];
```

**Container + tab markup pattern** (lines 19-37) — **MUST use these exact Tailwind classes for SPEC bottom-border alignment constraint**:
```tsx
export function EntityTabBar({ activeTab, onTabChange }: EntityTabBarProps) {
  return (
    <div className="flex border-b border-slate-200 dark:border-slate-700">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            "flex-1 px-3 py-2 text-xs font-medium transition-colors",
            activeTab === tab.id
              ? "border-b-2 border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400"
              : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
```

**Phase 17 deltas (specified by UI-SPEC §Component Inventory + RESEARCH Pattern 1):**
- Add ARIA roles: `role="tablist"` on container; `role="tab"`, `aria-selected`, `aria-controls`, `id`, `tabIndex={isActive ? 0 : -1}` on each button.
- Add keyboard nav: `onKeyDown` handler on the container (Left/Right/Home/End cycle through `tabs[]`).
- Add icon prop slot — render `<Icon className="h-3.5 w-3.5" />` before label, with `gap-1.5` between.
- Add accent-tinted active background per UI-SPEC: `bg-primary-50 dark:bg-primary-900/20` (extends EntityTabBar's underline-only treatment to underline + tint, deliberate distinction between "tree filter" vs "workspace mode" navigation).
- Add focus-visible ring: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50 focus-visible:ring-inset`.

---

### `components/editor/SourceTabBody.tsx` (component, request-response)

**Analog:** `components/editor/PropertyDetailPanel.tsx` (lines 83-86) — canonical `useMemo` over `(sourceContent, iri)` pattern

**Memoized derivation pattern** (PropertyDetailPanel:83-86):
```tsx
const detail = useMemo((): ParsedPropertyDetail | null => {
  if (!propertyIri || !sourceContent) return null;
  return extractPropertyDetail(sourceContent, propertyIri);
}, [propertyIri, sourceContent, refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps
```

**Empty-state pattern** (`components/editor/EntityPlaceholderDetail.tsx:13-21`):
```tsx
return (
  <div className="flex h-full items-center justify-center p-8 text-center">
    <div>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Select a {entityType.toLowerCase()} to view its details
      </p>
    </div>
  </div>
);
```

**Phase 17 deltas (UI-SPEC §Component Inventory + Copywriting Contract):**
- Toolbar row: `flex items-center justify-between h-8 px-3 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700`
  - Left: `# File: ontology.ttl, line {N}` in `font-mono text-xs text-slate-500 dark:text-slate-400` (line N from `sourceIriIndex.get(iri)?.line` per RESEARCH §Q5).
  - Right: `↗ Open full source` (primary, accent hover `hover:bg-primary-50`) | divider | `⎘ Copy snippet` (secondary).
- Body: existing `TurtleEditor` (Monaco) configured `readOnly: true`. Snippet text from `extractEntitySnippet(sourceText, iri)`.
- Empty state copy when `extractEntitySnippet` returns `null` — `Lucide.FileQuestion` icon + "Source not available for this entity" + "It may be defined in an imported ontology." Toolbar still shows `↗ Open full source`.

---

### `components/editor/FullSourceOverlay.tsx` (component, request-response)

**Analog:** `components/editor/OntologySourceEditor.tsx` (existing full-pane Monaco wrapper) — already in repo

**Phase 17 deltas:**
- Renders inside `EntityModal` body slot (post-rename of `EntityGraphModal`).
- On open: scroll to entity start line via `sourceIriIndex.get(iri)?.line`, apply highlight rule (existing source-IRI plumbing).
- On selection change while open (R10): scroll to new entity, do NOT dismiss.
- `headerExtras`: when `size === 'modal'` → `<button aria-label="Maximize source view"><Maximize2/></button>`. When `size === 'maximized' && cameFromModal` → `<button aria-label="Restore to modal view"><Minimize2/></button>`.

**Critical (RESEARCH Pitfall 1):** Monaco container must NEVER unmount across Maximize/Restore — single instance lives in this component. CSS attribute toggle on `<html>` is the only mechanism that hides the surrounding panes.

---

### `lib/hooks/useFullSourceOverlay.ts` (hook, event-driven)

**Analog:** `lib/hooks/useKeyboardShortcuts.ts` (lifecycle-managed DOM side-effect with cleanup)

**Cleanup pattern** (useKeyboardShortcuts:50-60+):
```tsx
"use client";

import { useEffect } from "react";

export function useKeyboardShortcuts(shortcuts: ShortcutDefinition[]): void {
  useEffect(() => {
    if (shortcuts.length === 0) return;

    const handler = (e: KeyboardEvent) => { ... };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [shortcuts]);
}
```

**Phase 17 hook contract (RESEARCH Code Example 2 — already locked):**
```tsx
"use client";
import { useCallback, useEffect, useState } from "react";

type Size = "closed" | "modal" | "maximized";

export function useFullSourceOverlay() {
  const [state, setState] = useState<{ size: Size; cameFromModal: boolean }>({
    size: "closed", cameFromModal: false,
  });
  const open = useCallback(() => setState({ size: "modal", cameFromModal: false }), []);
  const maximize = useCallback(() => setState((s) =>
    s.size === "modal" ? { size: "maximized", cameFromModal: true } : s), []);
  const restore = useCallback(() => setState((s) =>
    s.size === "maximized" ? { size: "modal", cameFromModal: true } : s), []);
  const close = useCallback(() => setState({ size: "closed", cameFromModal: false }), []);

  useEffect(() => {
    if (state.size === "maximized") {
      document.documentElement.dataset.overlayTakeover = "true";
    } else {
      delete document.documentElement.dataset.overlayTakeover;
    }
    return () => { delete document.documentElement.dataset.overlayTakeover; };
  }, [state.size]);

  return { isOpen: state.size !== "closed", size: state.size, cameFromModal: state.cameFromModal,
    open, close, maximize, restore };
}
```

---

### `lib/ontology/extractEntitySnippet.ts` (utility, transform)

**Analog:** `lib/ontology/turtleUtils.ts:178-277` (`findBlock`) + existing `lib/ontology/turtleClassUpdater.ts` callsite pattern

**Source `findBlock` skeleton** (turtleUtils.ts:178-215):
```ts
export function findBlock(
  lines: string[],
  iri: string,
  prefixes: PrefixMap,
  base?: string,
): BlockRange | null {
  const forms = iriTurtleForms(iri, prefixes, base);
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("@") ||
        /^(PREFIX|BASE)\s/i.test(trimmed)) continue;
    const isSubject = forms.some((f) => {
      if (!trimmed.startsWith(f)) return false;
      const after = trimmed[f.length];
      return !after || after === " " || after === "\t";
    });
    if (isSubject) {
      // CRITICAL: continuation-line guard — same landmine on prev-line ;/,
      const prevLine = i > 0 ? lines[i - 1].trim() : "";
      const isContinuation = prevLine.endsWith(";") || prevLine.endsWith(",");
      if (!isContinuation) return { startLine: i, endLine: scanToBlockEnd(lines, i) };
    }
  }
  // ... fallback layers also include the same continuation-line guard
}
```

**Phase 17 wrapper (RESEARCH §Q4 Action — already locked):**
```ts
export interface EntitySnippet {
  text: string;     // joined lines
  startLine: number; // 1-indexed
  endLine: number;   // 1-indexed
}
export function extractEntitySnippet(source: string, iri: string): EntitySnippet | null {
  const { prefixes, base } = parseDeclarations(source);
  const lines = source.split("\n");
  const block = findBlock(lines, iri, prefixes, base);
  if (!block) return null;
  return {
    text: lines.slice(block.startLine, block.endLine + 1).join("\n"),
    startLine: block.startLine + 1,
    endLine: block.endLine + 1,
  };
}
```

`findBlock` already handles property + individual subjects (verified RESEARCH §Q4) — no generalization required. CONTEXT D-01 ("generalize findBlock") is partially obsolete; only the wrapper is new.

---

### `lib/stores/selectionStore.ts` (store, event-driven) — **MODIFY**

**Analog:** itself — extend the existing `mode` field pattern (added in PR #228) for `activePaneTab`

**Existing store structure** (selectionStore.ts:1-39):
```ts
import { create } from "zustand";
import type { SelectableEntityType } from "@/lib/utils/selectionUrl";

export type ProjectViewMode = "viewer" | "editor";

interface SelectionState {
  iri: string | null;
  type: SelectableEntityType | null;
  mode: ProjectViewMode | null;
  setSelection: (iri: string | null, type: SelectableEntityType | null) => void;
  setMode: (mode: ProjectViewMode) => void;
  clear: () => void;
}

export const useSelectionStore = create<SelectionState>()((set) => ({
  iri: null, type: null, mode: null,
  setSelection: (iri, type) => set({ iri, type }),
  setMode: (mode) => set({ mode }),
  clear: () => set({ iri: null, type: null, mode: null }),
}));
```

**Phase 17 extension (RESEARCH §Code Example 3 — already locked):**
```ts
export type PaneTab = "detail" | "graph" | "source";

interface SelectionState {
  // ... existing fields
  activePaneTab: PaneTab;  // default "detail" per SPEC R8
  setActivePaneTab: (tab: PaneTab) => void;
}

export const useSelectionStore = create<SelectionState>()((set) => ({
  // ... existing initializers
  activePaneTab: "detail",
  setActivePaneTab: (tab) => set({ activePaneTab: tab }),
  clear: () => set({ iri: null, type: null, mode: null, activePaneTab: "detail" }),
}));

/** Derived effective tab — D-15: never mutates the store */
export function useEffectiveTab(editorMode: EditorMode): PaneTab {
  const stored = useSelectionStore((s) => s.activePaneTab);
  return stored === "source" && editorMode === "standard" ? "detail" : stored;
}
```

Non-persist pattern (D-14) is preserved — selectionStore is already non-persist (line 24-30 docblock confirms "Not persisted — on a full page reload").

---

### `lib/api/graph.ts` (api-client, request-response) — **MODIFY** (lands via PR #88)

**Analog:** `lib/api/projects.ts:1-40` (canonical API-client module pattern in repo)

**API-client module pattern** (lib/api/projects.ts:1-7):
```ts
/**
 * Projects API client
 */
import { api, type UploadProgress } from "./client";

// Types
export type ProjectRole = "owner" | "admin" | "editor" | "suggester" | "viewer";
```

**Phase 17 delta (D-05):**
- Refactor `getEntityGraph(focusIri, focusType?)` to call `GET /api/v1/projects/{id}/ontology/entity-graph?focus_iri=...&focus_type=class|property|individual`.
- Mirror `GraphEdgeType` Literal type extension from `ontokit-api/ontokit/schemas/graph.py` (10 values per UI-SPEC §Color).
- Re-export from `lib/api/client.ts` per existing pattern (`embeddingsApi`, `qualityApi`, etc. per CLAUDE.md).

---

### `components/graph/EntityGraphModal.tsx` → `EntityModal.tsx` (component, event-driven)

**Analog:** `components/ui/dialog.tsx` (Radix Dialog primitive, lines 1-53)

**Existing Radix Dialog wrapper pattern** (components/ui/dialog.tsx:1-15):
```tsx
"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;
```

**Existing overlay backdrop + dismissal markup** (dialog.tsx:16-29):
```tsx
const DialogOverlay = React.forwardRef<...>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
));
```

**Phase 17 prop generalization (RESEARCH §Q2 — locked contract):**
```tsx
interface EntityModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;            // body slot — graph or full-source
  headerExtras?: ReactNode;       // right-side header buttons (Maximize, Restore)
  size?: 'modal' | 'maximized';
  onMaximize?: () => void;
  onRestore?: () => void;
  titleId?: string;               // for aria-labelledby
}
```

Modal sizing classes (UI-SPEC §Spacing): `w-[92vw] h-[92vh] max-w-none rounded-lg shadow-2xl`. When `size === 'maximized'` AND `[data-overlay-takeover="true"]` is set on `<html>`, CSS rule expands modal to `position: fixed; inset: 0; width: 100vw; height: 100vh`.

---

### `components/graph/OntologyEdge.tsx` (component, transform) — **MODIFY**

**Analog:** itself (extend `edgeTypeConfig` Record at lines 21-47)

**Existing edge config pattern** (OntologyEdge.tsx:21-47):
```tsx
const edgeTypeConfig: Record<GraphEdgeType, {
  stroke: string;
  strokeDasharray?: string;
  label: string;
  markerEnd?: string;
}> = {
  subClassOf:      { stroke: "#94a3b8", label: "subClassOf",      markerEnd: "url(#arrow-slate)" },
  equivalentClass: { stroke: "#3b82f6", strokeDasharray: "5 3",   label: "equivalentTo" },
  disjointWith:    { stroke: "#ef4444", strokeDasharray: "5 3",   label: "disjointWith" },
  seeAlso:         { stroke: "#9ca3af", strokeDasharray: "2 4",   label: "seeAlso" },
};
```

**Existing stroke-width logic** (OntologyEdge.tsx:88-90):
```tsx
strokeWidth: edgeType === "subClassOf" ? 1.5 : 1,
```

**Phase 17 extension (UI-SPEC §Color — already locked palette):** Add 6 new entries following the same `{stroke, strokeDasharray?, label, markerEnd?}` shape. Stroke-width logic generalizes to: `1.5` for `subClassOf | subPropertyOf | rdfType`; `1` for others. New entries:
```tsx
domain:          { stroke: "#94a3b8", label: "domain",         markerEnd: "url(#arrow-slate)" },
range:           { stroke: "#94a3b8", strokeDasharray: "4 2",  label: "range",          markerEnd: "url(#arrow-slate)" },
subPropertyOf:   { stroke: "#64748b", label: "subPropertyOf",  markerEnd: "url(#arrow-slate)" },
rdfType:         { stroke: "#0ea5e9", label: "rdf:type",       markerEnd: "url(#arrow-slate)" },
sameAs:          { stroke: "#a855f7", strokeDasharray: "5 3",  label: "sameAs" },
objectProperty:  { stroke: "#71717a", label: "<predicate>",    markerEnd: "url(#arrow-slate)" },
```

---

### `components/editor/standard/StandardEditorLayout.tsx` (layout, event-driven) — **MODIFY**

**Analog:** itself (extend in place; remove `showGraph` state and Graph icon button)

**Existing Graph icon button to delete** (StandardEditorLayout.tsx:462-471):
```tsx
headerActions={selectedIri ? (
  <button
    onClick={() => setShowGraph(true)}
    className="flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-700"
    aria-label="Show relationship graph"
  >
    <Share2 className="h-3.5 w-3.5" />
    Graph
  </button>
) : undefined}
```

**Existing `showGraph` state to delete** (StandardEditorLayout.tsx:213-214 + 231):
```tsx
// Graph view state
const [showGraph, setShowGraph] = useState(false);
// ... usage in entityNavigationRef handler:
setShowGraph(false);  // line 231
```

**Existing entity-tab + selection mirroring pattern** (StandardEditorLayout.tsx:264-273) — preserve and extend with `activePaneTab`:
```tsx
const setSelection = useSelectionStore((s) => s.setSelection);
useEffect(() => {
  if (activeTab === "classes") {
    setSelection(selectedIri ?? null, selectedIri ? "class" : null);
  } else if (activeTab === "properties") {
    setSelection(selectedPropertyIri ?? null, selectedPropertyIri ? "property" : null);
  } else {
    setSelection(selectedIndividualIri ?? null, selectedIndividualIri ? "individual" : null);
  }
}, [activeTab, selectedIri, selectedPropertyIri, selectedIndividualIri, setSelection]);
```

**Phase 17 deltas (R3 + R6):**
- Insert `<PaneTabStrip tabs={[Detail, Graph]} ...>` ABOVE the entity header in the right pane. Source feeds from `useSelectionStore.activePaneTab` via `useEffectiveTab(editorMode)`.
- Delete `showGraph` state + `setShowGraph` callsites; render the right-pane body conditionally on `effectiveTab === 'graph'` instead.
- Drop `headerActions={...Graph button...}` prop.

---

### `components/editor/developer/DeveloperEditorLayout.tsx` (layout, event-driven) — **MODIFY**

**Analog:** itself + sibling `StandardEditorLayout`

**Existing Tree|Source|Graph mode strip to delete** (DeveloperEditorLayout.tsx:374-417):
```tsx
{/* Developer Sub-Header: View Mode Tabs */}
<div className="flex items-center gap-2 border-b border-slate-200 bg-white px-4 py-2 dark:border-slate-700 dark:bg-slate-800">
  <div className="flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 dark:border-slate-700 dark:bg-slate-900">
    <button onClick={() => handleViewModeChange("tree")} ...>Tree</button>
    <button onClick={() => handleViewModeChange("source")} ...>Source</button>
    <button onClick={() => handleViewModeChange("graph")} ...>Graph</button>
  </div>
</div>
```

**Existing `viewMode` state usages** (per RESEARCH §Q8 — DeveloperEditorLayout.tsx:246, 350-369, 374-417, 421, 435, 601-647): all branches collapse — `viewMode === "graph"` body becomes Graph tab body; `viewMode === "source"` body becomes `SourceTabBody` content; tree branch becomes the only top-level layout.

**Phase 17 deltas (R2 + R7):**
- Delete the entire mode-strip block (lines 374-417).
- Delete `viewMode` state + `DeveloperView` type + `handleViewModeChange` + `entityNavigationRef.type==="other"` logic that calls `setViewMode("source")` (line 271-274).
- `handleNavigateToSource` becomes `setActivePaneTab('source')`.
- Insert `<PaneTabStrip tabs={[Detail, Graph, Source]} ...>` ABOVE the right-pane entity header.
- Right-pane body conditional on `effectiveTab` (`'detail' | 'graph' | 'source'`), with `'source'` → `<SourceTabBody>`.
- Verifier task: `git grep -n viewMode components/editor/developer/` after deletion (RESEARCH Pitfall 6).

---

### `components/editor/{Class,Property,Individual}DetailPanel.tsx` (component, n/a) — **MODIFY**

**Analog:** itself (delete `</> Source` button — pattern is identical across all three panels)

**Existing `</> Source` button to delete** (ClassDetailPanel.tsx:608-617):
```tsx
{onNavigateToSource && (
  <button
    onClick={() => onNavigateToSource(classDetail.iri)}
    className="flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-xs text-primary-600 hover:bg-primary-50 hover:text-primary-700 dark:text-primary-400 dark:hover:bg-primary-900/20 dark:hover:text-primary-300"
    title="View in Source"
  >
    <Code className="h-3 w-3" />
    <span>Source</span>
  </button>
)}
```

**Phase 17 deltas (R3 + R4):**
- Delete the `{onNavigateToSource && (...)}` block from all three panels.
- Drop `onNavigateToSource` prop from each panel's interface (and its consumer in both layouts).
- Drop `headerActions` Graph button (already covered in `StandardEditorLayout` delta above).
- **Verification (RESEARCH §Q8 + Assumption A1):** grep `PropertyDetailPanel.tsx` and `IndividualDetailPanel.tsx` for `Source`/`onNavigateToSource`/`View in` to confirm whether the link exists there before declaring R4 complete; initial scout grep was empty in those files, but re-verify at plan time.

---

### `__tests__/components/editor/PaneTabStrip.test.tsx` (test, n/a) — **NEW**

**Analog:** `__tests__/components/editor/standard/EntityTabBar.test.tsx`

**Test scaffolding pattern** (EntityTabBar.test.tsx:1-23):
```tsx
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

vi.mock("@/lib/utils", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

import { EntityTabBar } from "@/components/editor/standard/EntityTabBar";

describe("EntityTabBar", () => {
  const onTabChange = vi.fn();
  beforeEach(() => { vi.clearAllMocks(); });

  it("renders all three tabs", () => {
    render(<EntityTabBar activeTab="classes" onTabChange={onTabChange} />);
    expect(screen.getByText("Classes")).toBeDefined();
    expect(screen.getByText("Properties")).toBeDefined();
    expect(screen.getByText("Individuals")).toBeDefined();
  });
```

**Click + active-style assertions** (EntityTabBar.test.tsx:25-72):
```tsx
it("applies active styling to the classes tab when active", () => {
  render(<EntityTabBar activeTab="classes" onTabChange={onTabChange} />);
  const classesBtn = screen.getByText("Classes");
  expect(classesBtn.className).toContain("border-primary-600");
});

it("calls onTabChange with 'classes' when Classes is clicked", () => {
  render(<EntityTabBar activeTab="properties" onTabChange={onTabChange} />);
  fireEvent.click(screen.getByText("Classes"));
  expect(onTabChange).toHaveBeenCalledWith("classes");
});
```

**Phase 17 deltas:** add ARIA assertions (`getByRole("tab")`, `aria-selected` toggling), add keyboard nav tests via `fireEvent.keyDown(container, { key: "ArrowRight" })`, add icon-rendering smoke check, test that `tabs` array prop without Source tab renders only 2 tabs (Standard view scenario).

---

### `__tests__/lib/stores/selectionStore.test.ts` (test, n/a) — **EXTEND**

**Analog:** itself

**Existing test pattern** (selectionStore.test.ts:1-44):
```ts
import { beforeEach, describe, expect, it } from "vitest";
import { useSelectionStore } from "@/lib/stores/selectionStore";

describe("useSelectionStore", () => {
  beforeEach(() => {
    useSelectionStore.getState().clear();
  });

  it("starts with no selection", () => {
    const state = useSelectionStore.getState();
    expect(state.iri).toBeNull();
    expect(state.type).toBeNull();
  });

  it("setSelection records both iri and type", () => {
    useSelectionStore.getState().setSelection("ex:Person", "class");
    expect(useSelectionStore.getState()).toMatchObject({ iri: "ex:Person", type: "class" });
    ...
  });

  it("clear resets selection and mode to null", () => {
    useSelectionStore.getState().setSelection("ex:Person", "class");
    useSelectionStore.getState().setMode("editor");
    useSelectionStore.getState().clear();
    expect(useSelectionStore.getState().iri).toBeNull();
    expect(useSelectionStore.getState().type).toBeNull();
    expect(useSelectionStore.getState().mode).toBeNull();
  });
```

**Phase 17 additions:**
- `it("starts with activePaneTab='detail'", ...)` — default per SPEC R8.
- `it("setActivePaneTab updates the field", ...)` — direct update.
- `it("clear resets activePaneTab to 'detail' (not null)", ...)` — confirms clear semantics.
- `it("activePaneTab persists across selection changes", ...)` — set tab + change selection + assert tab unchanged (SPEC R6).
- `useEffectiveTab(editorMode)` derivation: assert `'source' + 'standard' === 'detail'`, `'source' + 'developer' === 'source'`, `'graph' + 'standard' === 'graph'` — D-15 fallback (use `renderHook` from RTL since `useEffectiveTab` calls `useSelectionStore`).

---

### `__tests__/lib/hooks/useFullSourceOverlay.test.tsx` (test, n/a) — **NEW**

**Analog:** `__tests__/lib/hooks/useKeyboardShortcuts.test.ts`

**Hook test scaffolding pattern** (useKeyboardShortcuts.test.ts:1-26):
```ts
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useKeyboardShortcuts, ... } from "@/lib/hooks/useKeyboardShortcuts";

beforeEach(() => { vi.clearAllMocks(); });
afterEach(() => { vi.restoreAllMocks(); });

describe("useKeyboardShortcuts", () => {
  it("registers keydown event listener", () => {
    const addSpy = vi.spyOn(document, "addEventListener");
    const action = vi.fn();
    renderHook(() => useKeyboardShortcuts(shortcuts));
    expect(addSpy).toHaveBeenCalledWith("keydown", expect.any(Function));
  });
```

**Phase 17 coverage:**
- State machine transitions: `open()` → modal/cameFromModal=false; `maximize()` → maximized/cameFromModal=true; `restore()` → modal/cameFromModal=true (preserves bounce); `close()` → closed/cameFromModal=false.
- Bounce: open → maximize → restore → maximize keeps `cameFromModal=true` throughout.
- Side-effect: `document.documentElement.dataset.overlayTakeover` is `'true'` only when size==='maximized'; cleared on restore/close; cleared on hook unmount via `act` + `unmount()`.

---

### `__tests__/lib/ontology/extractEntitySnippet.test.ts` (test, n/a) — **NEW**

**Analog:** existing tests under `__tests__/lib/ontology/` (turtle-related test files)

**Phase 17 coverage:**
- Class block extraction: known IRI in fixture → returns expected `{text, startLine, endLine}`.
- Property block extraction.
- Individual block extraction.
- Not-found IRI → returns `null`.
- Continuation-line guard: an IRI that appears as a `;`-continued object reference does NOT cause spurious match (RESEARCH Pitfall 2).

---

### Backend (cross-repo, ontokit-api) — Documentation only

These three files live in the separate `ontokit-api` repo. The planner should resolve their analog code at plan-execution time by reading the api source directly. Patterns below come from RESEARCH §Q6 + §Don't Hand-Roll:

**`ontokit/api/routes/projects.py`** — new `/entity-graph` route + delegating shim
- **Analog:** existing `/classes/graph` route at `projects.py:660-701` (per RESEARCH).
- **Pattern:** mirror the existing route's signature (path params, query params, FastAPI `Depends(OptionalUser)`), accept `focus_iri` + `focus_type` in addition to existing knobs (`branch`, `ancestors_depth`, `descendants_depth`, `max_nodes`, `include_see_also`).
- **Deprecation pattern (D-05):** keep `/classes/graph` as `@router.get(..., deprecated=True)` decorator → delegates to new handler with `focus_type="class"` hardcoded.

**`ontokit/services/ontology.py`** — extend `build_entity_graph`
- **Analog:** existing `build_entity_graph` at `ontology.py:365-455`. Class-only gate at line 397: `if (class_uri, RDF.type, OWL.Class) not in graph: return None`. `_classify_node` at 437-455 already understands `property`/`individual`/`external`.
- **Pattern:** parametrize on `focus_type`. Branch BFS by type (RESEARCH §Q6):
  - `class` (existing, unchanged).
  - `property` → BFS over `rdfs:domain`, `rdfs:range`, `rdfs:subPropertyOf` (up + down), `rdfs:seeAlso`.
  - `individual` → BFS over `rdf:type`, all `(?indiv ?p ?other)` triples where `?p ∈ owl:ObjectProperty`, `owl:sameAs`, `rdfs:seeAlso`.
  - Annotation property with no neighborhood → `{nodes: [focus_only], edges: []}`.

**`ontokit/schemas/graph.py`** — extend `GraphEdgeType` Literal
- **Analog:** existing 4-value Literal at `schemas/graph.py:1-58`.
- **Pattern:** add `domain | range | subPropertyOf | rdfType | sameAs | objectProperty` to the existing `Literal[...]` union. Mirror in `lib/graph/types.ts` (frontend hand-mirror; comment at `schemas/graph.py:9` confirms convention).

**`tests/unit/test_entity_graph.py`** — extend tests
- **Analog:** existing class-focus tests in same file.
- **Pattern:** mirror the existing fixture-loading + assertion structure for property/individual/annotation focus tests. Coverage from SPEC R11 acceptance: at least one object property with domain+range, one individual with rdf:type+1 obj prop, one annotation property with seeAlso, one annotation property with no relationships → focus-only response.

---

## Shared Patterns

### Auth / Access Control
**Source:** existing API client pattern (`lib/api/client.ts` + sibling clients)
**Apply to:** `lib/api/graph.ts` modifications
- All API calls already pass `accessToken` via session per CLAUDE.md "Authentication Flow" — no new auth pattern introduced. New `/entity-graph` endpoint inherits the same `OptionalUser` dependency on the api side (per RESEARCH §Security Domain).

### Tailwind density tokens (LOCKED — visual alignment)
**Source:** `components/editor/standard/EntityTabBar.tsx:21-31`
**Apply to:** `PaneTabStrip` (mandatory for SPEC bottom-border alignment constraint)
```
flex border-b border-slate-200 dark:border-slate-700
flex-1 px-3 py-2 text-xs font-medium transition-colors
```
Active: `border-b-2 border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400`. Phase 17 adds the accent-tint background `bg-primary-50 dark:bg-primary-900/20` to the existing pattern.

### Empty-state copy / layout
**Source:** `components/editor/EntityPlaceholderDetail.tsx:13-21`
**Apply to:** `SourceTabBody` (extractor empty state) + Graph tab (annotation property empty state)
- Layout: `flex h-full items-center justify-center p-8 text-center`
- Body text: `text-sm text-slate-500 dark:text-slate-400`
- Heading text: `text-sm font-semibold text-slate-700 dark:text-slate-300`
- Lucide icon: `h-8 w-8 text-slate-400 mb-3`

### Memoized derivation from `(sourceContent, iri)`
**Source:** `components/editor/PropertyDetailPanel.tsx:83-86`
**Apply to:** `SourceTabBody` (snippet extraction memoization per D-04)
```tsx
const snippet = useMemo(() => {
  if (!iri || !sourceContent) return null;
  return extractEntitySnippet(sourceContent, iri);
}, [iri, sourceContent, refreshKey]);
```

### Selection-store mirroring on tab activation
**Source:** `components/editor/standard/StandardEditorLayout.tsx:254-273`
**Apply to:** layouts when integrating `PaneTabStrip`
- Pattern: `useEffect` that mirrors local UI state (active entity-tab, active pane-tab) into the Zustand store so cross-page chrome (Viewer/Editor switcher, side-page Back-to-project links) stays consistent. Selection mirroring continues as-is; new `activePaneTab` set is direct (`setActivePaneTab(tab)` in the tab strip click handler).

### Vitest + RTL test scaffolding
**Source:** `__tests__/components/editor/standard/EntityTabBar.test.tsx:1-23` + `__tests__/lib/hooks/useKeyboardShortcuts.test.ts:1-26`
**Apply to:** all new tests
- Use `vi.mock("@/lib/utils", () => ({ cn: ... }))` to bypass class-merge in unit tests.
- Use `renderHook` from RTL for hook tests; `render` + `screen` for components.
- Behavioral assertions over snapshots (project preference per RESEARCH §Q11).

### Continuation-line guard (RESEARCH Pitfall 2)
**Source:** `lib/ontology/turtleUtils.ts:207-211, 233-235, 265-268`
**Apply to:** any code path that locates Turtle subject blocks
- Always check `prevLine.endsWith(";") || prevLine.endsWith(",")` before declaring a line a subject definition. The existing `findBlock` already enforces this at all three fallback layers; do NOT re-implement subject detection.

### Lucide icon convention
**Source:** existing repo (per CLAUDE.md / global instructions)
**Apply to:** all new components
- `FileText` for Detail tab; `Network` for Graph tab; `FileCode2` for Source tab; `Maximize2`/`Minimize2` for size buttons; `Tag` for annotation-property empty graph; `FileQuestion` for source-not-found empty state. (UI-SPEC §Component Inventory locks these.)

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `lib/api/graph.ts` (today) | api-client | request-response | File doesn't exist on `dev` HEAD — lands via PR #88. Phase 17 modifies the post-#88 version. Use `lib/api/projects.ts` as the API-client style precedent until #88 merges. |
| `components/graph/EntityGraphModal.tsx` (today) | component (modal) | event-driven | File doesn't exist on `dev` HEAD — lands via PR #88. Phase 17 renames + generalizes the post-#88 version. Use `components/ui/dialog.tsx` (Radix Dialog primitive) as the modal-shell precedent until #88 merges. |
| `__tests__/components/editor/FullSourceOverlay.test.tsx` | test | n/a | No precedent for "full Monaco in modal" tests in current codebase. Once `__tests__/components/graph/EntityGraphModal.test.tsx` lands via PR #88, that's the analog; until then, base on `EntityTabBar.test.tsx` shape + `useKeyboardShortcuts.test.ts` Esc-key pattern. |
| Backend files (3 + 1 test) | api-side | request-response | Source lives in `ontokit-api` repo (not in this working tree). RESEARCH.md §Q6 documents the exact analog file paths and line numbers; resolve at plan-execution time. |

## Metadata

**Analog search scope:**
- `components/editor/`, `components/editor/standard/`, `components/editor/developer/`
- `components/editor/shared/`, `components/graph/`, `components/ui/`
- `lib/hooks/`, `lib/stores/`, `lib/api/`, `lib/ontology/`, `lib/editor/`
- `__tests__/components/editor/`, `__tests__/lib/stores/`, `__tests__/lib/hooks/`

**Files scanned (Read):** 12 source files + 3 test files
**Files scanned (Bash/grep):** ~25 directory listings + content greps
**Pattern extraction date:** 2026-05-02

**Key patterns identified:**
- All right-pane tab strips share the locked Tailwind density tokens (`flex-1 px-3 py-2 text-xs font-medium` + `border-b border-slate-200 dark:border-slate-700`) for SPEC bottom-border alignment.
- `useMemo` over `(sourceContent, iri)` is the canonical pattern for entity-scoped views derived from source — `PropertyDetailPanel` already uses it.
- `findBlock` in `turtleUtils.ts` is type-agnostic; the continuation-line guard at three fallback layers is the critical landmine to preserve.
- Selection-store extension follows the same in-place pattern used for `mode` (#228); non-persist semantics are documented in the store's existing docblock.
- All new components ship matching Vitest behavioral tests with `vi.mock("@/lib/utils")` and RTL `render`/`fireEvent` — snapshot tests are explicitly avoided.
