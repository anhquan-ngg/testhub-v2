"use client";

import { useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hook";
import { login as loginAction } from "@/store/slices/userSlice";

interface JWTPayload {
  id?: string;
  userId?: string;
  email?: string;
  role?: "ADMIN" | "STUDENT" | "LECTURER";
  full_name?: string;
  fullName?: string;
  name?: string;
}

// Helper function để lấy cookie
function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift() || null;
  return null;
}

// Helper function để decode JWT (không verify, chỉ decode)
function decodeJWT(token: string): JWTPayload | null {
  try {
    // JWT có format: header.payload.signature
    // Chúng ta chỉ cần decode payload
    const base64Url = token.split(".")[1];
    if (!base64Url) {
      console.error("JWT token không có payload");
      return null;
    }

    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );

    return JSON.parse(jsonPayload) as JWTPayload;
  } catch (error) {
    console.error("Error decoding JWT:", error);
    return null;
  }
}

export default function UserLoader({
  children,
}: {
  children: React.ReactNode;
}) {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.user);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    // Chỉ chạy trên client side
    if (typeof window === "undefined") return;

    // Nếu user đã có trong store và đã logged in, không cần load lại
    if (user.isLoggedIn && user.id) {
      console.log("User đã có trong store, không cần load lại:", user);
      return;
    }

    // Tránh load nhiều lần trong cùng một session
    if (hasLoadedRef.current) {
      console.log("Đã load user rồi, bỏ qua");
      return;
    }

    const loadUser = async () => {
      try {
        console.log("UserLoader: Bắt đầu load user từ /auth/me...");

        // Phương án A: Ưu tiên gọi /api/auth/me (an toàn với HttpOnly cookies)
        const API_BASE_URL =
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
        const meResponse = await fetch(`${API_BASE_URL}/auth/me`, {
          method: "GET",
          credentials: "include", // Gửi HttpOnly cookies
        });

        if (meResponse.ok) {
          const userData = await meResponse.json();
          console.log("API /me response:", userData);

          if (userData && (userData.id || userData.userId)) {
            const userId = userData.id || userData.userId || "";
            const fullName =
              userData.full_name || userData.fullName || userData.name || "";
            const email = userData.email || "";
            const role =
              (userData.role as "ADMIN" | "STUDENT" | "LECTURER") || "STUDENT";

            console.log("Dispatching login action từ /api/auth/me:", {
              id: userId,
              full_name: fullName,
              email,
              avatar_url: userData.avatar_url,
              role,
            });

            dispatch(
              loginAction({
                id: userId,
                full_name: fullName,
                email,
                avatar_url: userData.avatar_url || null,
                role,
              })
            );

            hasLoadedRef.current = true;
            console.log(
              "User đã được load vào store thành công (từ /api/auth/me)"
            );
            return;
          }
        } else if (meResponse.status === 401) {
          console.log("/api/auth/me trả 401 - Người dùng chưa đăng nhập");
        } else {
          console.warn(`/api/auth/me trả status ${meResponse.status}`);
        }
      } catch (error) {
        console.warn("Error gọi /api/auth/me:", error);
        console.log("Fallback: Thử load user từ JWT token trong cookie...");
      }

      // Phương án B (Fallback): Decode JWT từ cookie nếu /me không thành công
      try {
        const token = getCookie("testhub_token");
        console.log("Token cookie có tồn tại:", !!token);

        if (token) {
          const payload = decodeJWT(token);
          console.log("JWT Payload từ fallback:", payload);

          if (payload && (payload.id || payload.userId)) {
            const userId = payload.id || payload.userId || "";
            const fullName =
              payload.full_name || payload.fullName || payload.name || "";
            const email = payload.email || "";
            const role =
              (payload.role as "ADMIN" | "STUDENT" | "LECTURER") || "STUDENT";

            console.log("Dispatching login action từ JWT decode:", {
              id: userId,
              full_name: fullName,
              email,
              avatar_url: null,
              role,
            });

            dispatch(
              loginAction({
                id: userId,
                full_name: fullName,
                email,
                avatar_url: null,
                role,
              })
            );

            hasLoadedRef.current = true;
            console.log(
              "User đã được load vào store thành công (từ JWT token)"
            );
          } else {
            console.warn("JWT payload không có id hoặc userId");
          }
        } else {
          console.log("Không tìm thấy token trong cookie");
        }
      } catch (error) {
        console.error("Error trong fallback JWT decode:", error);
      }

      hasLoadedRef.current = true;
    };

    loadUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  return <>{children}</>;
}
