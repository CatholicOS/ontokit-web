---
sketch: 002
name: standard-view-layout
question: "Does the chosen tab strip (Variant D from sketch 001) fit Standard view's 2-pane layout, and at what density?"
winner: "D"
tags: [standard-view, density, layout, tab-strip]
---

# Sketch 002: Standard View Layout

## Design Question

Sketch 001 settled the tab-strip language (icon + sentence-case label, sitting ABOVE the entity header). This sketch validates that the chosen treatment fits Standard view's actual layout — **two panes only**: Tree (~280px on the left) + Detail/Graph (the rest of the viewport on the right). Three densities were explored, then the winner was refined to fix a tab-collapse issue.

## Layout correction (from initial draft)

The first version of this sketch incorrectly imagined a third "center pane" between Tree and Detail. **There is no center pane in Standard view.** With Detail/Graph taking the entire right side of the screen, the Graph tab gets a much wider canvas than initially shown — large enough to render a full neighborhood (parent, focus, siblings, multiple children) without cramping.

This means the density tradeoff is now mostly vertical (chrome height vs form-field/graph-canvas height).

## How to View

`open .planning/sketches/002-standard-view-layout/index.html`

## Variants

- **A: Compact** — text-xs tab labels, 24px entity pip, 8px tab padding. Tabs collapsed to the left, content-sized.
- **B: Comfortable** — text-sm tab labels, 28px entity pip, 12px tab padding. Tabs collapsed to the left.
- **C: Spacious** — text-base tab labels, 32px entity pip, 16px tab padding. Tabs collapsed to the left.
- **D: Compact + 50/50 tabs** ★ **WINNER** — Compact density (A's chrome size) with each tab spanning **50% of the entire right pane**. Detail and Graph are visually equal-weight affordances; the click target stretches the full pane width.

## Winning Insight

Compact density wins on space efficiency (the tab strip + entity header chrome consumes minimum vertical space, leaving the most room for form fields or graph canvas). But the original A had a discoverability issue: **the tabs were collapsed to the left of the pane**, which:
- Visually understates the importance of the Graph affordance
- Makes the right side of the strip feel hollow
- Reduces the click target to ~80px wide instead of ~half-pane

Variant D fixes that by making each tab `flex: 1 1 50%` — the strip now reads as a true mode selector spanning the full pane width. The two tabs are perceived as peers, not as a small control hugging one side.

## Watch-Outs for Implementation

- **Class on container:** apply via `data-tabstrip="full"` attribute (or a CSS class) on the tabstrip wrapper. CSS rule: `flex: 1 1 50%; justify-content: center;` on `.pane-tabstrip button`.
- **Centered text + icon:** label and icon should be visually centered within each 50% half (use `justify-content: center` on the button).
- **Padding still applies:** keep ~11px vertical padding so the click target is comfortable; the horizontal padding becomes irrelevant since flex-grow eats whatever's left.
- **Future-proofing:** if a third tab is ever added (e.g., History, Diff), the same `flex: 1` rule auto-divides into thirds. Verify the tab labels still fit at narrower widths.
- **Tree-pane tabs (Classes / Properties / Individuals)** keep their original collapsed-left treatment — they're a different kind of control (entity-type filter, not view-mode swap), so they shouldn't compete with the new pane tab strip's full-width emphasis.

## What to Look For When Reviewing D

- Does the tab strip read as a major mode-selector now (vs the buried-button feel in A)?
- Does centered icon+label still feel balanced, or does it look stretched?
- Toggle dark mode via corner toolbar — does the active state's accent fill still read clearly across the wider button?
- Click Detail / Graph — confirm the swap feels right; the entity header (pip + name + IRI + actions) stays put.
