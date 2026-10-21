import { apiClient } from "./client";

export type EventType =
  | "holding_created"
  | "valuation_updated"
  | "holding_archived"
  | "milestone_achieved"
  | "checkin_created"
  | "partner_joined";

export type ActivityLogEntry = {
  id: number;
  event_type: EventType;
  description: string;
  metadata: Record<string, unknown>;
  actor_email: string | null;
  created_at: string;
};

export type MonthlyCheckIn = {
  id: number;
  month: string;
  notes: string;
  actions: string;
  created_by_email: string | null;
  created_at: string;
};

export type CreateCheckInInput = {
  month: string;
  notes?: string;
  actions?: string;
};

export type Milestone = {
  id: number;
  amount: number;
  label: string;
  achieved: boolean;
  achieved_at: string | null;
};

export async function getTimeline(): Promise<ActivityLogEntry[]> {
  const { data } = await apiClient.get<ActivityLogEntry[]>("/timeline/");
  return data;
}

export async function getCheckIns(): Promise<MonthlyCheckIn[]> {
  const { data } = await apiClient.get<MonthlyCheckIn[]>("/checkins/");
  return data;
}

export async function createCheckIn(
  input: CreateCheckInInput,
): Promise<MonthlyCheckIn> {
  const { data } = await apiClient.post<MonthlyCheckIn>("/checkins/", input);
  return data;
}

export async function getMilestones(): Promise<Milestone[]> {
  const { data } = await apiClient.get<Milestone[]>("/milestones/");
  return data;
}
