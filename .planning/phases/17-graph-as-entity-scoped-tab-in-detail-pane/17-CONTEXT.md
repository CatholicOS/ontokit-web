# Phase 17: Graph as Entity-Scoped Tab in Detail Pane - Context

**Gathered:** 2026-05-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Restructure the right-side detail pane to host a `Detail | Graph[ | Source]` tab strip across both Standard and Developer views, removing scattered graph/source affordances. Source migrates from left-pane mode strip (Developer) and entity-actions link (both views) into a Developer-only third right-pane tab. Source tab opens entity-scoped Turtle snippets with a Modal ⇄ Maximize round-trip for full-source viewing. Backend gains property + individual graph support so all three entity types render meaningful neighborhoods.

</domain>

<spec_lock>
## Requirements (locked via SPEC.md)

**11 requirements are locked.** See `17-SPEC.md` for full requirements, boundaries, and acceptance criteria.

Downstream agents MUST read `17-SPEC.md` before planning or implementing. Requirements are not duplicated here.

**In scope (from SPEC.md):**
- New `<TabStrip>` component (shared across both views, `flex: 1 1 0`, accepts `tabs` prop)
- New `activePaneTab` field + setter in `useSelectionStore`
- Standard view layout integration (replace Graph icon button + `</> Source` link with the tab strip)
- Developer view layout integration (remove Tree | Source mode strip + Graph peer-tab + `</> Source` link; add right-pane 3-tab strip with Source tab)
- Source tab body: entity-scoped Turtle snippet + `↗ Open full source` + `⎘ Copy snippet` + line-number comment
- Modal ⇄ Maximize ⇄ Restore round-trip for `↗ Open full source` (reuses `EntityGraphModal` shell)
- Backend (`ontokit-api`): extend entity-graph endpoint to handle property and individual focus IRIs
- Property graph rendering — domain classes, range classes, parent properties, see-also (full content, not WebProtege empty-island)
- Individual graph rendering — class assertions, object property values, see-also, sameAs
- Annotation property empty-state copy
- Unit tests (Vitest) for new components and store extensions
- AI-driven smoke testing via Chrome DevTools MCP across Standard + Developer × light + dark modes
- Manual UAT covering all 11 requirements

**Out of scope (from SPEC.md):**
- Drag-to-reparent in the graph
- Per-user / per-project default tab preference
- Graph for properties of properties (rdf:Property meta-level)
- Graph export to SVG/PNG for screenshots
- Source view editing UX changes
- Two-way navigation from full-source line clicks back to tree selection
- New Playwright e2e tests
- Cosmetic refresh of `EntityGraphModal`

</spec_lock>

<decisions>
## Implementation Decisions

### Source snippet extraction (right-pane Source tab)
- **D-01:** Snippet computed **frontend-only** from already-loaded full source. Generalize `findBlock` in `lib/ontology/turtleClassUpdater.ts` to handle property + individual subject patterns (currently class-only). Use the Web Worker IRI index from `lib/editor/indexWorker.ts` for the start line number.
- **D-02:** When the extractor cannot locate the entity (e.g., entity defined in an imported ontology, malformed source), render an **empty-state body**: `"Source not available for this entity — it may be defined in an imported ontology."` Toolbar still shows `↗ Open full source` so the user can verify in the full file.
- **D-03:** Line-number comment format is **start line only**: `# File: ontology.ttl, line N` (matches SPEC Requirement 7 literal). The full-source modal handles range navigation by scrolling.
- **D-04:** Memoize snippet via `useMemo((sourceText, iri) => extract(...))` — extraction is regex over potentially-large Turtle (50k+ lines). Cache invalidates naturally on source reload or selection change.

### Backend endpoint shape (Requirement 11)
- **D-05:** Introduce a single new endpoint `GET /api/v1/projects/{id}/ontology/entity-graph?focus_iri=...&focus_type=class|property|individual` and **deprecate `/classes/graph`** during a one-release transition window (it delegates internally to the new endpoint). Frontend `lib/api/graph.ts` exposes one method `graphApi.getEntityGraph(focusIri, focusType?)`.
- **D-06:** Response uses **single `edges[]` array with a labelled `edge_kind` enum** — `{ subClassOf, equivalentClass, disjointWith, seeAlso, domain, range, subPropertyOf, rdfType, sameAs, objectProperty }`. Frontend renderer maps `edge_kind` → visual treatment in `OntologyEdge.tsx`. One schema across class/property/individual contexts.
- **D-07:** **No cap on object-property values for individuals in v1** — BFS surfaces every `(?indiv ?p ?other)` assertion. ELK layout absorbs density. Configurable depth/cap is deferred to v0.6+.
- **D-08:** **Sequential cross-repo merge order** — `ontokit-api` PR (entity-graph property+individual) lands on `dev` first; Phase 17 web branch is cut from `dev` after the api merge. **No feature gate, no try/catch fallback.** Web work for tab strip + Source tab can begin in parallel before api merges (those don't depend on the new endpoint), but property/individual graph wiring is gated on the api merge.

### Modal shell extension (Requirement 9 round-trip)
- **D-09:** **Rename `EntityGraphModal` → `EntityModal`** as part of Phase 17. Props: `{ isOpen, onClose, children, headerExtras?: ReactNode, size?: 'modal' | 'maximized', onMaximize?, onRestore? }`. Each consumer (graph use-case, full-source use-case) renders its own body as `children` and supplies `headerExtras` for size-control buttons. Modal mechanics (backdrop, sizing, dismissal) live in the shell. PR #88's existing graph usage migrates to the renamed component as the same PR.
- **D-10:** Round-trip state (`cameFromModal: boolean`, `size: 'closed' | 'modal' | 'maximized'`) lives in **local `useState` in the Source-tab consumer** via a `useFullSourceOverlay()` hook. Modal shell stays state-light and use-case-agnostic. `Restore` button only renders when `cameFromModal === true`.
- **D-11:** Maximized takeover is implemented by **CSS toggling on the layout root** (`data-overlay-takeover` attribute → `.editor-tree { display: none }` etc.) — **NOT** by unmounting/remounting components. This preserves Monaco scroll position across `Maximize → Restore → Maximize` round-trips (SPEC Decision 10 mandates "scroll preserved").
- **D-12:** **Esc / click-outside / ✕ all dismiss the overlay fully**, regardless of size. `Restore` is the only path back from maximized → modal. Matches SPEC Requirement 9 acceptance literal: "Press Esc → returns to Source tab" (from either size).

### activePaneTab persistence + fallback
- **D-13:** `activePaneTab: 'detail' | 'graph' | 'source' | null` is added to **`useSelectionStore`** (per SPEC Requirement 6 literal — "useSelectionStore gains an activePaneTab field"). Selection-related state stays colocated.
- **D-14:** **Session-only persistence** — Zustand non-persist (selectionStore is already non-persist). Page reload starts on Detail. Matches SPEC Requirement 8 literal: "first entity opened in a NEW SESSION lands on Detail."
- **D-15:** **Derived fallback at render** — components consume `useEffectiveTab(editorMode)` which returns `(activePaneTab === 'source' && editorMode === 'standard') ? 'detail' : activePaneTab`. The store value is **never mutated** by mode change. User returning to Developer view restores their Source tab preference. Most graceful fallback semantics.
- **D-16:** **No URL deep-linking** for the active tab — tab is session state, not URL state. URL stays focused on entity (`?classIri=...`, `?propertyIri=...`, `?individualIri=...`). Deep-linkable tabs deferred to v0.6+ backlog.

### Claude's Discretion
- TabStrip component file location, internal markup, focus-ring details, and prop naming beyond the `tabs` array contract — pick whatever lines up with existing patterns in `components/editor/`.
- Edge color/stroke specifics for new `edge_kind` values (`domain`, `range`, `subPropertyOf`, `sameAs`, `rdfType`, `objectProperty`) — coordinate with existing `OntologyEdge.tsx` palette; lineage-coloring philosophy from MEMORY (focus=blue, root=red) extends naturally.
- AI smoke-test report file format and location within the phase directory — choose whatever makes verification re-runs simple.
- Annotation-property empty-state copy wording (SPEC gives a placeholder; pick the final user-facing string).
- Deprecation window length for `/classes/graph` (one release / two releases) — coordinate with api repo conventions.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase artifacts (locked requirements + design contract)
- `.planning/phases/17-graph-as-entity-scoped-tab-in-detail-pane/17-SPEC.md` — Locked requirements, boundaries, acceptance criteria. **MUST read before planning.**
- `.planning/notes/graph-as-entity-pane.md` — 11-decision design contract (placement, click semantics, persistence, modal terminology). Anchors all UX decisions in this phase.
- `.planning/sketches/001-tab-strip-language/index.html` — Tab strip variant winner (D: above-header, icon + sentence-case label).
- `.planning/sketches/002-standard-view-layout/index.html` — Standard view 50/50 tab layout (winner D: compact, full-width).
- `.planning/sketches/003-developer-view-and-modal/index.html` — Developer view 33/33/33 + Source-as-third-tab restructure.
- `.planning/sketches/004-open-full-source/index.html` — Modal ⇄ Maximize round-trip (winner C).

### Roadmap context
- `.planning/ROADMAP.md` §"Phase 17: Graph as Entity-Scoped Tab in Detail Pane" — phase scope, 7 success criteria, UI hint flag.
- `.planning/REQUIREMENTS.md` — milestone-level (v0.5.0) requirements that frame Phase 17's role.
- `.planning/PROJECT.md` — project core value (collaborative SME ontology editing) for downstream alignment.

### Reusable code (frontend)
- `lib/ontology/turtleClassUpdater.ts` — `findBlock` helper (continuation-line aware) — **generalize for property + individual subjects** in this phase.
- `lib/editor/indexWorker.ts` — Web Worker IRI index — provides start line numbers per IRI for snippet `# File: ... line N` comment.
- `lib/stores/selectionStore.ts` — extend with `activePaneTab` field + setter; non-persist (session-only).
- `lib/api/graph.ts` — frontend client — refactor `getEntityGraph()` to call new `/entity-graph` endpoint with `focus_type`.
- `components/graph/OntologyGraph.tsx`, `OntologyEdge.tsx`, `OntologyNode.tsx` — extend to handle property/individual focus + new `edge_kind` values.

### Reusable code (modal shell)
- `components/graph/EntityGraphModal.tsx` (lands with PR #88) — **rename to `EntityModal`** in this phase; generalize props per D-09.

### Cross-repo
- `ontokit-api` PR #37 (`entity-graph-endpoint`) — class-only graph BFS handler; this phase extends to property + individual focus and renames the route to `/entity-graph` with `focus_type` discriminator.
- `ontokit-web` PR #88 (`entity-graph-pr`) — **must merge to dev BEFORE Phase 17 web branch is cut.**

### Memory (carry-forward patterns)
- MEMORY.md `editorModeStore` pattern (localStorage persist with `useThemeSync` hook) — referenced for **contrast** with D-14 (we explicitly do NOT use this pattern for activePaneTab).
- MEMORY.md `findBlock` continuation-line behavior — known landmine: `;`/`,` on prev line means object reference, not subject definition. Generalization to property/individual MUST preserve this guard.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`findBlock` (`lib/ontology/turtleClassUpdater.ts`)** — extracts a class block from full Turtle source by IRI; continuation-line aware. Generalize to accept any subject pattern (class IRI, property IRI, individual IRI) → unified snippet extraction for the Source tab.
- **Web Worker IRI index (`lib/editor/indexWorker.ts`)** — already maps IRI → line number for lint diagnostics. Reuse to populate the `# File: ontology.ttl, line N` comment without re-parsing source.
- **`useSelectionStore` (`lib/stores/selectionStore.ts`)** — current shape `{ iri, type, mode }`, non-persist Zustand. Extend with `activePaneTab` to maintain locality of selection-related state per SPEC Requirement 6.
- **`graphApi.getEntityGraph()` (`lib/api/graph.ts`)** — class-only today; refactor to accept `focus_type` and call `/entity-graph` instead of `/classes/graph`.
- **`OntologyEdge.tsx`** — currently handles 4 edge types (lineage-coloring); extend palette for new `edge_kind` enum values from D-06.
- **`EntityGraphModal.tsx`** (PR #88) — modal shell with backdrop, dismissal, sizing — rename + generalize per D-09.
- **`useThemeSync` pattern (`editorModeStore` + `app/providers.tsx`)** — established root-mounted hook pattern; precedent for any cross-component effects (e.g., the layout-root `data-overlay-takeover` toggle from D-11).

### Established Patterns
- **Source-modify-via-PUT pattern**: writes go through full Turtle PUT (`PUT /source` with full text + commit message), NOT direct REST entity endpoints. Phase 17 is read-only for source — no writes — so this pattern is informational only.
- **Lineage-based graph coloring**: focus=blue, root=red, ancestor=gray, seeAlso=purple. Extend to property/individual edges naturally (e.g., `domain`/`range` borrow ancestor/cousin colors; `sameAs` borrows seeAlso).
- **Continuous editing toggle pattern (`editorModeStore`)** — localStorage persist with sync hook; precedent shows we have the option for activePaneTab if we ever want to upgrade D-14, but SPEC explicitly chose session-only.
- **Resizable panel divider** — established for tree/detail; tab strip lives ABOVE the divider, so width logic stays clean.

### Integration Points
- **Right pane top chrome**: `Class/Property/IndividualDetailPanel` currently render `pip + name + IRI + Copy IRI button + Graph icon button + </> Source button`. Phase 17 inserts `<TabStrip>` ABOVE the entity header and removes the Graph icon button + `</> Source` link from entity-actions.
- **Developer left pane**: `DeveloperEditorLayout` currently renders `Tree | Source` mode strip + `Graph` peer-tab. Phase 17 removes the entire mode strip — left pane becomes tree-only with `Classes | Properties | Individuals` sub-tabs.
- **Layout root for takeover**: app shell needs a `data-overlay-takeover` toggle target. CSS hides `.editor-tree` and `.editor-detail` (or analogous classes) when set; Modal shell controls the attribute via the consumer hook.
- **Cross-repo handshake**: `ontokit-api` ships `/entity-graph` first; web `lib/api/graph.ts` consumes it post-api-merge. Sequential, no fallback (D-08).

</code_context>

<specifics>
## Specific Ideas

- **Modal ⇄ Maximize terminology**: locked to "Maximize" / "Restore" (Windows OS convention) — rejected "Minimize" because in OS land it means send-to-taskbar, wrong mental model. Captured pre-spec in `graph-as-entity-pane.md` §10.
- **Bottom-border alignment**: bottom border of right-pane tab strip MUST align horizontally with bottom border of left-pane `Classes | Properties | Individuals` strip. Pixel constraint — verifier checks via DevTools MCP screenshot. SPEC Constraints + Acceptance Criteria.
- **Property graph "full content"**: must render domain classes, range classes, parent properties, see-also — explicit improvement over WebProtege's empty-island treatment. Acceptance counts a non-empty graph for at least one object property in the test ontology.
- **Annotation property empty-state**: when no domain/range/parent/see-also exists, frontend renders a friendly empty-state (e.g., "No relationships to display for this annotation property"). Backend returns `{nodes: [focus_only], edges: []}`.

</specifics>

<deferred>
## Deferred Ideas

- **Per-user / per-project default tab preference** — global default is Detail (D-14, SPEC Decision 8); per-user persistence is a v0.6.0+ enhancement.
- **URL-deep-linkable active tab** (`?tab=detail|graph|source`) — out of SPEC scope; rejected because it conflicts with session-only persistence semantics. Backlog candidate for "shareable entity views."
- **Configurable graph depth + per-predicate cap** — `?depth=N&max_neighbors=K` knobs on `/entity-graph`. Out of v1; v0.6+ when dense individuals start to render busy.
- **Drag-to-reparent in graph** — Phase 17 keeps graph read-only; manipulation is a separate feature (per SPEC Out-of-scope).
- **Graph export to SVG/PNG** — screenshot/share affordance; separate feature.
- **Two-way navigation from full-source line clicks → tree selection** — the existing source-IRI index supports it; preserve current behavior, don't redesign in this phase.
- **Cosmetic refresh of `EntityModal`** — reuse the visual shell as-is from PR #88; visual polish is a separate small follow-up if it becomes a UAT finding.

</deferred>

---

*Phase: 17-graph-as-entity-scoped-tab-in-detail-pane*
*Context gathered: 2026-05-02*
