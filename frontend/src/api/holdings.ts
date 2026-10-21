import { apiClient } from "./client";

export type HoldingKind = "asset" | "liability";

export type HoldingCategory =
  | "stocks"
  | "mutual_fund"
  | "cash"
  | "fixed_deposit"
  | "property"
  | "business_equity"
  | "loan"
  | "other";

export type OwnerType = "individual" | "joint";

export type Valuation = {
  id: number;
  value: string;
  as_of: string;
  created_at: string;
};

export type Holding = {
  id: number;
  kind: HoldingKind;
  category: HoldingCategory;
  label: string;
  owner_type: OwnerType;
  owner_user: number | null;
  owner_email: string | null;
  archived_at: string | null;
  created_at: string;
  current_value: number | null;
  valuations: Valuation[];
};

export type CreateHoldingInput = {
  kind: HoldingKind;
  category: HoldingCategory;
  label: string;
  owner_type: OwnerType;
  owner_user?: number | null;
  value: string;
  as_of?: string;
};

export type UpdateValueInput = {
  value: string;
  as_of?: string;
};

export async function listHoldings(): Promise<Holding[]> {
  const response = await apiClient.get<Holding[]>("/holdings/");
  return response.data;
}

export async function createHolding(data: CreateHoldingInput): Promise<Holding> {
  const response = await apiClient.post<Holding>("/holdings/", data);
  return response.data;
}

export async function updateHoldingValue(
  holdingId: number,
  data: UpdateValueInput,
): Promise<Holding> {
  const response = await apiClient.patch<Holding>(`/holdings/${holdingId}/value/`, data);
  return response.data;
}

export async function archiveHolding(holdingId: number): Promise<void> {
  await apiClient.delete(`/holdings/${holdingId}/`);
}

export type HistoricalPoint = {
  date: string;
  net_worth: number;
};

export type DashboardData = {
  target_net_worth: number;
  net_worth: number;
  remaining: number;
  percent_complete: number;
  historical_series: HistoricalPoint[];
};

export async function getDashboard(): Promise<DashboardData> {
  const response = await apiClient.get<DashboardData>("/dashboard/");
  return response.data;
}
