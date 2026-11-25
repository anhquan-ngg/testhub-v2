"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { learningDocumentService as documents } from "@/services/learningDocumentService";
import { knowledgePlanService as plans } from "@/services/knowledgePlanService";
import { isUsableVersion, type DocumentVersion } from "@/types/learning-document";
import type { KnowledgePlan } from "@/types/knowledge-plan";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { OcrSummary } from "@/components/learning-documents/OcrSummary";

/** Explicit OCR recovery creates a separate version and, only on request, a separate plan. */
export function PlanOcrRecovery({ plan, disabled, dirty }: {
  plan: KnowledgePlan;
  disabled: boolean;
  dirty: boolean;
}) {
  const t = useTranslations("shared.questionGeneration.plan.ocr");
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const versionId = params.get("ocrVersion");
  const [version, setVersion] = useState<DocumentVersion | null>(null);
  const [reload, setReload] = useState(0);
  const [loadError, setLoadError] = useState(false);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [consent, setConsent] = useState(false);
  const [retryVersionId, setRetryVersionId] = useState<string | null>(null);
  const lock = useRef(false);
  const mounted = useRef(true);
  const eligible = ["REVIEW_REQUIRED", "APPROVED"].includes(plan.status);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    setVersion(null);
    setLoadError(false);
    if (!versionId) return () => controller.abort();
    const load = async () => {
      try {
        const value = await documents.version(versionId, controller.signal);
        if (controller.signal.aborted) return;
        setVersion(value);
        setLoadError(false);
        if (value.ocr_request?.status === "PENDING" || ["UPLOADING", "QUEUED", "PROCESSING"].includes(value.status)) {
          timer = setTimeout(() => void load(), 5000);
        }
      } catch {
        if (!controller.signal.aborted) setLoadError(true);
      }
    };
    void load();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [versionId, reload]);

  const mutate = async (action: () => Promise<void>) => {
    if (lock.current || disabled || dirty) return;
    lock.current = true;
    setBusy(true);
    setError(false);
    try { await action(); } catch { if (mounted.current) setError(true); } finally { lock.current = false; if (mounted.current) setBusy(false); }
  };
  const request = version?.ocr_request;
  const belongs = version?.id === versionId && request?.origin_plan_id === plan.id && request?.origin_revision === plan.revision;
  const pending = version && (request?.status === "PENDING" || ["UPLOADING", "QUEUED", "PROCESSING"].includes(version.status));
  const terminal = Boolean(version && ["COMPLETED", "INCOMPLETE"].includes(request?.status ?? "") && ["EXTRACTED", "PARTIAL", "OCR_REQUIRED", "FAILED"].includes(version.status));
  const added = (version?.quality?.ocr_units?.length ?? 0) > 0;
  const configs = plan.question_configs;

  if (!eligible && !versionId) return null;
  return (
    <section className="min-w-0 space-y-3 rounded-lg border border-blue-200 bg-blue-50/30 p-4" aria-label={t("title")}>
      <h3 className="font-semibold text-blue-900">{t("title")}</h3>
      <p className="text-sm leading-6">{t("explanation")}</p>
      {dirty && <p role="status" className="text-sm text-amber-800">{t("saveFirst")}</p>}
      {eligible && (
        <Button className="h-auto max-w-full whitespace-normal" type="button" variant="outline" disabled={disabled || busy || dirty || (Boolean(versionId) && (!version || belongs))} onClick={() => { setConsent(false); setRetryVersionId(null); setOpen(true); }}>
          {t("start")}
        </Button>
      )}
      <Dialog open={open} onOpenChange={(value) => { if (!busy) setOpen(value); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t(retryVersionId ? "retry" : "title")}</DialogTitle><DialogDescription>{t(retryVersionId ? "retryHint" : "confirmHint")}</DialogDescription></DialogHeader>
          <div className="flex items-start gap-2">
            <Checkbox id={`ocr-consent-${plan.id}`} checked={consent} disabled={busy} onCheckedChange={(value) => setConsent(value === true)} />
            <Label htmlFor={`ocr-consent-${plan.id}`} className="text-sm leading-6">{t("consent")}</Label>
          </div>
          <DialogFooter>
            <Button className="h-auto max-w-full whitespace-normal" type="button" variant="outline" disabled={busy} onClick={() => setOpen(false)}>{t("cancel")}</Button>
            <Button className="h-auto max-w-full whitespace-normal" type="button" disabled={!consent || busy || disabled || dirty} onClick={() => void mutate(async () => {
              const result = retryVersionId
                ? await plans.retryOcr(plan, retryVersionId)
                : await plans.supplementOcr(plan);
              if (!mounted.current) return;
              const query = new URLSearchParams(params.toString());
              query.set("plan", plan.id);
              query.set("ocrVersion", result.version_id);
              router.replace(`${pathname}?${query.toString()}`);
              setOpen(false);
            })}>{busy ? t("requesting") : t("confirm")}</Button>
          </DialogFooter>
          {error && <p role="alert" className="text-sm text-red-700">{t("error")}</p>}
        </DialogContent>
      </Dialog>
      {versionId && (
        <>
          <p className="break-all text-xs text-neutral-600">{t("version", { id: versionId })}</p>
          <Button className="h-auto max-w-full whitespace-normal" type="button" variant="outline" disabled={busy || disabled} onClick={() => setReload((value) => value + 1)}>{t("reload")}</Button>
          {loadError && <p role="alert" className="text-sm text-red-700">{t("loadError")}</p>}
          {!version && !loadError && <p role="status">{t("loading")}</p>}
          {version && !belongs && <p role="alert" className="text-sm text-amber-800">{t("wrongVersion")}</p>}
          {version && belongs && (
            <>
              <p role="status" aria-live="polite" className="text-sm">{t(pending ? "pending" : !terminal ? "unknownStatus" : version.status === "FAILED" ? "failed" : request?.status === "INCOMPLETE" ? "incomplete" : added ? "completed" : "noText")}</p>
              <OcrSummary quality={version.quality} request={request} />
              {terminal && eligible && (request?.status === "INCOMPLETE" || version.status === "FAILED") && (
                <Button className="h-auto max-w-full whitespace-normal" type="button" variant="outline" disabled={busy || disabled || dirty} onClick={() => { setConsent(false); setRetryVersionId(version.id); setOpen(true); }}>{t("retry")}</Button>
              )}
              {terminal && (
                <>
                  <p className="text-sm">{t("newPlanHint")}</p>
                  {version.status === "PARTIAL" && !version.partial_confirmed_at && version.document_id && (
                    <Button className="h-auto max-w-full whitespace-normal" type="button" variant="outline" disabled={busy || disabled || dirty} onClick={() => void mutate(async () => {
                      if (!version.document_id) return;
                      const result = await documents.confirmPartial(version.document_id, version.id);
                      if (mounted.current) setVersion({ ...version, partial_confirmed_at: result.partial_confirmed_at });
                    })}>{t("confirmPartial")}</Button>
                  )}
                  <Button className="h-auto max-w-full whitespace-normal" type="button" disabled={busy || disabled || dirty || !isUsableVersion(version) || !configs?.length} onClick={() => void mutate(async () => {
                    if (!configs?.length) return;
                    const result = await plans.create({ topic_id: plan.topic_id, version_id: version.id, question_configs: configs, external_processing_consent: true }, `ocr-recovery-${version.id}`);
                    if (!mounted.current) return;
                    // A stable business-version key survives reloads and ambiguous responses.
                    router.replace(`/lecturer/questions/generate?plan=${result.id}`);
                  })}>{t("createPlan")}</Button>
                  {!configs?.length && <p className="text-sm text-amber-800">{t("missingConfig")}</p>}
                </>
              )}
            </>
          )}
        </>
      )}
      {error && !open && <p role="alert" className="text-sm text-red-700">{t("error")}</p>}
    </section>
  );
}
