"use client";

import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { useEffect, useRef, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

function GoogleCallbackContent() {
  const t = useTranslations("auth.callback");
  const searchParams = useSearchParams();
  const router = useRouter();
  const processedRef = useRef(false);

  useEffect(() => {
    const error = searchParams.get("error");

    if (processedRef.current) return;
    processedRef.current = true;

    if (error) {
      router.push("/login?error=google_auth_failed");
      return;
    }

    router.replace("/");
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-[#0066cc] mx-auto" />
        <p className="text-lg text-gray-600">{t("signingIn")}</p>
      </div>
    </div>
  );
}

export default function GoogleCallbackPage() {
  const t = useTranslations("auth.callback");

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center space-y-4">
            <Loader2 className="h-10 w-10 animate-spin text-[#0066cc] mx-auto" />
            <p className="text-lg text-gray-600">{t("loading")}</p>
          </div>
        </div>
      }
    >
      <GoogleCallbackContent />
    </Suspense>
  );
}
