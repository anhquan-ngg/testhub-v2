"use client";

import axios from "axios";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import apiClient from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { SESSION_RECOVERY_ATTEMPT_KEY } from "@/constants/routes";

/** Restores a session through browser cookies before navigating to protected UI. */
export default function SessionRecoveryPage() {
  const locale = useLocale();
  const t = useTranslations("auth.session");
  const [attempt, setAttempt] = useState(0);
  const [failure, setFailure] = useState<"network" | "recovery" | null>(null);
  useEffect(() => {
    let active = true;
    void apiClient
      .get<{ role: string }>("/auth/me")
      .then(({ data }) => {
        if (!active) return;
        const fallback =
          data.role === "ADMIN"
            ? "/dashboard"
            : data.role === "LECTURER"
              ? "/lecturer"
              : "/home";
        const returnTo = new URLSearchParams(window.location.search).get(
          "returnTo",
        );
        const destination = new URL(
          returnTo || `/${locale}${fallback}`,
          window.location.origin,
        );
        const safe =
          destination.origin === window.location.origin &&
          destination.pathname.startsWith(`/${locale}/`) &&
          !destination.pathname.includes("/auth/");
        const target = safe
          ? destination.href
          : `${window.location.origin}/${locale}${fallback}`;
        try {
          if (
            window.sessionStorage.getItem(SESSION_RECOVERY_ATTEMPT_KEY) === target
          ) {
            setFailure("recovery");
            return;
          }
          window.sessionStorage.setItem(SESSION_RECOVERY_ATTEMPT_KEY, target);
        } catch {
          setFailure("recovery");
          return;
        }
        window.location.replace(target);
      })
      .catch((error: unknown) => {
        if (!active) return;
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          window.location.replace(`/${locale}/login?reauth=1`);
        } else setFailure("network");
      });
    return () => {
      active = false;
    };
  }, [attempt, locale]);
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-semibold">{t("recovering")}</h1>
      {failure && (
        <>
          <p role="alert">
            {t(failure === "recovery" ? "recoveryFailed" : "networkError")}
          </p>
          <Button
            onClick={() => {
              try {
                window.sessionStorage.removeItem(SESSION_RECOVERY_ATTEMPT_KEY);
              } catch {
                setFailure("recovery");
                return;
              }
              setFailure(null);
              setAttempt((value) => value + 1);
            }}
          >
            {t("retry")}
          </Button>
          <Link href="/login?reauth=1">{t("backToLogin")}</Link>
        </>
      )}
    </main>
  );
}
