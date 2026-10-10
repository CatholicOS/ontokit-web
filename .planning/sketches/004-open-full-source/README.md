---
sketch: 004
name: open-full-source
question: "When a user clicks 'Open Full Source' from the entity-scoped Source tab, what's the right surface — and how does the user move between sizes?"
winner: "C"
tags: [source-view, modal, full-screen, layout, round-trip]
---

# Sketch 004: Open Full Source

## Design Question

The entity-scoped Source tab (added in Sketch 003) shows a Turtle snippet for the currently selected entity. From there, the user can click **↗ Open full source** to view the entire `ontology.ttl` file. What surface should "full source" use, and how should the user move between sizes?

## How to View

`open .planning/sketches/004-open-full-source/index.html`

## Variants

- **A: Modal only** — Centered overlay at ~92% viewport with dim backdrop; Esc / click-outside / ✕ dismiss. Same dismissal as `EntityGraphModal`. Best for "peek and close." Lacks an escape hatch when the user wants more room.
- **B: Full editor takeover (current behavior)** — Source view fills the entire editor canvas; tree + detail are hidden. ← Back to entity dismisses. Maximum source real estate; matches what OntoKit does today. No way to peek without committing.
- **C: Modal ⇄ Maximize (round-trip)** ★ **WINNER** — Click **↗ Open full source** → opens the modal (~92% viewport). Inside the modal, click **⤢ Maximize** → promotes to full takeover. Inside the takeover, click **⊟ Restore** → returns to modal. ✕ / Back to entity dismisses fully from either size. Bounce maximize ↔ restore freely.

## Winning Insight

Variant C is C+ — the original C added a Maximize escape hatch but had no way back. The round-trip refinement adds **⊟ Restore** as a paired affordance to ⤢ Maximize:

- Both buttons share styling (accent-tinted, same `.maximize-btn` / `.minimize-btn` CSS rules) so they read as the same control inverted.
- Restore is **only shown** when the user reached the takeover via Maximize from the modal. Users who clicked "Open Full Source" with the variant-B-style direct takeover wouldn't see it (no modal to return to).
- The bounce is symmetric: peek (modal) → commit (Maximize) → peek again (Restore) → commit again (Maximize). The user never has to dismiss-and-reopen to switch sizes.
- Esc and click-outside still dismiss fully from the modal. The takeover dismisses via "← Back to entity" or via Restore then Esc.

This pattern matches what OS-level windows do without inheriting their visual baggage. Discovery is helped by the Maximize button's tooltip ("Expand to full editor takeover") and the Restore button's tooltip ("Restore to modal view").

### Why "Restore" (not "Minimize")

The button's user-facing label is **"Restore"** — the standard Windows OS title-bar pair to "Maximize." Rejected alternatives:

- **"Minimize"** — wrong: in OS land "Minimize" means send-to-taskbar (hide entirely), not return-to-previous-size. Conflicts with users' OS mental model.
- **"Exit fullscreen"** — works only if we'd named the trigger "Fullscreen"; mismatched with our "Maximize" trigger.
- **"Restore Down"** — the more verbose Windows term; "Down" is implementation-specific and unnecessary.
- **"Back to Modal"** — descriptive but technical (users don't think in "modal").
- **"Collapse"** — wrong nuance; implies hiding a panel, not resizing.

The Lucide icon used is named `Minimize2` internally (an icon-library convention) but the user-facing label is "Restore." The icon shows two arrows pointing inward at corners — it contrasts directly with the Maximize icon (two arrows pointing outward).

## What to Look For

- **Try the round-trip in C:** Open Full Source → Maximize → Restore → Maximize → Esc. The user should never feel trapped; both directions are one click.
- **Discoverability:** Is the Maximize button readable enough as "make this bigger" vs being mistaken for "open in new tab"? Hover the button to see the tooltip.
- **Consistency with EntityGraphModal:** the same modal frame is reused. Visual continuity across "Expand graph" and "Open full source" — same border radius, shadow, dismissal affordances.
- **The Restore icon:** the round-trip glyph is Lucide's `Minimize2` — two arrows pointing inward at corners. Contrasts directly with the Maximize glyph. Toggle dark mode to verify both still read clearly.
- **Highlight scrolling:** in either size, the entity's source block is highlighted with a left accent rule + blue tint and auto-scrolled into view.

## Watch-Outs for Implementation

- **Reuse the modal frame.** Same component as `EntityGraphModal` — only the body content differs. New props: `body` slot, `headerActions` slot.
- **Track origin in state.** A `cameFromModal` boolean on the source-overlay state. Set true when the takeover is reached via Maximize. Used to show/hide the Restore button. Reset on close.
- **Two affordances, paired styling.** The Maximize button (in the modal header) and the Restore button (in the takeover header) should share visual styling — accent-tinted background, same border, same icon family. They're conceptually one toggle, just split across two surfaces.
- **Esc dismisses, Restore doesn't.** Pressing Esc in either size dismisses fully (closes the source overlay entirely). Clicking Restore only changes size. Avoids the trap where Esc takes you back to modal but you wanted to dismiss.
- **Active-tab persistence.** When the user closes the source overlay (any size), they return to the right-pane Source tab. Their tab selection is unchanged.
- **Scroll position persistence within session.** When bouncing between modal and takeover, the source view's scroll position should persist (don't re-scroll to the entity's lines on every size change — only on initial open).

## Related to Idea 2 (Tree → Source jump)

When a user selects a different entity in the Tree while the **Source tab is active**, the entity-scoped source should auto-update to show the newly-selected entity's snippet. **If the full-source overlay is also open** (in either size), it should auto-scroll to the new entity's lines. This is a behavior spec that complements C's round-trip pattern — both modal and takeover need the same scroll-on-selection behavior.
