import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api',
  withCredentials: true, // JWT lives in httpOnly cookies
});

interface RetriableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

let refreshPromise: Promise<void> | null = null;

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined;
    const status = error.response?.status;

    const isAuthEndpoint =
      original?.url?.includes('/auth/login') ||
      original?.url?.includes('/auth/register') ||
      original?.url?.includes('/auth/refresh');

    if (status === 401 && original && !original._retry && !isAuthEndpoint) {
      original._retry = true;
      try {
        // Deduplicate concurrent refreshes
        refreshPromise ??= api
          .post('/auth/refresh')
          .then(() => undefined)
          .finally(() => {
            refreshPromise = null;
          });
        await refreshPromise;
        return api(original);
      } catch {
        // Refresh failed — fall through with the original 401
      }
    }

    return Promise.reject(error);
  }
);

export const apiErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    return (error.response?.data as { message?: string })?.message ?? error.message;
  }
  return error instanceof Error ? error.message : 'Something went wrong';
};
