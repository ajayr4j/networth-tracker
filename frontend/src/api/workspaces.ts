import { isAxiosError } from "axios";
import { apiClient } from "./client";

export type Member = {
  id: number;
  email: string;
  display_name: string;
  joined_at: string;
};

export type Workspace = {
  id: number;
  name: string;
  created_by: number;
  created_at: string;
  members: Member[];
};

export type Invite = {
  id: number;
  code: string;
  created_at: string;
  expires_at: string;
};

export async function getMine(): Promise<Workspace | null> {
  try {
    const response = await apiClient.get<Workspace>("/workspaces/mine/");
    return response.data;
  } catch (err) {
    if (isAxiosError(err) && err.response?.status === 404) {
      return null;
    }
    throw err;
  }
}

export async function createWorkspace(name: string): Promise<Workspace> {
  const response = await apiClient.post<Workspace>("/workspaces/", { name });
  return response.data;
}

export async function createInvite(workspaceId: number): Promise<Invite> {
  const response = await apiClient.post<Invite>(`/workspaces/${workspaceId}/invites/`);
  return response.data;
}

export async function redeemInvite(code: string): Promise<Workspace> {
  const response = await apiClient.post<Workspace>("/invites/redeem/", { code });
  return response.data;
}
