---
phase: 17
slug: graph-as-entity-scoped-tab-in-detail-pane
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-02
---

# Phase 17 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (web) + pytest (api) |
| **Config file** | `vitest.config.ts` (web), `pyproject.toml` / `pytest.ini` (api) |
| **Quick run command** | `npm run test -- --run` (web) / `pytest tests/ -k "entity_graph or test_ontology" -x` (api) |
| **Full suite command** | `npm run test:coverage` (web) / `pytest` (api) |
| **Estimated runtime** | ~30s (web quick), ~60s (api quick), ~3 min (web full) |

---

## Sampling Rate

- **After every task commit:** Run `npm run test -- --run <changed test files>` (web) or `pytest <changed test files> -x` (api)
- **After every plan wave:** Run full quick suite for the affected repo
- **Before `/gsd-verify-work`:** Full suite green in both repos + AI smoke test report committed
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

> Will be populated during planning. Below is the requirement-to-test-type mapping derived from SPEC.md (R1–R11) and RESEARCH.md.

| Requirement | Plan | Wave | Test Type | Test Surface | Notes |
|---|---|---|---|---|---|
| R1 — Tab strip in right pane (both views) | TBD | 2-3 | unit + AI smoke | `PaneTabStrip.test.tsx`, screenshot via Chrome DevTools MCP | Visual: bottom-border pixel alignment with `EntityTabBar` |
| R2 — Old peer-tab Graph removed (Developer) | TBD | 3 | unit | grep absence in `DeveloperEditorLayout.tsx` | No Tree/Source/Graph mode strip rendered |
| R3 — Old Graph icon button removed (Standard) | TBD | 3 | unit | grep absence in `Class/Property/IndividualDetailPanel.tsx` | All 3 panels |
| R4 — Old `</> Source` link removed (both) | TBD | 3 | unit | grep absence in 3 detail panels | Verify property + individual panels too (Open Q1 in RESEARCH) |
| R5 — Click semantics preserved | TBD | 3 | AI smoke | Single-click recenter, double-click select | Existing `OntologyGraph` behavior |
| R6 — Tab persistence across selection | TBD | 2 | unit + AI smoke | `useSelectionStore.test.ts` (activePaneTab), `useEffectiveTab.test.ts` | Type-change fallback covered |
| R7 — Source as Developer-only tab | TBD | 2-3 | unit + AI smoke | `SourceTabBody.test.tsx` snippet extraction; conditional render in `DeveloperEditorLayout` | Standard view hides Source tab |
| R8 — Default tab Detail on first load | TBD | 2 | unit | `selectionStore` initial state test | Session storage NOT used (D-14) |
| R9 — Modal⇄Maximize round-trip | TBD | 2 | unit + AI smoke | `useFullSourceOverlay.test.ts`, screenshot pre/post Maximize | Esc/click-outside dismiss; Restore preserves Monaco scroll |
| R10 — Tree → Source auto-jump | TBD | 3 | unit + AI smoke | Source tab body re-renders on selection change | Modal scrolls to new entity's lines |
| R11 — Property/individual graph backend | TBD | 1 | pytest + integration | `tests/test_entity_graph.py` (api) — property domain+range, individual rdf:type+objectProperty, annotation-property empty | Includes empty-state response shape |

---

## Wave 0 Requirements

- [ ] `vitest.config.ts` already exists — no install needed
- [ ] `pyproject.toml` `pytest` already exists — no install needed
- [ ] AI smoke test report file path + format established in plan (place under `${phase_dir}/17-AI-SMOKE-TEST.md`)

*Existing test infrastructure covers all phase requirements. Wave 0 is documentation-only (smoke test report scaffold).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Bottom-border pixel alignment between left and right tab strips | R1 visual constraint | Pixel-level visual fidelity | Chrome DevTools MCP — take screenshot of full editor, verify bottom-border y-coordinate parity |
| Cross-repo deploy + smoke test | R11 | Requires both `ontokit-api` and `ontokit-web` running together | Sequential merge (api → dev → web → dev), then run AI smoke test against staging |
| Annotation property empty-state copy renders correctly | R11 | Specific entity needs to exist in test ontology | Manual UAT walkthrough with the test ontology |
| Maximize → Restore preserves Monaco scroll position | R9 (D-11) | Browser-state assertion not easily unit-testable | Manual: scroll full source, Maximize, Restore, verify scroll position unchanged |
| AI-driven Chrome DevTools MCP smoke test (R1, R5, R6, R7, R8, R9 × Standard+Developer × light+dark) | SPEC acceptance | AI smoke test is itself a manual orchestration step | Walk through smoke test script, log results in `17-AI-SMOKE-TEST.md` |
| Human UAT sign-off on all 11 requirements | SPEC acceptance | Requires human judgment | UAT checklist generated from SPEC acceptance criteria |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter (after planner populates per-task map)

**Approval:** pending
