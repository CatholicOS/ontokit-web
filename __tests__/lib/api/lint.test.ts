import { describe, expect, it, vi, beforeEach } from "vitest";
import { ApiError } from "@/lib/api/client";
import { lintApi } from "@/lib/api/lint";

const mockFetch = vi.fn();
global.fetch = mockFetch;

function mockOk(data: unknown) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    text: () => Promise.resolve(JSON.stringify(data)),
  });
}

function mockEmpty() {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    text: () => Promise.resolve(""),
  });
}

function mockError(status: number, statusText: string, body: string) {
  mockFetch.mockResolvedValueOnce({
    ok: false,
    status,
    statusText,
    text: () => Promise.resolve(body),
  });
}

describe("lintApi", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  // --- triggerLint ---

  describe("triggerLint", () => {
    it("calls POST /api/v1/projects/:id/lint/run with auth", async () => {
      const response = { job_id: "j1", status: "queued", message: "Lint started" };
      mockOk(response);

      const result = await lintApi.triggerLint("p1", "tok");
      expect(result).toEqual(response);

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain("/api/v1/projects/p1/lint/run");
      expect(options.method).toBe("POST");
      expect(options.headers.get("Authorization")).toBe("Bearer tok");
    });

    it("throws ApiError on 403 with correct status", async () => {
      mockError(403, "Forbidden", "Not authorized");

      try {
        await lintApi.triggerLint("p1", "tok");
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        expect((err as ApiError).status).toBe(403);
      }
    });
  });

  // --- getStatus ---

  describe("getStatus", () => {
    it("calls GET /api/v1/projects/:id/lint/status", async () => {
      const summary = {
        project_id: "p1",
        last_run: null,
        error_count: 0,
        warning_count: 0,
        info_count: 0,
        total_issues: 0,
      };
      mockOk(summary);

      const result = await lintApi.getStatus("p1", "tok");
      expect(result).toEqual(summary);

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain("/api/v1/projects/p1/lint/status");
      expect(options.headers.get("Authorization")).toBe("Bearer tok");
    });

    it("omits auth header when no token", async () => {
      mockOk({ project_id: "p1", last_run: null, error_count: 0, warning_count: 0, info_count: 0, total_issues: 0 });

      await lintApi.getStatus("p1");

      const [, options] = mockFetch.mock.calls[0];
      expect(options.headers.has("Authorization")).toBe(false);
    });
  });

  // --- listRuns ---

  describe("listRuns", () => {
    it("calls GET /api/v1/projects/:id/lint/runs with pagination", async () => {
      mockOk({ items: [], total: 0, skip: 5, limit: 10 });

      await lintApi.listRuns("p1", "tok", { skip: 5, limit: 10 });

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain("/api/v1/projects/p1/lint/runs");
      expect(url).toContain("skip=5");
      expect(url).toContain("limit=10");
    });

    it("works without options", async () => {
      mockOk({ items: [], total: 0, skip: 0, limit: 20 });

      await lintApi.listRuns("p1");

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain("/api/v1/projects/p1/lint/runs");
    });
  });

  // --- getRun ---

  describe("getRun", () => {
    it("calls GET /api/v1/projects/:id/lint/runs/:runId", async () => {
      const run = { id: "r1", project_id: "p1", status: "completed", issues: [] };
      mockOk(run);

      const result = await lintApi.getRun("p1", "r1", "tok");
      expect(result).toEqual(run);

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain("/api/v1/projects/p1/lint/runs/r1");
    });

    it("omits auth header when no token", async () => {
      mockOk({ id: "r1" });

      await lintApi.getRun("p1", "r1");

      const [, options] = mockFetch.mock.calls[0];
      expect(options.headers.has("Authorization")).toBe(false);
    });
  });

  // --- getIssues ---

  describe("getIssues", () => {
    it("calls GET /api/v1/projects/:id/lint/issues with filters", async () => {
      mockOk({ items: [], total: 0, skip: 0, limit: 50 });

      await lintApi.getIssues("p1", "tok", {
        issue_type: "error",
        rule_id: "R001",
        include_resolved: true,
        skip: 0,
        limit: 50,
      });

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain("/api/v1/projects/p1/lint/issues");
      expect(url).toContain("issue_type=error");
      expect(url).toContain("rule_id=R001");
      expect(url).toContain("include_resolved=true");
    });

    it("works without options", async () => {
      mockOk({ items: [], total: 0, skip: 0, limit: 20 });

      await lintApi.getIssues("p1");

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain("/api/v1/projects/p1/lint/issues");
    });

    it("passes subject_iri filter with full encoded value", async () => {
      mockOk({ items: [], total: 0, skip: 0, limit: 20 });

      await lintApi.getIssues("p1", "tok", { subject_iri: "http://example.org/Class1" });

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain("subject_iri=" + encodeURIComponent("http://example.org/Class1"));
    });
  });

  // --- dismissIssue ---

  describe("dismissIssue", () => {
    it("calls DELETE /api/v1/projects/:id/lint/issues/:issueId", async () => {
      mockEmpty();

      await lintApi.dismissIssue("p1", "i1", "tok");

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain("/api/v1/projects/p1/lint/issues/i1");
      expect(options.method).toBe("DELETE");
      expect(options.headers.get("Authorization")).toBe("Bearer tok");
    });
  });

  // --- getRules ---

  describe("getRules", () => {
    it("calls GET /api/v1/projects/lint/rules without auth", async () => {
      const rules = {
        rules: [
          { rule_id: "R001", name: "Missing label", description: "Class has no label", severity: "warning" },
        ],
      };
      mockOk(rules);

      const result = await lintApi.getRules();
      expect(result).toEqual(rules);

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain("/api/v1/projects/lint/rules");
      expect(options.method).toBe("GET");
    });
  });
});
