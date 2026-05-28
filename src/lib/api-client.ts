import axios from "axios";
import { ROUTES } from "@/constants/routes";

// Lấy API base URL từ biến môi trường
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Cho phép gửi cookie cùng với các request
});

let isRefreshing = false;
let sessionExpired = false;
let failedQueue: Array<{ resolve: (value?: void) => void; reject: (error: unknown) => void }> = [];

const rejectFailedQueue = (error: unknown) => {
  failedQueue.forEach((p) => p.reject(error));
  failedQueue = [];
};

const resolveFailedQueue = () => {
  failedQueue.forEach((p) => p.resolve());
  failedQueue = [];
};

const redirectToLogin = () => {
  if (typeof window === "undefined") return;
  if (window.location.pathname !== ROUTES.LOGIN) {
    window.location.href = ROUTES.LOGIN;
  }
};

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (!original) {
      return Promise.reject(error);
    }

    const requestUrl = original.url ?? "";
    const shouldSkipRefresh = [
      "/auth/login",
      "auth/login",
      "/auth/signup",
      "auth/signup",
      "/auth/logout",
      "auth/logout",
      "/auth/refresh",
      "auth/refresh",
    ].some((path) => requestUrl.includes(path));

    if (error.response?.status === 401 && sessionExpired && !shouldSkipRefresh) {
      redirectToLogin();
      return Promise.reject(error);
    }

    if (
      error.response?.status === 401 &&
      !original._retry &&
      !shouldSkipRefresh
    ) {
      original._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => {
          return apiClient(original);
        });
      }

      isRefreshing = true;
      try {
        await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true },
        );
        sessionExpired = false;
        resolveFailedQueue();
        return apiClient(original);
      } catch (refreshError) {
        sessionExpired = true;
        rejectFailedQueue(refreshError);
        redirectToLogin();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;
