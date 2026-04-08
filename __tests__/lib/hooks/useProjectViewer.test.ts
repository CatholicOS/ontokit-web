import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import type { Project } from "@/lib/api/projects";

// --- Mocks ---

const mockUseProject = vi.fn();
const mockDerivePermissions = vi.fn();

vi.mock("@/lib/hooks/useProject", () => ({
  useProject: (...args: unknown[]) => mockUseProject(...args),
  derivePermissions: (...args: unknown[]) => mockDerivePermissions(...args),
}));

vi.mock("@/lib/hooks/useOntologyTree", () => ({
  useOntologyTree: vi.fn().mockReturnValue({
    nodes: [],
    totalClasses: 0,
    isLoading: false,
    error: null,
    selectedIri: null,
    loadRootClasses: vi.fn(),
    expandNode: vi.fn(),
    collapseNode: vi.fn(),
    selectNode: vi.fn(),
    navigateToNode: vi.fn(),
    addOptimisticNode: vi.fn(),
    removeOptimisticNode: vi.fn(),
    updateNodeLabel: vi.fn(),
    collapseAll: vi.fn(),
    collapseOneLevel: vi.fn(),
    expandOneLevel: vi.fn(),
    expandAllFully: vi.fn(),
    hasExpandableNodes: false,
    hasExpandedNodes: false,
    isExpandingAll: false,
    reparentOptimistic: vi.fn(),
    rollbackReparent: vi.fn(),
  }),
}));

vi.mock("@/lib/hooks/useCollaborationStatus", () => ({
  useCollaborationStatus: vi.fn().mockReturnValue({
    status: "disconnected",
    endpoint: "",
    purpose: "",
  }),
}));

vi.mock("@/lib/api/pullRequests", () => ({
  pullRequestsApi: {
    list: vi.fn().mockResolvedValue({ total: 3, items: [] }),
  },
}));

vi.mock("@/lib/api/lint", () => ({
  lintApi: {
    getStatus: vi.fn().mockResolvedValue({
      project_id: "p1",
      last_run: null,
      error_count: 1,
      warning_count: 2,
      info_count: 0,
      total_issues: 3,
    }),
  },
}));

vi.mock("@/lib/api/normalization", () => ({
  normalizationApi: {
    getStatus: vi.fn().mockResolvedValue({
      needs_normalization: false,
      last_run: null,
      last_run_id: null,
      last_check: null,
      preview_report: null,
      checking: false,
      error: null,
    }),
  },
}));

vi.mock("@/lib/api/revisions", () => ({
  revisionsApi: {
    getFileAtVersion: vi.fn().mockResolvedValue({ content: "@prefix ex: <http://example.org/> .\nex:A a owl:Class ." }),
  },
}));

vi.mock("@/lib/api/suggestions", () => ({
  suggestionsApi: {
    listPending: vi.fn().mockResolvedValue({ items: [{ id: "s1" }] }),
  },
}));

import { useProjectViewer } from "@/lib/hooks/useProjectViewer";
import { pullRequestsApi } from "@/lib/api/pullRequests";
import { lintApi } from "@/lib/api/lint";
import { normalizationApi } from "@/lib/api/normalization";
import { suggestionsApi } from "@/lib/api/suggestions";

function makeProject(overrides?: Partial<Project>): Project {
  return {
    id: "p1",
    name: "Test Ontology",
    is_public: true,
    owner_id: "u1",
    created_at: "2025-01-01T00:00:00Z",
    member_count: 1,
    source_file_path: "ontology.ttl",
    git_ontology_path: "ontology.ttl",
    user_role: "editor",
    ...overrides,
  } as Project;
}

function defaultPermissions(overrides?: Record<string, unknown>) {
  return {
    canManage: false,
    canEdit: true,
    canSuggest: true,
    isSuggester: false,
    isSuggestionMode: false,
    hasValidAccess: true,
    hasOntology: true,
    hasExplicitRole: true,
    ...overrides,
  };
}

describe("useProjectViewer", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseProject.mockReturnValue({
      project: null,
      isLoading: true,
      error: null,
      errorKind: null,
    });
    mockDerivePermissions.mockReturnValue(defaultPermissions());
  });

  it("returns loading state initially", () => {
    const { result } = renderHook(() =>
      useProjectViewer({
        projectId: "p1",
        accessToken: "tok",
        sessionStatus: "authenticated",
        activeBranch: "main",
      })
    );

    expect(result.current.isLoading).toBe(true);
    expect(result.current.project).toBeNull();
  });

  it("propagates project data once loaded", async () => {
    const project = makeProject();
    mockUseProject.mockReturnValue({
      project,
      isLoading: false,
      error: null,
      errorKind: null,
    });

    const { result } = renderHook(() =>
      useProjectViewer({
        projectId: "p1",
        accessToken: "tok",
        sessionStatus: "authenticated",
        activeBranch: "main",
      })
    );

    expect(result.current.project).toBe(project);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("propagates error state", () => {
    mockUseProject.mockReturnValue({
      project: null,
      isLoading: false,
      error: "Not found",
      errorKind: "not-found",
    });

    const { result } = renderHook(() =>
      useProjectViewer({
        projectId: "p1",
        accessToken: "tok",
        sessionStatus: "authenticated",
        activeBranch: "main",
      })
    );

    expect(result.current.error).toBe("Not found");
    expect(result.current.errorKind).toBe("not-found");
  });

  it("passes through permission flags from derivePermissions", () => {
    const project = makeProject();
    mockUseProject.mockReturnValue({
      project,
      isLoading: false,
      error: null,
      errorKind: null,
    });
    mockDerivePermissions.mockReturnValue(
      defaultPermissions({ canManage: true, canEdit: true })
    );

    const { result } = renderHook(() =>
      useProjectViewer({
        projectId: "p1",
        accessToken: "tok",
        sessionStatus: "authenticated",
        activeBranch: "main",
      })
    );

    expect(result.current.canManage).toBe(true);
    expect(result.current.canEdit).toBe(true);
    expect(result.current.hasOntology).toBe(true);
  });

  it("overrides hasValidAccess based on sessionStatus", () => {
    const project = makeProject();
    mockUseProject.mockReturnValue({
      project,
      isLoading: false,
      error: null,
      errorKind: null,
    });
    mockDerivePermissions.mockReturnValue(
      defaultPermissions({ hasValidAccess: true })
    );

    // Unauthenticated session means hasValidAccess should be false
    const { result } = renderHook(() =>
      useProjectViewer({
        projectId: "p1",
        accessToken: undefined,
        sessionStatus: "unauthenticated",
        activeBranch: "main",
      })
    );

    expect(result.current.hasValidAccess).toBe(false);
  });

  it("fetches secondary data (openPRCount, lintSummary) when project loads", async () => {
    const project = makeProject();
    mockUseProject.mockReturnValue({
      project,
      isLoading: false,
      error: null,
      errorKind: null,
    });

    const { result } = renderHook(() =>
      useProjectViewer({
        projectId: "p1",
        accessToken: "tok",
        sessionStatus: "authenticated",
        activeBranch: "main",
      })
    );

    await waitFor(() => {
      expect(result.current.openPRCount).toBe(3);
    });

    await waitFor(() => {
      expect(result.current.lintSummary).not.toBeNull();
      expect(result.current.lintSummary?.total_issues).toBe(3);
    });

    expect(pullRequestsApi.list).toHaveBeenCalledWith("p1", "tok", "open", undefined, 0, 1);
    expect(lintApi.getStatus).toHaveBeenCalledWith("p1", "tok");
  });

  it("fetches normalization status when project has source_file_path", async () => {
    const project = makeProject({ source_file_path: "ont.ttl" });
    mockUseProject.mockReturnValue({
      project,
      isLoading: false,
      error: null,
      errorKind: null,
    });

    const { result } = renderHook(() =>
      useProjectViewer({
        projectId: "p1",
        accessToken: "tok",
        sessionStatus: "authenticated",
        activeBranch: "main",
      })
    );

    await waitFor(() => {
      expect(result.current.normalizationStatus).not.toBeNull();
    });

    expect(normalizationApi.getStatus).toHaveBeenCalledWith("p1", "tok");
  });

  it("does not fetch normalization status when no source_file_path", async () => {
    const project = makeProject({ source_file_path: undefined });
    mockUseProject.mockReturnValue({
      project,
      isLoading: false,
      error: null,
      errorKind: null,
    });

    renderHook(() =>
      useProjectViewer({
        projectId: "p1",
        accessToken: "tok",
        sessionStatus: "authenticated",
        activeBranch: "main",
      })
    );

    // Wait for secondary effects to complete
    await waitFor(() => {
      expect(pullRequestsApi.list).toHaveBeenCalled();
    });

    expect(normalizationApi.getStatus).not.toHaveBeenCalled();
  });

  it("fetches pending suggestions when canEdit and has accessToken", async () => {
    const project = makeProject();
    mockUseProject.mockReturnValue({
      project,
      isLoading: false,
      error: null,
      errorKind: null,
    });
    mockDerivePermissions.mockReturnValue(defaultPermissions({ canEdit: true }));

    const { result } = renderHook(() =>
      useProjectViewer({
        projectId: "p1",
        accessToken: "tok",
        sessionStatus: "authenticated",
        activeBranch: "main",
      })
    );

    await waitFor(() => {
      expect(result.current.pendingSuggestionCount).toBe(1);
    });

    expect(suggestionsApi.listPending).toHaveBeenCalledWith("p1", "tok");
  });

  it("does not fetch suggestions when canEdit is false", async () => {
    const project = makeProject();
    mockUseProject.mockReturnValue({
      project,
      isLoading: false,
      error: null,
      errorKind: null,
    });
    mockDerivePermissions.mockReturnValue(defaultPermissions({ canEdit: false }));

    renderHook(() =>
      useProjectViewer({
        projectId: "p1",
        accessToken: "tok",
        sessionStatus: "authenticated",
        activeBranch: "main",
      })
    );

    // Wait for other effects
    await waitFor(() => {
      expect(pullRequestsApi.list).toHaveBeenCalled();
    });

    expect(suggestionsApi.listPending).not.toHaveBeenCalled();
  });

  it("exposes tree properties from useOntologyTree", () => {
    mockUseProject.mockReturnValue({
      project: makeProject(),
      isLoading: false,
      error: null,
      errorKind: null,
    });

    const { result } = renderHook(() =>
      useProjectViewer({
        projectId: "p1",
        accessToken: "tok",
        sessionStatus: "authenticated",
        activeBranch: "main",
      })
    );

    expect(result.current.nodes).toEqual([]);
    expect(result.current.totalClasses).toBe(0);
    expect(result.current.isTreeLoading).toBe(false);
    expect(result.current.treeError).toBeNull();
  });

  it("exposes collaboration status", () => {
    mockUseProject.mockReturnValue({
      project: makeProject(),
      isLoading: false,
      error: null,
      errorKind: null,
    });

    const { result } = renderHook(() =>
      useProjectViewer({
        projectId: "p1",
        accessToken: "tok",
        sessionStatus: "authenticated",
        activeBranch: "main",
      })
    );

    expect(result.current.connectionStatus).toBe("disconnected");
  });

  it("exposes source state with defaults", () => {
    mockUseProject.mockReturnValue({
      project: makeProject(),
      isLoading: false,
      error: null,
      errorKind: null,
    });

    const { result } = renderHook(() =>
      useProjectViewer({
        projectId: "p1",
        accessToken: "tok",
        sessionStatus: "authenticated",
        activeBranch: "main",
      })
    );

    expect(result.current.sourceContent).toBe("");
    expect(result.current.isLoadingSource).toBe(false);
    expect(result.current.sourceError).toBeNull();
    expect(result.current.isPreloading).toBe(false);
    expect(result.current.sourceIriIndex.size).toBe(0);
    expect(result.current.isIndexing).toBe(false);
    expect(typeof result.current.loadSourceContent).toBe("function");
    expect(typeof result.current.resetSourceState).toBe("function");
  });

  it("does not fetch secondary data when project is null", async () => {
    mockUseProject.mockReturnValue({
      project: null,
      isLoading: false,
      error: "Not found",
      errorKind: "not-found",
    });

    renderHook(() =>
      useProjectViewer({
        projectId: "p1",
        accessToken: "tok",
        sessionStatus: "authenticated",
        activeBranch: "main",
      })
    );

    // Give effects time to fire (they shouldn't)
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(pullRequestsApi.list).not.toHaveBeenCalled();
    expect(lintApi.getStatus).not.toHaveBeenCalled();
  });
});
