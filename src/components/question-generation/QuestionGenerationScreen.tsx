"use client";
import { PlanCoverage } from "./PlanCoverage";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowLeft,
  CheckCheck,
  ClipboardCheck,
  History,
  Loader2,
  RefreshCw,
  Sparkles,
  Wand2,
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
import { batchStatusClass, questionTypeClass } from "./generation-style";
import {
  QuestionConfigTable,
  newQuestionConfigRow,
} from "./QuestionConfigTable";
import type { QuestionConfigRow } from "./QuestionConfigTable";
import { documentGenerationSettingsSchema } from "./generation-validation";
import { knowledgePlanService } from "@/services/knowledgePlanService";
import { KnowledgePlanWorkspace } from "./KnowledgePlanWorkspace";

import { learningDocumentService as documentApi } from "@/services/learningDocumentService";
import type {
  DocumentReservation,
  DocumentStatus,
  LearningDocument,
} from "@/types/learning-document";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const REUSABLE_STATUSES: DocumentStatus[] = [
  "EXTRACTED",
  "QUEUED",
  "PROCESSING",
];
const selectClass =
  "h-9 w-full cursor-pointer rounded-md border border-gray-300 bg-white px-2 text-sm focus:border-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-600/20 disabled:cursor-not-allowed disabled:opacity-60";

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
  const [topics, setTopics] = useState<Target[]>([]);
  const hintedVersion = params.get("version") ?? "";
  const [sourceMode, setSourceMode] = useState<"upload" | "existing">(
    uuidPattern.test(hintedVersion) ? "existing" : "upload",
  );
  const [existingVersionId, setExistingVersionId] = useState(
    uuidPattern.test(hintedVersion) ? hintedVersion : "",
  );
  const [libraryDocs, setLibraryDocs] = useState<LearningDocument[] | null>(
    null,
  );
  const [libraryError, setLibraryError] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [includeNotes, setIncludeNotes] = useState(false);
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
    if (sourceMode !== "existing" || !uuidPattern.test(topicId)) {
      setLibraryDocs(null);
      return;
    }
    const controller = new AbortController();
    setLibraryDocs(null);
    setLibraryError(false);
    documentApi
      .list(1, controller.signal, { topic_id: topicId, limit: 50 })
      .then((value) => {
        setLibraryDocs(value.data);
        const reusable = value.data.some((doc) =>
          doc.versions.some(
            (version) =>
              REUSABLE_STATUSES.includes(version.status) &&
              version.id === existingVersionId,
          ),
        );
        if (!reusable) setExistingVersionId("");
      })
      .catch(() => {
        if (!controller.signal.aborted) setLibraryError(true);
      });
    return () => controller.abort();
    // The selected version is validated against the list once per topic/mode load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceMode, topicId]);

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
      chapter_id: undefined,
      question_configs: configs.map(
        ({ question_type, question_format, count }) => ({
          question_type,
          question_format,
          count,
        }),
      ),
      language: "vi",
      external_processing_consent: consent,
      query: "",
    });
    const sourceType: "PDF" | "PPTX" | null = file?.name
      .toLowerCase()
      .endsWith(".pdf")
      ? "PDF"
      : file?.name.toLowerCase().endsWith(".pptx")
        ? "PPTX"
        : null;
    const uploadInput =
      sourceMode === "upload" &&
      file &&
      sourceType &&
      file.size > 0 &&
      file.size <= 20 * 1024 * 1024 &&
      file.name.length <= 200
        ? { file, sourceType }
        : null;
    const reuseInput =
      sourceMode === "existing" && uuidPattern.test(existingVersionId);
    if (!parsed.success || (!uploadInput && !reuseInput)) {
      setInvalidCommand(true);
      return;
    }
    createLock.current = true;
    setCreating(true);
    setInvalidCommand(false);
    setUploadStage(uploadInput ? "UPLOADING" : "CREATING");
    try {
      let sourceVersionId = existingVersionId;
      if (uploadInput) {
        const { file: source, sourceType: type } = uploadInput;
        const signature = JSON.stringify({
          topicId,
          includeNotes: type === "PPTX" && includeNotes,
        });
        const mime =
          type === "PDF"
            ? "application/pdf"
            : "application/vnd.openxmlformats-officedocument.presentationml.presentation";
        let checkpoint = uploadCheckpoint.current;
        if (
          !checkpoint ||
          (!checkpoint.uploaded &&
            Date.parse(checkpoint.reservation.upload_expires_at) <=
              Date.now()) ||
          checkpoint.file !== source ||
          checkpoint.signature !== signature
        ) {
          const reservation = await documentApi.create({
            title: source.name,
            topic_id: topicId,
            chapter_id: null,
            upload: {
              file_name: source.name,
              source_type: type,
              mime_type: mime,
              size: source.size,
              include_notes: type === "PPTX" && includeNotes,
              consent: true,
            },
          });
          checkpoint = {
            file: source,
            signature,
            reservation,
            uploaded: false,
            confirmed: false,
          };
          uploadCheckpoint.current = checkpoint;
        }
        if (!checkpoint.uploaded) {
          await documentApi.upload(checkpoint.reservation, source, mime);
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
        sourceVersionId = checkpoint.reservation.version_id;
      }
      const { question_configs } = parsed.data;
      const command = {
        topic_id: topicId,
        version_id: sourceVersionId,
        question_configs,
        external_processing_consent: true as const,
      };
      const canonical = JSON.stringify(command);
      if (requestKey.current?.canonical !== canonical)
        requestKey.current = { canonical, key: crypto.randomUUID() };
      setUploadStage("CREATING");
      const result = await knowledgePlanService.create(
        command,
        requestKey.current.key,
      );
      requestKey.current = null;
      uploadCheckpoint.current = null;
      router.replace(`/lecturer/questions/generate?plan=${result.id}`);
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
          <Link
            href="/lecturer/questions"
            className="mb-2 flex cursor-pointer items-center gap-1 text-sm text-neutral-500 hover:text-neutral-800"
          >
            <ArrowLeft className="size-4" />
            {t("back")}
          </Link>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-neutral-900">
            <Sparkles className="size-6 text-violet-500" />
            {t("title")}
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-neutral-700">
            {t("description")}
          </p>
          <Badge
            variant="outline"
            className="mt-3 border-violet-200 bg-violet-50 text-violet-700"
          >
            {t("textOnly")}
          </Badge>
        </div>
        <Button
          asChild
          variant="outline"
          className="cursor-pointer gap-1.5 border-gray-300 bg-white"
        >
          <Link href="/lecturer/questions/documents">
            {documentText("title")}
          </Link>
        </Button>
      </div>
      <Card className="border-gray-300 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-neutral-900">
            <span className="flex size-8 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
              <Wand2 className="size-4" />
            </span>
            {t("createTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(event) => void create(event)}
            className="grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]"
          >
            <div className="space-y-4">
              {targetError && (
                <p
                  role="alert"
                  className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                >
                  {t("targetError")}
                </p>
              )}
              <div className="space-y-2">
                <Label htmlFor="ai-topic">{t("topic")}</Label>
                <select
                  id="ai-topic"
                  className="h-9 w-full cursor-pointer rounded-md border border-gray-300 bg-white px-2 text-sm focus:border-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-600/20 disabled:cursor-not-allowed disabled:opacity-60"
                  value={topicId}
                  disabled={creating}
                  onChange={(event) => {
                    setTopicId(event.target.value);
                    setExistingVersionId("");
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
              <div
                className="grid grid-cols-2 gap-1 rounded-md bg-gray-100 p-1"
                role="group"
                aria-label={t("fileSource")}
              >
                {(["upload", "existing"] as const).map((mode) => (
                  <Button
                    key={mode}
                    type="button"
                    size="sm"
                    variant={sourceMode === mode ? "default" : "ghost"}
                    aria-pressed={sourceMode === mode}
                    className="cursor-pointer"
                    disabled={creating}
                    onClick={() => {
                      setSourceMode(mode);
                      setInvalidCommand(false);
                    }}
                  >
                    {t(`sourceMode.${mode}`)}
                  </Button>
                ))}
              </div>
              {sourceMode === "existing" && (
                <div className="space-y-2">
                  <Label htmlFor="ai-existing-version">
                    {t("existing.label")}
                  </Label>
                  <select
                    id="ai-existing-version"
                    className={selectClass}
                    value={existingVersionId}
                    disabled={creating || !libraryDocs?.length}
                    onChange={(event) => {
                      setExistingVersionId(event.target.value);
                      setInvalidCommand(false);
                    }}
                  >
                    <option value="">{t("existing.choose")}</option>
                    {(libraryDocs ?? []).map((doc) => (
                      <optgroup key={doc.id} label={doc.title}>
                        {doc.versions.map((version) => {
                          const reusable = REUSABLE_STATUSES.includes(
                            version.status,
                          );
                          const ready = version.indexes.some(
                            (index) => index.status === "READY",
                          );
                          return (
                            <option
                              key={version.id}
                              value={version.id}
                              disabled={!reusable}
                            >
                              {documentText("version", {
                                version: version.version,
                                name: version.file_name,
                              })}
                              {" · "}
                              {documentText(`status.${version.status}`)}
                              {ready ? ` · ${t("existing.indexed")}` : ""}
                            </option>
                          );
                        })}
                      </optgroup>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    {!uuidPattern.test(topicId)
                      ? t("existing.pickTopic")
                      : libraryError
                        ? t("existing.error")
                        : libraryDocs === null
                          ? t("existing.loading")
                          : libraryDocs.length === 0
                            ? t("existing.empty")
                            : t("existing.hint")}
                  </p>
                  <Link
                    href="/lecturer/questions/documents"
                    className="text-xs text-accent-700 underline"
                  >
                    {t("existing.manage")}
                  </Link>
                </div>
              )}
              <div
                className={
                  sourceMode === "upload" ? "space-y-2" : "hidden"
                }
              >
                <Label htmlFor="ai-source-file">{t("fileSource")}</Label>
                <Input
                  id="ai-source-file"
                  type="file"
                  accept=".pdf,.pptx"
                  className="cursor-pointer border-gray-300 bg-white"
                  disabled={creating}
                  onChange={(event) => {
                    setFile(event.target.files?.[0] ?? null);
                    setInvalidCommand(false);
                  }}
                />
                <p className="text-xs text-muted-foreground">{t("fileHint")}</p>
                {file && (
                  <p className="break-words rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-800">
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
                    onCheckedChange={(value) => setIncludeNotes(value === true)}
                  />
                  <Label
                    htmlFor="ai-file-notes"
                    className="text-xs leading-relaxed"
                  >
                    {t("includeNotes")}
                  </Label>
                </div>
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
              <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3">
                <Checkbox
                  id="ai-consent"
                  checked={consent}
                  disabled={creating}
                  onCheckedChange={(value) => setConsent(value === true)}
                />
                <Label
                  htmlFor="ai-consent"
                  className="text-xs leading-relaxed text-amber-900"
                >
                  {t("consent")}
                </Label>
              </div>
              {invalidCommand && (
                <p
                  role="alert"
                  className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                >
                  {t("invalidCommand")}
                </p>
              )}
              <Button
                className="w-full cursor-pointer bg-violet-600 text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-violet-200 disabled:text-violet-700 disabled:opacity-100"
                type="submit"
                disabled={
                  creating ||
                  busy ||
                  Boolean(editingId) ||
                  !consent ||
                  (sourceMode === "upload" ? !file : !existingVersionId)
                }
              >
                {creating ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Sparkles className="size-4" />
                )}
                {creating ? t(`uploadStage.${uploadStage}`) : t("plan.propose")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      {batch?.plan_snapshot && (
        <PlanCoverage plan={batch.plan_snapshot} items={items} />
      )}
      <KnowledgePlanWorkspace
        planId={params.get("plan")}
        disabled={busy || Boolean(editingId) || creating}
        onGenerated={(id) => {
          router.replace(`/lecturer/questions/generate?batch=${id}`);
          setRefresh((value) => value + 1);
        }}
      />
      <div className="grid items-start gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-5">
          <Card className="border-gray-300 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-neutral-900">
                <span className="flex size-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <History className="size-4" />
                </span>
                {t("history")}
              </CardTitle>
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
                    className={`w-full cursor-pointer rounded-md border p-3 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${batchId === record.id ? "border-violet-300 bg-violet-50 ring-1 ring-violet-200" : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"}`}
                  >
                    <span className="block font-medium">
                      {topics.find((topic) => topic.id === record.topic_id)
                        ?.name ?? t("batchLabel")}
                    </span>
                    <span className="mt-1.5 flex items-center gap-2 text-xs text-neutral-500">
                      <Badge
                        variant="outline"
                        className={batchStatusClass(record.status)}
                      >
                        {t(`batchStatus.${record.status}`)}
                      </Badge>
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
            <div className="rounded-xl border border-dashed border-violet-200 bg-violet-50/40 p-10 text-center">
              <Sparkles className="mx-auto mb-4 size-10 text-violet-400" />
              <h2 className="font-semibold text-neutral-900">{t("emptyTitle")}</h2>
              <p className="mt-2 text-sm text-neutral-500">
                {t("emptyDescription")}
              </p>
            </div>
          ) : (
            <>
              <Card className="border-gray-300 bg-white shadow-sm">
                <CardContent className="space-y-4 pt-6">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                        <ClipboardCheck className="size-4" />
                      </span>
                      <div>
                        <h2 className="font-semibold text-neutral-900">
                          {t("reviewTitle")}
                        </h2>
                        <p className="mt-0.5 break-all text-xs text-neutral-500">
                          {batchId}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="cursor-pointer gap-1.5 border-gray-300 bg-white"
                      disabled={busy || loading || Boolean(editingId)}
                      onClick={() => setRefresh((value) => value + 1)}
                    >
                      <RefreshCw className="size-4" />
                      {t("reload")}
                    </Button>
                  </div>
                  {loading && (
                    <p className="flex items-center gap-2 text-sm text-neutral-600">
                      <Loader2 className="size-4 animate-spin text-accent-600" />
                      {t("loading")}
                    </p>
                  )}
                  {loadError && (
                    <p
                      role="alert"
                      className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                    >
                      {t("loadError")}
                    </p>
                  )}
                  {batch && (
                    <>
                      <Badge
                        variant="outline"
                        className={batchStatusClass(batch.status)}
                      >
                        {t(`batchStatus.${batch.status}`)}
                      </Badge>
                      {["WAITING_SOURCE", "QUEUED", "GENERATING"].includes(
                        batch.status,
                      ) && (
                        <p className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
                          {t("processing")}
                        </p>
                      )}
                      {!!batch.question_configs?.length && (
                        <ul className="flex flex-wrap gap-2">
                          {batch.question_configs.map((config, index) => (
                            <li key={index}>
                              <Badge
                                variant="outline"
                                className={questionTypeClass(
                                  config.question_type,
                                )}
                              >
                                {t("configSummary", {
                                  count: config.count,
                                  type: questionType(config.question_type),
                                  format: questionFormat(
                                    config.question_format,
                                  ),
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
                        <p
                          role="status"
                          className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-800"
                        >
                          {t(
                            `preparationStage.${batch.preparation_stage ?? "EXTRACTING"}`,
                          )}
                        </p>
                      )}
                      {batch.status === "FAILED" && (
                        <p
                          role="alert"
                          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                        >
                          {t("failed")}{" "}
                          <span className="font-mono">{batch.error_code}</span>
                        </p>
                      )}
                      {batch.status === "COMPLETED" && (
                        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                          {t("completed")}
                        </p>
                      )}
                      {!!items.length && (
                        <>
                          <p className="text-sm text-neutral-700">
                            {t("reviewHint")}
                          </p>
                          <p className="text-sm font-medium text-neutral-800">
                            {t("summary", {
                              total: items.length,
                              approved: stats.approved,
                              committed: stats.committed,
                            })}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              variant="outline"
                              className="cursor-pointer gap-1.5 border-emerald-300 bg-white text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
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
                              className="cursor-pointer gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
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
