import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useWorkspace } from "../context/WorkspaceContext";

export function RequireWorkspace({ children }: { children: ReactNode }) {
  const { workspace, isLoading } = useWorkspace();

  if (isLoading) {
    return null;
  }

  if (!workspace) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
