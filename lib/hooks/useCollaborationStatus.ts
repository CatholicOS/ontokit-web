"use client";

import type { ConnectionState } from "@/components/ui/ConnectionStatus";

/**
 * Hook for real-time collaboration presence status.
 * Currently disabled — the /collab/ws endpoint does not exist yet.
 * When the endpoint is available, this hook should establish a WebSocket
 * connection and return live presence/connection state.
 */
export function useCollaborationStatus(_options: { projectId: string; enabled?: boolean }) {
  const status: ConnectionState = "disabled";

  return {
    status,
    isConnected: false,
    /** The collaboration WebSocket endpoint path (not yet available) */
    endpoint: "/api/v1/collab/ws",
    /** Description of what this connection is for */
    purpose: "Real-time collaboration (coming soon)",
  };
}
