# Sketch Manifest

## Design Direction

Phase 17 — move the entity graph from a peer-tab in Developer view (and a small icon button in Standard view) into a `Detail | Graph` tab strip at the top of the right-side detail pane. Visual language matches OntoKit's existing app: sky-blue primary (`--color-primary-*`), slate neutrals, OWL-entity accent colors (class=green, property=blue, individual=pink), light + dark via CSS data-attribute. Folio-Enrich tab strip is the closest reference; WebProtege's docked entity graph is the loose mental model. Read `.planning/notes/graph-as-entity-pane.md` for the eight design decisions that constrain these sketches.

## Reference Points

- **Folio Enrich** — `CANDIDATE DETAILS | ENTITY GRAPH` tab strip in caps, graph-bracket icon, dark theme.
- **WebProtege** — entity graph as a docked pane below the entity detail; property graph is an isolated single-node island (a problem we want to fix).
- **OntoKit current state** — Developer has Graph as a peer-tab next to Tree/Source; Standard has a small icon button hidden in the right-side detail panel.

## Sketches

| # | Name | Design Question | Winner | Tags |
|---|------|----------------|--------|------|
| 001 | tab-strip-language | What should the `Detail \| Graph` tab strip look like — label, casing, icon, position? | **D — icon + label, ABOVE entity header** | tab-strip, typography, layout |
| 002 | standard-view-layout | Does the chosen tab strip fit Standard view's 2-pane layout, and at what density? | **D — Compact + 50/50 tabs** | standard-view, density, layout, tab-strip |
| 003 | developer-view-and-modal | Does the right-pane tab strip work as Detail \| Graph \| Source in Developer view (Source absent in Standard)? | **Applied — 3 tabs at 33/33/33; left pane is just the tree; Source absent in Standard** | developer-view, modal, layout, tab-strip |
| 004 | open-full-source | When the user clicks "Open Full Source" — what surface, and how does the user move between sizes? | **C — Modal ⇄ Maximize round-trip** | source-view, modal, full-screen, round-trip |
