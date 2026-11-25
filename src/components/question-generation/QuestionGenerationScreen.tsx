"use client";
import { PlanCoverage } from "./PlanCoverage";
import type { KnowledgePlan } from "@/types/knowledge-plan";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowLeft,
  CheckCheck,
  ClipboardCheck,
  FileText,
  FolderOpen,
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { GenerationBatchFailure } from "./GenerationBatchFailure";
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
import {
  isUsableVersion,
  type DocumentReservation,
  type DocumentVersion,
  type LearningDocument,
} from "@/types/learning-document";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isReusable = (version: DocumentVersion) =>
  isUsableVersion(version) ||
  version.status === "QUEUED" ||
  version.status === "PROCESSING";
const selectClass =
  "data-[size=default]:h-10 w-full min-w-0 cursor-pointer rounded-md border border-gray-200 bg-white px-3 text-sm shadow-xs outline-none focus-visible:border-[#0066cc] focus-visible:ring-2 focus-visible:ring-blue-100 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400";

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
  const [selectedPlan, setSelectedPlan] = useState<KnowledgePlan | null>(null);
  const [confirmedSource, setConfirmedSource] = useState<{
    file: File; signature: string; versionId: string;
  } | null>(null);
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
              isReusable(version) &&
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
  const sourceSignature = JSON.stringify({
    topicId,
    includeNotes: Boolean(file?.name.toLowerCase().endsWith(".pptx") && includeNotes),
  });
  const selectedSourceVersionId = sourceMode === "existing" ? existingVersionId
    : confirmedSource?.file === file && confirmedSource?.signature === sourceSignature
      ? confirmedSource.versionId : null;
  const equivalentPlanPreparing = Boolean(selectedPlan &&
    ["WAITING_SOURCE", "PREPARING"].includes(selectedPlan.status) &&
    selectedPlan.topic_id === topicId && selectedPlan.source_version_id === selectedSourceVersionId &&
    JSON.stringify(selectedPlan.question_configs?.map(({ question_type, question_format, count }) => ({ question_type, question_format, count }))) ===
      JSON.stringify(configs.map(({ question_type, question_format, count }) => ({ question_type, question_format, count }))));

  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (createLock.current || equivalentPlanPreparing) return;
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
        setConfirmedSource({ file: source, signature, versionId: sourceVersionId });
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
      setSelectedPlan(result);
      router.replace(`/lecturer/questions/generate?plan=${result.id}`);
      setRefresh((value) => value + 1);
      toast.success(t(result.reused ? "plan.preparation.reused" : "queued"));
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
    <div className="min-w-0 space-y-5 pb-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 basis-80">
          <Link
            href="/lecturer/questions"
            className="mb-2 flex cursor-pointer items-center gap-1 text-sm text-neutral-500 hover:text-neutral-800"
          >
            <ArrowLeft className="size-4" />
            {t("back")}
          </Link>
          <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-neutral-900">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-600">
              <Sparkles className="size-5" aria-hidden="true" />
            </span>
            {t("title")}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-500">
            {t("description")}
          </p>
        </div>
        <Button
          asChild
          variant="outline"
          className="cursor-pointer gap-1.5 border-gray-300 bg-white"
        >
          <Link href="/lecturer/questions/documents">
            <FolderOpen className="size-4" aria-hidden="true" />
            {documentText("title")}
          </Link>
        </Button>
      </div>
      <ol className="grid gap-4 rounded-xl border border-blue-100 bg-blue-50/50 p-4 sm:grid-cols-3 sm:gap-5">
        {(["source", "plan", "review"] as const).map((step, index) => (
          <li key={step} className="flex min-w-0 items-start gap-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-blue-100 bg-white text-xs font-semibold text-blue-600">
              {index + 1}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-neutral-900">{t(`workspace.${step}`)}</p>
              <p className="mt-0.5 text-xs leading-5 text-neutral-500">{t(`workspace.${step}Hint`)}</p>
            </div>
          </li>
        ))}
      </ol>
      <Card className="gap-0 overflow-hidden border-gray-200 bg-white py-0 shadow-sm">
        <CardHeader className="border-b border-gray-100 p-4 sm:p-5">
          <CardTitle className="flex items-center gap-2 text-base text-neutral-900">
            <span className="flex size-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Wand2 className="size-4" aria-hidden="true" />
            </span>
            {t("createTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-5">
          <form
            onSubmit={(event) => void create(event)}
            className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]"
          >
            <div className="min-w-0 space-y-4 rounded-lg border border-gray-200 bg-gray-50/50 p-4">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
                <FileText className="size-4 text-blue-600" aria-hidden="true" />
                {t("fileSource")}
              </h2>
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
                <Select
                  value={topicId || "__none__"}
                  disabled={creating}
                  onValueChange={(value) => {
                    setTopicId(value === "__none__" ? "" : value);
                    setExistingVersionId("");
                  }}
                >
                  <SelectTrigger id="ai-topic" className={selectClass}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{t("chooseTopic")}</SelectItem>
                    {topics.map((topic) => (
                      <SelectItem key={topic.id} value={topic.id}>
                        {topic.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div
                className="grid grid-cols-1 gap-1 rounded-lg border border-gray-200 bg-white p-1 sm:grid-cols-2"
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
                    className={`h-auto min-h-9 cursor-pointer whitespace-normal px-2 py-2 text-xs ${sourceMode === mode ? "bg-blue-50 text-blue-700 shadow-none hover:bg-blue-100" : "text-neutral-500 hover:bg-gray-50 hover:text-neutral-900"}`}
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
                  <Select
                    value={existingVersionId || "__none__"}
                    disabled={creating || !libraryDocs?.length}
                    onValueChange={(value) => {
                      setExistingVersionId(value === "__none__" ? "" : value);
                      setInvalidCommand(false);
                    }}
                  >
                    <SelectTrigger id="ai-existing-version" className={selectClass}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">{t("existing.choose")}</SelectItem>
                      {(libraryDocs ?? []).map((doc) => (
                        <SelectGroup key={doc.id}>
                          <SelectLabel>{doc.title}</SelectLabel>
                          {doc.versions.map((version) => {
                            const reusable = isReusable(version);
                            const ready = version.indexes.some(
                              (index) => index.status === "READY",
                            );
                            return (
                              <SelectItem
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
                              </SelectItem>
                            );
                          })}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
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
            <div className="min-w-0 space-y-4">
              <QuestionConfigTable
                rows={configs}
                disabled={creating}
                onChange={(rows) => {
                  setConfigs(rows);
                  setInvalidCommand(false);
                }}
              />
              <div className="flex items-start gap-2.5 rounded-lg border border-blue-100 bg-blue-50/50 p-3 [&_[data-slot=checkbox]]:mt-0.5">
                <Checkbox
                  id="ai-consent"
                  checked={consent}
                  disabled={creating}
                  onCheckedChange={(value) => setConsent(value === true)}
                />
                <Label
                  htmlFor="ai-consent"
                  className="cursor-pointer text-xs leading-5 text-neutral-700"
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
                className="h-auto min-h-10 w-full cursor-pointer whitespace-normal bg-[#0066cc] text-white hover:bg-[#0052a3] disabled:cursor-not-allowed"
                type="submit"
                disabled={
                  creating ||
                  busy ||
                  Boolean(editingId) ||
                  !consent ||
                  equivalentPlanPreparing ||
                  (sourceMode === "upload" ? !file : !existingVersionId)
                }
              >
                {creating ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Sparkles className="size-4" />
                )}
                {creating ? t(`uploadStage.${uploadStage}`) : equivalentPlanPreparing ? t("plan.preparation.alreadyPreparing") : t("plan.propose")}
              </Button>
              {equivalentPlanPreparing && <p role="status" className="text-xs leading-5 text-neutral-600">{t("plan.preparation.alreadyPreparingHint")}</p>}
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
        onPlanChange={setSelectedPlan}
        onGenerated={(id) => {
          router.replace(`/lecturer/questions/generate?batch=${id}`);
          setRefresh((value) => value + 1);
        }}
      />
      <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="min-w-0 space-y-5">
          <Card className="gap-0 overflow-hidden border-gray-200 bg-white py-0 shadow-sm">
            <CardHeader className="border-b border-gray-100 p-4">
              <CardTitle className="flex items-center gap-2 text-base text-neutral-900">
                <span className="flex size-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <History className="size-4" />
                </span>
                {t("history")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-4">
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
                    className={`w-full cursor-pointer rounded-md border p-3 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${batchId === record.id ? "border-blue-300 bg-blue-50 ring-1 ring-blue-100" : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"}`}
                  >
                    <span className="block break-words font-medium">
                      {topics.find((topic) => topic.id === record.topic_id)
                        ?.name ?? t("batchLabel")}
                    </span>
                    <span className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
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
            <div className="flex flex-col items-center gap-4 rounded-xl border border-gray-200 bg-gradient-to-br from-blue-50/60 via-white to-white p-6 text-center shadow-sm sm:flex-row sm:text-left">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-white text-blue-600 shadow-xs">
                <ClipboardCheck className="size-6" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h2 className="font-semibold text-neutral-900">{t("emptyTitle")}</h2>
                <p className="mt-1 max-w-xl text-sm leading-6 text-neutral-500">
                  {t("emptyDescription")}
                </p>
              </div>
            </div>
          ) : (
            <>
              <Card className="gap-0 border-gray-200 bg-white py-0 shadow-sm">
                <CardContent className="space-y-4 p-4 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
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
                                className={`max-w-full whitespace-normal text-left ${questionTypeClass(config.question_type)}`}
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
                      <GenerationBatchFailure batch={batch} />
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
                              className="h-auto min-h-9 max-w-full cursor-pointer gap-1.5 whitespace-normal border-emerald-300 bg-white text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
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
                              className="h-auto min-h-9 max-w-full cursor-pointer gap-1.5 whitespace-normal bg-emerald-600 text-white hover:bg-emerald-700"
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
