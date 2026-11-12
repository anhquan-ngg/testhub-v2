"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { isAxiosError } from "axios";
import {
  AlertTriangle, ArrowLeft, ClipboardCheck, FileText, History, Loader2, RefreshCw, Save, Send, ShieldAlert,
} from "lucide-react";
import { useRouter as useNextRouter } from "next/navigation";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import apiClient from "@/lib/api-client";
import { ENDPOINTS } from "@/constants/endpoints";
import { questionTypeClass, regradeTotal, regradeValues, validateRegradeScores } from "@/lib/regrading";
import type { RegradeWorkspace as Workspace } from "@/types/regrading";
import { useEnumLabels } from "@/i18n/useEnumLabels";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RegradeQuestion } from "./RegradeQuestion";

type Failure = "loadError" | "saveError" | "publishError" | "conflict" | "forbidden" | "notFound";

/** Edit a private revisioned draft and publish only its saved, unchanged revision. */
export function RegradeWorkspace({ examId, submissionId }: { examId: string; submissionId: string }) {
  const t = useTranslations("shared.regrading");
  const format = useFormatter();
  const labels = useEnumLabels();
  const router = useRouter();
  const nextRouter = useNextRouter();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<"load" | "save" | "publish" | null>("load");
  const [failure, setFailure] = useState<Failure | null>(null);
  const [needsReload, setNeedsReload] = useState(false);
  const [dialog, setDialog] = useState<"publish" | "reload" | "leave" | null>(null);
  const request = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const locked = useRef(false);
  const pendingHref = useRef<string | null>(null);
  const bypassGuard = useRef(false);
  const dialogTrigger = useRef<HTMLElement | null>(null);

  const baseline = workspace ? regradeValues(workspace) : {};
  const dirty = workspace !== null && (reason !== (workspace.draft?.reason ?? "") ||
    Object.keys(values).length !== Object.keys(baseline).length ||
    Object.keys(baseline).some((id) => values[id] !== baseline[id]));
  const ids = workspace?.submission.questions.map((question) => question.id) ?? [];
  const scores = validateRegradeScores(ids, values);
  const valid = scores !== null && reason.length <= 2000;
  const draft = workspace?.draft;
  const alreadyPublished = !!draft && draft.published_revision === draft.revision;
  const staleDraft = !!draft && !alreadyPublished && draft.base_grade_revision !== workspace?.submission.grading_revision;
  const canPublish = !!draft && !alreadyPublished && !staleDraft && !dirty && valid && !busy && !needsReload;
  const canSave = !!workspace && valid && !busy && !needsReload && (dirty || !draft || staleDraft);
  const number = (value: number | string | null) => value === null ? t("notGraded") : format.number(Number(value), { maximumFractionDigits: 2 });

  const apply = useCallback((data: Workspace) => {
    if (data.submission.id !== submissionId || data.submission.exam.id !== examId) throw new Error("Workspace mismatch");
    setWorkspace(data);
    setValues(regradeValues(data));
    setReason(data.draft?.reason ?? "");
    setNeedsReload(false);
  }, [examId, submissionId]);

  const load = useCallback(async () => {
    if (locked.current) return;
    locked.current = true;
    const version = ++request.current;
    const abort = new AbortController();
    controller.current = abort;
    setBusy("load");
    setFailure(null);
    try {
      const response = await apiClient.get<Workspace>(ENDPOINTS.SUBMISSIONS.REGRADE(submissionId), { signal: abort.signal });
      if (version === request.current) apply(response.data);
    } catch (error) {
      if (version !== request.current || abort.signal.aborted) return;
      const status = isAxiosError(error) ? error.response?.status : undefined;
      const reason: Failure = status === 403 ? "forbidden" : status === 404 ? "notFound" : "loadError";
      setNeedsReload(true);
      setFailure(reason);
      toast.error(t(reason));
    } finally {
      if (version === request.current) {
        locked.current = false;
        setBusy(null);
      }
    }
  }, [apply, submissionId, t]);

  useEffect(() => {
    void load();
    return () => {
      request.current += 1;
      controller.current?.abort();
      locked.current = false;
    };
  }, [load]);

  const guarded = dirty || busy === "save" || busy === "publish";
  useEffect(() => {
    if (!guarded) return;
    const beforeUnload = (event: BeforeUnloadEvent) => { if (!bypassGuard.current) event.preventDefault(); };
    const beforeLink = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(target instanceof HTMLAnchorElement) || target.target === "_blank" || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      if (target.href === window.location.href) return;
      event.preventDefault();
      event.stopPropagation();
      pendingHref.current = target.href;
      setDialog("leave");
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", beforeLink, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", beforeLink, true);
    };
  }, [guarded]);

  const mutate = async (action: "save" | "publish") => {
    if (locked.current || !workspace || (action === "save" ? !canSave : !canPublish)) return;
    locked.current = true;
    const version = ++request.current;
    const abort = new AbortController();
    controller.current = abort;
    setBusy(action);
    setFailure(null);
    try {
      const response = action === "save"
        ? await apiClient.put<Workspace>(ENDPOINTS.SUBMISSIONS.REGRADE_DRAFT(submissionId), {
          expected_revision: draft?.revision ?? 0,
          expected_grade_revision: workspace.submission.grading_revision,
          scores,
          reason,
        }, { signal: abort.signal })
        : await apiClient.post<Workspace>(ENDPOINTS.SUBMISSIONS.REGRADE_PUBLISH(submissionId), {
          revision: draft?.revision,
        }, { signal: abort.signal });
      if (version !== request.current) return;
      apply(response.data);
      toast.success(t(action === "save" ? "saved" : "published"));
    } catch (error) {
      if (version !== request.current || abort.signal.aborted) return;
      // A failed response may still have committed; preserve local edits until an explicit reload.
      setNeedsReload(true);
      const status = isAxiosError(error) ? error.response?.status : undefined;
      const reason: Failure = status === 409 ? "conflict" : status === 403 ? "forbidden" : action === "save" ? "saveError" : "publishError";
      setFailure(reason);
      toast.error(t(reason));
    } finally {
      if (version === request.current) {
        locked.current = false;
        setBusy(null);
        setDialog((current) => current === "publish" ? null : current);
      }
    }
  };

  const leave = () => {
    const href = pendingHref.current;
    pendingHref.current = null;
    if (!href) {
      router.push(`/lecturer/exams/${examId}/report`);
      return;
    }
    const url = new URL(href, window.location.href);
    if (url.origin === window.location.origin) {
      nextRouter.push(`${url.pathname}${url.search}${url.hash}`);
    } else {
      bypassGuard.current = true;
      window.location.assign(url.href);
    }
  };

  if (!workspace && busy === "load") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center" role="status" aria-label={t("loading")}>
        <Loader2 className="h-8 w-8 animate-spin text-accent-600" />
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-center">
        <ShieldAlert className="h-9 w-9 text-red-400" />
        <p role="alert" className="text-neutral-700">{t(failure ?? "loadError")}</p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button variant="outline" className="cursor-pointer" onClick={() => router.push(`/lecturer/exams/${examId}/report`)}>
            {t("back")}
          </Button>
          {failure !== "forbidden" && failure !== "notFound" && (
            <Button variant="outline" className="cursor-pointer gap-1.5" onClick={() => void load()}>
              <RefreshCw className="h-4 w-4" />{t("retry")}
            </Button>
          )}
        </div>
      </div>
    );
  }

  const cardClass = "border-gray-300 bg-white shadow-sm";

  return (
    <div className="space-y-6" aria-busy={busy !== null}>
      <p role="status" className="sr-only">{busy ? t(busy === "load" ? "loading" : busy === "save" ? "saving" : "publishing") : ""}</p>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <button
            type="button"
            disabled={!!busy}
            onClick={() => { pendingHref.current = null; if (dirty) setDialog("leave"); else leave(); }}
            className="mb-2 flex cursor-pointer items-center gap-1 text-sm text-neutral-500 hover:text-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ArrowLeft className="h-4 w-4" />{t("back")}
          </button>
          <h2 className="text-2xl font-bold text-neutral-900">{t("title")}</h2>
          <p className="mt-1 break-words text-sm text-neutral-500">{workspace.submission.exam.title} · {workspace.submission.student?.full_name}</p>
        </div>
        <Button variant="outline" className="cursor-pointer gap-1.5 border-gray-300 bg-white" disabled={!!busy} onClick={() => dirty ? setDialog("reload") : void load()}>
          <RefreshCw className={`h-4 w-4 ${busy === "load" ? "animate-spin" : ""}`} />{t("reload")}
        </Button>
      </div>
      {failure && (
        <div role="alert" className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p>{t(failure)}</p>
            <p className="mt-1">{t("editsPreserved")}</p>
          </div>
        </div>
      )}
          <Card className={cardClass}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <ClipboardCheck className="h-5 w-5" />{t("summary")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div><p className="text-sm text-muted-foreground">{t("publishedTotal")}</p><p className="text-2xl font-semibold">{number(workspace.submission.total_score)} /10</p><p className="text-sm">{t("gradeRevision", { revision: workspace.submission.grading_revision })}</p></div>
                <div><p className="text-sm text-muted-foreground">{t("draftTotal")}</p><p className="text-2xl font-semibold">{scores ? number(regradeTotal(scores)) : t("invalidScore")} /10</p><Badge variant="outline" className={dirty ? "border-amber-200 bg-amber-50 text-amber-800" : alreadyPublished ? "border-emerald-200 bg-emerald-50 text-emerald-700" : draft ? "border-blue-200 bg-blue-50 text-blue-700" : "border-gray-200 bg-gray-50 text-gray-700"}>{dirty ? t("unsaved") : alreadyPublished ? t("publishedState") : draft ? t("savedState", { revision: draft.revision }) : t("noDraft")}</Badge></div>
              </div>
              <p className="text-sm text-muted-foreground">{t("privateDraft")}</p>
              <p className="text-sm text-muted-foreground">{t("scale", { count: ids.length, maximum: number(ids.length ? 10 / ids.length : 0) })}</p>
              {staleDraft && (
                <p role="alert" className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{t("staleDraft")}
                </p>
              )}
            </CardContent>
          </Card>
          <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); void mutate("save"); }}>
            <fieldset disabled={!!busy} className="min-w-0 space-y-4">
              <legend className="sr-only">{t("questions")}</legend>
              {workspace.submission.questions.map((item, index) => {
                const percent = values[item.id] ?? "";
                const invalid = validateRegradeScores([item.id], { [item.id]: percent }) === null;
                return (
                  <Card key={item.id} className={cardClass}>
                    <CardHeader>
                      <CardTitle className="flex flex-wrap items-center gap-2 text-xl">
                        <FileText className="h-5 w-5" />{t("questionNumber", { number: index + 1 })}
                        <Badge variant="outline" className={questionTypeClass(item.question.question_type)}>{labels.questionType(item.question.question_type)}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      <RegradeQuestion item={item} />
                      <div className="flex flex-wrap items-start gap-4 border-t pt-4">
                        <div className="space-y-2">
                          <Label htmlFor={`score-${item.id}`}>{t("scorePercent")}</Label>
                          <Input id={`score-${item.id}`} inputMode="numeric" value={percent} maxLength={3} className="w-32" aria-invalid={invalid} aria-describedby={`score-help-${item.id}`} onChange={(event) => setValues((previous) => ({ ...previous, [item.id]: event.target.value }))} />
                          <p id={`score-help-${item.id}`} className={`text-sm ${invalid ? "text-red-700" : "text-muted-foreground"}`}>{t(invalid ? "invalidScore" : "scoreHelp")}</p>
                        </div>
                        <div className="space-y-2 text-sm">
                          <p>{t("publishedQuestion", { score: number(Number(item.score ?? 0) * 100) })}</p>
                          <p>{t("contribution", { score: invalid ? t("invalidScore") : number(Number(percent) / 100 * 10 / ids.length), maximum: number(10 / ids.length) })}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {!ids.length && <p role="alert">{t("noQuestions")}</p>}
              <div className="space-y-2">
                <Label htmlFor="regrade-reason">{t("reason")}</Label>
                <Textarea id="regrade-reason" value={reason} rows={3} maxLength={2000} aria-describedby="reason-help" className="bg-white" onChange={(event) => setReason(event.target.value)} />
                <p id="reason-help" className="text-sm text-muted-foreground">{t("reasonHelp", { count: reason.length })}</p>
              </div>
            </fieldset>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" variant="outline" className="cursor-pointer gap-1.5 border-gray-300 bg-white" disabled={!canSave}>
                {busy === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{t("save")}
              </Button>
              <Button type="button" className="cursor-pointer gap-1.5 bg-[#0066cc] text-white hover:bg-[#0052a3]" disabled={!canPublish} onClick={() => setDialog("publish")}>
                {busy === "publish" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}{t("publish")}
              </Button>
              {dirty && <p className="text-sm text-muted-foreground">{t("saveBeforePublish")}</p>}
            </div>
          </form>
          <Card className={cardClass}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <History className="h-5 w-5" />{t("history")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {workspace.history.length ? (
                <ol className="space-y-4">
                  {workspace.history.map((entry) => (
                    <li key={entry.id} className="space-y-1 rounded-md border border-gray-200 p-4">
                      <p className="font-semibold">{t("historyTotal", { previous: number(entry.previous_total_score), current: number(entry.total_score) })}</p>
                      <p className="text-sm text-muted-foreground">{t("historyRevision", { revision: entry.revision })} · {Number.isNaN(new Date(entry.created_at).getTime()) ? entry.created_at : format.dateTime(new Date(entry.created_at), { dateStyle: "medium", timeStyle: "short" })}</p>
                      <p className="whitespace-pre-wrap break-words text-sm">{entry.reason || t("noReason")}</p>
                    </li>
                  ))}
                </ol>
              ) : <p className="text-muted-foreground">{t("noHistory")}</p>}
            </CardContent>
          </Card>
      <AlertDialog open={dialog !== null} onOpenChange={(open) => { if (!open && !(dialog === "publish" && locked.current)) { setDialog(null); pendingHref.current = null; } }}>
        <AlertDialogContent
          className="bg-white"
          onOpenAutoFocus={() => { dialogTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; }}
          onCloseAutoFocus={(event) => { event.preventDefault(); dialogTrigger.current?.focus(); }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>{t(dialog === "publish" ? "confirmPublish" : "confirmDiscard")}</AlertDialogTitle>
            <AlertDialogDescription>{t(dialog === "publish" ? "publishWarning" : "unsavedWarning")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer" disabled={dialog === "publish" && !!busy}>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className={dialog === "publish" ? "cursor-pointer gap-1.5 bg-[#0066cc] text-white hover:bg-[#0052a3]" : "cursor-pointer bg-red-600 text-white hover:bg-red-700"}
              disabled={(dialog === "publish" && (!!busy || !canPublish)) || ((dialog === "reload" || dialog === "leave") && !!busy)}
              onClick={(event) => {
                event.preventDefault();
                if (dialog === "publish") void mutate("publish");
                else { const action = dialog; setDialog(null); if (action === "reload") void load(); else leave(); }
              }}
            >
              {dialog === "publish" && busy === "publish" && <Loader2 className="h-4 w-4 animate-spin" />}
              {t(dialog === "publish" ? "publish" : "discard")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
