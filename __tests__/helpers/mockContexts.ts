/**
 * Shared context mocks for BranchContext and ToastContext.
 *
 * Usage in test files:
 *   vi.mock("@/lib/context/BranchContext", () => branchContextMock());
 *   vi.mock("@/lib/context/ToastContext", () => toastContextMock());
 */
import { vi } from "vitest";

export function branchContextMock(overrides?: {
  activeBranch?: string;
  branches?: string[];
  isLoading?: boolean;
}) {
  const switchBranch = vi.fn();
  const refreshBranches = vi.fn();

  return {
    useBranch: () => ({
      activeBranch: overrides?.activeBranch ?? "main",
      branches: overrides?.branches ?? ["main", "dev"],
      isLoading: overrides?.isLoading ?? false,
      switchBranch,
      refreshBranches,
      defaultBranch: "main",
    }),
    BranchProvider: ({ children }: { children: React.ReactNode }) => children,
    __switchBranch: switchBranch,
    __refreshBranches: refreshBranches,
  };
}

export function toastContextMock() {
  const success = vi.fn();
  const error = vi.fn();
  const info = vi.fn();
  const dismiss = vi.fn();

  return {
    useToast: () => ({ success, error, info, dismiss }),
    ToastProvider: ({ children }: { children: React.ReactNode }) => children,
    __success: success,
    __error: error,
    __info: info,
    __dismiss: dismiss,
  };
}
