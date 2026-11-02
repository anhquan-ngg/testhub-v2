"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { isAxiosError } from "axios";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import apiClient from "@/lib/api-client";
import { ENDPOINTS } from "@/constants/endpoints";
import { regradeTotal, regradeValues, validateRegradeScores } from "@/lib/regrading";
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
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<"load" | "save" | "publish" | null>("load");
  const [failure, setFailure] = useState<Failure | null>(null);
  const [needsReload, setNeedsReload] = useState(false);
  const [notice, setNotice] = useState<"saved" | "published" | null>(null);
  const [dialog, setDialog] = useState<"publish" | "reload" | "leave" | null>(null);
  const request = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const locked = useRef(false);

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
    setNotice(null);
    try {
      const response = await apiClient.get<Workspace>(ENDPOINTS.SUBMISSIONS.REGRADE(submissionId), { signal: abort.signal });
      if (version === request.current) apply(response.data);
    } catch (error) {
      if (version !== request.current || abort.signal.aborted) return;
      const status = isAxiosError(error) ? error.response?.status : undefined;
      setNeedsReload(true);
      setFailure(status === 403 ? "forbidden" : status === 404 ? "notFound" : "loadError");
    } finally {
      if (version === request.current) {
        locked.current = false;
        setBusy(null);
      }
    }
  }, [apply, submissionId]);

  useEffect(() => {
    void load();
    return () => {
      request.current += 1;
      controller.current?.abort();
      locked.current = false;
    };
  }, [load]);

  useEffect(() => {
    if (!dirty && !busy) return;
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    const beforeLink = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(target instanceof HTMLAnchorElement) || target.target === "_blank" || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      if (target.href !== window.location.href && !window.confirm(t("unsavedWarning"))) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", beforeLink, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", beforeLink, true);
    };
  }, [busy, dirty, t]);

  const mutate = async (action: "save" | "publish") => {
    if (locked.current || !workspace || (action === "save" ? !canSave : !canPublish)) return;
    locked.current = true;
    const version = ++request.current;
    const abort = new AbortController();
    controller.current = abort;
    setBusy(action);
    setFailure(null);
    setNotice(null);
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
      setNotice(action === "save" ? "saved" : "published");
    } catch (error) {
      if (version !== request.current || abort.signal.aborted) return;
      // A failed response may still have committed; preserve local edits until an explicit reload.
      setNeedsReload(true);
      const status = isAxiosError(error) ? error.response?.status : undefined;
      setFailure(status === 409 ? "conflict" : status === 403 ? "forbidden" : action === "save" ? "saveError" : "publishError");
    } finally {
      if (version === request.current) {
        locked.current = false;
        setBusy(null);
        setDialog(null);
      }
    }
  };

  const leave = () => router.push(`/lecturer/exams/${examId}/report`);

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6" aria-busy={busy !== null}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Button variant="ghost" disabled={!!busy} onClick={() => dirty ? setDialog("leave") : leave()}>
            <ArrowLeft className="mr-2 h-4 w-4" />{t("back")}
          </Button>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          {workspace && <p className="break-words text-muted-foreground">{workspace.submission.exam.title} · {workspace.submission.student?.full_name}</p>}
        </div>
        <Button variant="outline" disabled={!!busy} onClick={() => dirty ? setDialog("reload") : void load()}>{t("reload")}</Button>
      </div>
      {busy && <p role="status" className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />{t(busy === "load" ? "loading" : busy === "save" ? "saving" : "publishing")}</p>}
      {failure && <div role="alert" className="rounded-md border border-red-300 bg-red-50 p-4 text-red-900">{t(failure)}{workspace && <p className="mt-1">{t("editsPreserved")}</p>}</div>}
      {notice && <p role="status" className="rounded-md border border-green-300 bg-green-50 p-4 text-green-900">{t(notice)}</p>}
      {workspace && (
        <>
          <Card>
            <CardHeader><CardTitle>{t("summary")}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div><p className="text-sm text-muted-foreground">{t("publishedTotal")}</p><p className="text-2xl font-semibold">{number(workspace.submission.total_score)} /10</p><p className="text-sm">{t("gradeRevision", { revision: workspace.submission.grading_revision })}</p></div>
                <div><p className="text-sm text-muted-foreground">{t("draftTotal")}</p><p className="text-2xl font-semibold">{scores ? number(regradeTotal(scores)) : t("invalidScore")} /10</p><Badge variant="secondary">{dirty ? t("unsaved") : alreadyPublished ? t("publishedState") : draft ? t("savedState", { revision: draft.revision }) : t("noDraft")}</Badge></div>
              </div>
              <p className="text-sm text-muted-foreground">{t("privateDraft")}</p>
              <p className="text-sm text-muted-foreground">{t("scale", { count: ids.length, maximum: number(ids.length ? 10 / ids.length : 0) })}</p>
              {staleDraft && <p role="alert" className="text-amber-800">{t("staleDraft")}</p>}
            </CardContent>
          </Card>
          <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); void mutate("save"); }}>
            <fieldset disabled={!!busy} className="min-w-0 space-y-4">
              <legend className="sr-only">{t("questions")}</legend>
              {workspace.submission.questions.map((item, index) => {
                const percent = values[item.id] ?? "";
                const invalid = validateRegradeScores([item.id], { [item.id]: percent }) === null;
                return (
                  <Card key={item.id}>
                    <CardHeader><CardTitle className="flex flex-wrap items-center gap-2">{t("questionNumber", { number: index + 1 })}<Badge variant="outline">{labels.questionType(item.question.question_type)}</Badge></CardTitle></CardHeader>
                    <CardContent className="space-y-5">
                      <RegradeQuestion item={item} />
                      <div className="flex flex-wrap items-start gap-4 border-t pt-4">
                        <div className="space-y-2">
                          <Label htmlFor={`score-${item.id}`}>{t("scorePercent")}</Label>
                          <Input id={`score-${item.id}`} inputMode="numeric" value={percent} maxLength={3} className="w-32" aria-invalid={invalid} aria-describedby={`score-help-${item.id}`} onChange={(event) => { setValues((previous) => ({ ...previous, [item.id]: event.target.value })); setNotice(null); }} />
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
                <Textarea id="regrade-reason" value={reason} rows={3} maxLength={2000} aria-describedby="reason-help" onChange={(event) => { setReason(event.target.value); setNotice(null); }} />
                <p id="reason-help" className="text-sm text-muted-foreground">{t("reasonHelp", { count: reason.length })}</p>
              </div>
            </fieldset>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={!canSave}>{t("save")}</Button>
              <Button type="button" variant="outline" disabled={!canPublish} onClick={() => setDialog("publish")}>{t("publish")}</Button>
              {dirty && <p className="text-sm text-muted-foreground">{t("saveBeforePublish")}</p>}
            </div>
          </form>
          <Card>
            <CardHeader><CardTitle>{t("history")}</CardTitle></CardHeader>
            <CardContent>
              {workspace.history.length ? (
                <ol className="space-y-4">
                  {workspace.history.map((entry) => (
                    <li key={entry.id} className="space-y-1 rounded-md border p-4">
                      <p className="font-semibold">{t("historyTotal", { previous: number(entry.previous_total_score), current: number(entry.total_score) })}</p>
                      <p className="text-sm text-muted-foreground">{t("historyRevision", { revision: entry.revision })} · {Number.isNaN(new Date(entry.created_at).getTime()) ? entry.created_at : format.dateTime(new Date(entry.created_at), { dateStyle: "medium", timeStyle: "short" })}</p>
                      <p className="whitespace-pre-wrap break-words text-sm">{entry.reason || t("noReason")}</p>
                    </li>
                  ))}
                </ol>
              ) : <p className="text-muted-foreground">{t("noHistory")}</p>}
            </CardContent>
          </Card>
        </>
      )}
      <AlertDialog open={dialog !== null} onOpenChange={(open) => { if (!open && !locked.current) setDialog(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t(dialog === "publish" ? "confirmPublish" : "confirmDiscard")}</AlertDialogTitle>
            <AlertDialogDescription>{t(dialog === "publish" ? "publishWarning" : "unsavedWarning")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!busy}>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction disabled={!!busy || (dialog === "publish" && !canPublish)} onClick={(event) => {
              event.preventDefault();
              if (dialog === "publish") void mutate("publish");
              else { const action = dialog; setDialog(null); if (action === "reload") void load(); else leave(); }
            }}>{t(dialog === "publish" ? "publish" : "discard")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
