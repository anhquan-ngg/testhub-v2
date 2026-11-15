"use client";

import axios from "axios";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import apiClient from "@/lib/api-client";
import { ENDPOINTS } from "@/constants/endpoints";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { toast } from "sonner";

type TransferRequest = {
  id: string;
  approved_at: string | null;
  user: { id: string; full_name: string };
};

/** Shows staff the scoped, credential-authenticated requests awaiting device transfer. */
export default function SessionTransferPanel({ examId }: { examId?: string }) {
  const t = useTranslations("auth.session");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const requestLock = useRef<AbortController | null>(null);
  const approveLock = useRef(false);
  const trigger = useRef<HTMLElement | null>(null);
  const heading = useRef<HTMLHeadingElement | null>(null);
  const lifetime = useRef<AbortController | null>(null);
  const [requests, setRequests] = useState<TransferRequest[]>([]);
  const [error, setError] = useState<false | "forbidden" | "network">(false);
  const [approvalError, setApprovalError] = useState<false | "forbidden" | "network">(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [target, setTarget] = useState<TransferRequest | null>(null);
  const load = useCallback(
    async (signal = lifetime.current?.signal, force = false) => {
      if (signal?.aborted || (requestLock.current && !force)) return;
      requestLock.current?.abort();
      const controller = new AbortController();
      requestLock.current = controller;
      const abort = () => controller.abort();
      signal?.addEventListener("abort", abort, { once: true });
      setRefreshing(true);
      try {
        const { data } = await apiClient.get<TransferRequest[]>(
          ENDPOINTS.AUTH.SESSION_TRANSFERS,
          { params: { examId }, signal: controller.signal },
        );
        if (!controller.signal.aborted) {
          setRequests(data);
          setError(false);
        }
      } catch (error: unknown) {
        if (!controller.signal.aborted) {
          const status = axios.isAxiosError(error)
            ? error.response?.status
            : undefined;
          if (status === 403) setRequests([]);
          setError(status === 403 ? "forbidden" : "network");
        }
      } finally {
        signal?.removeEventListener("abort", abort);
        if (requestLock.current === controller) {
          requestLock.current = null;
          if (!controller.signal.aborted) { setLoading(false); setRefreshing(false); }
        }
      }
    },
    [examId],
  );
  useEffect(() => {
    const controller = new AbortController();
    lifetime.current = controller;
    requestLock.current = null;
    setLoading(true);
    setRequests([]);
    setError(false);
    setApprovalError(false);
    setTarget(null);
    void load(controller.signal);
    const timer = window.setInterval(() => void load(controller.signal), 10000);
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [load]);
  const approve = async () => {
    if (!target || approveLock.current) return;
    const signal = lifetime.current?.signal;
    if (signal?.aborted) return;
    approveLock.current = true;
    setApprovalError(false);
    setBusy(target.id);
    try {
      await apiClient.post(
        ENDPOINTS.AUTH.SESSION_TRANSFERS + "/" + target.id + "/approve",
      );
      if (signal?.aborted) return;
      toast.success(t("approved"));
      await load(signal, true);
      if (!signal?.aborted) setTarget(null);
    } catch (error: unknown) {
      if (signal?.aborted) return;
      const status = axios.isAxiosError(error)
        ? error.response?.status
        : undefined;
      if (status === 409) {
        await load(signal, true);
        setTarget(null);
      } else {
        setApprovalError(status === 403 ? "forbidden" : "network");
      }
    } finally {
      approveLock.current = false;
      setBusy(null);
    }
  };
  return (
    <section className="space-y-3 rounded-lg border border-gray-300 bg-white p-4 shadow-sm">
      <h3 ref={heading} tabIndex={-1} className="text-base font-semibold text-neutral-900">{t("staffTitle")}</h3>
      <p className="text-sm text-neutral-500">{t("staffDescription")}</p>
      {error && <div role="alert" className="space-y-2 text-sm text-red-600"><p>{t(error === "forbidden" ? "forbidden" : "networkError")}</p><Button variant="outline" disabled={refreshing || !!busy} onClick={() => void load()}>{t("retry")}</Button></div>}
      {loading && <p role="status" className="text-sm text-neutral-500">{t("loadingRequests")}</p>}
      {!loading && !error && !requests.length && <p className="text-sm text-neutral-500">{t("noRequests")}</p>}
      {requests.map((request) => (
        <div
          key={request.id}
          className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-3"
        >
          <span className="min-w-0 break-words text-sm font-medium text-neutral-900">{request.user.full_name}</span>
          <Button
            variant="outline"
            disabled={Boolean(busy) || Boolean(error) || Boolean(request.approved_at)}
            onClick={(event) => { trigger.current = event.currentTarget; setApprovalError(false); setTarget(request); }}
          >
            {request.approved_at ? t("approved") : t("approve")}
          </Button>
        </div>
      ))}
      <AlertDialog open={!!target} onOpenChange={(open) => { if (!open && !approveLock.current) setTarget(null); }}>
        <AlertDialogContent className="bg-white" onCloseAutoFocus={(event) => { event.preventDefault(); (trigger.current?.isConnected ? trigger.current : heading.current)?.focus(); }}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("approve")}</AlertDialogTitle>
            <AlertDialogDescription>{t("approveDescription", { name: target?.user.full_name ?? "" })}</AlertDialogDescription>
          </AlertDialogHeader>
          {(approvalError || error) && <p role="alert" className="text-sm text-red-600">{t(approvalError === "forbidden" || error === "forbidden" ? "forbidden" : "networkError")}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(busy)}>{t("cancel")}</AlertDialogCancel>
            <Button className="bg-[#0066cc] text-white hover:bg-[#0052a3]" disabled={Boolean(busy) || error === "forbidden" || approvalError === "forbidden"} onClick={() => void approve()}>
              {busy ? t("approving") : t("approve")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
