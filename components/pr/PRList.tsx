"use client";

import { useCallback, useEffect, useState } from "react";
import {
  pullRequestsApi,
  type PRStatus,
  type PullRequest,
} from "@/lib/api/pullRequests";
import { PRListItem } from "./PRListItem";
import { cn } from "@/lib/utils";
import { GitPullRequest } from "lucide-react";
import type { EditorMode } from "@/lib/stores/editorModeStore";

interface PRListProps {
  projectId: string;
  accessToken?: string;
  defaultStatus?: PRStatus | "all";
  mode?: EditorMode;
  /**
   * Restrict the list to one author. Reviewers (owner/admin) leave this unset
   * to see everyone's; everyone else passes their own id so a list titled
   * "My Suggestions" / "My Pull Requests" actually only contains theirs.
   */
  authorId?: string;
  className?: string;
}

export function PRList({
  projectId,
  accessToken,
  defaultStatus = "open",
  mode = "developer",
  authorId,
  className,
}: PRListProps) {
  const isSuggestionMode = mode === "standard";
  const [prs, setPrs] = useState<PullRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<PRStatus | "all">(defaultStatus);
  const [skip, setSkip] = useState(0);
  const limit = 20;

  const loadPRs = useCallback(async () => {
    if (!projectId) return;

    setIsLoading(true);
    setError(null);

    try {
      const status = statusFilter === "all" ? undefined : statusFilter;
      const response = await pullRequestsApi.list(
        projectId,
        accessToken,
        status,
        authorId,
        skip,
        limit
      );
      setPrs(response.items);
      setTotal(response.total);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load pull requests";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [projectId, accessToken, statusFilter, authorId, skip]);

  useEffect(() => {
    loadPRs();
  }, [loadPRs]);

  const handleStatusChange = (newStatus: PRStatus | "all") => {
    setStatusFilter(newStatus);
    setSkip(0);
  };

  // The list is either scoped to the signed-in user (authorId set) or shows the
  // whole project, so the empty state has to speak in the matching voice —
  // "You have no…" vs "There are no…".
  const isScopedToViewer = !!authorId;
  const noun = isSuggestionMode ? "suggestion" : "pull request";
  const emptyStateMessage = (() => {
    if (statusFilter === "open") {
      return isScopedToViewer
        ? `You have no open ${noun}s.`
        : `There are no open ${noun}s for this project.`;
    }
    if (statusFilter === "merged") {
      const verb = isSuggestionMode ? "accepted" : "merged";
      return isScopedToViewer
        ? `None of your ${noun}s have been ${verb} yet.`
        : `No ${noun}s have been ${verb} yet.`;
    }
    if (statusFilter === "closed") {
      const verb = isSuggestionMode ? "rejected" : "closed";
      return isScopedToViewer
        ? `None of your ${noun}s have been ${verb}.`
        : `No ${noun}s have been ${verb}.`;
    }
    const verb = isSuggestionMode ? "submitted" : "created";
    return isScopedToViewer
      ? `You have not ${verb} any ${noun}s yet.`
      : `No ${noun}s have been ${verb} for this project.`;
  })();

  const statusTabs: { value: PRStatus | "all"; label: string }[] = [
    { value: "open", label: "Open" },
    { value: "merged", label: isSuggestionMode ? "Accepted" : "Merged" },
    { value: "closed", label: isSuggestionMode ? "Rejected" : "Closed" },
    { value: "all", label: "All" },
  ];

  return (
    <div className={cn("space-y-4", className)}>
      {/* Filters */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
          {statusTabs.map((tab) => (
            <button
              key={tab.value}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                statusFilter === tab.value
                  ? "bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-slate-100"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              )}
              onClick={() => handleStatusChange(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <span className="text-sm text-slate-500">
          {total} {total === 1 ? noun : `${noun}s`}
        </span>
      </div>

      {/* Loading state */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-8 text-center text-red-600 dark:border-red-900 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      ) : prs.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-12 text-center dark:border-slate-700 dark:bg-slate-800/50">
          <GitPullRequest className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600" />
          <h3 className="mt-4 font-medium text-slate-900 dark:text-slate-100">
            {isSuggestionMode ? "No suggestions" : "No pull requests"}
          </h3>
          <p className="mt-1 text-sm text-slate-500">{emptyStateMessage}</p>
        </div>
      ) : (
        <>
          {/* PR List */}
          <div className="space-y-3">
            {prs.map((pr) => (
              <PRListItem key={pr.id} pr={pr} projectId={projectId} mode={mode} />
            ))}
          </div>

          {/* Pagination */}
          {total > limit && (
            <div className="flex items-center justify-between border-t border-slate-200 pt-4 dark:border-slate-700">
              <button
                className="text-sm text-slate-600 hover:text-slate-900 disabled:opacity-50 dark:text-slate-400 dark:hover:text-slate-100"
                disabled={skip === 0}
                onClick={() => setSkip(Math.max(0, skip - limit))}
              >
                Previous
              </button>
              <span className="text-sm text-slate-500">
                {skip + 1}-{Math.min(skip + limit, total)} of {total}
              </span>
              <button
                className="text-sm text-slate-600 hover:text-slate-900 disabled:opacity-50 dark:text-slate-400 dark:hover:text-slate-100"
                disabled={skip + limit >= total}
                onClick={() => setSkip(skip + limit)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
