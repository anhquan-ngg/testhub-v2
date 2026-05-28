"use client";

import { useEffect, useRef } from "react";
import apiClient from "@/lib/api-client";
import { useAppDispatch, useAppSelector } from "@/store/hook";
import { clearAuth, setUser } from "@/store/slices/authSlice";
import { usePathname } from "next/navigation";

const PUBLIC_PATHS = ["/", "/login", "/signup"];

export default function UserLoader({
  children,
}: {
  children: React.ReactNode;
}) {
  const dispatch = useAppDispatch();
  const pathname = usePathname();
  const user = useAppSelector((state) => state.user);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (PUBLIC_PATHS.includes(pathname)) return;
    if (user.isLoggedIn && user.id) return;
    if (hasLoadedRef.current) return;

    const loadUser = async () => {
      try {
        const meResponse = await apiClient.get("/auth/me");
        const userData = meResponse.data;

        if (userData && (userData.id || userData.userId)) {
          const userId = userData.id || userData.userId || "";
          const fullName =
            userData.full_name || userData.fullName || userData.name || "";
          const email = userData.email || "";
          const role =
            (userData.role as "ADMIN" | "STUDENT" | "LECTURER") || "STUDENT";

          dispatch(
            setUser({
              id: userId,
              full_name: fullName,
              email,
              avatar_url: userData.avatar_url || null,
              role,
            }),
          );
        }
      } catch (error) {
        console.warn("Error loading /auth/me:", error);
        dispatch(clearAuth());
      } finally {
        hasLoadedRef.current = true;
      }
    };

    loadUser();
  }, [dispatch, pathname, user.id, user.isLoggedIn]);

  return <>{children}</>;
}
