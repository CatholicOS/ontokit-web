---
sketch: 001
name: tab-strip-language
question: "What should the Detail | Graph tab strip look like — label, casing, icon, position?"
winner: "D"
tags: [tab-strip, typography, layout]
---

# Sketch 001: Tab Strip Language

## Design Question

The Phase 17 design is settled on a tab strip in the right-side detail pane that swaps `Detail` and `Graph`. Open: label wording, casing, whether icons are needed, and **whether the strip sits above or below the entity header**. The answer here propagates to both Standard and Developer views and to all three entity types.

## How to View

`open .planning/sketches/001-tab-strip-language/index.html`

## Variants

- **A: Folio caps** — `DETAIL | ENTITY GRAPH` in caps with letter-spacing, mirrors Folio Enrich. Heaviest visual weight; loud and obvious; fixes discoverability instantly.
- **B: Sentence soft** — pill-style segmented control (`Detail` / `Graph`). macOS-y. Quietest; defers to entity content; risks under-discoverability.
- **C: Icon + label, BELOW entity header** — Lucide icons + sentence-case (`◉ Detail` / `◇ Graph`), underline + accent tint on active. Tab strip sits beneath the entity name (the layout in the original Folio Enrich screenshot).
- **D: Icon + label, ABOVE entity header** ★ **WINNER** — Same icon-and-label treatment as C, but the tab strip is the topmost chrome of the pane. The entity header (pip + name + IRI) becomes content of whichever tab is active.

## Winning Insight

The tab strip works best as the topmost chrome of the pane because:

1. **Maximum discoverability** — the tab strip is the first thing the eye lands on when scanning the right side of the screen. Fixes the original "not obvious" complaint without resorting to caps/loud styling.
2. **Persistent orientation** — the entity header (pip + name + IRI) sits beneath the tab strip and stays visible when switching modes, so the user never loses context. Reads as: *"I am viewing &lt;Triune God&gt;, in &lt;Detail&gt; mode."*
3. **Unified pane semantics** — the whole right pane reads as an "Entity workspace" with a mode selector at the top, rather than an "Entity card with a buried tab control."

## Watch-Outs for Subsequent Sketches

- Tab strip + entity header costs ~88px of vertical space before content begins (vs ~62px in variant C). Sketch **002** must validate this density still works in Standard view's compact right pane without pushing the form fields below the fold.
- Tab strip styling: underline + accent fill on active. Carry these tokens into the real implementation via the existing `--color-primary-*` palette.
- Lucide icons used: `file-text` (Detail) and a custom 3-node graph glyph (Graph). The graph glyph should be replaceable with whatever icon the implementation team picks (lucide `Network`, `Workflow`, or `Share2` are all candidates).

## What to Look For When Reviewing

- Toggle dark mode via the corner toolbar — does the active state still read clearly?
- Click the inactive tab — confirm the swap feels right (no flicker, predictable highlight).
