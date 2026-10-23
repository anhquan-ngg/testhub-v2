"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowLeft,
  CheckCheck,
  Loader2,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { Link, useRouter } from "@/i18n/navigation";
import { intlLocales } from "@/i18n/config";
import { useEnumLabels } from "@/i18n/useEnumLabels";
import apiClient from "@/lib/api-client";
import { ENDPOINTS } from "@/constants/endpoints";
import { questionGenerationService as api } from "@/services/questionGenerationService";
import type {
  GenerationPage,
  QuestionGenerationBatch,
  QuestionGenerationItem,
} from "@/types/question-generation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { GenerationDraftCard } from "./GenerationDraftCard";
import {
  QuestionConfigTable,
  newQuestionConfigRow,
} from "./QuestionConfigTable";
import type { QuestionConfigRow } from "./QuestionConfigTable";
import { documentGenerationSettingsSchema } from "./generation-validation";

import { learningDocumentService as documentApi } from "@/services/learningDocumentService";
import type { DocumentReservation } from "@/types/learning-document";

type Target = {
  id: string;
  name: string;
  topic_id?: string;
  parent_id?: string | null;
};

async function allTargets(
  endpoint: string,
  signal: AbortSignal,
  topicId?: string,
): Promise<Target[]> {
  const result: Target[] = [];
  for (let page = 1; ; page++) {
    const response = await apiClient.get<GenerationPage<Target>>(endpoint, {
      signal,
      params: { page, limit: 100, ...(topicId ? { topic_id: topicId } : {}) },
    });
    result.push(...response.data.data);
    if (!response.data.data.length || result.length >= response.data.total)
      return result;
  }
}

function chapterLabel(
  chapter: Target,
  chapters: Target[],
  seen = new Set<string>(),
): string {
  const parent = chapters.find(
    (candidate) => candidate.id === chapter.parent_id,
  );
  if (!parent || seen.has(parent.id)) return chapter.name;
  seen.add(chapter.id);
  return `${chapterLabel(parent, chapters, seen)} / ${chapter.name}`;
}

/** File-based RAG authoring and explicit review. An owned batch can be resumed by URL. */
export function QuestionGenerationScreen() {
  const t = useTranslations("shared.questionGeneration");
  const documentText = useTranslations("shared.learningDocuments");
  const locale = useLocale();
  const { questionFormat, questionType } = useEnumLabels();
  const params = useSearchParams();
  const router = useRouter();
  const batchId = params.get("batch");
  const [topicId, setTopicId] = useState(params.get("topic") ?? "");
  const [chapterId, setChapterId] = useState(params.get("chapter") ?? "");
  const [topics, setTopics] = useState<Target[]>([]);
  const [chapters, setChapters] = useState<Target[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [includeNotes, setIncludeNotes] = useState(false);
  const [focus, setFocus] = useState("");
  const [uploadStage, setUploadStage] = useState<
    "UPLOADING" | "CONFIRMING" | "CREATING"
  >("UPLOADING");
  const uploadCheckpoint = useRef<{
    file: File;
    signature: string;
    reservation: DocumentReservation;
    uploaded: boolean;
    confirmed: boolean;
  } | null>(null);
  const [configs, setConfigs] = useState<QuestionConfigRow[]>(() => [
    newQuestionConfigRow(5),
  ]);
  const [consent, setConsent] = useState(false);
  const [creating, setCreating] = useState(false);
  const [invalidCommand, setInvalidCommand] = useState(false);
  const requestKey = useRef<{ canonical: string; key: string } | null>(null);
  const createLock = useRef(false);
  const mutationLock = useRef(false);
  const [batch, setBatch] = useState<QuestionGenerationBatch | null>(null);
  const [items, setItems] = useState<QuestionGenerationItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const knownRevisions = useRef(new Map<string, number>());
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const editingChange = useCallback((id: string, editing: boolean) => {
    setEditingId((previous) =>
      editing ? id : previous === id ? null : previous,
    );
  }, []);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [targetError, setTargetError] = useState(false);
  const [historyError, setHistoryError] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [history, setHistory] = useState<
    GenerationPage<QuestionGenerationBatch>
  >({ data: [], total: 0, page: 1, limit: 10 });
  const [refresh, setRefresh] = useState(0);
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    allTargets(ENDPOINTS.TOPICS.BASE, controller.signal)
      .then(setTopics)
      .catch(() => {
        if (!controller.signal.aborted) setTargetError(true);
      });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setChapters([]);
    if (topicId)
      allTargets(ENDPOINTS.CHAPTERS.BASE, controller.signal, topicId)
        .then(setChapters)
        .catch(() => {
          if (!controller.signal.aborted) setTargetError(true);
        });
    return () => controller.abort();
  }, [topicId]);
  useEffect(() => {
    const controller = new AbortController();
    setHistoryError(false);
    api
      .list(historyPage, controller.signal)
      .then(setHistory)
      .catch(() => {
        if (!controller.signal.aborted) setHistoryError(true);
      });
    return () => controller.abort();
  }, [historyPage, refresh]);

  const load = useCallback(async (id: string, signal?: AbortSignal) => {
    const [state, drafts] = await Promise.all([
      api.get(id, signal),
      api.items(id, signal),
    ]);
    if (signal?.aborted) return state;
    setBatch(state);
    setItems(drafts.data);
    setLoadError(false);
    setHistory((previous) => ({
      ...previous,
      data: previous.data.map((record) =>
        record.id === state.id ? state : record,
      ),
    }));
    const previousRevisions = knownRevisions.current;
    setSelected(
      (previous) =>
        new Set(
          [...previous].filter((itemId) =>
            drafts.data.some(
              (item) =>
                item.id === itemId &&
                item.status === "APPROVED" &&
                previousRevisions.get(item.id) === item.revision,
            ),
          ),
        ),
    );
    knownRevisions.current = new Map(
      drafts.data.map((item) => [item.id, item.revision]),
    );
    return state;
  }, []);
  useEffect(() => {
    setBatch(null);
    setItems([]);
    setSelected(new Set());
    setLoadError(false);
    if (!batchId) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    setLoading(true);
    async function poll() {
      try {
        const state = await load(batchId as string, controller.signal);
        if (
          !controller.signal.aborted &&
          ["WAITING_SOURCE", "QUEUED", "GENERATING"].includes(state.status)
        )
          timer = setTimeout(() => void poll(), 2_000);
      } catch {
        if (!controller.signal.aborted) setLoadError(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void poll();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [batchId, load, refresh]);

  function openBatch(id: string) {
    if (busy || creating || editingId) return;
    router.replace(
      `/lecturer/questions/generate?batch=${encodeURIComponent(id)}`,
    );
  }
  function showError(error: unknown) {
    toast.error(
      axios.isAxiosError(error) && error.response?.status === 409
        ? t("conflict")
        : t("actionError"),
    );
  }
  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (createLock.current) return;
    const parsed = documentGenerationSettingsSchema.safeParse({
      topic_id: topicId,
      chapter_id: chapterId,
      question_configs: configs.map(
        ({ question_type, question_format, count }) => ({
          question_type,
          question_format,
          count,
        }),
      ),
      language: "vi",
      external_processing_consent: consent,
      query: focus,
    });
    const sourceType = file?.name.toLowerCase().endsWith(".pdf")
      ? "PDF"
      : file?.name.toLowerCase().endsWith(".pptx")
        ? "PPTX"
        : null;
    if (
      !parsed.success ||
      !file ||
      !sourceType ||
      file.size <= 0 ||
      file.size > 20 * 1024 * 1024 ||
      file.name.length > 200
    ) {
      setInvalidCommand(true);
      return;
    }
    createLock.current = true;
    setCreating(true);
    setInvalidCommand(false);
    setUploadStage("UPLOADING");
    try {
      const signature = JSON.stringify({
        topicId,
        chapterId,
        includeNotes: sourceType === "PPTX" && includeNotes,
      });
      let checkpoint = uploadCheckpoint.current;
      if (
        !checkpoint ||
        (!checkpoint.uploaded && Date.parse(checkpoint.reservation.upload_expires_at) <= Date.now()) ||
        checkpoint.file !== file ||
        checkpoint.signature !== signature
      ) {
        const mime =
          sourceType === "PDF"
            ? "application/pdf"
            : "application/vnd.openxmlformats-officedocument.presentationml.presentation";
        const reservation = await documentApi.create({
          title: file.name,
          topic_id: topicId,
          chapter_id: chapterId,
          upload: {
            file_name: file.name,
            source_type: sourceType,
            mime_type: mime,
            size: file.size,
            include_notes: sourceType === "PPTX" && includeNotes,
            consent: true,
          },
        });
        checkpoint = {
          file,
          signature,
          reservation,
          uploaded: false,
          confirmed: false,
        };
        uploadCheckpoint.current = checkpoint;
      }
      if (!checkpoint.uploaded) {
        await documentApi.upload(
          checkpoint.reservation,
          file,
          sourceType === "PDF"
            ? "application/pdf"
            : "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        );
        checkpoint.uploaded = true;
      }
      setUploadStage("CONFIRMING");
      if (!checkpoint.confirmed) {
        await documentApi.complete(
          checkpoint.reservation.document_id,
          checkpoint.reservation.version_id,
        );
        checkpoint.confirmed = true;
      }
      const { query, ...settings } = parsed.data;
      const command = {
        ...settings,
        source: {
          mode: "document" as const,
          version_id: checkpoint.reservation.version_id,
          query,
        },
      };
      const canonical = JSON.stringify(command);
      if (requestKey.current?.canonical !== canonical)
        requestKey.current = { canonical, key: crypto.randomUUID() };
      setUploadStage("CREATING");
      const result = await api.create(command, requestKey.current.key);
      requestKey.current = null;
      uploadCheckpoint.current = null;
      router.replace(`/lecturer/questions/generate?batch=${result.batch_id}`);
      setRefresh((value) => value + 1);
      toast.success(t("queued"));
    } catch (error) {
      showError(error);
    } finally {
      createLock.current = false;
      setCreating(false);
    }
  }
  async function mutate(operation: () => Promise<unknown>): Promise<boolean> {
    if (!batchId || mutationLock.current) return false;
    mutationLock.current = true;
    setBusy(true);
    let success = false;
    try {
      await operation();
      success = true;
    } catch (error) {
      showError(error);
    }
    // A timeout may have followed a committed transaction. Always reload state.
    try {
      await load(batchId);
    } catch {
      setLoadError(true);
    }
    mutationLock.current = false;
    setBusy(false);
    return success;
  }
  const selectedItems = items.filter(
    (item) => item.status === "APPROVED" && selected.has(item.id),
  );
  const editable = batch?.status === "REVIEW_REQUIRED" && !loadError;
  const stats = {
    approved: items.filter((item) => item.status === "APPROVED").length,
    committed: items.filter((item) => item.status === "COMMITTED").length,
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Button asChild variant="ghost" className="mb-3 -ml-3">
            <Link href="/lecturer/questions">
              <ArrowLeft className="size-4" />
              {t("back")}
            </Link>
          </Button>
          <Button asChild variant="outline" className="mb-3">
            <Link href="/lecturer/questions/documents">
              {documentText("title")}
            </Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            {t("description")}
          </p>
        </div>
        <Badge variant="secondary" className="mt-4">
          {t("textOnly")}
        </Badge>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("createTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(event) => void create(event)}
            className="grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]"
          >
            <div className="space-y-4">
              {targetError && (
                <p role="alert" className="text-sm text-destructive">
                  {t("targetError")}
                </p>
              )}
              <div className="space-y-2">
                <Label htmlFor="ai-topic">{t("topic")}</Label>
                <select
                  id="ai-topic"
                  className="w-full rounded-md border bg-background p-2 text-sm"
                  value={topicId}
                  disabled={creating}
                  onChange={(event) => {
                    setTopicId(event.target.value);
                    setChapterId("");
                  }}
                >
                  <option value="">{t("chooseTopic")}</option>
                  {topics.map((topic) => (
                    <option key={topic.id} value={topic.id}>
                      {topic.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ai-chapter">{t("chapter")}</Label>
                <select
                  id="ai-chapter"
                  className="w-full rounded-md border bg-background p-2 text-sm"
                  value={chapterId}
                  disabled={!topicId || creating}
                  onChange={(event) => setChapterId(event.target.value)}
                >
                  <option value="">{t("chooseChapter")}</option>
                  {chapters.map((chapter) => (
                    <option key={chapter.id} value={chapter.id}>
                      {chapterLabel(chapter, chapters)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ai-source-file">{t("fileSource")}</Label>
                <Input
                  id="ai-source-file"
                  type="file"
                  accept=".pdf,.pptx"
                  disabled={creating}
                  onChange={(event) => {
                    setFile(event.target.files?.[0] ?? null);
                    setInvalidCommand(false);
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  {t("fileHint")}
                </p>
                {file && (
                  <p className="break-words text-sm">
                    {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="ai-file-notes"
                    checked={includeNotes}
                    disabled={
                      creating || !file?.name.toLowerCase().endsWith(".pptx")
                    }
                    onCheckedChange={(value) =>
                      setIncludeNotes(value === true)
                    }
                  />
                  <Label
                    htmlFor="ai-file-notes"
                    className="text-xs leading-relaxed"
                  >
                    {t("includeNotes")}
                  </Label>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ai-focus">{t("focus")}</Label>
                <Input
                  id="ai-focus"
                  value={focus}
                  maxLength={400}
                  disabled={creating}
                  onChange={(event) => setFocus(event.target.value)}
                  placeholder={t("focusPlaceholder")}
                />
              </div>
            </div>
            <div className="space-y-4">
              <QuestionConfigTable
                rows={configs}
                disabled={creating}
                onChange={(rows) => {
                  setConfigs(rows);
                  setInvalidCommand(false);
                }}
              />
              <div className="flex items-start gap-2">
                <Checkbox
                  id="ai-consent"
                  checked={consent}
                  disabled={creating}
                  onCheckedChange={(value) => setConsent(value === true)}
                />
                <Label
                  htmlFor="ai-consent"
                  className="text-xs leading-relaxed"
                >
                  {t("consent")}
                </Label>
              </div>
              {invalidCommand && (
                <p role="alert" className="text-sm text-destructive">
                  {t("invalidCommand")}
                </p>
              )}
              <Button
                className="w-full"
                type="submit"
                disabled={
                  creating || busy || Boolean(editingId) || !consent || !file
                }
              >
                {creating ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Sparkles className="size-4" />
                )}
                {creating ? t(`uploadStage.${uploadStage}`) : t("generate")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <div className="grid items-start gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("history")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {historyError ? (
                <p role="alert" className="text-sm text-destructive">
                  {t("loadError")}
                </p>
              ) : !history.data.length ? (
                <p className="text-sm text-muted-foreground">
                  {t("noHistory")}
                </p>
              ) : (
                history.data.map((record) => (
                  <button
                    key={record.id}
                    disabled={busy || creating || Boolean(editingId)}
                    onClick={() => openBatch(record.id)}
                    className={`w-full rounded-md border p-3 text-left text-sm hover:bg-muted ${batchId === record.id ? "border-primary bg-muted" : ""}`}
                  >
                    <span className="block font-medium">
                      {topics.find((topic) => topic.id === record.topic_id)
                        ?.name ?? t("batchLabel")}
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {t(`batchStatus.${record.status}`)} ·{" "}
                      {record.requested_count}
                    </span>
                    <time
                      className="text-xs text-muted-foreground"
                      dateTime={record.created_at}
                    >
                      {new Date(record.created_at).toLocaleString(
                        intlLocales[locale],
                      )}
                    </time>
                  </button>
                ))
              )}
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={historyPage === 1 || busy}
                  onClick={() => setHistoryPage((page) => page - 1)}
                >
                  {t("previous")}
                </Button>
                <span className="text-xs text-muted-foreground">
                  {historyPage}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={historyPage * 10 >= history.total || busy}
                  onClick={() => setHistoryPage((page) => page + 1)}
                >
                  {t("next")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </aside>
        <section className="min-w-0 space-y-4" aria-live="polite">
          {!batchId ? (
            <div className="rounded-xl border border-dashed p-10 text-center">
              <Sparkles className="mx-auto mb-4 size-10 text-primary/60" />
              <h2 className="font-semibold">{t("emptyTitle")}</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {t("emptyDescription")}
              </p>
            </div>
          ) : (
            <>
              <Card>
                <CardContent className="space-y-4 pt-6">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="font-semibold">{t("reviewTitle")}</h2>
                      <p className="mt-1 break-all text-xs text-muted-foreground">
                        {batchId}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busy || loading || Boolean(editingId)}
                      onClick={() => setRefresh((value) => value + 1)}
                    >
                      <RefreshCw className="size-4" />
                      {t("reload")}
                    </Button>
                  </div>
                  {loading && (
                    <p className="flex items-center gap-2 text-sm">
                      <Loader2 className="size-4 animate-spin" />
                      {t("loading")}
                    </p>
                  )}
                  {loadError && (
                    <p role="alert" className="text-sm text-destructive">
                      {t("loadError")}
                    </p>
                  )}
                  {batch && (
                    <>
                      <Badge
                        variant={
                          batch.status === "FAILED"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {t(`batchStatus.${batch.status}`)}
                      </Badge>
                      {["WAITING_SOURCE", "QUEUED", "GENERATING"].includes(
                        batch.status,
                      ) && (
                        <p className="text-sm text-muted-foreground">
                          {t("processing")}
                        </p>
                      )}
                      {!!batch.question_configs?.length && (
                        <ul className="flex flex-wrap gap-2">
                          {batch.question_configs.map((config, index) => (
                            <li key={index}>
                              <Badge variant="outline">
                                {t("configSummary", {
                                  count: config.count,
                                  type: questionType(config.question_type),
                                  format: questionFormat(config.question_format),
                                })}
                              </Badge>
                            </li>
                          ))}
                        </ul>
                      )}
                      {batch.sourceVersion && (
                        <p className="break-words text-sm">
                          {t("sourceFileLabel", {
                            file: batch.sourceVersion.file_name,
                            version: batch.sourceVersion.version,
                          })}
                        </p>
                      )}
                      {batch.status === "WAITING_SOURCE" && (
                        <p role="status" className="text-sm">
                          {t(
                            `preparationStage.${batch.preparation_stage ?? "EXTRACTING"}`,
                          )}
                        </p>
                      )}
                      {batch.status === "FAILED" && (
                        <p role="alert" className="text-sm text-destructive">
                          {t("failed")}{" "}
                          <span className="font-mono">{batch.error_code}</span>
                        </p>
                      )}
                      {batch.status === "COMPLETED" && (
                        <p className="text-sm text-emerald-700">
                          {t("completed")}
                        </p>
                      )}
                      {!!items.length && (
                        <>
                          <p className="text-sm text-muted-foreground">
                            {t("reviewHint")}
                          </p>
                          <p className="text-sm">
                            {t("summary", {
                              total: items.length,
                              approved: stats.approved,
                              committed: stats.committed,
                            })}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              variant="outline"
                              disabled={
                                !editable ||
                                busy ||
                                Boolean(editingId) ||
                                !stats.approved
                              }
                              onClick={() =>
                                setSelected(
                                  new Set(
                                    items
                                      .filter(
                                        (item) => item.status === "APPROVED",
                                      )
                                      .map((item) => item.id),
                                  ),
                                )
                              }
                            >
                              {t("selectApproved")}
                            </Button>
                            <Button
                              disabled={
                                !editable ||
                                busy ||
                                Boolean(editingId) ||
                                !selectedItems.length
                              }
                              onClick={() => setConfirm(true)}
                            >
                              <CheckCheck className="size-4" />
                              {t("commitSelected", {
                                count: selectedItems.length,
                              })}
                            </Button>
                          </div>
                        </>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
              {items.map((item) => (
                <GenerationDraftCard
                  key={`${item.id}-${item.revision}`}
                  item={item}
                  selected={selected.has(item.id)}
                  busy={busy || Boolean(editingId && editingId !== item.id)}
                  editable={editable}
                  onEditingChange={editingChange}
                  onSelect={(checked) =>
                    setSelected((previous) => {
                      const next = new Set(previous);
                      if (checked) next.add(item.id);
                      else next.delete(item.id);
                      return next;
                    })
                  }
                  onEdit={(data) => mutate(() => api.edit(batchId, item, data))}
                  onReview={(decision) =>
                    mutate(() => api.review(batchId, item, decision))
                  }
                />
              ))}
            </>
          )}
        </section>
      </div>
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("confirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("confirmDescription", { count: selectedItems.length })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <ul className="max-h-48 list-inside list-disc space-y-2 overflow-auto text-sm">
            {selectedItems.map((item) => (
              <li key={item.id}>{item.data.question_text}</li>
            ))}
          </ul>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={
                busy || Boolean(editingId) || !editable || !selectedItems.length
              }
              onClick={() => {
                const refs = selectedItems.map((item) => ({
                  id: item.id,
                  revision: item.revision,
                }));
                void mutate(() => api.commit(batchId as string, refs)).then(
                  (success) => {
                    if (success) {
                      setSelected(new Set());
                      toast.success(t("committed"));
                    }
                  },
                );
              }}
            >
              {t("confirmCommit")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
