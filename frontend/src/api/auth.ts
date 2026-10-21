import { apiClient } from "./client";

export type User = {
  id: number;
  email: string;
  display_name: string;
  date_joined: string;
};

export type AuthResponse = {
  user: User;
  access: string;
  refresh: string;
};

export type LoginResponse = {
  access: string;
  refresh: string;
};

export async function register(data: {
  email: string;
  password: string;
  display_name?: string;
}): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>("/accounts/register/", data);
  return response.data;
}

export async function login(data: {
  email: string;
  password: string;
}): Promise<LoginResponse> {
  const response = await apiClient.post<LoginResponse>("/accounts/login/", data);
  return response.data;
}

export async function fetchMe(): Promise<User> {
  const response = await apiClient.get<User>("/accounts/me/");
  return response.data;
}
