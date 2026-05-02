---
title: Graph as Entity-Scoped Tab in Detail Pane — Design Decisions
date: 2026-05-02
context: Pre-phase exploration + sketch session; captured for Phase 17 spec/plan.
references:
  - WebProtege Entity Graph (stacked under detail panel)
  - Folio Enrich (Candidate Details | Entity Graph tab strip)
  - Current OntoKit Standard view (Graph icon button in right-side detail panel)
  - Current OntoKit Developer view (Graph as peer-tab next to Tree/Source)
sketches:
  - .planning/sketches/001-tab-strip-language/   (winner: D — icon + label, ABOVE entity header)
  - .planning/sketches/002-standard-view-layout/ (winner: D — Compact + 50/50 tabs)
  - .planning/sketches/003-developer-view-and-modal/ (winner: applied + Source-as-third-tab restructure)
  - .planning/sketches/004-open-full-source/     (winner: C — Modal ⇄ Maximize round-trip)
---

# Graph as Entity-Scoped Tab in Detail Pane

The graph today is misplaced in both views: a peer-tab in Developer (alongside Tree/Source — implies it's a *navigation surface*, not an entity-scoped view), and a small icon button in Standard that users miss entirely. This note captures the design decisions made during exploration (Decisions 1-8) and refined through a four-sketch validation pass (Decisions 9-11 + visual specs).

## Problem statement

A graph is fundamentally an entity-scoped view — it shows a focused class/property/individual surrounded by its neighborhood. The current placement in both views obscures that relationship. Users in Standard view don't realize the graph exists. Users in Developer view treat it as a separate mode they switch to, breaking the connection between the selected entity and what's rendered.

## The design contract (11 decisions)

### 1. Purpose: read-only neighborhood view (verify + explore)

The graph is a read-only context view. It helps users see the selected entity in relation to its siblings, parents, cousins. It is not a manipulation surface (no drag-to-reparent in this scope) and not a presentation/screenshot surface (that's a side benefit).

### 2. Layout: tabbed swap inside the existing detail pane

The right-side detail pane gains a tab strip at the top. The two (Standard) or three (Developer) tabs swap content in the same pane. Same screen real estate as today; tabs are one click away; swapped content is never visible simultaneously.

**Sketch refinements (from 001 + 002):**
- **Tab strip sits ABOVE the entity header** (not below). Reads as "Entity workspace with mode selector," not "Entity card with buried tab." Sketch 001 Variant D.
- **Compact density** — tab buttons use 8px vertical padding + text-xs, matching the left-pane tree-tabs strip exactly so the bottom borders align horizontally across the whole editor. Sketch 002 Variant D.
- **Tabs span the full pane width** — `flex: 1 1 0` so 2 tabs are 50/50, 3 tabs are 33/33/33. Reads as a major mode-selector, not a small control collapsed to one side.
- **Active state** — accent underline + accent-tinted background fill. Same visual language as the left-pane tree-tabs (Classes / Properties / Individuals), so the two strips read as a coherent family.
- **Icons + sentence-case labels** — Lucide `file-text` for Detail, a 3-node graph glyph for Graph, `chevrons-left-right` for Source. Underlines indicate active.

### 3. Old peer-tab Graph: removed entirely

Developer view's `Tree | Source | Graph` peer-tab strip is removed. Graph is *only* ever in the right-pane tab strip. Standard view's small icon button is also removed.

**Sketch refinement (from 003):** the entire left-pane mode strip (Tree | Source) is removed. The left pane shows only the tree (with `Classes | Properties | Individuals` sub-tabs). Source migrates to the right pane as a third tab — see Decision 9.

### 4. Full-screen affordance: reuse existing EntityGraphModal

The in-pane graph has an "Expand" button (top-right of the canvas). Clicking it opens the existing `EntityGraphModal` component as a centered overlay above the editor, dismissable via Escape / click-outside / close button. Same component reused for both Standard and Developer views.

### 5. Entity-type scope: all three (class, property, individual)

Class, Property, and Individual detail panes each get the tab strip. The graph component adapts per entity type:

- **Class:** parent classes, child classes, siblings, equivalent classes, disjoint classes, see-also.
- **Property:** **domain classes, range classes**, parent/child properties, see-also. _Explicit improvement over WebProtege, which leaves the property graph as an isolated single-node island._ OntoKit's property graph must show the relationships that make a property meaningful.
- **Individual:** class assertions (rdf:type), object property values, see-also, sameAs.

**Edge case (defer to plan/build):** Annotation properties typically have no domain/range. Graph for them shows just see-also if any, plus a friendly empty state otherwise.

### 6. Click behavior: preserve current single/double-click semantics

- **Single-click on a non-focus node** → re-center the graph on that node (graph navigation only; global selection unchanged).
- **Double-click on a non-focus node** → fully select that entity (URL updates, Tree highlights, Detail tab shows new entity).

Preserves the "explore the graph without losing your place" model that's a real differentiator vs WebProtege.

### 7. Tab persistence: stay on current tab across selection changes

When the user picks a new entity (tree click, search, or double-click in graph), the active tab does *not* reset. If they were on Graph, they stay on Graph. If on Detail, they stay on Detail. If on Source (Developer-only), they stay on Source.

### 8. Default tab on first load: Detail

First entity opened in a new session lands on the Detail tab. Decision 7 then keeps the user on whichever tab they choose for the rest of the session.

### 9. Source as right-pane Developer-only tab _(new — from sketch 003)_

The Source affordance migrates from two places that no longer exist:

- The left-pane `Tree | Source` peer-tab strip (removed per Decision 3 refinement).
- The `</> Source` link button in the entity-actions area of the detail header (removed).

…into a **third tab in the right-pane tab strip** alongside Detail and Graph. Source tab is **conditionally rendered** based on editor mode:

- **Standard view:** right pane has `Detail | Graph` (2 tabs at 50/50). No Source tab.
- **Developer view:** right pane has `Detail | Graph | Source` (3 tabs at 33/33/33).

The Source tab shows the **entity-scoped Turtle snippet** — just the block defining the currently-selected entity, with a comment line indicating where in the full file it lives (e.g., `# File: ontology.ttl, line 4,217`). A toolbar above the snippet exposes:

- **↗ Open full source** — opens the full ontology source (see Decision 10).
- **⎘ Copy snippet** — copies the entity-scoped snippet to clipboard.

### 10. "Open Full Source" — Modal ⇄ Maximize round-trip _(new — from sketch 004)_

When the user clicks **↗ Open full source** from the Source tab, a centered **modal** opens at ~92% viewport with a dim backdrop, reusing the same modal frame component as `EntityGraphModal`. Inside the modal, the user can:

- **Stay in modal** — Esc / click-outside / ✕ dismisses fully back to the Source tab.
- **⤢ Maximize** (modal header) — promotes the modal to a full editor takeover (tree + detail hidden; only the app header and project bar remain). Inside the takeover:
  - **⊟ Restore** (takeover header) — returns to the modal view. Bouncing maximize ↔ restore is symmetric and preserves scroll position.
  - **← Back to entity** — dismisses fully back to the Source tab.

**Terminology:** the takeover-side button is labelled **"Restore"** (matching Windows OS Maximize ↔ Restore convention) with tooltip *"Restore to modal view."* "Minimize" was rejected because in OS land it means send-to-taskbar (hide entirely), not return-to-previous-size — the wrong mental model.

**Round-trip integrity:** the Restore button is only shown when the takeover was reached via the modal's Maximize. If a user reaches the takeover by some other path (none currently designed, but kept open as a constraint), the Restore button is absent — preserving the chain.

**State:**
- A `cameFromModal` boolean tracks whether the takeover was reached via Maximize.
- Esc dismisses fully from either size; Restore only changes size.
- Active right-pane tab (Detail / Graph / Source) doesn't change when the source overlay opens or closes.

### 11. Tree → Source auto-jump (behavior spec) _(new — from sketch 004 follow-up)_

When the user has the Source tab active and selects a different entity in the Tree (or via search), the Source tab's content auto-updates to show the newly-selected entity's snippet — no extra click.

If the **full-source overlay is also open** (in either modal or maximized size), it auto-scrolls to the new entity's lines and re-applies the highlight rule. The overlay does not dismiss on selection change.

This complements Decision 7 (tab persistence) and Decision 10 (round-trip) — together they make the Source tab feel like a continuously-synced view of "whatever you're looking at in the tree."

## Implicit consequences (worth flagging for the plan)

- **Standard view's small Graph icon button** in the right-side detail panel — the affordance the user described as "not obvious" — is removed. The new tab strip replaces it.
- **Developer view's Tree | Source peer-tab strip** is removed entirely. The left pane is just the tree.
- **`</> Source` link in entity-actions** is removed in both views (replaced by the Source tab in Developer; not exposed at all in Standard).
- **Tab strip component** is shared across both views but receives a `tabs` prop that drives `flex: 1 1 0` layout: 2 tabs in Standard, 3 in Developer. One component, two configurations.

## Visual decisions captured from sketches

| What | Decision | Source |
|---|---|---|
| Tab strip position | Above the entity header (topmost chrome of the right pane) | Sketch 001 D |
| Tab styling | Icon + sentence-case label, accent-fill on active, accent underline | Sketch 001 D |
| Tab density | Compact: 8px vertical padding, text-xs, matching left tree-tabs height | Sketch 002 D |
| Tab width | `flex: 1 1 0` — fills the pane (50/50 in Standard, 33/33/33 in Developer) | Sketch 002 D |
| Standard view layout | 2-pane: Tree (~280px) \| Detail/Graph (rest) | Sketch 002 |
| Developer view layout | 2-pane: Tree (~280px, no mode strip) \| Detail/Graph/Source (rest) | Sketch 003 |
| Modal frame | Reuse `EntityGraphModal` shell — same border radius, shadow, dismissal | Sketch 004 |
| Open Full Source default | Modal at ~92% viewport, dim backdrop | Sketch 004 C |
| Open Full Source escape | ⤢ Maximize → full editor takeover; ⊟ Restore returns to modal | Sketch 004 C |
| Restore button label | "Restore" (Windows convention; rejected: Minimize, Exit fullscreen, Back to Modal) | Sketch 004 |

## Out of scope for Phase 17

- Drag-to-reparent in the graph.
- Per-user / per-project default tab preference.
- Graph for properties of properties (rdf:Property meta-level).
- Graph export to SVG/PNG for screenshots (separate feature).
- Source view editing UX changes (the new tab inherits whatever the current Source view does for keybindings, autocomplete, etc.).
- Two-way navigation from full-source line clicks back to tree selection (existing source-IRI index already supports it; just preserve behavior).
