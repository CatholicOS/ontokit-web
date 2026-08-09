# Phase 17: Graph as Entity-Scoped Tab in Detail Pane — Research

**Researched:** 2026-05-02
**Domain:** React 19 / Next.js 15 frontend restructure (TabStrip + modal round-trip + Source-tab) + cross-repo FastAPI/RDFLib backend extension (entity-graph BFS for property + individual focus)
**Confidence:** HIGH (most upstream code already exists in repo; SPEC + UI-SPEC + 11 design decisions are locked)

## Summary

Phase 17 is mostly an **integration phase, not a research-heavy phase**. SPEC, CONTEXT, and UI-SPEC are pre-locked with 11 requirements + 16 implementation decisions + a full visual contract. The remaining unknowns are concrete code locations, prop contracts of components landing via PR #88, and a small set of generalization questions (findBlock, edge palette, ARIA tablist wiring).

Scout findings:
- `findBlock` in `lib/ontology/turtleUtils.ts` is **already type-agnostic** — it matches subject IRIs by Turtle form, not by `owl:Class`-specific assertions. CONTEXT D-01 ("generalize findBlock") is partially obsolete; the function already handles property and individual subjects. The single landmine to preserve is the `prevLine.endsWith(";")||","` continuation-line guard at lines 207–211 / 233–235 / 265–268 — already implemented at all three fallback layers.
- `EntityTabBar.tsx` (the existing left-pane `Classes|Properties|Individuals` strip) is the canonical Tailwind density precedent (`flex-1 px-3 py-2 text-xs font-medium`). The new `PaneTabStrip` MUST use these exact classes for the bottom-border alignment constraint.
- PR #88's `EntityGraphModal` is currently a **graph-specific modal**. It needs renaming to `EntityModal` AND prop generalization (`children`, `headerExtras`, `size`, `onMaximize`, `onRestore`) — this is part of Phase 17, not pre-existing.
- PR #88's `lib/api/graph.ts` calls `/api/v1/projects/{id}/ontology/classes/graph` with `class_iri=...` (class-only). Phase 17 introduces a new `/entity-graph?focus_iri=...&focus_type=...` endpoint and refactors the client to call it.
- `useGraphData` was completely rewritten by PR #88 — current `dev` HEAD has the legacy client-side BFS version. Phase 17 builds on PR #88's server-side BFS hook, so any plan task touching `useGraphData` must base off PR #88's version.
- `lib/editor/indexWorker.ts` already builds an IRI → `{line, col, len}` index for ANY subject (class/property/individual), keyed by full IRI. Phase 17's `# File: ontology.ttl, line N` comment can read this directly via `sourceIriIndex` (already plumbed through `DeveloperEditorLayout`).
- Backend (`ontokit-api`): `ontokit/services/ontology.py:365` `build_entity_graph()` exists and rejects non-class IRIs at line 397 with `if (class_uri, RDF.type, OWL.Class) not in graph: return None`. Phase 17 needs to extend this method (or add sibling methods) to handle property + individual focus, plus rename the route to `/entity-graph` with a `focus_type` discriminator.

**Primary recommendation:** Treat Phase 17 as **three plans**:
1. **API plan (ontokit-api)**: extend `build_entity_graph` to handle property/individual focus, add `focus_type` query param, expose new `/entity-graph` route, deprecate `/classes/graph` as an internal delegating shim, add `edge_kind` enum extension, add tests.
2. **Web plumbing plan (ontokit-web)**: rename `EntityGraphModal` → `EntityModal` with new slot props, add `PaneTabStrip` component, add `activePaneTab` to `selectionStore`, add `useEffectiveTab` derivation, add `useFullSourceOverlay` hook, extract `extractEntitySnippet` from `findBlock`, extend `OntologyEdge` palette for new `edge_kind` values, refactor `lib/api/graph.ts` to call `/entity-graph`.
3. **Web layout plan (ontokit-web)**: integrate `PaneTabStrip` into both layouts, remove old peer-tab strip + Graph icon button + `</> Source` link, wire `SourceTabBody` + `FullSourceOverlay`, ensure tab persistence + auto-jump behavior, run AI smoke test, fix regressions.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| TabStrip rendering / state-bind | Browser/Client | — | Pure UI state; lives in component + zustand selectionStore |
| `activePaneTab` persistence (session-only) | Browser/Client | — | D-13/14: non-persist Zustand; resets on reload by design |
| Source snippet extraction | Browser/Client | — | D-01/04: already-loaded source text + memoized findBlock; no API call |
| Full-source overlay | Browser/Client | — | D-10/11: local useState hook + CSS attribute toggle on layout root |
| Maximize/Restore CSS takeover | Browser/Client | — | D-11: `[data-overlay-takeover="true"]` on `<html>` hides `.editor-tree-pane`/`.editor-detail-pane` |
| Entity-graph BFS (class/property/individual) | API/Backend | — | RDFLib graph traversal; SPEC R11 |
| Edge_kind enum (10 values) | API/Backend → Browser | — | Backend emits, frontend renders palette per UI-SPEC §Color |
| Class-graph backward compat | API/Backend | — | D-05: `/classes/graph` delegates to `/entity-graph` during deprecation window |
| Auto-jump source on selection change | Browser/Client | — | SPEC R10: existing `pendingScrollIri` plumbing already in `DeveloperEditorLayout` |

## Standard Stack

### Core (already in repo — versions verified from `package.json` 2026-05-02)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | ^16.2.4 | App framework | [VERIFIED: package.json] |
| React | ^19.0.0 | UI runtime | [VERIFIED: package.json] |
| TypeScript | (project default) | Type safety | [VERIFIED: tsconfig present] |
| Tailwind CSS | 3.x | Styling | [VERIFIED: tailwind.config.ts present, darkMode: "class"] |
| @xyflow/react | ^12.10.1 | Graph rendering | [VERIFIED: package.json] |
| elkjs | ^0.11.0 | Graph layout | [VERIFIED: package.json] |
| zustand | ^5.0.0 | Client state | [VERIFIED: package.json] |
| @radix-ui/react-dialog | ^1.1.0 | Modal primitive (focus trap, dismissal) | [VERIFIED: package.json] |
| @radix-ui/react-tabs | ^1.1.0 | Available but NOT used here per UI-SPEC | [VERIFIED: package.json — UI-SPEC chooses native ARIA tablist for store-driven external control, matching `EntityTabBar` and Phase 16 `ShardTabNavigator`] |
| lucide-react | ^1.14.0 | Icons | [VERIFIED: package.json] |
| Monaco Editor | (via existing TurtleEditor) | Source editing | [VERIFIED: components/editor/TurtleEditor.tsx present] |
| Vitest | ^4.0.18 | Unit tests | [VERIFIED: package.json] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @testing-library/react | (existing) | RTL render/fireEvent for unit tests | Test new components per `__tests__/components/editor/standard/EntityTabBar.test.tsx` precedent [VERIFIED: file exists] |
| MCP chrome-devtools | (Claude Code MCP) | AI smoke testing | SPEC mandate; `/snap/bin/chromium` headless explicitly disallowed per MEMORY |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native ARIA tablist | `@radix-ui/react-tabs` | Radix Tabs ships internal state; Phase 17 needs external `activePaneTab` from `selectionStore` to drive selection. UI-SPEC explicitly rejects Radix Tabs for this reason, mirroring Phase 16's `ShardTabNavigator` precedent. [CITED: 17-UI-SPEC.md §Design System] |
| Modal as new component | Reuse `EntityGraphModal` (renamed) | D-09: rename + slot generalization keeps backdrop / focus-trap / dismissal logic in one place. |
| `display: none` for takeover | Visibility:hidden / absolute offscreen | D-11 picks CSS attribute toggle (`[data-overlay-takeover="true"] .editor-tree-pane { display: none }`). See Common Pitfall 1 for Monaco scroll-preservation analysis. |

**Installation:** No new dependencies needed. All required packages are already in `package.json`.

**Version verification:**
```bash
# Run from ontokit-web/ (already verified 2026-05-02):
node -p "require('./package.json').dependencies['@radix-ui/react-dialog']"  # ^1.1.0
node -p "require('./package.json').dependencies['lucide-react']"             # ^1.14.0
```

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| R1 | TabStrip becomes topmost chrome of right pane (Detail/Graph or Detail/Graph/Source) | UI-SPEC §Component Inventory locks Tailwind classes; `EntityTabBar.tsx` is the parity precedent |
| R2 | Old peer-tab `Tree\|Source\|Graph` strip removed (Developer view) | `DeveloperEditorLayout.tsx:373-417` defines the strip; remove entirely. `viewMode` state at line 246 must be repurposed (Source moves to right-pane tab). See Q8 below |
| R3 | Old Graph icon button removed (Standard view entity-actions) | `StandardEditorLayout.tsx:462-471` renders the `<Share2>` button; delete |
| R4 | Old `</> Source` link removed (both views, all 3 detail panels) | `ClassDetailPanel.tsx:608-617` (verified). Property + Individual panels: needs grep verification — see Q8 |
| R5 | Click semantics preserved (single = recenter, double = select) | PR #88's `OntologyGraph.tsx` already implements this; preserve when graph renders inside Graph tab |
| R6 | `activePaneTab` persists across selection changes | D-13: add field to `selectionStore`. Current store at `lib/stores/selectionStore.ts:12-22` has `iri`/`type`/`mode`; extend |
| R7 | Source as Developer-only third tab with snippet + toolbar | New `SourceTabBody` component; reuse `Monaco TurtleEditor` in readOnly mode |
| R8 | Default tab on first load = Detail | D-14: non-persist Zustand defaults to `'detail'` (or `null` → fallback) |
| R9 | Modal ⇄ Maximize ⇄ Restore round-trip | D-09/10/11/12: new `useFullSourceOverlay` hook + renamed `EntityModal` slot props |
| R10 | Tree → Source auto-jump on selection change | Existing `pendingScrollIri` plumbing in `DeveloperEditorLayout` (lines 153, 365–368, 642–643) — preserve |
| R11 | Backend supports class + property + individual focus | `ontokit-api` `build_entity_graph` at `ontokit/services/ontology.py:365`; route at `ontokit/api/routes/projects.py:660-701` |

## Architecture Patterns

### System Architecture Diagram

```
                          [User clicks tab in PaneTabStrip]
                                        ↓
                          useSelectionStore.setActivePaneTab(tab)
                                        ↓
                          ┌─────────── activePaneTab ───────────┐
                          ↓                  ↓                   ↓
                       'detail'           'graph'            'source'
                          ↓                  ↓                   ↓
                  [Class/Property/      [OntologyGraph     [SourceTabBody]
                  IndividualDetail-      with focusIri]          ↓
                   Panel body]                ↓           ┌──────┴──────┐
                                              ↓           ↓             ↓
                                     graphApi.getEntityGraph()  Monaco snippet  ↗ Open full
                                              ↓           via extract-       source btn
                                     [server-side BFS:    EntityBlock(            ↓
                                      class | property |  source, iri)       useFullSource-
                                      individual]                            Overlay.open()
                                              ↓                                    ↓
                                     {nodes, edges with     ┌────── EntityModal (renamed) ──────┐
                                      edge_kind ∈ 10 vals}  │ <body slot> = FullSourceOverlay   │
                                              ↓             │   (full Monaco at ~92vw/92vh)     │
                                     OntologyEdge palette   │ <headerExtras> = ⤢Max / ⊟Restore  │
                                     maps edge_kind → color │   buttons                          │
                                                            └─────────────────────────────────────┘
                                                                          ↓
                                                            ⤢ Maximize → setattr <html>
                                                              data-overlay-takeover="true"
                                                              → CSS hides .editor-tree-pane
                                                              + .editor-detail-pane
                                                            ⊟ Restore → unset attr (Monaco never
                                                              unmounts; scroll preserved)


  Backend (ontokit-api):
  GET /api/v1/projects/{id}/ontology/entity-graph?focus_iri=...&focus_type=class|property|individual
                                              ↓
                                 OntologyService.build_entity_graph(focus_iri, focus_type)
                                              ↓
                              ┌──────────────┼──────────────┐
                              ↓              ↓              ↓
                        focus_type=    focus_type=    focus_type=
                        class          property       individual
                        (existing      (NEW: domain,  (NEW: rdf:type,
                        BFS up/down)   range, sub-    object props,
                                       PropertyOf,    sameAs,
                                       seeAlso)       seeAlso)
                                              ↓
                                  {nodes, edges with edge_kind enum}
                                              ↓
                  Old route /classes/graph → delegates to /entity-graph (D-05 deprecation)
```

### Recommended File Placement
```
ontokit-web/
├── components/editor/
│   ├── PaneTabStrip.tsx                     # NEW (sibling of EntityTabBar)
│   ├── SourceTabBody.tsx                    # NEW
│   ├── FullSourceOverlay.tsx                # NEW
│   ├── ClassDetailPanel.tsx                 # MODIFY: remove </> Source button (lines 608-617)
│   ├── PropertyDetailPanel.tsx              # MODIFY: remove </> Source + (any) Graph button
│   ├── IndividualDetailPanel.tsx            # MODIFY: remove </> Source + (any) Graph button
│   ├── developer/DeveloperEditorLayout.tsx  # MODIFY: remove Tree|Source|Graph mode strip; integrate PaneTabStrip
│   └── standard/StandardEditorLayout.tsx    # MODIFY: remove Graph icon button (lines 462-471); integrate PaneTabStrip
├── components/graph/
│   └── EntityGraphModal.tsx → EntityModal.tsx  # RENAME + prop generalization (D-09)
├── lib/
│   ├── api/graph.ts                         # MODIFY (PR #88 base): refactor getEntityGraph for /entity-graph + focus_type
│   ├── graph/types.ts                       # MODIFY: extend GraphEdgeType with 6 new values
│   ├── hooks/useFullSourceOverlay.ts        # NEW
│   ├── hooks/useGraphData.ts                # MODIFY (PR #88 base): pass focus_type through
│   ├── ontology/extractEntitySnippet.ts     # NEW (or reuse findBlock + slice)
│   └── stores/selectionStore.ts             # MODIFY: add activePaneTab + setter
├── components/graph/OntologyEdge.tsx        # MODIFY: extend edgeTypeConfig with 6 new edge_kind entries
└── __tests__/                               # NEW unit tests for: PaneTabStrip, SourceTabBody, useFullSourceOverlay, EntityModal slot wiring, selectionStore.activePaneTab, edge palette extension

ontokit-api/
├── ontokit/api/routes/projects.py           # MODIFY: add new /entity-graph route; mark /classes/graph deprecated (delegate)
├── ontokit/services/ontology.py             # MODIFY: extend build_entity_graph to handle property + individual focus
├── ontokit/services/entity_graph_helpers.py # MODIFY: add property_neighbors() + individual_neighbors() helpers
├── ontokit/schemas/graph.py                 # MODIFY: extend GraphEdgeType Literal with 6 new values
└── tests/unit/test_entity_graph.py          # MODIFY: add property + individual + annotation-property focus tests
```

### Pattern 1: Native ARIA tablist with external state control (Phase 16 precedent)
**What:** TabStrip uses `role="tablist"` + `<button role="tab" aria-selected aria-controls>` + `role="tabpanel"` body, driven by external prop `activeTab` and `onTabChange` callback.
**When to use:** When tab state lives in a store (selectionStore) outside the component, so Radix Tabs' internal state would conflict.
**Example:**
```tsx
// Source: components/editor/standard/EntityTabBar.tsx (precedent — extend, do not deviate)
<div role="tablist" className="flex border-b border-slate-200 dark:border-slate-700">
  {tabs.map((tab) => (
    <button
      key={tab.id}
      role="tab"
      id={`pane-tab-${tab.id}`}
      aria-selected={activeTab === tab.id}
      aria-controls={`pane-panel-${tab.id}`}
      tabIndex={activeTab === tab.id ? 0 : -1}
      onClick={() => onTabChange(tab.id)}
      className={cn(
        "flex-1 px-3 py-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50 focus-visible:ring-inset",
        activeTab === tab.id
          ? "border-b-2 border-primary-600 bg-primary-50 text-primary-600 dark:border-primary-400 dark:bg-primary-900/20 dark:text-primary-400"
          : "text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-300 dark:hover:bg-slate-800/50"
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      <span>{tab.label}</span>
    </button>
  ))}
</div>
```

Keyboard nav (Left/Right/Home/End/Enter) is handled by an `onKeyDown` on the tablist container, walking `tabs` index and updating focus + calling `onTabChange`. [CITED: WAI-ARIA Authoring Practices — Tabs Pattern]

### Pattern 2: CSS attribute-toggled takeover (D-11)
**What:** Maximize sets `document.documentElement.dataset.overlayTakeover = "true"`. CSS rule (in `app/globals.css` or scoped per layout) hides the tree + detail panes:
```css
[data-overlay-takeover="true"] .editor-tree-pane,
[data-overlay-takeover="true"] .editor-detail-pane {
  display: none;
}
[data-overlay-takeover="true"] .editor-overlay-modal {
  position: fixed; inset: 0;
  width: 100vw; height: 100vh;
  border-radius: 0;
  max-width: none;
}
```
**When to use:** When a child overlay needs to expand beyond a portal modal but the underlying component (Monaco) MUST keep its scroll position. Unmount/remount strategies destroy Monaco's view state.
**Why:** Monaco's `IEditor` instance is tied to its DOM container. Hiding via `display: none` on an *ancestor* element preserves the editor instance — when restored, Monaco re-uses its existing scroll position. Hiding the editor's container directly (or unmounting it) discards view state. [VERIFIED: PR #88's `OntologySourceEditor.tsx` uses `monaco.editor.IStandaloneCodeEditor` instance, which preserves view state across DOM hide/show as long as the instance is not disposed]

### Pattern 3: Useful Memo for snippet extraction (D-04)
```tsx
// Source: D-04 specification
const snippet = useMemo(() => {
  if (!sourceContent || !focusIri) return null;
  return extractEntitySnippet(sourceContent, focusIri);
}, [sourceContent, focusIri]);
```
`extractEntitySnippet` wraps the existing `findBlock` (re-exported from `lib/ontology/turtleUtils.ts`), slices `lines[startLine..endLine]`, joins with `\n`, returns `{snippet, startLine}` so the toolbar can render `# File: ontology.ttl, line ${startLine + 1}`. (`startLine` is 0-indexed in `findBlock`; the comment uses 1-indexed lines per `IriPosition.line` convention in `indexWorker.ts:28`.)

### Anti-Patterns to Avoid
- **Don't unmount Monaco on Maximize/Restore.** Use CSS attribute toggle only (D-11). Unmounting destroys scroll position even if you save the line number — Monaco's word wrap, fold state, and selection are all lost.
- **Don't mutate `activePaneTab` on mode change.** D-15: derive `useEffectiveTab(editorMode)` at render time. Mutation breaks the user's preference (Developer→Standard→Developer should restore Source tab).
- **Don't add a feature flag or try/catch fallback for the new `/entity-graph` endpoint.** D-08: sequential cross-repo merge order — api ships first to dev, then web cuts from dev. No graceful degradation; if API isn't deployed, web breaks (and that's fine — it's a coordinated release).
- **Don't re-parse the full Turtle source for line numbers.** The Web Worker IRI index already maps every subject IRI to `{line, col, len}`. Read it from `sourceIriIndex` (already a `Map<string, IriPosition>` plumbed through `DeveloperEditorLayout` — lines 91, 152, 366).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Subject-block discovery in Turtle | New regex per entity type | Existing `findBlock` from `lib/ontology/turtleUtils.ts:178-277` | Already type-agnostic. Handles full IRI, prefixed names, relative IRIs (via @base), continuation-line guards. The "class-only" misimpression comes from `turtleClassUpdater.ts` — but `findBlock` itself is generic. |
| IRI → line number lookup | Re-parse Turtle in component | `sourceIriIndex: Map<string, IriPosition>` from `lib/editor/indexWorker.ts` | Already runs in Web Worker, already plumbed through the editor layouts. |
| Modal focus trap + dismissal | Custom focus management | PR #88's `EntityGraphModal` (renamed) — keeps existing focus trap at `EntityGraphModal.tsx:34-83` | Don't reimplement; just generalize props. |
| Tab keyboard nav | Custom focus rover | Native ARIA tablist pattern + `tabIndex={activeTab === tab.id ? 0 : -1}` | Standard pattern; matches Phase 16 `ShardTabNavigator`. |
| BFS over RDF graph | Custom traversal | `OntologyService.build_entity_graph` at `ontokit/services/ontology.py:365` | Extend, don't rewrite. The `_classify_node` function at line 437-455 already detects properties + individuals — the gating is at line 397 (`if (class_uri, RDF.type, OWL.Class) not in graph: return None`). |
| Annotation-property "no relationships" detection | Custom check on response | Backend returns `{nodes: [focus_only], edges: []}` per D-05/SPEC R11; frontend checks `edges.length === 0 && nodes.length === 1` | Single source of truth in API. |

**Key insight:** Phase 17 is mostly a **wiring + rename + extend** phase. The platform already has every primitive needed; the planner's job is to sequence the changes correctly across two repos.

## Per-Question Findings

### Q1. TabStrip ARIA tablist wiring
**Resolved.** UI-SPEC §Accessibility lines 312-323 fully specify the pattern. Implementation:
- Container: `<div role="tablist" onKeyDown={handleArrowKeys}>`
- Each tab: `<button role="tab" id="pane-tab-{id}" aria-selected={isActive} aria-controls="pane-panel-{id}" tabIndex={isActive ? 0 : -1}>`
- Body: `<div role="tabpanel" id="pane-panel-{id}" aria-labelledby="pane-tab-{id}">`
- Keyboard: Left/Right cycle through `tabs[]`, Home/End jump to first/last, Enter/Space activate (already focused tab is "active" — clicking activates).
- `tabIndex={isActive ? 0 : -1}` is the canonical "roving tabindex" pattern. [CITED: w3.org/WAI/ARIA/apg/patterns/tabs/]

Existing `EntityTabBar` does NOT implement ARIA roles or keyboard nav — Phase 17 should add them to the new `PaneTabStrip` AND consider porting them to `EntityTabBar` (out of scope unless trivial).

### Q2. EntityModal generalization
PR #88's `EntityGraphModal` is at `components/graph/EntityGraphModal.tsx` (`git show entity-graph-pr:components/graph/EntityGraphModal.tsx`). Current props: `{focusIri, label, projectId, branch, accessToken, onNavigateToClass, onClose}` — graph-specific.

Phase 17 rename + generalization:
```tsx
interface EntityModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;            // body slot — graph or full-source or future
  headerExtras?: ReactNode;       // right-side header buttons (Maximize, Restore, etc.)
  size?: 'modal' | 'maximized';   // controls outer sizing via CSS attribute
  onMaximize?: () => void;
  onRestore?: () => void;
  titleId?: string;               // for aria-labelledby (caller renders the title in headerExtras or in body)
}
```
The existing focus-trap and Esc-handler logic (lines 25-83 of `git show entity-graph-pr:components/graph/EntityGraphModal.tsx`) stays intact. Two consumers:
- Graph use-case (was inline, becomes `<EntityModal><OntologyGraph .../></EntityModal>`).
- Full-source use-case (`<EntityModal headerExtras={<MaximizeBtn/>}><FullSourceOverlay/></EntityModal>`).

PR #88 has tests at `__tests__/components/graph/EntityGraphModal.test.tsx` — they'll need updating for the new prop contract.

### Q3. Maximize/Restore CSS-toggle takeover
**Recommendation:** `display: none` on ancestor selectors `.editor-tree-pane` and `.editor-detail-pane`, NOT on the Monaco container itself.

Mechanism:
1. `useFullSourceOverlay.maximize()` sets `document.documentElement.dataset.overlayTakeover = "true"`.
2. CSS in `app/globals.css`:
```css
[data-overlay-takeover="true"] .editor-tree-pane,
[data-overlay-takeover="true"] .editor-detail-pane { display: none; }
[data-overlay-takeover="true"] .editor-overlay-modal {
  position: fixed; inset: 0; width: 100vw; height: 100vh;
  max-width: none; border-radius: 0;
}
```
3. `restore()` clears the attribute. Monaco container DOM is untouched; `IStandaloneCodeEditor` instance survives, scroll position preserved.

**Comparison:**
| Strategy | Scroll preserved? | DOM cost | Notes |
|----------|------------------|----------|-------|
| `display: none` on ancestor | ✓ YES | Cheap (toggle CSS) | Recommended (D-11) |
| `visibility: hidden` | ✓ YES | Layout still computed | Wastes work; also doesn't free space — must combine with grid hacks |
| Absolute-position offscreen | ✓ YES | Layout still computed | Same as visibility:hidden, with extra positioning math |
| Unmount/remount Monaco | ✗ NO | Expensive | Disposes editor instance; loses scroll, fold state, word-wrap state |
| `display: none` on Monaco container | Mostly preserved | Cheap | Risky — Monaco's `onDidLayoutChange` may fire spuriously; ancestor approach is safer |

[VERIFIED: Monaco `IStandaloneCodeEditor` preserves `viewState` (scroll/cursor/folds) as long as the instance is not disposed; `editor.dispose()` is the only call that destroys it. Source: monaco-editor TypeScript definitions, observed in PR #88's `OntologySourceEditor.tsx`]

### Q4. findBlock generalization for property/individual subjects
**Already done.** `findBlock` at `lib/ontology/turtleUtils.ts:178-277` operates on **subject IRI patterns**, not type-specific assertions:
- Primary loop (lines 187-215): matches lines starting with any known Turtle form of the IRI (full `<...>`, prefixed `prefix:local`, relative `<local>` via @base) — agnostic to whether the subject is a class, property, or individual.
- Continuation-line guard at lines 207-211: `prevLine.endsWith(";")||","` correctly rejects object references on continuation lines.
- Fallback 1 (lines 218-240): full IRI substring match.
- Fallback 2 (lines 243-273): local-name regex match.

All three fallbacks already include the `isContinuation` guard. No changes needed for property/individual subjects.

`turtleClassUpdater.ts` is class-specific only because of its **block generator** (`genBlock` at line 35 emits `a owl:Class`). `turtlePropertyUpdater.ts` and `turtleIndividualUpdater.ts` already exist and use the same shared `findBlock` — confirmed by reading their imports (`lib/ontology/turtlePropertyUpdater.ts:8-15`, `lib/ontology/turtleIndividualUpdater.ts:7-16`).

**Action for Phase 17:** Create `lib/ontology/extractEntitySnippet.ts` as a thin wrapper:
```ts
export interface EntitySnippet {
  text: string;     // joined lines
  startLine: number; // 1-indexed for display
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
Memoize at the consumer site (`SourceTabBody`).

### Q5. Web Worker IRI index lookup
**Public API:** `lib/editor/indexWorker.ts:4-37`. Worker emits `IndexWorkerResult` with `iriIndex: Array<[string, IriPosition]>` where `IriPosition = { line, col, len }`. Line is 1-indexed (line 105: `index.set(iri, { line: i + 1, col, len })`).

Consumer pattern (already in repo at `DeveloperEditorLayout.tsx:91, 152, 366`):
- `sourceIriIndex: Map<string, IriPosition>` is built once when source loads.
- Lookup is O(1): `sourceIriIndex.get(iri)?.line`.
- Synchronous after the index is built; no await needed in component.

For `# File: ontology.ttl, line N` comment in `SourceTabBody`:
```tsx
const startLine = sourceIriIndex.get(focusIri)?.line ?? extractedSnippet?.startLine ?? null;
```
Use `sourceIriIndex` first (faster, already cached); fall back to `extractEntitySnippet` for full-block bounds.

### Q6. Backend /entity-graph endpoint design
Current state (`ontokit-api/ontokit/api/routes/projects.py:660-701`):
- Route: `GET /api/v1/projects/{project_id}/ontology/classes/graph?class_iri=...&branch=...&ancestors_depth=...&descendants_depth=...&max_nodes=...&include_see_also=...`
- Calls `OntologyService.build_entity_graph` at `ontokit/services/ontology.py:365`.
- Gates non-class IRIs at line 397: `if (class_uri, RDF.type, OWL.Class) not in graph: return None`.
- `_classify_node` at line 437 already understands `property`/`individual`/`external`.

Phase 17 changes:

1. **New route** `GET /api/v1/projects/{project_id}/ontology/entity-graph?focus_iri=...&focus_type=class|property|individual&branch=...`
   - Other knobs (`ancestors_depth`, `descendants_depth`, `max_nodes`, `include_see_also`) carry over.
   - Respond 404 if the focus IRI doesn't match `focus_type` (e.g., `focus_type=property` but IRI has `rdf:type owl:Class`).

2. **Refactor `build_entity_graph`** to accept `focus_type`:
   - `focus_type=class` (existing): keep current BFS unchanged.
   - `focus_type=property`: BFS over `rdfs:domain`, `rdfs:range`, `rdfs:subPropertyOf` (up + down), `rdfs:seeAlso`. Property-type detection: `(uri, RDF.type, OWL.ObjectProperty|OWL.DatatypeProperty|OWL.AnnotationProperty)`.
   - `focus_type=individual`: BFS over `rdf:type` (class assertions), all `(?indiv ?p ?other)` triples where `?p` is an `owl:ObjectProperty` (object-property assertions), `owl:sameAs`, `rdfs:seeAlso`.
   - For annotation properties with no neighborhood: return `{nodes: [focus_only], edges: []}`.

3. **Edge_kind enum extension** in `ontokit/schemas/graph.py` (and mirror in `lib/graph/types.ts`):
   ```python
   GraphEdgeType = Literal[
       "subClassOf", "equivalentClass", "disjointWith", "seeAlso",  # existing
       "domain", "range", "subPropertyOf",                            # property edges
       "rdfType", "sameAs", "objectProperty",                         # individual edges
   ]
   ```

4. **Deprecation pattern** (D-05): keep `/classes/graph` as a delegating shim:
   ```python
   @router.get("/{project_id}/ontology/classes/graph", deprecated=True)
   async def get_ontology_class_graph_deprecated(...):
       """DEPRECATED. Use /entity-graph?focus_iri=...&focus_type=class instead."""
       return await get_ontology_entity_graph(..., focus_iri=class_iri, focus_type="class")
   ```
   FastAPI `deprecated=True` flags it in OpenAPI/Swagger. Suggested removal window: 1 release cycle (matches v0.5.0→v0.6.0 of `pyproject.toml`).

5. **Object-property enumeration for individuals (no cap, per D-07):** Iterate all triples `(focus_uri, p, o)` where `p` is in the set of object properties (`graph.objects(p, RDF.type) ∋ OWL.ObjectProperty`). Each `(p, o)` pair becomes an edge with `edge_kind="objectProperty"` and `label=local_name(p)`. ELK absorbs density.

### Q7. Lineage-based edge coloring extension
UI-SPEC §Color (lines 104-122) locks the palette. Mapping rationale:

| edge_kind | Stroke | Dash | Existing palette parallel |
|-----------|--------|------|---------------------------|
| `domain` | slate-400 | solid | Mirrors `subClassOf` (structural anchor) |
| `range` | slate-400 | `4 2` dashed | Symmetric to domain, dashed for direction |
| `subPropertyOf` | slate-500 | solid | Darker slate than `subClassOf` to visually distinguish two hierarchies on screen |
| `rdfType` | primary-500 (blue) | solid | Most semantically strong assertion in individual graphs — accent blue |
| `sameAs` | purple-500 | `5 3` | Same family as `seeAlso` (which UI-SPEC slightly tweaks from existing gray-400 to purple `#8b5cf6` per PR #88's `OntologyEdge.tsx`) |
| `objectProperty` | zinc-500 | solid | Neutral — keeps focus on rdfType accent |

Implementation: extend `edgeTypeConfig` Record at `components/graph/OntologyEdge.tsx:25-50`. Add 6 new entries following the same shape (`{stroke, strokeDasharray?, label, markerEnd?}`).

Marker-end usage: `subClassOf`, `subPropertyOf`, `domain`, `range`, `rdfType`, `objectProperty` get `markerEnd: "url(#arrow-slate)"` (existing). Symmetric edges (`equivalentClass`, `disjointWith`, `seeAlso`, `sameAs`) are markerless. Stroke widths: 1.5 for hierarchical/semantic-primary edges (`subClassOf`, `subPropertyOf`, `rdfType`), 1 for others.

### Q8. Removing Tree|Source mode strip from DeveloperEditorLayout
Current state (`DeveloperEditorLayout.tsx:246-417`):
- `viewMode` state at line 246: `useState<DeveloperView>("tree")`.
- Mode strip rendered at lines 374-417 (`Tree | Source | Graph` tab buttons).
- `viewMode === "source"`: renders full-pane `OntologySourceEditor` (lines 601-647).
- `viewMode === "graph"`: renders full-pane `OntologyGraph` (lines 421-434).
- `viewMode === "tree"`: renders the 2-pane tree-and-detail layout (lines 435-600).

Consumers of `viewMode`:
- `handleViewModeChange` at line 356-361.
- `handleNavigateToSource` at line 363-369 (navigates from tree → source view).
- Source pre-load on hover at line 342-347.
- `entityNavigationRef` handler at line 264-279 — when `type === "other"`, sets `viewMode="source"` (line 273).

After Phase 17:
- Delete `DeveloperView` type (line 58) and `viewMode` state.
- Delete the entire mode strip (lines 374-417).
- Source moves to right-pane Source tab → `viewMode === "source"` branch (lines 601-647) becomes the body of the Source tab in `SourceTabBody`.
- Graph moves to right-pane Graph tab → `viewMode === "graph"` branch (lines 421-434) renders inside the Graph tab body.
- `handleNavigateToSource` becomes "set activePaneTab to source" (a `setActivePaneTab('source')` call from `selectionStore`).
- `entityNavigationRef` `type === "other"` branch (line 271-274) — needs decision: now that there's no left-pane source mode, untyped entities should set `activePaneTab='source'` AND `setPendingScrollIri`. (Confirm in plan.)

**No `viewMode` state in either store** — `editorMode` (Standard/Developer) is in `editorModeStore`; `viewMode` (Tree/Source/Graph) was local to `DeveloperEditorLayout`. Cleanup is purely component-local.

`StandardEditorLayout.tsx:214` also has a `showGraph: boolean` state that drives the entity-actions Graph button (line 462-471). Phase 17 deletes both the button (R3) and the `showGraph` state — the Graph tab now carries this functionality via `activePaneTab === 'graph'`.

**Source-link removal verification** (R4): grep for `onNavigateToSource` or `View in Source` — confirmed in `ClassDetailPanel.tsx:608-617`. The plan task should also grep `PropertyDetailPanel.tsx` and `IndividualDetailPanel.tsx` (initial grep was empty — likely those panels haven't yet wired the source link, but the plan task should re-verify before declaring R4 complete). [ASSUMED — needs `git grep` re-verification per Property/Individual panels at plan time]

### Q9. Cross-repo PR coordination
**Project layout:** `~/Coding Projects/ontokit-web` and `~/Coding Projects/ontokit-api` are separate repos with separate `.git`. There's NO shared OpenAPI/typespec source — the frontend types in `lib/api/graph.ts` and `lib/graph/types.ts` are hand-mirrored from `ontokit/schemas/graph.py`. Comment at `ontokit/schemas/graph.py:9` confirms: `# Frontend mirror: GraphNodeType in lib/graph/types.ts`.

**Sequencing (D-08 + SPEC Constraints):**
1. **api branch** opens PR against `catholicos/dev`: extends `build_entity_graph` for property/individual, adds `/entity-graph` route, updates schema, tests.
2. **api PR merges to dev.** API is deployed locally (`http://localhost:8000`) and to staging.
3. **web Phase 17 branch** is cut from `catholicos/dev` AFTER PR #88 (`entity-graph-pr`) lands. Phase 17 web work consumes the new `/entity-graph` endpoint.
4. **web PR merges to dev.** Both repos are aligned.
5. CatholicOS releases v0.5.0 → both repos tag.

**Local dev:** `NEXT_PUBLIC_API_URL=http://localhost:8000` (per `CLAUDE.md` env vars). The web app points at whatever local api is running. So during Phase 17 development, the developer must:
- Run local `ontokit-api` from the api branch (or post-merge dev).
- Web must consume the new endpoints from that local api.
- Staging deploy waits until both PRs land.

**No feature flag** (D-08) — if api isn't deployed, web breaks. This is intentional — coordinated release.

### Q10. AI-driven Chrome DevTools MCP smoke test
SPEC mandates AI smoke test across Standard + Developer × light + dark, walking R1, R5, R6, R7, R8, R9. There's **no prior phase precedent** for this format — phases 14, 15, 16 used Vitest unit tests + manual UAT only. Phase 17 establishes the smoke-test convention.

**Recommended structure:**
- File: `.planning/phases/17-graph-as-entity-scoped-tab-in-detail-pane/17-SMOKE-TEST.md`
- Sections: Setup (start dev server, navigate to test ontology), Scenarios (one per requirement, with explicit MCP commands: `navigate_page`, `click`, `take_screenshot`, `read_screenshot`, `wait_for`), Pass/Fail criteria per scenario, Regression report.
- Run order per scenario: Light → Dark, Standard → Developer, repeat for each of R1, R5, R6, R7, R8, R9 = 4 modes × 6 reqs = 24 captures.
- Output: a single SMOKE-TEST-REPORT.md with screenshot file paths + pass/fail flags + any regression notes.
- Cleanup: delete screenshot files after report assembled (per global CLAUDE.md "Clean up screenshot files after reading them").

**Key MCP calls:**
```
navigate_page url=http://localhost:3000/projects/{test-project-id}/editor?classIri=...
wait_for selector="[role='tablist']"
take_screenshot path="$HOME/phase17-r1-light-standard.png"
click selector="[role='tab'][aria-controls='pane-panel-graph']"
wait_for selector=".react-flow__renderer"
take_screenshot ...
```

[ASSUMED — exact MCP API surface (`navigate_page`, `take_screenshot`, etc.) is per global CLAUDE.md. The plan task should verify available chrome-devtools MCP tools via `/mcp` listing before scripting.]

### Q11. Test surface — Vitest unit tests
**Existing patterns** (verified):
- `__tests__/components/editor/standard/EntityTabBar.test.tsx`: render + className assertions + `fireEvent.click` + `vi.fn()` mock for callbacks. Uses `screen.getByText`. No snapshots — behavioral tests.
- `__tests__/lib/stores/selectionStore.test.ts`: direct Zustand store testing.
- `__tests__/components/graph/EntityGraphModal.test.tsx` (PR #88): focus-trap + Esc-handler tests using `fireEvent.keyDown(document, {key: 'Escape'})`.

**New tests needed:**

| File | Coverage |
|------|----------|
| `__tests__/components/editor/PaneTabStrip.test.tsx` | Renders all tabs, ARIA roles correct, click → onTabChange, keyboard nav (Arrow/Home/End), focus-visible ring, hides Source tab when `tabs` array doesn't include it |
| `__tests__/components/editor/SourceTabBody.test.tsx` | Renders snippet + line comment, "Open full source" click → calls onOpen, "Copy snippet" click → clipboard mock, empty state when `extractEntitySnippet` returns null |
| `__tests__/components/editor/FullSourceOverlay.test.tsx` | Modal renders at modal size, headerExtras Maximize click → onMaximize, takeover Restore click → onRestore, scroll-to-line on selection change |
| `__tests__/lib/hooks/useFullSourceOverlay.test.tsx` | open() / close() / maximize() / restore() state transitions; bounce maximize→restore→maximize keeps `cameFromModal=true`; close() resets cameFromModal |
| `__tests__/lib/stores/selectionStore.test.ts` (extend) | `activePaneTab` field defaults, `setActivePaneTab` updates; `useEffectiveTab` returns 'detail' when source+standard, else echoes |
| `__tests__/components/graph/OntologyEdge.test.tsx` (extend) | All 10 edge_kind values render with correct stroke/dasharray/label |
| `__tests__/lib/api/graph.test.ts` (extend, PR #88 base) | `getEntityGraph(focusIri, focusType)` calls `/entity-graph` with correct params |
| `__tests__/lib/ontology/extractEntitySnippet.test.ts` | Class block, property block, individual block; not-found returns null; preserves continuation lines |

Mock strategy:
- `useSelectionStore` — mocked via `vi.mock("@/lib/stores/selectionStore")` returning a stable hook stub. Existing pattern in test files.
- IRI Web Worker — pass `prebuiltIriIndex` Map directly to component props (existing pattern at `DeveloperEditorLayout.tsx:641`).
- Monaco editor — mock via `vi.mock("@monaco-editor/react")` returning a stub `<textarea>`. Existing tests likely already do this for Source view tests.

**Project's stance:** Behavioral over snapshot, per Vitest 4 + RTL. No snapshot tests in observed files.

### Q12. Bottom-border alignment constraint
The two strips must share identical:
- Vertical padding (`py-2` = 8px)
- Text size (`text-xs` = 12px)
- Font weight (`font-medium`)
- Border (`border-b border-slate-200 dark:border-slate-700`)

`EntityTabBar.tsx:21-37` has `flex-1 px-3 py-2 text-xs font-medium`. `PaneTabStrip` MUST use the same. Total height calculation: `12px (text) * 1.4 (line-height) + 16px (padding 8+8) = 32.8px`, rounded to 33px. The `border-b` adds 1px to both sides, so when the two strips sit at the same vertical offset (both at top of their respective panes, immediately below any project header), their bottom borders fall at the same Y coordinate.

**Verification:** DevTools MCP screenshot of full editor in both views; measure pixel Y of the two bottom borders. AI smoke test should include this check (an explicit assertion in R1). Tolerance: ±0 pixels (D-15 wording: "MUST align horizontally").

## Common Pitfalls

### Pitfall 1: Monaco scroll loss on Maximize/Restore
**What goes wrong:** User opens full-source modal → scrolls to a deep line → clicks Maximize → scrolls again → clicks Restore. If the modal Monaco instance was destroyed when Maximize swapped layouts, all scroll positions are reset to top.
**Why it happens:** Naive implementations conditionally render `<Monaco/>` inside two different containers (`<Modal>` vs `<TakeoverContainer>`); React unmounts and remounts.
**How to avoid:** D-11 — single Monaco instance lives in `FullSourceOverlay` body. Maximize/Restore only toggles `<html data-overlay-takeover="true">` attribute, which CSS-hides the surrounding panes. The Monaco container's parent (`EntityModal`) re-sizes via `position: fixed; inset: 0` rule but never unmounts the editor.
**Warning signs:** Scroll bar jumps to top after Maximize → Restore → Maximize bounce.

### Pitfall 2: findBlock continuation-line trap
**What goes wrong:** A regex matching `^prefix:LocalName` finds an *object reference* on a continuation line (e.g., `    rdfs:seeAlso prefix:LocalName ;`) and returns it as the subject definition.
**Why it happens:** The existing `findBlock` already guards against this at lines 207-211, 233-235, 265-268: `prevLine.endsWith(";")||","` rejects continuation lines.
**How to avoid:** Don't write a new regex. Use the existing `findBlock`. If you must write a new matcher (e.g., for a non-Turtle source), preserve the continuation-line check.
**Warning signs:** `extractEntitySnippet` returns a snippet that starts mid-block (e.g., `prefix:LocalName ;` with no `a owl:Property` or `a owl:NamedIndividual`).

### Pitfall 3: activePaneTab mutation on mode change
**What goes wrong:** User has Source tab active in Developer → switches to Standard → switches back to Developer → expects Source tab restored, but lands on Detail because the store value was overwritten when Standard view "fell back" to Detail.
**Why it happens:** Implementer writes `if (mode === 'standard' && activePaneTab === 'source') setActivePaneTab('detail')` — mutates the store.
**How to avoid:** D-15 — never mutate the store on mode change. Add `useEffectiveTab(editorMode)` derivation that returns `activePaneTab === 'source' && editorMode === 'standard' ? 'detail' : activePaneTab`. Components consume `useEffectiveTab`, not `activePaneTab` directly.
**Warning signs:** Switching modes while Source tab active flips it permanently.

### Pitfall 4: Cross-repo merge order violation
**What goes wrong:** Web PR #88 merges to dev, Phase 17 web branch is cut, Phase 17 web PR is opened — but the api branch hasn't merged yet. Phase 17 web tries to call `/entity-graph` and gets 404.
**Why it happens:** Optimistic parallel development.
**How to avoid:** D-08 — strict sequence: api branch → dev → web branch → dev. The plan should explicitly state "DO NOT cut Phase 17 web branch until api PR is merged" and ideally include a check task that confirms the api version on `dev`.
**Warning signs:** First api call from dev environment returns 404 with route-not-found.

### Pitfall 5: Annotation-property graph empty-state miss
**What goes wrong:** Backend returns `{nodes: [focus_only], edges: []}` for an annotation property. Frontend's existing renderer shows a single isolated node with no labels, looks broken.
**Why it happens:** Frontend doesn't detect the "focus-only" pattern.
**How to avoid:** SPEC R11 + UI-SPEC empty-state copy (`No relationships to display`). Detection: `nodes.length === 1 && edges.length === 0 && nodes[0].is_focus`. Render the empty-state component (Lucide `Tag` icon + heading + body).
**Warning signs:** Annotation property graph shows just a circle with the entity name and no edges, no message.

### Pitfall 6: Stale `viewMode` references after Developer left-pane mode strip removal
**What goes wrong:** Removing the Tree|Source|Graph mode strip leaves orphan references to `viewMode`, `setViewMode`, `handleViewModeChange`, `DeveloperView` type, `viewMode === "source"` blocks, etc.
**Why it happens:** `DeveloperEditorLayout.tsx` has ~10 sites referencing this state (search for `viewMode` in lines 246, 350-369, 374-417, 421, 435, 601, etc.).
**How to avoid:** Plan task should include an explicit `git grep -n viewMode components/editor/developer/` step in verification.
**Warning signs:** TypeScript errors after deletion ("`viewMode` is not defined"), or runtime errors when entity navigation tries to call removed handlers.

## Code Examples

### Example 1: PaneTabStrip component skeleton
```tsx
// File: components/editor/PaneTabStrip.tsx
"use client";

import { useCallback } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type PaneTab = "detail" | "graph" | "source";

export interface PaneTabDefinition {
  id: PaneTab;
  label: string;
  icon: LucideIcon;
}

interface PaneTabStripProps {
  tabs: PaneTabDefinition[];
  activeTab: PaneTab;
  onTabChange: (tab: PaneTab) => void;
}

export function PaneTabStrip({ tabs, activeTab, onTabChange }: PaneTabStripProps) {
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const idx = tabs.findIndex((t) => t.id === activeTab);
      if (e.key === "ArrowRight") onTabChange(tabs[(idx + 1) % tabs.length].id);
      if (e.key === "ArrowLeft") onTabChange(tabs[(idx - 1 + tabs.length) % tabs.length].id);
      if (e.key === "Home") onTabChange(tabs[0].id);
      if (e.key === "End") onTabChange(tabs[tabs.length - 1].id);
    },
    [tabs, activeTab, onTabChange]
  );

  return (
    <div role="tablist" onKeyDown={handleKeyDown} className="flex border-b border-slate-200 dark:border-slate-700">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            id={`pane-tab-${tab.id}`}
            aria-selected={isActive}
            aria-controls={`pane-panel-${tab.id}`}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50 focus-visible:ring-inset",
              isActive
                ? "border-b-2 border-primary-600 bg-primary-50 text-primary-600 dark:border-primary-400 dark:bg-primary-900/20 dark:text-primary-400"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-300"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
```

### Example 2: useFullSourceOverlay hook
```tsx
// File: lib/hooks/useFullSourceOverlay.ts
"use client";
import { useCallback, useEffect, useState } from "react";

type Size = "closed" | "modal" | "maximized";

export function useFullSourceOverlay() {
  const [state, setState] = useState<{ size: Size; cameFromModal: boolean }>({
    size: "closed",
    cameFromModal: false,
  });

  const open = useCallback(() => setState({ size: "modal", cameFromModal: false }), []);
  const maximize = useCallback(
    () => setState((s) => (s.size === "modal" ? { size: "maximized", cameFromModal: true } : s)),
    []
  );
  const restore = useCallback(
    () => setState((s) => (s.size === "maximized" ? { size: "modal", cameFromModal: true } : s)),
    []
  );
  const close = useCallback(() => setState({ size: "closed", cameFromModal: false }), []);

  // CSS attribute toggle for takeover (D-11)
  useEffect(() => {
    if (state.size === "maximized") {
      document.documentElement.dataset.overlayTakeover = "true";
    } else {
      delete document.documentElement.dataset.overlayTakeover;
    }
    return () => {
      delete document.documentElement.dataset.overlayTakeover;
    };
  }, [state.size]);

  return {
    isOpen: state.size !== "closed",
    size: state.size,
    cameFromModal: state.cameFromModal,
    open,
    close,
    maximize,
    restore,
  };
}
```

### Example 3: selectionStore extension with activePaneTab + useEffectiveTab
```tsx
// File: lib/stores/selectionStore.ts (modified)
import { create } from "zustand";
import type { SelectableEntityType } from "@/lib/utils/selectionUrl";
import type { EditorMode } from "@/lib/stores/editorModeStore";

export type PaneTab = "detail" | "graph" | "source";
export type ProjectViewMode = "viewer" | "editor";

interface SelectionState {
  iri: string | null;
  type: SelectableEntityType | null;
  mode: ProjectViewMode | null;
  activePaneTab: PaneTab;  // default "detail" per SPEC R8
  setSelection: (iri: string | null, type: SelectableEntityType | null) => void;
  setMode: (mode: ProjectViewMode) => void;
  setActivePaneTab: (tab: PaneTab) => void;
  clear: () => void;
}

export const useSelectionStore = create<SelectionState>()((set) => ({
  iri: null,
  type: null,
  mode: null,
  activePaneTab: "detail",
  setSelection: (iri, type) => set({ iri, type }),
  setMode: (mode) => set({ mode }),
  setActivePaneTab: (tab) => set({ activePaneTab: tab }),
  clear: () => set({ iri: null, type: null, mode: null, activePaneTab: "detail" }),
}));

/** Derived effective tab — D-15: never mutates the store */
export function useEffectiveTab(editorMode: EditorMode): PaneTab {
  const stored = useSelectionStore((s) => s.activePaneTab);
  return stored === "source" && editorMode === "standard" ? "detail" : stored;
}
```

## Runtime State Inventory

> Phase 17 is a code/component refactor — minimal runtime state to migrate.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — selectionStore is non-persist (already verified at `lib/stores/selectionStore.ts:31`) | None |
| Live service config | None — no external service stores Phase-17 state | None |
| OS-registered state | None | None |
| Secrets/env vars | `NEXT_PUBLIC_API_URL` continues to point at the same backend; new endpoint path consumed via existing client | None |
| Build artifacts | None — no compiled artifacts encode the old endpoint path | None |

The one cross-repo coordination is the API endpoint URL (`/classes/graph` → `/entity-graph`). D-05 mitigates by keeping `/classes/graph` as a delegating shim during the deprecation window, so even an out-of-order frontend deploy doesn't break.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Frontend dev/build | ✓ | (project default) | — |
| Python 3.13 | ontokit-api | ✓ | 3.13 (per `.venv/lib/python3.13/`) | — |
| @xyflow/react | Graph rendering | ✓ | 12.10.1 | — |
| elkjs | Graph layout | ✓ | 0.11.0 | — |
| @radix-ui/react-dialog | Modal primitive | ✓ | 1.1.0 | — |
| RDFLib (Python) | Backend BFS | ✓ (in `.venv`) | (existing) | — |
| Vitest 4 | Frontend tests | ✓ | 4.0.18 | — |
| pytest | Backend tests | ✓ (Phase 11+ established) | (existing) | — |
| MCP chrome-devtools | AI smoke test | Per session | — | Skip smoke test, run manual UAT only (NOT acceptable per SPEC) |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** MCP chrome-devtools must be available at execution time. If the MCP server isn't responding, the AI smoke test step blocks — escalate to user.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework (web) | Vitest 4.0.18 + @testing-library/react |
| Framework (api) | pytest |
| Config file (web) | `vitest.config.ts` |
| Config file (api) | `pyproject.toml` (project conventions from Phase 11+) |
| Quick run command (web) | `npm run test -- <pattern> --run` |
| Quick run command (api) | `cd ontokit-api && pytest tests/unit/test_entity_graph.py -k <pattern> -x` |
| Full suite command (web) | `npm run test` |
| Full suite command (api) | `cd ontokit-api && pytest` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| R1 | TabStrip renders + ARIA | unit | `npm run test -- PaneTabStrip --run` | ❌ Wave 0 |
| R1 (alignment) | Bottom-border pixel-aligned | smoke (MCP) | manual + screenshot | N/A |
| R2 | Old peer-tab strip absent | unit | `npm run test -- DeveloperEditorLayout --run` | ✅ extend existing |
| R3 | No Graph icon button in entity-actions | unit | `npm run test -- StandardEditorLayout --run` | ✅ extend existing |
| R4 | No `</> Source` link | unit | `npm run test -- ClassDetailPanel PropertyDetailPanel IndividualDetailPanel --run` | ✅ extend existing |
| R5 | Single/double-click semantics preserved | unit | `npm run test -- OntologyGraph --run` | ✅ from PR #88 |
| R6 | activePaneTab persists across selection | unit | `npm run test -- selectionStore --run` | ✅ extend existing |
| R7 | Source tab body renders snippet + toolbar | unit | `npm run test -- SourceTabBody --run` | ❌ Wave 0 |
| R8 | Default tab = Detail on first load | unit | `npm run test -- selectionStore --run` | ✅ extend existing |
| R9 | Modal/Maximize/Restore round-trip | unit | `npm run test -- useFullSourceOverlay EntityModal --run` | ❌ Wave 0 |
| R9 (visual) | CSS takeover hides panes | smoke (MCP) | manual + screenshot | N/A |
| R10 | Auto-jump on selection change | unit | `npm run test -- SourceTabBody FullSourceOverlay --run` | ❌ Wave 0 |
| R11 (api) | Property focus returns domain/range | unit | `cd ontokit-api && pytest tests/unit/test_entity_graph.py::test_property_focus -x` | ✅ extend existing |
| R11 (api) | Individual focus returns rdf:type + obj props | unit | `cd ontokit-api && pytest tests/unit/test_entity_graph.py::test_individual_focus -x` | ✅ extend existing |
| R11 (api) | Annotation property empty-state | unit | `cd ontokit-api && pytest tests/unit/test_entity_graph.py::test_annotation_property_empty -x` | ✅ extend existing |
| R11 (web) | Empty-state UI renders | unit | `npm run test -- OntologyGraph --run` | ✅ extend existing |

### Sampling Rate
- **Per task commit:** Quick run for the modified file only.
- **Per wave merge:** Full Vitest suite (web) + relevant pytest module (api).
- **Phase gate:** `npm run test` + `npm run lint` + `npm run type-check` all green; full pytest suite green; AI smoke test report attached.

### Wave 0 Gaps
- [ ] `__tests__/components/editor/PaneTabStrip.test.tsx` — covers R1
- [ ] `__tests__/components/editor/SourceTabBody.test.tsx` — covers R7, R10
- [ ] `__tests__/components/editor/FullSourceOverlay.test.tsx` — covers R9
- [ ] `__tests__/lib/hooks/useFullSourceOverlay.test.tsx` — covers R9
- [ ] `__tests__/lib/ontology/extractEntitySnippet.test.ts` — covers R7 (snippet extraction logic)
- [ ] `__tests__/components/graph/OntologyEdge.test.tsx` (extend) — covers R11 frontend palette
- [ ] `tests/unit/test_entity_graph.py` (extend) — covers R11 backend (property/individual/annotation)

## Security Domain

> security_enforcement defaults to enabled. Phase 17 is a UI restructure + read-only graph extension — minimal new attack surface.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes (existing) | NextAuth.js v5 + Zitadel — unchanged |
| V3 Session Management | yes (existing) | accessToken via session — unchanged |
| V4 Access Control | yes (existing) | OptionalUser dependency on backend route (line 669); existing canEdit/canSuggest gates on frontend |
| V5 Input Validation | yes | New `focus_iri` + `focus_type` query params on `/entity-graph` — Pydantic validators on api side; Zod or runtime checks not needed (FastAPI handles validation) |
| V6 Cryptography | no (none introduced) | — |

### Known Threat Patterns for {stack}

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| IRI injection in BFS | Tampering | Pass `focus_iri` as URIRef to RDFLib; never interpolate into SPARQL; existing pattern at `ontology.py:395` is safe |
| XSS in entity labels | Tampering | React auto-escapes; `OntologyNode` already renders labels as text content (verified in PR #88) |
| Open redirect via Open-full-source | Spoofing | None — no redirects; full-source overlay reads same project source already loaded |
| DoS via large individual graph (no cap per D-07) | Denial of Service | ELK absorbs density; backend `max_nodes=500` cap on existing endpoint should carry over to `/entity-graph` |
| Information leakage via deprecated route | Disclosure | Delegating shim returns same data; no new disclosure |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Property + Individual detail panels do not currently have a `</> Source` link (initial grep was empty) | Q8, R4 | Plan task missing the deletion — verifier catches in unit test |
| A2 | Chrome DevTools MCP exposes `navigate_page` / `take_screenshot` / `click` / `wait_for` tool names | Q10 | Smoke test script needs adjustment to actual MCP tool surface — discoverable at runtime |
| A3 | Backend deprecation window for `/classes/graph` is 1 release cycle (v0.5→v0.6) | Q6 | If users depend on the old route directly (unlikely — only ontokit-web uses it), removal too fast — extend window |
| A4 | Phase 17 web branch can be cut from `dev` after PR #88 lands but before the api PR lands, IF only TabStrip + selection store + EntityModal rename + Source tab work happens first (graph wiring waits) | Q9 | Parallel work harder to coordinate; safer is strict sequential per D-08 |
| A5 | `useGraphData` (PR #88 version) accepts a `focusType` parameter pass-through OR can be extended without breaking PR #88's tests | Q6, Q11 | Plan must inspect PR #88's hook contract carefully; may need a v2 hook |

**If A1–A5 turn out wrong:** none cascade into a blocker — they shift task boundaries within Phase 17, not requirements.

## Open Questions

1. **Are `</> Source` links present in `PropertyDetailPanel.tsx` and `IndividualDetailPanel.tsx` today?**
   - What we know: `ClassDetailPanel.tsx:608-617` has the link; an initial grep returned no results in the other two panels.
   - What's unclear: Whether the grep returned empty because (a) the link is absent or (b) it's named differently (e.g., `Show in source`, `View source`).
   - Recommendation: Plan task #1 should re-grep with broader patterns (`Source`, `onNavigateToSource`, `View in`) before declaring R4 complete on those two panels.

2. **What's the exact prop contract of `useGraphData` in PR #88?**
   - What we know: PR #88 rewrites `useGraphData` substantially (from 345 lines client-side BFS to a server-call hook); current `dev` HEAD has the old version.
   - What's unclear: Whether the new hook signature accepts `focusType` natively or needs extension.
   - Recommendation: Phase 17 plan should base its hook-modification task off PR #88's exact code, not the current dev version. Inspect via `git show entity-graph-pr:lib/hooks/useGraphData.ts` at plan time.

3. **What's the deprecation timeline for `/classes/graph`?**
   - What we know: D-05 says "one release", but doesn't specify which release pair.
   - What's unclear: v0.5 → v0.6 vs v0.5 → v0.7.
   - Recommendation: Confirm with project maintainer (Damien) before deletion task.

4. **Should `useEffectiveTab` live in `selectionStore.ts` (per Code Example 3) or as a separate hook file?**
   - What we know: Both patterns work; no project precedent for derived selectors as separate hooks.
   - What's unclear: Naming convention preference.
   - Recommendation: Place in `selectionStore.ts` (single import site, easier to find).

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Client-side BFS via repeated `getClassDetail` calls | Server-side BFS via `/classes/graph` endpoint | PR #88 (entity-graph-pr branch) | Phase 17 builds on the server-side approach; old `useGraphData` is irrelevant |
| Class-only graph | Class + Property + Individual graph with `focus_type` discriminator | Phase 17 (this phase) | New `/entity-graph` route + `edge_kind` enum extension |
| Graph as a peer-tab in Developer / icon button in Standard | Graph as right-pane tab in both views | Phase 17 (this phase) | Major UX restructure; sketch winners 001-D, 002-D, 003 |
| Source as left-pane mode + entity-actions link | Source as Developer-only third right-pane tab + Modal/Maximize round-trip | Phase 17 (this phase) | Source migrates fully into the right pane; "Open full source" is the only path to the full file |

**Deprecated/outdated:**
- `/api/v1/projects/{id}/ontology/classes/graph` route: kept as delegating shim in Phase 17, removed in v0.6+ (per A3).
- `DeveloperEditorLayout.viewMode` state (`Tree | Source | Graph`): removed entirely in Phase 17.
- `StandardEditorLayout.showGraph` state: removed in Phase 17.

## Sources

### Primary (HIGH confidence)
- `lib/ontology/turtleUtils.ts:178-277` — `findBlock` source — type-agnostic; continuation-line guards verified
- `lib/editor/indexWorker.ts:42-144` — Web Worker IRI index — public API + IriPosition shape
- `lib/stores/selectionStore.ts:1-39` — current Zustand store shape
- `components/editor/standard/EntityTabBar.tsx:1-39` — canonical tab pattern (parity precedent)
- `components/editor/developer/DeveloperEditorLayout.tsx:246, 374-417, 601-647` — current Tree|Source|Graph mode strip + Source view; consumers of `viewMode` state
- `components/editor/standard/StandardEditorLayout.tsx:214, 462-471` — `showGraph` state + Graph icon button (to be removed)
- `components/editor/ClassDetailPanel.tsx:608-617` — `</> Source` link (to be removed)
- `git show entity-graph-pr:components/graph/EntityGraphModal.tsx` — current modal shape (to be renamed/generalized)
- `git show entity-graph-pr:lib/api/graph.ts` — current graph API client (to be refactored for `/entity-graph`)
- `git show entity-graph-pr:lib/graph/types.ts` — `GraphNodeType` + `GraphEdgeType` (to be extended)
- `ontokit-api/ontokit/api/routes/projects.py:660-701` — current `/classes/graph` route (to deprecate)
- `ontokit-api/ontokit/services/ontology.py:365-455` — `build_entity_graph` BFS + `_classify_node` (to be extended)
- `ontokit-api/ontokit/schemas/graph.py:1-58` — Pydantic schema (to be extended)
- `__tests__/components/editor/standard/EntityTabBar.test.tsx` — Vitest test pattern precedent
- `package.json` (verified 2026-05-02) — versions of all stack libraries
- `.planning/phases/17-graph-as-entity-scoped-tab-in-detail-pane/17-SPEC.md` — locked requirements
- `.planning/phases/17-graph-as-entity-scoped-tab-in-detail-pane/17-CONTEXT.md` — locked decisions D-01 through D-16
- `.planning/phases/17-graph-as-entity-scoped-tab-in-detail-pane/17-UI-SPEC.md` — locked visual contract
- `.planning/notes/graph-as-entity-pane.md` — 11-decision design contract

### Secondary (MEDIUM confidence)
- WAI-ARIA Authoring Practices Guide — Tabs pattern (https://www.w3.org/WAI/ARIA/apg/patterns/tabs/) — keyboard nav specification
- Monaco Editor TypeScript definitions — `IStandaloneCodeEditor` view-state preservation across DOM hide/show

### Tertiary (LOW confidence)
- Chrome DevTools MCP tool surface — assumed `navigate_page`/`take_screenshot`/`click`/`wait_for` from global CLAUDE.md description; runtime verification needed before scripting smoke test (A2).

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions verified from `package.json`; existing patterns observed in repo
- Architecture: HIGH — every primitive already exists in repo or PR #88; Phase 17 is integration work
- Pitfalls: HIGH — landmines documented from existing code (continuation-line guard, Monaco scroll preservation, store mutation traps)
- Backend changes: HIGH — handler at known location, BFS code already classifies properties/individuals, schema extension is mechanical
- Cross-repo timing: MEDIUM — D-08 prescribes sequential merge but real-world parallel work may compress; A4 flags the risk
- AI smoke test: LOW — no prior phase precedent for format; A2 flags MCP surface assumption

**Research date:** 2026-05-02
**Valid until:** 2026-06-01 (30 days for stable; cross-repo coordination demands re-validation if either repo's `dev` advances significantly before Phase 17 kickoff)
