---
sketch: 003
name: developer-view-and-modal
question: "Does the right-pane tab strip work as Detail | Graph | Source in Developer view (Source absent in Standard)?"
winner: null
tags: [developer-view, modal, layout, tab-strip]
---

# Sketch 003: Developer View + Modal Expand

## Design Question

Sketch 002 established the right-pane tab strip with **two** tabs (`Detail | Graph`) for Standard view. Developer view extends that strip to **three** tabs (`Detail | Graph | Source`) — the Source tab subsumes both:

1. The current `Tree | Source` peer-tab strip in the left pane (which is now removed entirely — left pane shows only the tree).
2. The current `</> Source` link button in the entity-actions of the detail panel (also removed).

Source is **Developer-only**: Standard view never shows the Source tab. The tab is conditionally rendered based on the active editor mode.

## Layout corrections from prior drafts

- **No left-pane mode strip.** The left pane now shows only the tree (with `Classes | Properties | Individuals` sub-tabs). The previous `Tree | Source` 50/50 strip is gone.
- **No `</> Source` button in entity-actions.** Replaced by the Source tab in the right pane.
- **Source as entity-scoped.** The Source tab shows the Turtle snippet for the *currently selected* entity (with line number reference and an "Open full source" affordance to dive into the complete file). Consistent with Detail and Graph also being entity-scoped.

## How to View

`open .planning/sketches/003-developer-view-and-modal/index.html`

## States

- **State A — Detail tab active.** Initial load. Verify: left pane is just the tree (no Tree/Source toggle); right pane has 3 tabs; entity-actions has Copy IRI but no Source link.
- **State B — Graph tab active.** Inline neighborhood graph, ⤢ Expand button top-right.
- **State C — Source tab active.** Entity-scoped Turtle snippet with toolbar (Open full source, Copy snippet). Visible only because we're in Developer view.
- **State D — Modal expanded.** EntityGraphModal opens over the editor with extra room. Esc/click-outside/✕ to dismiss.

Cycle states via the variant tabs at the top, or interact directly:
- Click Detail / Graph / Source in the right-pane tab strip
- Click ⤢ Expand on the Graph tab to open the modal

## What to Look For

- **Left pane consolidation feels right.** Removing Tree/Source frees the left pane to be exactly one thing: the entity hierarchy. Confirm the absence doesn't feel "where did Source go?" — the user should naturally find it as the third tab in the right pane.
- **Three tabs at 33/33/33.** Same icon + label treatment as the 2-tab Standard view, but each tab now spans 33% of the pane width. Verify the three tabs read as peers (no one tab dominating).
- **Source as entity-scoped.** Developer-mode users coming from the old "full file source" mental model should see "Triune God — entity-scoped definition" comment + line number ("File: ontology.ttl, line 4,217") + the "Open full source" button. Together those signal "this is the snippet, full file is one click away."
- **Modal still works.** The Expand button on the Graph tab still opens the modal.
- **Dark mode.** Toggle via corner toolbar — the Source view's syntax-highlighted Turtle should still read clearly.

## Watch-Outs for Implementation

- **Conditional tab rendering.** `Source` tab only renders when `editorMode === "developer"`. In Standard view, the right pane's tab strip becomes 2-tab (Detail | Graph) at 50/50; in Developer it's 3-tab at 33/33/33. The tab-strip component should accept a `tabs` prop and lay them out with `flex: 1 1 0` so the same component handles both cases.
- **Source tab persistence.** If a user is on the Source tab in Developer view and switches to Standard mode, the active tab should fall back to whatever they were last on (Detail or Graph). The selection-store's `mode`/active-tab tracking needs a fallback path.
- **Old Tree/Source state.** Removing the left-pane Tree/Source toggle means the existing `viewMode` state in `DeveloperEditorLayout` is dropped — the left pane is always the tree now. The Source content moves into the right pane's tab body.
- **Entity-scoped source rendering.** New: needs a function `getEntitySourceSnippet(iri, ttlSource)` that finds the Turtle block for an IRI. Already exists in `lib/ontology/turtleClassUpdater.ts` (`findBlock`) — reuse it for the Source tab.
- **"Open full source" affordance.** Clicking it should open the existing full-file Source view in a modal or a new pane, scrolled to the entity's line. This preserves the "I need the whole file" workflow without making it the default.
- **Standard view's old Source link.** The `</> Source` button in the entity-actions area is removed in both views (since Standard never had real source editing and Developer now has the Source tab).
