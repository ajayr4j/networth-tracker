import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setAccessToken,
} from "./tokens";

export const AUTH_LOGOUT_EVENT = "auth:logout";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const refresh = getRefreshToken();
  if (!refresh) {
    throw new Error("No refresh token available");
  }
  const { data } = await axios.post<{ access: string }>(
    `${import.meta.env.VITE_API_URL}/accounts/refresh/`,
    { refresh },
  );
  setAccessToken(data.access);
  return data.access;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetriableConfig | undefined;
    if (error.response?.status === 401 && config && !config._retried) {
      config._retried = true;
      try {
        refreshPromise ??= refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
        const access = await refreshPromise;
        config.headers.Authorization = `Bearer ${access}`;
        return apiClient(config);
      } catch {
        clearTokens();
        window.dispatchEvent(new Event(AUTH_LOGOUT_EVENT));
      }
    }
    return Promise.reject(error);
  },
);
