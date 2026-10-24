"use client";

import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import apiClient from "@/lib/api-client";
import { ENDPOINTS } from "@/constants/endpoints";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

type TransferStatus = {
  status: "PENDING" | "APPROVED";
  approvalRequired: boolean;
  expiresAt: string;
};

/** Lets a credential-authenticated student explicitly confirm a browser transfer. */
export default function SessionTransferPage() {
  const t = useTranslations("auth.session");
  const locale = useLocale();
  const [status, setStatus] = useState<TransferStatus | null>(null);
  const [error, setError] = useState<"expired" | "networkError" | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await apiClient.get<TransferStatus>(
        ENDPOINTS.AUTH.SESSION_TRANSFER,
        { signal },
      );
      if (!signal?.aborted) {
        setStatus(response.data);
        setError(null);
      }
    } catch (cause) {
      if (signal?.aborted) return;
      setError(
        axios.isAxiosError(cause) && cause.response?.status === 401
          ? "expired"
          : "networkError",
      );
    }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    const interval = window.setInterval(
      () => void load(controller.signal),
      5000,
    );
    return () => {
      controller.abort();
      window.clearInterval(interval);
    };
  }, [load]);
  const complete = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await apiClient.post(ENDPOINTS.AUTH.SESSION_TRANSFER + "/complete");
      window.location.replace(`/${locale}/auth/session-recovery`);
    } catch (cause) {
      if (
        axios.isAxiosError(cause) &&
        [401, 409].includes(cause.response?.status ?? 0)
      )
        setError("expired");
      else {
        await load();
        if (!axios.isAxiosError(cause) || cause.response?.status !== 403)
          setError("networkError");
      }
    } finally {
      setBusy(false);
    }
  };
  const waiting = status?.approvalRequired && status.status !== "APPROVED";
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-5 p-6">
      <h1 className="text-2xl font-semibold">{t("transferTitle")}</h1>
      <p>{waiting ? t("waitingApproval") : t("confirmDescription")}</p>
      <p className="text-sm text-muted-foreground">{t("preserveExam")}</p>
      {error && <p role="alert">{t(error)}</p>}
      {!status && !error && <p>{t("recovering")}</p>}
      {status && error !== "expired" && (
        <Button
          disabled={busy || Boolean(waiting)}
          onClick={() => void complete()}
        >
          {busy ? t("recovering") : t("confirmTransfer")}
        </Button>
      )}
      <Button variant="outline" disabled={busy} onClick={() => void load()}>
        {t("retry")}
      </Button>
      <Link href="/login?reauth=1">{t("backToLogin")}</Link>
    </main>
  );
}
