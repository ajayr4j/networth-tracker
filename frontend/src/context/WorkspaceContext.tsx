import { useQuery } from "@tanstack/react-query";
import { createContext, useContext, type ReactNode } from "react";
import * as workspacesApi from "../api/workspaces";
import type { Workspace } from "../api/workspaces";
import { useAuth } from "./AuthContext";

type WorkspaceContextValue = {
  workspace: Workspace | null;
  isLoading: boolean;
  refetch: () => Promise<unknown>;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["workspace", "mine"],
    queryFn: workspacesApi.getMine,
    enabled: !!user,
    retry: false,
  });

  return (
    <WorkspaceContext.Provider value={{ workspace: data ?? null, isLoading, refetch }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return ctx;
}
