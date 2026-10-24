"use client";

import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import apiClient from "@/lib/api-client";
import { ENDPOINTS } from "@/constants/endpoints";
import { Button } from "@/components/ui/button";

type TransferRequest = {
  id: string;
  approved_at: string | null;
  user: { id: string; full_name: string };
};

/** Shows staff the scoped, credential-authenticated requests awaiting device transfer. */
export default function SessionTransferPanel({ examId }: { examId?: string }) {
  const t = useTranslations("auth.session");
  const [requests, setRequests] = useState<TransferRequest[]>([]);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [target, setTarget] = useState<TransferRequest | null>(null);
  const load = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const { data } = await apiClient.get<TransferRequest[]>(
          ENDPOINTS.AUTH.SESSION_TRANSFERS,
          { params: { examId }, signal },
        );
        if (!signal?.aborted) {
          setRequests(data);
          setError(false);
        }
      } catch (error: unknown) {
        if (!signal?.aborted) {
          const status = axios.isAxiosError(error)
            ? error.response?.status
            : undefined;
          setError(status === undefined || status >= 500);
        }
      }
    },
    [examId],
  );
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    const timer = window.setInterval(() => void load(controller.signal), 10000);
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [load]);
  const approve = async () => {
    if (!target || busy) return;
    setBusy(target.id);
    try {
      await apiClient.post(
        ENDPOINTS.AUTH.SESSION_TRANSFERS + "/" + target.id + "/approve",
      );
      setTarget(null);
      await load();
    } catch (error: unknown) {
      const status = axios.isAxiosError(error)
        ? error.response?.status
        : undefined;
      if (status === 409) {
        await load();
        setTarget(null);
      } else {
        setError(status === undefined || status >= 500);
      }
    } finally {
      setBusy(null);
    }
  };
  return (
    <section className="space-y-3 rounded-xl border bg-white p-4">
      <h3 className="font-semibold">{t("staffTitle")}</h3>
      <p className="text-sm text-muted-foreground">{t("staffDescription")}</p>
      {error && <p role="alert">{t("networkError")}</p>}
      {!requests.length && <p className="text-sm">{t("noRequests")}</p>}
      {requests.map((request) => (
        <div
          key={request.id}
          className="flex items-center justify-between gap-3 border-t pt-3"
        >
          <span>{request.user.full_name}</span>
          <Button
            variant="outline"
            disabled={Boolean(busy) || Boolean(request.approved_at)}
            onClick={() => setTarget(request)}
          >
            {request.approved_at ? t("approved") : t("approve")}
          </Button>
        </div>
      ))}
      {target && (
        <div
          role="alertdialog"
          aria-label={t("approve")}
          className="space-y-3 rounded border p-4"
        >
          <p>{t("approveDescription", { name: target.user.full_name })}</p>
          <Button disabled={Boolean(busy)} onClick={() => void approve()}>
            {t("approve")}
          </Button>{" "}
          <Button
            variant="outline"
            disabled={Boolean(busy)}
            onClick={() => setTarget(null)}
          >
            {t("cancel")}
          </Button>
        </div>
      )}
    </section>
  );
}
