import { useQuery } from "@tanstack/react-query";
import { suggestionsApi, type SuggestionSessionSummary } from "@/lib/api/suggestions";

export const suggestionSessionQueryKeys = {
  list: (projectId: string) => ["suggestionSessions", projectId] as const,
};

/**
 * Suggestion sessions for a project.
 *
 * Server state, so it is owned by React Query rather than mirrored into
 * component state by a fetch-in-effect.
 */
export function useSuggestionSessions(projectId: string, accessToken?: string) {
  const query = useQuery({
    queryKey: suggestionSessionQueryKeys.list(projectId),
    queryFn: () => suggestionsApi.listSessions(projectId, accessToken!),
    enabled: !!projectId && !!accessToken,
  });

  return {
    sessions: (query.data?.items ?? []) as SuggestionSessionSummary[],
    // A disabled query stays "pending" forever, so callers that are not signed
    // in must not be told the list is still loading.
    isLoading: !!projectId && !!accessToken && query.isPending,
    error: query.error
      ? query.error instanceof Error
        ? query.error.message
        : "Failed to load suggestions"
      : null,
    refetch: query.refetch,
  };
}
