# Phase 17: Graph as Entity-Scoped Tab in Detail Pane — Specification

**Created:** 2026-05-02
**Ambiguity score:** 0.19 (gate: ≤ 0.20)
**Requirements:** 11 locked

## Goal

Both Standard and Developer views render a `Detail | Graph[ | Source]` tab strip at the topmost chrome of the right-side detail pane for all three entity types (class, property, individual). The Developer view's `Tree | Source | Graph` left-pane peer-tab strip is reduced to no peer strip (left pane shows only the tree). The Standard view's prior small Graph icon button in the entity-actions area is removed. The `</> Source` link in entity-actions is removed in both views (replaced by the Source tab in Developer; not exposed in Standard). The full source view is reachable from the Source tab via a Modal ⇄ Maximize round-trip.

## Background

The graph today is misplaced: a peer-tab in Developer view (alongside Tree/Source — implies it's a *navigation surface*, not an entity-scoped view), and a small icon button in Standard view that users miss entirely. Source is similarly fragmented across a left-pane mode strip in Developer and a small `</> Source` link in the entity actions of all detail panels.

Codebase scout (commit `dev` HEAD prior to PR #88 merge):

- `components/editor/standard/StandardEditorLayout.tsx` — 2-pane layout (tree | detail). Detail panels carry the Graph icon button + `</> Source` link.
- `components/editor/developer/DeveloperEditorLayout.tsx` — 2-pane layout. Left pane has `Tree | Source` mode strip with `Graph` peer-tab. Right pane is the detail panel.
- `components/editor/{Class,Property,Individual}DetailPanel.tsx` — render entity-actions with Copy IRI + `</> Source` button.
- `components/graph/OntologyGraph.tsx` — current client-side renderer (PR #88 replaces with server-side BFS + new `useELKLayout`, `OntologyEdge`).
- `components/graph/EntityGraphModal.tsx` — existing modal frame; reused for graph and (new) for full-source modal.
- `lib/stores/selectionStore.ts` — Zustand store with `iri`, `type`, `mode` fields (extended in #228). This phase adds `activePaneTab: 'detail' | 'graph' | 'source' | null`.
- `lib/api/graph.ts` (ontokit-web) and `ontokit-api`'s `/api/v1/projects/{id}/ontology/classes/graph` endpoint — class-only today. Phase 17 extends API for properties and individuals (see Requirement 11).

Design contract (decisions 1–11): `.planning/notes/graph-as-entity-pane.md`. Sketch winners: `.planning/sketches/{001..004}/index.html`.

## Requirements

1. **Tab strip — right pane**: A unified tab strip becomes the topmost chrome of the right-pane detail panel in both Standard and Developer views.
   - Current: No tab strip exists. Standard panel goes pip+name+IRI → form fields. Developer panel same. Graph affordances are scattered.
   - Target: Right pane renders `<TabStrip tabs={...}>` above the entity header. Tabs are `Detail | Graph` (Standard, 50/50) or `Detail | Graph | Source` (Developer, 33/33/33). Visual treatment: icon + sentence-case label, `flex: 1 1 0`, accent underline + accent-tinted background fill on active, 8px vertical padding + text-xs (matches left tree-tabs height).
   - Acceptance: Both views show the strip at the top of the right pane; clicking a tab swaps the body content beneath the entity header; entity header (pip + name + IRI + Copy IRI button) stays visible across tab swaps; bottom border of the right-pane strip aligns horizontally with the bottom border of the left-pane `Classes | Properties | Individuals` strip.

2. **Old peer-tab Graph removed (Developer view)**: The left-pane `Tree | Source | Graph` peer-tab strip is reduced to no peer-tab strip.
   - Current: `DeveloperEditorLayout` renders `Tree | Source | Graph` peer-tabs as the left-pane mode selector.
   - Target: The `Tree | Source` strip is removed entirely. The left pane shows only the tree (with `Classes | Properties | Individuals` sub-tabs). Source moves to the right-pane Source tab (Requirement 7).
   - Acceptance: No Tree/Source/Graph mode selector renders anywhere in the left pane in Developer view. The left pane's only tab strip is `Classes | Properties | Individuals`.

3. **Old Graph icon button removed (Standard view)**: The small Graph icon button in the entity-actions area is removed.
   - Current: `Class/Property/IndividualDetailPanel` render `<button title="View graph">` in the entity-actions row.
   - Target: That button is deleted. The new Detail | Graph tab strip is the only graph entry point in Standard view.
   - Acceptance: Manual inspection of all three detail panels in Standard view shows no Graph button in entity-actions.

4. **Old `</> Source` link removed (both views)**: The Source link in entity-actions is removed.
   - Current: All three detail panels render `<button title="View in Source">`. In Developer view it switches the left-pane mode to Source. In Standard view it has no analog.
   - Target: That button is deleted. In Developer, replaced by the Source tab (Requirement 7). In Standard, no replacement (Source is not exposed at all).
   - Acceptance: Manual inspection of all three detail panels in both views shows no Source button in entity-actions.

5. **Click semantics preserved**: Single-click on a non-focus graph node re-centers the graph; double-click fully selects the entity.
   - Current: PR #88's `OntologyGraph` already implements this on the existing graph component.
   - Target: Same behavior preserved when the graph renders inside the new Graph tab. No new keyboard shortcuts; no behavioral change to graph navigation.
   - Acceptance: In any view, with the Graph tab active, single-clicking an unfocused node re-centers without changing tree highlight or detail content; double-clicking changes the URL `?<type>Iri=`, highlights the new entity in the tree, and keeps the user on the Graph tab.

6. **Tab persistence across selection changes**: The active right-pane tab persists when the user picks a different entity.
   - Current: No right-pane tab state exists.
   - Target: `useSelectionStore` gains an `activePaneTab: 'detail' | 'graph' | 'source' | null` field. When the user selects a different entity (via tree, search, or double-click in graph), the active tab is unchanged. When the entity type changes (class → property → individual), the active tab is also unchanged unless the new tab is unavailable in the new context (e.g., Source tab in Standard view), in which case it falls back to Detail.
   - Acceptance: With Graph tab active, selecting a different class keeps the user on Graph (graph re-renders for the new entity). With Source tab active in Developer view, switching to Standard view falls back to Detail tab.

7. **Source as right-pane Developer-only tab**: Developer view exposes a third tab `Source` showing the entity-scoped Turtle snippet.
   - Current: Source view is a left-pane mode in Developer; not exposed at all in Standard.
   - Target: Developer right-pane tab strip has `Detail | Graph | Source` (33/33/33). The Source tab body shows: a toolbar with `↗ Open full source` (primary action) + `⎘ Copy snippet` + a comment line `# File: ontology.ttl, line N` + a Monaco-rendered Turtle snippet for the currently-selected entity. Standard view's tab strip remains `Detail | Graph` (no Source tab rendered).
   - Acceptance: Developer view shows three tabs in the right-pane strip; clicking Source renders the entity-scoped Turtle snippet with the toolbar actions visible. Standard view shows two tabs only; switching to Standard mode while the Source tab is active falls back to Detail.

8. **Default tab on first load**: Detail tab is active when the user opens a new session.
   - Current: No tab state exists.
   - Target: First entity opened in a session lands on Detail tab. Requirement 6 then keeps the user on whichever tab they switch to for the rest of the session.
   - Acceptance: Open the editor in a fresh tab/incognito → click any entity → Detail tab is active. After clicking Graph, subsequent entity selections in the same session land on Graph.

9. **Modal ⇄ Maximize round-trip for Open Full Source**: The Source tab's `↗ Open full source` action opens a modal at ~92% viewport with a `⤢ Maximize` ⇄ `⊟ Restore` round-trip to a full editor takeover.
   - Current: No "Open full source" affordance exists. The current Source view is the left-pane Source mode (full file, full pane).
   - Target: Click ↗ Open full source → opens overlay modal (~92% viewport, dim backdrop) reusing the existing `EntityGraphModal` shell. Modal header includes `⤢ Maximize` button → promotes to full editor takeover (tree + detail hidden; only app header + project bar remain). Takeover header includes `⊟ Restore` button → returns to modal. Esc / click-outside / ✕ dismisses fully from either size and returns to the Source tab. Restore button is only shown when the takeover was reached via Maximize.
   - Acceptance: Click ↗ Open full source → modal opens. Click ⤢ Maximize → full takeover with ⊟ Restore visible. Click ⊟ Restore → modal again. Click ⤢ Maximize again → takeover (bounce works). Press Esc → returns to Source tab. Open full source then immediately Esc — no Restore button ever appeared in the brief modal flash.

10. **Tree → Source auto-jump (behavior)**: Selecting a different entity while the Source tab is active auto-updates the source view.
    - Current: No such behavior — the existing `</> Source` link is a one-shot navigation, not a continuous sync.
    - Target: When the Source tab is active and the user picks a different entity (via tree, search, or double-click in graph), the entity-scoped Turtle snippet auto-updates to the new entity. If the full-source overlay is also open (modal or maximized), it auto-scrolls to the new entity's lines and applies the highlight rule.
    - Acceptance: With Source tab active on entity A, clicking entity B in the tree → Source tab now shows B's snippet without an extra click. Repeat with full-source modal open → modal scrolls to B's lines.

11. **Property and individual graph backend**: The entity-graph backend supports class, property, AND individual focus IRIs.
    - Current: `ontokit-api` PR #37 (`entity-graph-endpoint`) supports `focus_iri` typed as a class only. Property and individual graphs are not implemented.
    - Target: The `/api/v1/projects/{id}/ontology/classes/graph` endpoint (or equivalents per type) returns BFS neighborhood for class, property, and individual focus IRIs. **For properties:** nodes include the property itself (focus), domain classes, range classes, parent properties (rdfs:subPropertyOf chain), and see-also targets; edges are labelled `domain`, `range`, `subPropertyOf`, `seeAlso`. **For individuals:** nodes include the individual itself, class assertions (rdf:type), individuals connected via object property values, see-also targets, and sameAs targets; edges labelled `rdf:type`, `<predicate>`, `seeAlso`, `sameAs`. **For annotation properties:** when no domain, range, parent, or see-also exists, the response is `{nodes: [focus_only], edges: []}` and the frontend renders an empty-state message ("No relationships to display for this annotation property").
    - Acceptance: Backend endpoint returns non-empty `nodes` and `edges` for at least one object property in the test ontology with domain + range; for at least one individual with rdf:type + ≥1 object property value; for at least one annotation property with see-also. Annotation property with no relationships returns the focus-only response and frontend shows the empty-state copy.

## Boundaries

**In scope:**
- New `<TabStrip>` component (shared across both views, `flex: 1 1 0`, accepts `tabs` prop)
- New `activePaneTab` field + setter in `useSelectionStore`
- Standard view layout integration (replace Graph icon button + `</> Source` link with the tab strip)
- Developer view layout integration (remove Tree | Source mode strip + Graph peer-tab + `</> Source` link; add right-pane 3-tab strip with Source tab)
- Source tab body: entity-scoped Turtle snippet + `↗ Open full source` + `⎘ Copy snippet` + line-number comment
- Modal ⇄ Maximize ⇄ Restore round-trip for `↗ Open full source` (reuses `EntityGraphModal` shell)
- Backend (`ontokit-api`): extend entity-graph endpoint to handle property and individual focus IRIs with domain/range/parent/see-also and class-assertion/object-property/sameAs respectively
- Property graph rendering — domain classes, range classes, parent properties, see-also; full content (not the WebProtege empty-island treatment)
- Individual graph rendering — class assertions, object property values, see-also, sameAs
- Annotation property empty-state copy
- Unit tests (Vitest) for new components and store extensions
- AI-driven smoke testing via Chrome DevTools MCP across Standard + Developer × light + dark modes, walking through Requirements 1, 5, 6, 7, 8, 9 in a real browser before human UAT
- Manual UAT covering all 11 requirements

**Out of scope:**
- Drag-to-reparent in the graph — Phase 17 keeps the graph read-only; this is a separate feature
- Per-user / per-project default tab preference — global default is Detail (Decision 8); per-user persistence is a v0.6.0+ enhancement
- Graph for properties of properties (rdf:Property meta-level) — out of scope; only typed properties (object/data/annotation) get graph rendering
- Graph export to SVG/PNG for screenshots — separate feature
- Source view editing UX changes (keybindings, autocomplete, find-replace behaviour) — the new Source tab inherits whatever the current Source view does; only the placement and entity-scoping change
- Two-way navigation from full-source line clicks back to tree selection — the existing source-IRI index already supports it; preserve behavior, don't redesign
- New Playwright e2e tests — covered by Phase 17 acceptance via unit + AI smoke + human UAT; broader e2e coverage is tracker item #139
- Cosmetic refresh of `EntityGraphModal` — reuse as-is; visual polish is a separate small follow-up

## Constraints

- **Hard dependency on PR #88** (`ontokit-web` entity-graph-pr) merging to dev. Phase 17 implementation branch is cut from `dev` AFTER #88 lands. No parallel development.
- **Cross-repo coordination**: Phase 17 spans both `ontokit-web` and `ontokit-api`. The api branch must ship endpoints that handle property and individual focus IRIs before web integration is testable end-to-end. Suggested merge order: api branch → dev → web branch → dev.
- **Reuse `EntityGraphModal` shell** for the new full-source modal — no new modal component. Add a `body` slot prop.
- **Tab strip styling tokens** must use existing OntoKit tokens (`--color-primary-*`, slate neutrals, dark mode via Tailwind `dark:` class). No new CSS variables introduced.
- **Backward compatibility**: Existing single-click recenter / double-click select behavior on graph nodes is preserved unchanged (Requirement 5). Existing keyboard shortcuts on the editor are unchanged.
- **Visual alignment requirement**: bottom borders of the left-pane `Classes | Properties | Individuals` strip and the right-pane `Detail | Graph[ | Source]` strip MUST align horizontally. This is a pixel-aligned UI constraint — verifier checks via DevTools MCP screenshot.

## Acceptance Criteria

- [ ] Standard view renders `Detail | Graph` tab strip at top of right pane (50/50 width) for all three entity types (class, property, individual)
- [ ] Developer view renders `Detail | Graph | Source` tab strip at top of right pane (33/33/33 width) for all three entity types
- [ ] Bottom border of right-pane tab strip aligns with bottom border of left-pane `Classes | Properties | Individuals` strip (verified via DevTools MCP screenshot, both views)
- [ ] Developer view's left pane shows only the tree — no `Tree | Source` mode strip; no `Graph` peer-tab anywhere
- [ ] Standard view's detail panels show no Graph icon button in entity-actions; no `</> Source` link
- [ ] Developer view's detail panels show no `</> Source` link in entity-actions
- [ ] Single-click on a non-focus graph node re-centers (no URL/tree change); double-click changes URL + tree highlight + tab stays on Graph
- [ ] Active tab persists across entity selection changes within the same session
- [ ] Source tab active in Developer → switch to Standard mode → tab falls back to Detail (no error)
- [ ] First entity load in a fresh session opens on Detail tab
- [ ] Source tab body renders entity-scoped Turtle snippet with `↗ Open full source` + `⎘ Copy snippet` + line-number comment
- [ ] `↗ Open full source` opens modal at ~92% viewport with dim backdrop, dismissable via Esc / click-outside / ✕
- [ ] Modal `⤢ Maximize` opens full editor takeover (tree + detail hidden); takeover header shows `⊟ Restore`
- [ ] Takeover `⊟ Restore` returns to modal; Maximize ⇄ Restore round-trip is symmetric and bounceable
- [ ] Esc dismisses full source overlay (any size) and returns to the Source tab
- [ ] Restore button is hidden when the takeover was NOT reached via Maximize (no current path triggers this, but verified)
- [ ] With Source tab active on entity A, clicking entity B → Source content auto-updates to B's snippet without extra click
- [ ] With Source tab active and full-source modal open, selecting a different entity → modal scrolls to new entity's lines
- [ ] Backend returns `nodes` and `edges` for at least one object property (with domain + range), one individual (with rdf:type + ≥1 object property value), and one annotation property (with see-also) in the test ontology
- [ ] Backend returns `{nodes: [focus_only], edges: []}` for an annotation property with no relationships; frontend renders the empty-state message
- [ ] All Vitest unit tests pass (existing + new)
- [ ] AI-driven Chrome DevTools MCP smoke test walks through Requirements 1, 5, 6, 7, 8, 9 in both Standard + Developer × light + dark; report logged in the phase's verification document; any regressions fixed before handoff to human UAT
- [ ] Human UAT sign-off on all 11 requirements

## Ambiguity Report

| Dimension          | Score | Min  | Status | Notes                                                                  |
|--------------------|-------|------|--------|------------------------------------------------------------------------|
| Goal Clarity       | 0.85  | 0.75 | ✓      | 11 decisions in design contract + 7 success criteria in roadmap        |
| Boundary Clarity   | 0.80  | 0.70 | ✓      | Explicit in/out scope lists; "out" items reasoned                      |
| Constraint Clarity | 0.80  | 0.65 | ✓      | PR #88 dependency pinned; cross-repo scope confirmed; verification floor set |
| Acceptance Criteria| 0.78  | 0.70 | ✓      | 23 pass/fail checkboxes; property graph minimum is "full" (Decision 5) |
| **Ambiguity**      | 0.19  | ≤0.20| ✓      |                                                                        |

## Interview Log

| Round | Perspective    | Question summary                                                  | Decision locked                                                                                              |
|-------|----------------|-------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------|
| 0     | Scout          | What exists today; what does the design contract already lock?    | 11 decisions captured pre-spec in `.planning/notes/graph-as-entity-pane.md`; 4 sketches validated visuals    |
| 1     | Researcher     | Where does property/individual graph backend work live?           | Phase 17 spans both repos (web + api); api branch must ship endpoints before web integration                |
| 1     | Researcher     | Phase 17 timing relative to PR #88?                               | Hard dependency — wait for #88 to merge to dev before cutting Phase 17 implementation branch                |
| 2     | Simplifier     | What's the verification floor?                                    | Vitest unit tests + AI-driven Chrome DevTools MCP smoke pass + human UAT (no Playwright e2e in this phase)  |
| 2     | Simplifier     | What counts as "property graph renders in context"?               | Full content per Decision 5: domain + range + parent properties + see-also; not just non-empty               |

---

*Phase: 17-graph-as-entity-scoped-tab-in-detail-pane*
*Spec created: 2026-05-02*
*Next step: /gsd-discuss-phase 17 — implementation decisions (TabStrip component shape, store extension API, Source snippet extraction reuse, modal slot design, etc.)*
