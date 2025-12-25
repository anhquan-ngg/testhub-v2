"use client";

import { useAuth } from "@/hook/useAuth";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, Suspense } from "react";
import { Loader2 } from "lucide-react";

function GoogleCallbackContent() {
  const searchParams = useSearchParams();
  const { handleGoogleLogin } = useAuth();
  const router = useRouter();
  const processedRef = useRef(false);

  useEffect(() => {
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (processedRef.current) return;
    processedRef.current = true;

    if (error) {
      router.push("/login?error=google_auth_failed");
      return;
    }

    if (code) {
      handleGoogleLogin({ code }).catch(() => {
        router.push("/login?error=google_auth_failed");
      });
    } else {
      router.push("/login");
    }
  }, [searchParams, handleGoogleLogin, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-[#0066cc] mx-auto" />
        <p className="text-lg text-gray-600">Đang đăng nhập với Google...</p>
      </div>
    </div>
  );
}

export default function GoogleCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center space-y-4">
            <Loader2 className="h-10 w-10 animate-spin text-[#0066cc] mx-auto" />
            <p className="text-lg text-gray-600">Đang tải...</p>
          </div>
        </div>
      }
    >
      <GoogleCallbackContent />
    </Suspense>
  );
}
