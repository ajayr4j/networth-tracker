import { apiClient } from "./client";

export type ProjectionSettings = {
  monthly_contribution: string;
  conservative_rate: string;
  base_rate: string;
  optimistic_rate: string;
  updated_at: string;
};

export type UpdateProjectionSettingsInput = Partial<{
  monthly_contribution: string;
  conservative_rate: string;
  base_rate: string;
  optimistic_rate: string;
}>;

export type TrajectoryPoint = {
  date: string;
  net_worth: number;
};

export type Scenario = {
  annual_rate: number;
  trajectory: TrajectoryPoint[];
  estimated_target_date: string | null;
  is_estimate: boolean;
};

export type Forecast = {
  target_net_worth: number;
  starting_net_worth: number;
  as_of: string;
  monthly_contribution: number;
  disclaimer: string;
  scenarios: {
    conservative: Scenario;
    base: Scenario;
    optimistic: Scenario;
  };
};

export async function getSettings(): Promise<ProjectionSettings> {
  const response = await apiClient.get<ProjectionSettings>("/projections/settings/");
  return response.data;
}

export async function updateSettings(
  data: UpdateProjectionSettingsInput,
): Promise<ProjectionSettings> {
  const response = await apiClient.patch<ProjectionSettings>("/projections/settings/", data);
  return response.data;
}

export async function getForecast(): Promise<Forecast> {
  const response = await apiClient.get<Forecast>("/projections/forecast/");
  return response.data;
}
