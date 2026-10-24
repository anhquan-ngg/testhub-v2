import axios from "axios";
import { ROUTES } from "@/constants/routes";
import { ENDPOINTS } from "@/constants/endpoints";
import { defaultLocale, isLocale } from "@/i18n/config";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});
let refreshPromise: Promise<void> | null = null;

/** Renews one session; concurrent callers/tabs share or serialize refresh. */
export function refreshSession(): Promise<void> {
  if (refreshPromise) return refreshPromise;
  const renew = async () => {
    await axios.post(
      API_BASE_URL + ENDPOINTS.AUTH.REFRESH,
      {},
      { withCredentials: true, timeout: 10000 },
    );
  };
  const locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
  const pending = Promise.resolve(
    locks ? locks.request("testhub-session-refresh", renew) : renew(),
  ).then(() => undefined);
  refreshPromise = pending.finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

function redirectToLogin() {
  if (
    typeof window === "undefined" ||
    window.location.pathname.includes("/auth/session-recovery")
  )
    return;
  const segment = window.location.pathname.split("/")[1];
  const locale = isLocale(segment) ? segment : defaultLocale;
  window.location.replace("/" + locale + ROUTES.LOGIN + "?reauth=1");
}

apiClient.interceptors.response.use(
  (res) => res,
  async (error: unknown) => {
    if (!axios.isAxiosError(error) || !error.config)
      return Promise.reject(error);
    const original = error.config as typeof error.config & { _retry?: boolean };
    const path = new URL(original.url ?? "", API_BASE_URL).pathname;
    const skip =
      ["/auth/login", "/auth/signup", "/auth/refresh"].includes(path) ||
      path === ENDPOINTS.AUTH.SESSION_TRANSFER ||
      path.startsWith(ENDPOINTS.AUTH.SESSION_TRANSFER + "/");
    if (error.response?.status !== 401 || original._retry || skip)
      return Promise.reject(error);
    original._retry = true;
    try {
      await refreshSession();
    } catch (refreshError) {
      // Network failures and 5xx do not prove that a session is invalid.
      if (
        axios.isAxiosError(refreshError) &&
        refreshError.response?.status === 401
      )
        redirectToLogin();
      return Promise.reject(refreshError);
    }
    return apiClient(original);
  },
);
export default apiClient;
