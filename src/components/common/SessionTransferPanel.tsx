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
  const [error, setError] = useState<false | "forbidden" | "network">(false);
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
          if (status === 403) setRequests([]);
          setError(status === 403 ? "forbidden" : "network");
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
        setError(status === 403 ? "forbidden" : "network");
      }
    } finally {
      setBusy(null);
    }
  };
  return (
    <section className="space-y-3 rounded-lg border border-gray-300 bg-white p-4 shadow-sm">
      <h3 className="text-base font-semibold text-neutral-900">{t("staffTitle")}</h3>
      <p className="text-sm text-neutral-500">{t("staffDescription")}</p>
      {error && <p role="alert" className="text-sm text-red-600">{t(error === "forbidden" ? "forbidden" : "networkError")}</p>}
      {!error && !requests.length && <p className="text-sm text-neutral-500">{t("noRequests")}</p>}
      {requests.map((request) => (
        <div
          key={request.id}
          className="flex items-center justify-between gap-3 border-t border-gray-200 pt-3"
        >
          <span className="text-sm font-medium text-neutral-900">{request.user.full_name}</span>
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
          className="space-y-3 rounded-lg border border-amber-200 bg-amber-50/60 p-4"
        >
          <p className="text-sm text-neutral-700">{t("approveDescription", { name: target.user.full_name })}</p>
          <Button className="bg-[#0066cc] hover:bg-[#0052a3]" disabled={Boolean(busy)} onClick={() => void approve()}>
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
