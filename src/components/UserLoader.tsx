"use client";

import axios from "axios";
import { useEffect, useState } from "react";
import apiClient from "@/lib/api-client";
import { useAppDispatch, useAppSelector } from "@/store/hook";
import { clearAuth, setUser } from "@/store/slices/authSlice";
import { usePathname } from "@/i18n/navigation";
import { SESSION_RECOVERY_ATTEMPT_KEY } from "@/constants/routes";

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/signup",
  "/auth/session-recovery",
  "/auth/session-transfer",
];
type Me = {
  id: string;
  full_name: string;
  email: string;
  role: "ADMIN" | "LECTURER" | "STUDENT";
  school?: string;
  phone?: string;
  address?: string;
  avatar_url?: string | null;
};

/** Loads the current user and retries transient failures without clearing a valid session. */
export default function UserLoader({
  children,
}: {
  children: React.ReactNode;
}) {
  const dispatch = useAppDispatch();
  const pathname = usePathname();
  const user = useAppSelector((state) => state.user);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (PUBLIC_PATHS.includes(pathname)) return;
    // Reaching protected UI proves the proxy accepted navigation after recovery.
    try {
      window.sessionStorage.removeItem(SESSION_RECOVERY_ATTEMPT_KEY);
    } catch {
      // Storage may be disabled; recovery itself fails closed in that case.
    }
  }, [pathname]);
  useEffect(() => {
    const online = () => setAttempt(0);
    window.addEventListener("online", online);
    return () => window.removeEventListener("online", online);
  }, []);
  useEffect(() => {
    if (PUBLIC_PATHS.includes(pathname) || (user.isLoggedIn && user.id)) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    void apiClient
      .get<Me>("/auth/me", { signal: controller.signal })
      .then(({ data }) => {
        if (data.id && !controller.signal.aborted)
          dispatch(
            setUser({
              ...data,
              school: data.school ?? "",
              phone: data.phone ?? "",
              address: data.address ?? "",
              avatar_url: data.avatar_url ?? null,
            }),
          );
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        if (axios.isAxiosError(error) && error.response?.status === 401)
          dispatch(clearAuth());
        else if (attempt < 3)
          timer = setTimeout(() => setAttempt((value) => value + 1), 3000);
      });
    return () => {
      controller.abort();
      if (timer) clearTimeout(timer);
    };
  }, [dispatch, pathname, user.id, user.isLoggedIn, attempt]);
  return <>{children}</>;
}
