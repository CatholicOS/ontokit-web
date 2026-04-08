# Coverage Plan: Path to 80%

**Created**: 2026-04-08
**Branch**: `test/increase-coverage`
**Starting coverage**: ~42.2% lines

## Current State

- **Overall**: 42.2% lines covered
- **~9,500 lines** across 37 files at 0% coverage
- Need to roughly double covered lines

## Priority Tiers (by impact)

### Tier 1 — Highest Impact (0% coverage, largest files)

These files alone account for ~5,000 uncovered lines. Getting even 70-80% on each moves the needle dramatically.

| File | Lines | Notes |
|------|-------|-------|
| `components/editor/ClassDetailPanel.tsx` | 1187 | Biggest single file. Heavy component — mock ontology data, test render states |
| `components/pr/PRDetail.tsx` | 657 | PR workflow display. Mock API responses, test states (open/merged/closed) |
| `components/editor/OntologySourceEditor.tsx` | 642 | Monaco wrapper. Mock Monaco, test toolbar actions and callbacks |
| `components/editor/TurtleEditor.tsx` | 640 | Monaco wrapper. Similar mocking strategy |
| `components/editor/standard/RelationshipSection.tsx` | 495 | Form-like component. Test add/remove/edit interactions |
| `components/editor/standard/StandardEditorLayout.tsx` | 447 | Layout orchestrator. Test tab switching, panel rendering |
| `components/pr/PRActions.tsx` | 423 | Buttons/actions. Test permission-gated rendering, click handlers |
| `components/revision/CommitDetailView.tsx` | 401 | Diff display. Mock commit data, test rendering |
| `components/graph/OntologyGraph.tsx` | 356 | ReactFlow wrapper. Mock ReactFlow, test node/edge rendering |
| `components/revision/BranchSelector.tsx` | 352 | Dropdown. Mock branches, test selection |

### Tier 2 — High Impact (0% or low coverage, medium files)

| File | Lines | Current |
|------|-------|---------|
| `lib/api/client.ts` | 642 | **46%** — cover retry logic, error paths, request/response handling |
| `lib/hooks/useProjectViewer.ts` | 317 | **34%** — cover permission derivation, edge cases |
| `lib/api/lint.ts` | 263 | **17%** — cover lint result parsing, API calls |
| `lib/collab/client.ts` | 245 | **0%** — WebSocket mock, connection lifecycle |
| `components/pr/PRCommentThread.tsx` | 267 | 0% |
| `components/revision/GitGraph.tsx` | 281 | 0% |
| `components/revision/HistoryPanel.tsx` | 257 | 0% |
| `components/pr/PRCreateModal.tsx` | 207 | 0% |
| `components/editor/standard/AnnotationEditor.tsx` | 248 | 0% |
| `components/layout/notification-bell.tsx` | 225 | 0% |

### Tier 3 — Medium Impact (smaller 0% files, fill gaps)

| File | Lines |
|------|-------|
| `components/pr/PRList.tsx` | 163 |
| `components/projects/project-form.tsx` | 197 |
| `components/editor/standard/PropertyTree.tsx` | 193 |
| `lib/sitemap.ts` | 168 |
| `components/graph/OntologyNode.tsx` | 134 |
| `components/editor/standard/IndividualList.tsx` | 112 |
| `components/graph/OntologyEdge.tsx` | 107 |
| `components/editor/developer/EditorLayout.tsx` | 608 |
| Remaining `components/projects/*` (role-picker, search-input, layout-picker, preferences, repo-picker) | ~1,000 total |

### Tier 4 — Finish line (small files, existing gaps)

- `components/ui/` small 0% files (LiveAnnouncer, toast-container, RocketIcon)
- `components/suggestions/` dialog components
- `components/editor/PanelDivider.tsx`, `ParentClassPicker.tsx`, `CommitSubmitDialog.tsx`
- `lib/i18n/request.ts`
- Bump partially-covered hooks/lib files from 80->95%

## Execution Order

1. [x] **lib/ gaps** — `client.ts`, `lint.ts`, `collab/client.ts`, `useProjectViewer.ts`, `sitemap.ts`. (42.2% → 46.6%)
2. [x] **Component shared infrastructure** — Reusable test helpers/mocks for Monaco, ReactFlow, React Query, Next.js navigation, contexts.
3. [x] **Tier 1 components** — 10 largest 0% files. (46.6% → 57.5%)
4. [x] **Tier 2 components** — PR, revision, editor, layout, project components. (57.5% → 63.8%)
5. [x] **Tier 3 + 4** — Mop up smaller files and push partially-covered files higher. (63.8% → 81.7%)

## Mocking Strategy Notes

- **Monaco Editor**: Mock `@monaco-editor/react` returning a `<textarea>` — covers `TurtleEditor` and `OntologySourceEditor`
- **ReactFlow**: Mock `@xyflow/react` — covers `OntologyGraph`, `GitGraph`
- **React Query**: Use `QueryClientProvider` wrapper in test utils — already likely in place
- **BranchContext/ToastContext**: Wrap renders in providers with controlled values
- **Next.js**: Mock `next/navigation` (`useRouter`, `useParams`, `useSearchParams`)

## Progress Log

| Date | Action | Coverage (lines) |
|------|--------|----------|
| 2026-04-08 | Starting point | 42.2% |
| 2026-04-08 | Step 1: lib/ gaps (client, lint, collab, useProjectViewer, sitemap) | 46.6% |
| 2026-04-08 | Step 2: Shared test infrastructure (mock helpers) | — |
| 2026-04-08 | Step 3: Tier 1 components (10 largest files) | 57.5% |
| 2026-04-08 | Step 4: Tier 2 components (PR, revision, editor, projects) | 63.8% |
| 2026-04-08 | Step 5: Tier 3+4 mop-up (remaining 0% files) | 81.7% |
