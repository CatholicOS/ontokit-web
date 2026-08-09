# Phase 17: Graph as Entity-Scoped Tab in Detail Pane - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-02
**Phase:** 17-graph-as-entity-scoped-tab-in-detail-pane
**Areas discussed:** Source snippet extraction, Backend endpoint shape, Modal shell extension API, activePaneTab persistence

---

## Source snippet extraction

### Q1: Where should the entity-scoped Turtle snippet be computed?

| Option | Description | Selected |
|--------|-------------|----------|
| Frontend, reuse existing assets | Use Web Worker IRI index for line number, generalize findBlock to handle property + individual blocks. Zero new backend work, zero round-trips, works offline. | ✓ |
| New backend endpoint | ontokit-api adds /api/v1/projects/{id}/source/snippet?iri=... returning {text, startLine, endLine}. Cleaner separation. | |
| Hybrid — frontend extract, backend fallback | Frontend extraction by default; backend endpoint as fallback for entities the IRI index can't locate. | |

**User's choice:** Frontend, reuse existing assets
**Notes:** Generalizing findBlock for property/individual subjects is a one-helper, three-pattern change; full source already loaded for editor.

### Q2: How should the snippet handle entities the extractor can't locate?

| Option | Description | Selected |
|--------|-------------|----------|
| Empty state with explanation | "Source not available for this entity — it may be defined in an imported ontology." Toolbar still shows ↗ Open full source. | ✓ |
| Reconstruct from REST API data | Use loaded class/property/individual data to synthesize a Turtle block. | |
| Hide Source tab when unavailable | Conditionally render the tab. | |

**User's choice:** Empty state with explanation
**Notes:** Honest, simple, no fake data. Hide-tab option rejected because it would break Requirement 6 tab persistence.

### Q3: What should the line-number comment show?

| Option | Description | Selected |
|--------|-------------|----------|
| Start line only — # File: ontology.ttl, line 4217 | Matches SPEC Requirement 7's literal example. | ✓ |
| Range — # File: ontology.ttl, lines 4217–4232 | More precise; communicates block size. | |
| No line comment, just snippet | Cleaner aesthetic. | |

**User's choice:** Start line only

### Q4: Should snippet recompute be cached?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — useMemo on (sourceText, iri) | Snippet extraction is regex over potentially-large Turtle (50k+ lines). | ✓ |
| No — recompute on every render | Simpler. | |
| React Query with sourceText + iri as queryKey | Same caching guarantees + integrates with existing patterns. | |

**User's choice:** useMemo on (sourceText, iri)

---

## Backend endpoint shape

### Q1: How should the backend surface property + individual graph support?

| Option | Description | Selected |
|--------|-------------|----------|
| Single /entity-graph endpoint, deprecate /classes/graph | New /api/v1/projects/{id}/ontology/entity-graph?focus_iri=...&focus_type=class\|property\|individual. Old endpoint delegates internally during deprecation window. | ✓ |
| Extend /classes/graph to accept any IRI | Same endpoint, new behavior. | |
| Three sibling endpoints | /classes/graph, /properties/graph, /individuals/graph with shared BFS core. | |

**User's choice:** Single /entity-graph endpoint, deprecate /classes/graph

### Q2: How should the response shape evolve to handle type-specific edge labels?

| Option | Description | Selected |
|--------|-------------|----------|
| Single edges[] with labelled edge_kind enum | { subClassOf, equivalentClass, disjointWith, seeAlso, domain, range, subPropertyOf, rdfType, sameAs, objectProperty } | ✓ |
| Separate response schemas per focus type | /classes returns { parents, children, ... }; /properties returns { domains, ranges, ... } | |
| Generic predicate-labelled edges | Edge { source, target, predicate_iri }. Maximally flexible. | |

**User's choice:** Single edges[] with labelled edge_kind enum

### Q3: How should object-property values rendered for individuals be limited?

| Option | Description | Selected |
|--------|-------------|----------|
| All object property values, no cap | BFS surfaces every (?indiv ?p ?other) assertion. ELK layout absorbs density. | ✓ |
| Cap at top-K per predicate (e.g., 5) | Server limits with sort heuristic. | |
| Configurable depth + cap via query params | ?depth=1&max_neighbors=20 | |

**User's choice:** All object property values, no cap (v1)

### Q4: How should the web frontend be deployable before the api endpoint ships?

| Option | Description | Selected |
|--------|-------------|----------|
| Sequential merges, no feature gate | api PR → dev first; web PR cut from dev after api lands. | ✓ |
| Web ships first with try/catch fallback | property/individual focus calls 404 → empty state. | |
| Feature flag (NEXT_PUBLIC_GRAPH_PROPERTY_INDIVIDUAL=true) | Web ships with flag default-off; flip on once api deploys. | |

**User's choice:** Sequential merges, no feature gate

---

## Modal shell extension API

### Q1: How should EntityGraphModal be generalized?

| Option | Description | Selected |
|--------|-------------|----------|
| Rename to EntityModal; accept children + headerExtras + size props | One place to edit modal mechanics; both consumers render their own body as children. | ✓ |
| Keep EntityGraphModal name; add body + headerExtras render-props | Less churn (PR #88 just landed). | |
| Wrap with new FullSourceModal that composes EntityGraphModal | <FullSourceModal>{...}</FullSourceModal> internally renders <EntityGraphModal>. | |

**User's choice:** Rename to EntityModal

### Q2: Where should the cameFromModal state for the round-trip live?

| Option | Description | Selected |
|--------|-------------|----------|
| Local useState in the FullSource consumer | useFullSourceOverlay() hook in Source tab body tracks { isOpen, size, cameFromModal }. | ✓ |
| Zustand sourceOverlayStore | Global store. | |
| Inside EntityModal shell as internal state | Shell owns size state. | |

**User's choice:** Local useState in the FullSource consumer
**Notes:** Modal shell stays state-light and use-case-agnostic; Restore hidden when !cameFromModal.

### Q3: What components make up the takeover view when Maximized?

| Option | Description | Selected |
|--------|-------------|----------|
| Render shell content full-screen, hide tree+detail via CSS class on layout root | data-overlay-takeover attribute → CSS hides .editor-tree, .editor-detail. Preserves Monaco scroll position across round-trip. | ✓ |
| Mount a separate FullEditorTakeover component, unmount on Restore | Cleanest separation but loses Monaco scroll position. | |
| Use HTML <dialog> Fullscreen API | Native; gets Esc-to-close for free. | |

**User's choice:** CSS toggle on layout root
**Notes:** Critical — SPEC Decision 10 mandates Restore preserves scroll position; only the no-unmount path satisfies this.

### Q4: How should Esc / click-outside / ✕ dismissal be wired?

| Option | Description | Selected |
|--------|-------------|----------|
| Esc, click-outside, ✕ all dismiss to closed regardless of size | Matches SPEC Requirement 9 acceptance literal. | ✓ |
| Esc respects current size — Esc on maximized = restore to modal | Mirrors OS app behavior. | |
| Escape closes overlay; Maximize button is the only way to maximize, Restore only way back | No click-outside on maximized. | |

**User's choice:** Esc, click-outside, ✕ all dismiss to closed regardless of size

---

## activePaneTab persistence

### Q1: How should activePaneTab persist across page reloads?

| Option | Description | Selected |
|--------|-------------|----------|
| Session-only (Zustand non-persist) | Matches SPEC literal "first entity opened in a NEW SESSION lands on Detail". | ✓ |
| Persist in localStorage (like editorMode) | Mirrors editorModeStore pattern. | |
| sessionStorage (per-tab persistence, dies on tab close) | Halfway. | |

**User's choice:** Session-only (Zustand non-persist)

### Q2: How should fallback work when the active tab becomes unavailable?

| Option | Description | Selected |
|--------|-------------|----------|
| Compute at render — derived getter, store untouched | useEffectiveTab(editorMode) returns 'detail' when current tab unavailable. Store still holds 'source'; user returning to Developer view restores Source tab. | ✓ |
| Mutate store on mode change — reset to detail | useEffect listens to editorMode change; setActivePaneTab('detail') if unavailable. | |
| Block tab change attempts to unavailable tabs | TabStrip filters out tabs not valid for current editorMode. | |

**User's choice:** Compute at render — derived getter
**Notes:** Most graceful — preserves user's last explicit choice across mode round-trips.

### Q3: Where should activePaneTab live?

| Option | Description | Selected |
|--------|-------------|----------|
| Extend selectionStore | SPEC explicitly names this: "useSelectionStore gains an activePaneTab field" (Requirement 6). | ✓ |
| New paneTabStore | Cleaner separation by concern. | |
| URL query param (?tab=detail\|graph\|source) | Deep-linkable. | |

**User's choice:** Extend selectionStore

### Q4: Should the URL also reflect the active tab (deep-linking)?

| Option | Description | Selected |
|--------|-------------|----------|
| No — tab is session state, not URL state | Matches SPEC. | ✓ |
| Yes — add ?tab= query param for shareability | "Send a colleague this entity's graph" via URL. | |

**User's choice:** No
**Notes:** Deferred to v0.6+ backlog as a candidate for shareable entity views.

---

## Claude's Discretion

- TabStrip component file location, internal markup, focus-ring details, and prop naming beyond the `tabs` array contract
- Edge color/stroke specifics for new `edge_kind` values (`domain`, `range`, `subPropertyOf`, `sameAs`, `rdfType`, `objectProperty`)
- AI smoke-test report file format and location within the phase directory
- Annotation-property empty-state copy wording (final user-facing string)
- Deprecation window length for `/classes/graph` (one release / two releases) — coordinate with api repo conventions

## Deferred Ideas

- Per-user / per-project default tab preference (v0.6+)
- URL-deep-linkable active tab (`?tab=...`) — backlog candidate for shareable entity views
- Configurable graph depth + per-predicate cap on `/entity-graph` (v0.6+)
- Drag-to-reparent in graph (separate feature)
- Graph export to SVG/PNG (separate feature)
- Two-way navigation from full-source line clicks → tree selection (preserve existing behavior, don't redesign)
- Cosmetic refresh of `EntityModal` (post-Phase-17 polish if UAT finding)
