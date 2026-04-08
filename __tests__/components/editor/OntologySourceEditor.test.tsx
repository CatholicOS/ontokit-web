import React, { createRef } from "react";
import { describe, expect, it, vi, beforeEach, type Mock } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ── Mocks ──

// Mock TurtleEditor as a simple textarea so we can test change/save flow
vi.mock("@/components/editor/TurtleEditor", () => ({
  TurtleEditor: (props: {
    value: string;
    onChange?: (v: string) => void;
    readOnly?: boolean;
    onReady?: (editor: unknown) => void;
    "data-testid"?: string;
  }) => {
    // Simulate onReady on mount
    React.useEffect(() => {
      props.onReady?.({
        revealLineInCenter: vi.fn(),
        setPosition: vi.fn(),
        focus: vi.fn(),
        getModel: () => ({
          getValue: () => props.value,
          getLineCount: () => props.value.split("\n").length,
          getLineMaxColumn: () => 1,
        }),
        executeEdits: vi.fn(),
      });
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return React.createElement("textarea", {
      "data-testid": "turtle-editor",
      value: props.value,
      readOnly: props.readOnly,
      onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) =>
        props.onChange?.(e.target.value),
    });
  },
}));

vi.mock("@/lib/api/lint", () => ({
  lintApi: {
    getIssues: vi.fn().mockResolvedValue({
      items: [],
      total: 0,
      skip: 0,
      limit: 100,
    }),
  },
}));

// Stub Web Worker globally (jsdom has no Worker)
class MockWorker {
  onmessage: ((e: MessageEvent) => void) | null = null;
  onerror: ((e: ErrorEvent) => void) | null = null;
  postMessage() {
    // Auto-respond with an empty but valid result so diagnosticsReady becomes true
    setTimeout(() => {
      this.onmessage?.({
        data: {
          diagnostics: [],
          positions: [],
          iriIndex: [],
          iriLabels: [],
          stats: { linesProcessed: 0, irisIndexed: 0, localNamesIndexed: 0, issuesMatched: 0, timeMs: 0 },
        },
      } as unknown as MessageEvent);
    }, 0);
  }
  terminate() {}
}
vi.stubGlobal("Worker", MockWorker);
// URL constructor is used with import.meta.url in the component
vi.stubGlobal("URL", class extends globalThis.URL {
  constructor(input: string | URL, base?: string | URL) {
    super(typeof input === "string" && !input.startsWith("http") ? `http://test/${input}` : input, base);
  }
});

import {
  OntologySourceEditor,
  type OntologySourceEditorRef,
} from "@/components/editor/OntologySourceEditor";
import { lintApi } from "@/lib/api/lint";

const mockGetIssues = lintApi.getIssues as Mock;

const SAMPLE_TURTLE = `@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .

<http://example.org/ontology#Person> a owl:Class ;
    rdfs:label "Person"@en .
`;

const DEFAULT_PROPS = {
  projectId: "proj-1",
  initialValue: SAMPLE_TURTLE,
  accessToken: "test-token",
};

describe("OntologySourceEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetIssues.mockResolvedValue({ items: [], total: 0, skip: 0, limit: 100 });
  });

  // ── Basic rendering ──

  it("renders the editor with initial value", () => {
    render(<OntologySourceEditor {...DEFAULT_PROPS} />);
    const editor = screen.getByTestId("turtle-editor") as HTMLTextAreaElement;
    expect(editor.value).toBe(SAMPLE_TURTLE);
  });

  it("renders Source Editor heading", () => {
    render(<OntologySourceEditor {...DEFAULT_PROPS} />);
    expect(screen.getByText("Source Editor")).toBeDefined();
  });

  // ── Toolbar buttons ──

  it("shows Save and Revert buttons in editable mode", () => {
    render(<OntologySourceEditor {...DEFAULT_PROPS} onSave={vi.fn()} />);
    expect(screen.getByText("Save")).toBeDefined();
    expect(screen.getByText("Revert")).toBeDefined();
  });

  it("hides Save and Revert buttons in read-only mode", () => {
    render(<OntologySourceEditor {...DEFAULT_PROPS} readOnly={true} />);
    expect(screen.queryByText("Save")).toBeNull();
    expect(screen.queryByText("Revert")).toBeNull();
  });

  // ── Save/Revert disabled state ──

  it("Save button is disabled when there are no changes", () => {
    render(<OntologySourceEditor {...DEFAULT_PROPS} onSave={vi.fn()} />);
    const saveBtn = screen.getByText("Save").closest("button")!;
    expect(saveBtn.disabled).toBe(true);
  });

  it("Revert button is disabled when there are no changes", () => {
    render(<OntologySourceEditor {...DEFAULT_PROPS} onSave={vi.fn()} />);
    const revertBtn = screen.getByText("Revert").closest("button")!;
    expect(revertBtn.disabled).toBe(true);
  });

  // ── Unsaved changes indicator ──

  it("shows 'Unsaved changes' badge when content changes", async () => {
    const user = userEvent.setup();
    render(<OntologySourceEditor {...DEFAULT_PROPS} onSave={vi.fn()} />);
    const editor = screen.getByTestId("turtle-editor");

    await user.clear(editor);
    await user.type(editor, "modified content");

    expect(screen.getByText("Unsaved changes")).toBeDefined();
  });

  it("enables Save and Revert buttons when content changes", async () => {
    const user = userEvent.setup();
    render(<OntologySourceEditor {...DEFAULT_PROPS} onSave={vi.fn()} />);
    const editor = screen.getByTestId("turtle-editor");

    await user.clear(editor);
    await user.type(editor, "modified content");

    const saveBtn = screen.getByText("Save").closest("button")!;
    const revertBtn = screen.getByText("Revert").closest("button")!;
    expect(saveBtn.disabled).toBe(false);
    expect(revertBtn.disabled).toBe(false);
  });

  // ── Save flow ──

  it("calls onSave when Save button is clicked", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<OntologySourceEditor {...DEFAULT_PROPS} onSave={onSave} />);
    const editor = screen.getByTestId("turtle-editor");

    await user.clear(editor);
    await user.type(editor, "new content");

    await user.click(screen.getByText("Save").closest("button")!);

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith("new content");
    });
  });

  it("shows save error when onSave rejects", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockRejectedValue(new Error("Save failed"));
    render(<OntologySourceEditor {...DEFAULT_PROPS} onSave={onSave} />);
    const editor = screen.getByTestId("turtle-editor");

    await user.clear(editor);
    await user.type(editor, "bad content");

    await user.click(screen.getByText("Save").closest("button")!);

    await waitFor(() => {
      expect(screen.getByText("Save failed")).toBeDefined();
    });
  });

  it("resets to original value when Revert is clicked", async () => {
    const user = userEvent.setup();
    render(<OntologySourceEditor {...DEFAULT_PROPS} onSave={vi.fn()} />);
    const editor = screen.getByTestId("turtle-editor") as HTMLTextAreaElement;

    await user.clear(editor);
    await user.type(editor, "modified");

    await user.click(screen.getByText("Revert").closest("button")!);

    expect(editor.value).toBe(SAMPLE_TURTLE);
  });

  // ── No issues indicator ──

  it("shows 'No issues' when lint returns empty list", async () => {
    render(<OntologySourceEditor {...DEFAULT_PROPS} />);

    await waitFor(() => {
      expect(screen.getByText("No issues")).toBeDefined();
    });
  });

  // ── Lint issues ──

  it("shows error and warning counts when lint issues exist", async () => {
    mockGetIssues.mockResolvedValue({
      items: [
        {
          id: "i1",
          run_id: "r1",
          project_id: "proj-1",
          issue_type: "error",
          rule_id: "ERR1",
          message: "An error",
          subject_iri: "http://example.org/A",
          details: null,
          created_at: "2024-01-01T00:00:00Z",
          resolved_at: null,
        },
        {
          id: "i2",
          run_id: "r1",
          project_id: "proj-1",
          issue_type: "warning",
          rule_id: "WARN1",
          message: "A warning",
          subject_iri: "http://example.org/B",
          details: null,
          created_at: "2024-01-01T00:00:00Z",
          resolved_at: null,
        },
        {
          id: "i3",
          run_id: "r1",
          project_id: "proj-1",
          issue_type: "warning",
          rule_id: "WARN2",
          message: "Another warning",
          subject_iri: "http://example.org/C",
          details: null,
          created_at: "2024-01-01T00:00:00Z",
          resolved_at: null,
        },
      ],
      total: 3,
      skip: 0,
      limit: 200,
    });

    render(<OntologySourceEditor {...DEFAULT_PROPS} />);

    await waitFor(() => {
      expect(screen.getAllByText(/1 errors?/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/2 warnings?/).length).toBeGreaterThanOrEqual(1);
    });
  });

  it("shows Problems panel with issue messages", async () => {
    mockGetIssues.mockResolvedValue({
      items: [
        {
          id: "i1",
          run_id: "r1",
          project_id: "proj-1",
          issue_type: "error",
          rule_id: "ERR1",
          message: "Missing label declaration",
          subject_iri: "http://example.org/A",
          details: null,
          created_at: "2024-01-01T00:00:00Z",
          resolved_at: null,
        },
      ],
      total: 1,
      skip: 0,
      limit: 200,
    });

    render(<OntologySourceEditor {...DEFAULT_PROPS} />);

    await waitFor(() => {
      expect(screen.getByText("Problems (1)")).toBeDefined();
      expect(screen.getByText("Missing label declaration")).toBeDefined();
      expect(screen.getByText("ERR1")).toBeDefined();
    });
  });

  // ── Fetching lint ──

  it("calls lintApi.getIssues with correct project ID and token", async () => {
    render(<OntologySourceEditor {...DEFAULT_PROPS} />);

    await waitFor(() => {
      expect(mockGetIssues).toHaveBeenCalledWith(
        "proj-1",
        "test-token",
        expect.objectContaining({ include_resolved: false, limit: 200 })
      );
    });
  });

  // ── Status bar ──

  it("shows line count in status bar", () => {
    render(<OntologySourceEditor {...DEFAULT_PROPS} />);
    const lineCount = SAMPLE_TURTLE.split("\n").length;
    expect(screen.getByText(`${lineCount} lines`)).toBeDefined();
  });

  // ── useImperativeHandle ref ──

  it("exposes scrollToIri, insertAtEnd, getValue via ref", async () => {
    const ref = createRef<OntologySourceEditorRef>();
    render(<OntologySourceEditor {...DEFAULT_PROPS} ref={ref} />);

    // Wait for the editor to be "ready" (onReady fires in mock useEffect)
    await waitFor(() => {
      expect(ref.current).not.toBeNull();
    });

    expect(typeof ref.current!.scrollToIri).toBe("function");
    expect(typeof ref.current!.insertAtEnd).toBe("function");
    expect(typeof ref.current!.getValue).toBe("function");
  });

  it("getValue returns current editor content", async () => {
    const ref = createRef<OntologySourceEditorRef>();
    render(<OntologySourceEditor {...DEFAULT_PROPS} ref={ref} />);

    await waitFor(() => {
      expect(ref.current).not.toBeNull();
    });

    const value = ref.current!.getValue();
    expect(value).toBe(SAMPLE_TURTLE);
  });

  // ── Plural / singular issue labels ──

  it("uses singular 'error' for a single error", async () => {
    mockGetIssues.mockResolvedValue({
      items: [
        {
          id: "i1",
          run_id: "r1",
          project_id: "proj-1",
          issue_type: "error",
          rule_id: "ERR1",
          message: "An error",
          subject_iri: null,
          details: null,
          created_at: "2024-01-01T00:00:00Z",
          resolved_at: null,
        },
      ],
      total: 1,
      skip: 0,
      limit: 200,
    });

    render(<OntologySourceEditor {...DEFAULT_PROPS} />);

    await waitFor(() => {
      expect(screen.getByText(/1 error\b/)).toBeDefined();
    });
  });

  it("uses plural 'errors' for multiple errors", async () => {
    mockGetIssues.mockResolvedValue({
      items: [
        {
          id: "i1", run_id: "r1", project_id: "proj-1", issue_type: "error",
          rule_id: "ERR1", message: "Error 1", subject_iri: null,
          details: null, created_at: "2024-01-01T00:00:00Z", resolved_at: null,
        },
        {
          id: "i2", run_id: "r1", project_id: "proj-1", issue_type: "error",
          rule_id: "ERR2", message: "Error 2", subject_iri: null,
          details: null, created_at: "2024-01-01T00:00:00Z", resolved_at: null,
        },
      ],
      total: 2,
      skip: 0,
      limit: 200,
    });

    render(<OntologySourceEditor {...DEFAULT_PROPS} />);

    await waitFor(() => {
      expect(screen.getAllByText(/2 errors/).length).toBeGreaterThanOrEqual(1);
    });
  });
});
