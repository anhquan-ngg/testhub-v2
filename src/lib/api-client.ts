import axios from "axios";
import { ROUTES } from "@/constants/routes";
import { ENDPOINTS } from "@/constants/endpoints";
import { defaultLocale, isLocale } from "@/i18n/config";

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
  const localeSegment = window.location.pathname.split("/")[1];
  const locale = isLocale(localeSegment) ? localeSegment : defaultLocale;
  const loginPath = `/${locale}${ROUTES.LOGIN}`;
  if (window.location.pathname !== loginPath) {
    window.location.href = loginPath;
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
      ENDPOINTS.AUTH.LOGIN,
      ENDPOINTS.AUTH.LOGIN.slice(1),
      ENDPOINTS.AUTH.SIGNUP,
      ENDPOINTS.AUTH.SIGNUP.slice(1),
      ENDPOINTS.AUTH.LOGOUT,
      ENDPOINTS.AUTH.LOGOUT.slice(1),
      ENDPOINTS.AUTH.REFRESH,
      ENDPOINTS.AUTH.REFRESH.slice(1),
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
          `${API_BASE_URL}${ENDPOINTS.AUTH.REFRESH}`,
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
