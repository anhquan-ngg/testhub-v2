"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { z } from "zod";
import axios from "axios";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import apiClient from "@/lib/api-client";
import { ENDPOINTS } from "@/constants/endpoints";
import { learningDocumentService as api } from "@/services/learningDocumentService";
import type {
  DocumentArchiveFilter,
  DocumentContent,
  DocumentDuplicate,
  DocumentPage,
  DocumentQuota,
  DocumentReservation,
  DocumentUpload,
  DocumentVersion,
  LearningDocument,
} from "@/types/learning-document";
import { DocumentRagPanel } from "./DocumentRagPanel";
import { DocumentManagePanel } from "./DocumentManagePanel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  ArrowLeft, ArrowRight, BookOpen, CheckCircle2, ChevronLeft, ChevronRight,
  Copy, CloudUpload, FileStack, FileText, FolderOpen, Info, Library, Loader2,
  RefreshCw, ScanText, Search, ShieldCheck, Sparkles, Trash2,
} from "lucide-react";

const VERSION_PAGE_SIZE = 20;
const DETAIL_VERSION_LIMIT = 50;
const MB = 1024 * 1024;

async function sha256Hex(file: File) {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}

const selectClassName = "h-10 w-full min-w-0 rounded-md border border-gray-200 bg-white px-3 text-sm shadow-xs outline-none focus-visible:border-[#0066cc] focus-visible:ring-2 focus-visible:ring-blue-100 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400";
const statusClassName = {
  UPLOADING: "border-slate-200 bg-slate-50 text-slate-600",
  QUEUED: "border-blue-100 bg-blue-50 text-blue-700",
  PROCESSING: "border-blue-100 bg-blue-50 text-blue-700",
  EXTRACTED: "border-emerald-100 bg-emerald-50 text-emerald-700",
  OCR_REQUIRED: "border-amber-100 bg-amber-50 text-amber-800",
  FAILED: "border-red-100 bg-red-50 text-red-700",
};

type Target = { id: string; name: string; parent_id?: string | null };
const metadata = z.object({
  title: z.string().trim().min(1).max(200),
  topic_id: z.string().uuid(),
  chapter_id: z.union([z.string().uuid(), z.literal("")]).transform((value) => value || null),
});

async function targets(
  endpoint: string,
  signal: AbortSignal,
  topic?: string,
): Promise<Target[]> {
  const result: Target[] = [];
  for (let page = 1; ; page++) {
    const { data } = await apiClient.get<DocumentPage<Target>>(endpoint, {
      params: { page, limit: 100, ...(topic ? { topic_id: topic } : {}) },
      signal,
    });
    result.push(...data.data);
    if (!data.data.length || result.length >= data.total) return result;
  }
}

/** Upload/version workflow with safe plain-text preview and resumable confirmation. */
export function LearningDocumentsScreen() {
  const t = useTranslations("shared.learningDocuments");
  const format = useFormatter();
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [chapter, setChapter] = useState("");
  const [topics, setTopics] = useState<Target[]>([]);
  const [chapters, setChapters] = useState<Target[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState(false);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [page, setPage] = useState(1);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState(false);
  const [history, setHistory] = useState<DocumentPage<LearningDocument> | null>(
    null,
  );
  const [document, setDocument] = useState<LearningDocument | null>(null);
  const [versionId, setVersionId] = useState("");
  const [contentPage, setContentPage] = useState(1);
  const [content, setContent] = useState<DocumentContent | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [topicFilter, setTopicFilter] = useState("");
  const [archivedFilter, setArchivedFilter] =
    useState<DocumentArchiveFilter>("false");
  const [quota, setQuota] = useState<DocumentQuota | null>(null);
  const [extraVersions, setExtraVersions] = useState<DocumentVersion[]>([]);
  const [versionTotal, setVersionTotal] = useState<number | null>(null);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [duplicates, setDuplicates] = useState<DocumentDuplicate[]>([]);
  const [duplicateChecking, setDuplicateChecking] = useState(false);
  const selectedId = document?.id;
  const allVersions = useMemo(() => {
    const known = new Set((document?.versions ?? []).map((v) => v.id));
    return [
      ...(document?.versions ?? []),
      ...extraVersions.filter((v) => !known.has(v.id)),
    ].sort((a, b) => b.version - a.version);
  }, [document, extraVersions]);
  const canLoadMoreVersions =
    versionTotal === null
      ? (document?.versions.length ?? 0) >= DETAIL_VERSION_LIMIT
      : allVersions.length < versionTotal;
  const version = allVersions.find((v) => v.id === versionId);
  const status = version?.status;
  const pending = (value: LearningDocument) =>
    value.versions.some(
      (v) => v.status === "QUEUED" || v.status === "PROCESSING" || v.indexes?.some(i => i.status === "QUEUED" || i.status === "INDEXING"),
    );
  const shouldPoll = Boolean(
    (document && pending(document)) || history?.data.some(pending),
  );
  const refresh = useCallback(() => setReloadKey((n) => n + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    void targets(ENDPOINTS.TOPICS.BASE, controller.signal)
      .then(setTopics)
      .catch(() => {
        if (!controller.signal.aborted) toast.error(t("failed"));
      });
    return () => controller.abort();
  }, [t]);
  useEffect(() => {
    const controller = new AbortController();
    if (topic)
      void targets(ENDPOINTS.CHAPTERS.BASE, controller.signal, topic)
        .then(setChapters)
        .catch(() => {
          if (!controller.signal.aborted) toast.error(t("failed"));
        });
    return () => controller.abort();
  }, [topic, t]);
  useEffect(() => {
    const controller = new AbortController();
    let running = false;
    const load = async (notify: boolean) => {
      if (running) return;
      running = true;
      if (notify) setHistoryLoading(true);
      try {
        const list = await api.list(page, controller.signal, {
          q: query,
          topic_id: topicFilter,
          archived: archivedFilter,
        });
        if (!controller.signal.aborted) {
          setHistory(list);
          setHistoryError(false);
        }
        if (selectedId) {
          const current = await api.detail(selectedId, controller.signal);
          if (!controller.signal.aborted) setDocument(current);
        }
      } catch (error) {
        if (
          !controller.signal.aborted &&
          axios.isAxiosError(error) &&
          error.response?.status === 404
        ) {
          setDocument(null);
          setVersionId("");
          setContent(null);
        }
        if (notify && !controller.signal.aborted) {
          setHistoryError(true);
          toast.error(t("failed"));
        }
      } finally {
        running = false;
        if (!controller.signal.aborted) setHistoryLoading(false);
      }
    };
    void load(true);
    const timer = shouldPoll
      ? setInterval(() => {
          void load(false);
        }, 3000)
      : undefined;
    return () => {
      controller.abort();
      if (timer) clearInterval(timer);
    };
  }, [page, query, topicFilter, archivedFilter, selectedId, reloadKey, shouldPoll, t]);
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);
  useEffect(() => {
    const controller = new AbortController();
    void api
      .quota(controller.signal)
      .then((value) => {
        if (!controller.signal.aborted) setQuota(value);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [reloadKey]);
  useEffect(() => {
    const controller = new AbortController();
    if (
      selectedId &&
      versionId &&
      (status === "EXTRACTED" || status === "OCR_REQUIRED")
    ) {
      void api
        .content(selectedId, versionId, contentPage, controller.signal)
        .then((value) => {
          if (!controller.signal.aborted) setContent(value);
        })
        .catch(() => {
          if (!controller.signal.aborted) toast.error(t("failed"));
        });
    }
    return () => controller.abort();
  }, [selectedId, versionId, status, contentPage, reloadKey, t]);

  useEffect(() => {
    setDuplicates([]);
    const type = file?.name.toLowerCase().endsWith(".pdf")
      ? "PDF"
      : file?.name.toLowerCase().endsWith(".pptx")
        ? "PPTX"
        : null;
    if (!file || !type || !file.size || file.size > 20 * MB) return;
    const controller = new AbortController();
    setDuplicateChecking(true);
    sha256Hex(file)
      .then((hash) => api.checkDuplicate(hash, type, controller.signal))
      .then((matches) => {
        if (!controller.signal.aborted)
          setDuplicates(matches.filter((m) => m.include_notes === (type === "PPTX" && notes)));
      })
      .catch(() => undefined)
      .finally(() => {
        if (!controller.signal.aborted) setDuplicateChecking(false);
      });
    return () => {
      controller.abort();
      setDuplicateChecking(false);
    };
  }, [file, notes]);

  const openDuplicate = async (match: DocumentDuplicate) => {
    try {
      const detail = await api.detail(match.document_id);
      open(detail);
      setVersionId(match.version_id);
      setDuplicates([]);
    } catch {
      toast.error(t("failed"));
    }
  };

  const open = (value: LearningDocument) => {
    setDocument(value);
    setVersionId(value.versions[0]?.id ?? "");
    setContent(null);
    setContentPage(1);
    setExtraVersions([]);
    setVersionTotal(null);
  };
  const loadMoreVersions = async () => {
    if (!document || versionsLoading) return;
    setVersionsLoading(true);
    try {
      const next = await api.versions(
        document.id,
        Math.floor(allVersions.length / VERSION_PAGE_SIZE) + 1,
      );
      setExtraVersions((current) => [...current, ...next.data]);
      setVersionTotal(next.total);
    } catch {
      toast.error(t("failed"));
    } finally {
      setVersionsLoading(false);
    }
  };
  const changeFilter = (apply: () => void) => {
    apply();
    setPage(1);
  };
  const megabytes = (bytes: number) => Math.round(bytes / MB);
  const quotaNearLimit =
    quota !== null &&
    (quota.documents.used >= quota.documents.limit * 0.9 ||
      quota.bytes.used >= quota.bytes.limit * 0.9);
  const upload = async (replacement: boolean) => {
    if (lock.current) return;
    const parsed = metadata.safeParse({
      title,
      topic_id: topic,
      chapter_id: chapter,
    });
    const type = file?.name.toLowerCase().endsWith(".pdf")
      ? "PDF"
      : file?.name.toLowerCase().endsWith(".pptx")
        ? "PPTX"
        : null;
    if (
      !file ||
      !type ||
      !consent ||
      !file.size ||
      file.size > 20 * 1024 * 1024 ||
      file.name.length > 200 ||
      (replacement ? !document : !parsed.success)
    ) {
      toast.error(t("invalid"));
      return;
    }
    lock.current = true;
    setBusy(true);
    let reservation: DocumentReservation | undefined;
    try {
      const input: DocumentUpload = {
        file_name: file.name,
        source_type: type,
        size: file.size,
        mime_type:
          type === "PDF"
            ? "application/pdf"
            : "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        include_notes: type === "PPTX" && notes,
        consent: true,
      };
      if (replacement && document)
        reservation = await api.addVersion(document.id, input);
      else if (parsed.success)
        reservation = await api.create({ ...parsed.data, upload: input });
      if (!reservation) return;
      setDocument(await api.detail(reservation.document_id));
      setVersionId(reservation.version_id);
      setContent(null);
      setContentPage(1);
      await api.upload(reservation, file, input.mime_type);
      const done = await api.complete(
        reservation.document_id,
        reservation.version_id,
      );
      toast.success(
        done?.reused_extraction
          ? t("manage.reusedExtraction")
          : t("success"),
      );
    } catch (error) {
      toast.error(
        axios.isAxiosError(error) && error.response?.status === 409
          ? t("manage.quotaExceeded")
          : t("failed"),
      );
    } finally {
      lock.current = false;
      setBusy(false);
      refresh();
    }
  };
  const confirmUpload = async () => {
    if (!document || !version || lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      const done = await api.complete(document.id, version.id);
      toast.success(
        done?.reused_extraction
          ? t("manage.reusedExtraction")
          : t("success"),
      );
    } catch {
      toast.error(t("failed"));
    } finally {
      lock.current = false;
      setBusy(false);
      refresh();
    }
  };
  const revoke = async () => {
    if (!document || lock.current || !window.confirm(t("revokeConfirm")))
      return;
    lock.current = true;
    setBusy(true);
    try {
      await api.revoke(document.id);
      setDocument(null);
      setContent(null);
      setVersionId("");
    } catch {
      toast.error(t("failed"));
    } finally {
      lock.current = false;
      setBusy(false);
      refresh();
    }
  };

  return (
    <div className="w-full min-w-0 space-y-6">
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm" className="-ml-3 text-gray-500 hover:text-[#0066cc]">
          <Link href="/lecturer/questions"><ArrowLeft className="size-4" />{t("back")}</Link>
        </Button>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900">{t("title")}</h1>
            <p className="max-w-2xl text-sm leading-6 text-gray-500">{t("intro")}</p>
          </div>
          <Button asChild variant="outline" className="h-auto min-h-9 max-w-full whitespace-normal border-blue-200 bg-white text-[#0066cc] hover:bg-blue-50">
            <Link href="/lecturer/questions/generate"><Sparkles className="size-4" />{t("workspace.generate")}<ArrowRight className="size-4" /></Link>
          </Button>
        </div>
      </div>
      <section aria-label={t("workspace.workflow")} className="relative isolate overflow-hidden rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-sky-50 p-5 sm:p-6">
        <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-24 -z-10 size-64 rounded-full border-[32px] border-blue-100/40" />
        <div className="grid gap-5 md:grid-cols-3">
          {([
            { icon: CloudUpload, title: "workspace.stepUpload", description: "workspace.stepUploadHint" },
            { icon: ScanText, title: "workspace.stepReview", description: "workspace.stepReviewHint" },
            { icon: Sparkles, title: "workspace.stepUse", description: "workspace.stepUseHint" },
          ] as const).map((step, index) => (
            <div key={step.title} className="flex min-w-0 items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-white text-[#0066cc] shadow-xs"><step.icon className="size-5" aria-hidden="true" /></div>
              <div className="min-w-0 space-y-1"><h2 className="text-sm font-semibold text-gray-900"><span className="mr-2 text-[#0066cc]">0{index + 1}</span>{t(step.title)}</h2><p className="text-xs leading-5 text-gray-500">{t(step.description)}</p></div>
            </div>
          ))}
        </div>
      </section>
      <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(320px,380px)_minmax(0,1fr)]">
      <Card className="min-w-0 gap-0 border-gray-200 py-0 shadow-sm">
        <CardHeader className="gap-1 border-b border-gray-100 p-5 sm:p-6">
          <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-blue-50 text-[#0066cc]"><CloudUpload className="size-5" aria-hidden="true" /></div>
          <CardTitle className="text-base text-gray-900">{t("upload")}</CardTitle>
          <p className="text-sm leading-6 text-gray-500">{t("workspace.uploadHint")}</p>
        </CardHeader>
        <CardContent className="p-5 sm:p-6">
          <form
            className="space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              void upload(false);
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="document-title">{t("documentTitle")}</Label>
              <Input
                id="document-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                placeholder={t("workspace.titlePlaceholder")}
                className="border-gray-200 bg-white"
                disabled={busy}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <div className="space-y-2">
                <Label htmlFor="document-topic">{t("topic")}</Label>
                <select
                  id="document-topic"
                  className={selectClassName}
                  value={topic}
                  disabled={busy}
                  onChange={(e) => {
                    setTopic(e.target.value);
                    setChapter("");
                    setChapters([]);
                  }}
                >
                  <option value="">{t("choose")}</option>
                  {topics.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="document-chapter">{t("chapterOptional")}</Label>
                <select
                  id="document-chapter"
                  className={selectClassName}
                  value={chapter}
                  disabled={busy || !topic}
                  onChange={(e) => setChapter(e.target.value)}
                >
                  <option value="">{t("noChapter")}</option>
                  {chapters.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="document-file">{t("file")}</Label>
              <div className={cn("relative flex flex-col items-center gap-2 rounded-xl border border-dashed border-blue-200 bg-blue-50/40 px-4 py-6 text-center transition-colors focus-within:ring-2 focus-within:ring-[#0066cc] hover:bg-blue-50", busy && "opacity-60")}>
                <CloudUpload className="size-7 text-[#0066cc]" aria-hidden="true" />
                <span className="max-w-full break-all text-sm font-medium text-gray-800">{file ? file.name : t("workspace.chooseFile")}</span>
                <span id="document-file-hint" className="text-xs text-gray-500">{t("workspace.fileHint")}</span>
                <input
                  id="document-file"
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
                  type="file"
                  accept=".pdf,.pptx"
                  aria-describedby="document-file-hint"
                  disabled={busy}
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </div>
            </div>
            {duplicateChecking && (
              <p className="flex items-center gap-2 text-xs text-gray-500" role="status">
                <Loader2 className="size-3 animate-spin" aria-hidden="true" />
                {t("manage.duplicateChecking")}
              </p>
            )}
            {duplicates.length > 0 && (
              <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4" role="alert">
                <p className="flex items-center gap-2 text-sm font-medium text-amber-900">
                  <Copy className="size-4 shrink-0" aria-hidden="true" />
                  {t("manage.duplicateTitle")}
                </p>
                <p className="text-xs leading-5 text-amber-800">{t("manage.duplicateHint")}</p>
                <ul className="space-y-2">
                  {duplicates.slice(0, 3).map((m) => (
                    <li key={m.version_id} className="flex flex-wrap items-center justify-between gap-2 text-xs text-amber-900">
                      <span className="min-w-0 break-words">
                        {t("manage.duplicateLine", {
                          title: m.title,
                          version: m.version,
                          date: format.dateTime(new Date(m.created_at), { dateStyle: "medium" }),
                        })}
                        {m.archived_at && (
                          <Badge variant="outline" className="ml-2">{t("manage.archived")}</Badge>
                        )}
                      </span>
                      <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => { void openDuplicate(m); }}>
                        {t("manage.duplicateOpen")}
                      </Button>
                    </li>
                  ))}
                </ul>
                <Button type="button" size="sm" variant="ghost" className="text-amber-900" onClick={() => setDuplicates([])}>
                  {t("manage.duplicateIgnore")}
                </Button>
              </div>
            )}
            <label className="flex items-start gap-3 text-sm leading-6 text-gray-600 has-disabled:opacity-50">
              <input
                className="mt-1 size-4 shrink-0 accent-[#0066cc]"
                type="checkbox"
                checked={notes}
                disabled={busy || !file?.name.toLowerCase().endsWith(".pptx")}
                onChange={(e) => setNotes(e.target.checked)}
              />
              {t("notes")}
            </label>
            <div className="space-y-3 rounded-xl border border-blue-100 bg-blue-50/50 p-4">
              <p className="flex items-center gap-2 text-sm font-medium text-gray-800"><ShieldCheck className="size-4 shrink-0 text-[#0066cc]" aria-hidden="true" />{t("workspace.consentTitle")}</p>
              <label className="flex items-start gap-3 text-xs leading-5 text-gray-600">
                <input
                  className="mt-1 size-4 shrink-0 accent-[#0066cc]"
                  type="checkbox"
                  checked={consent}
                  disabled={busy}
                  onChange={(e) => setConsent(e.target.checked)}
                />
                {t("consent")}
              </label>
            </div>
            <div className="space-y-2 border-t border-gray-100 pt-5">
              <Button className="h-auto min-h-10 w-full whitespace-normal bg-[#0066cc] hover:bg-[#0052a3]" disabled={busy} type="submit">
                {busy ? <Loader2 className="size-4 shrink-0 animate-spin" /> : <CloudUpload className="size-4 shrink-0" />}
                {busy ? t("uploading") : t("upload")}
              </Button>
              {document && <>
                <Button
                  className="h-auto min-h-10 w-full whitespace-normal border-gray-200 text-gray-700"
                  type="button"
                  variant="outline"
                  disabled={busy}
                  title={t("newVersion")}
                  onClick={() => { void upload(true); }}
                ><FileStack className="size-4 shrink-0" />{t("workspace.newVersion")}</Button>
                <p className="break-words text-xs leading-5 text-gray-500">{t("workspace.versionTarget", { title: document.title })}</p>
              </>}
            </div>
          </form>
        </CardContent>
      </Card>
      <Card className="min-w-0 gap-0 border-gray-200 py-0 shadow-sm">
        <CardHeader className="gap-4 border-b border-gray-100 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#0066cc]"><Library className="size-5" aria-hidden="true" /></div>
              <div className="min-w-0"><CardTitle className="text-base text-gray-900">{t("history")}</CardTitle>{history && <p className="mt-1 text-xs text-gray-500">{t("workspace.documentCount", { count: history.total })}</p>}</div>
            </div>
            <Button size="sm" variant="outline" className="border-gray-200 text-gray-600" disabled={historyLoading} onClick={refresh}>
              <RefreshCw className={cn("size-3.5", historyLoading && "animate-spin")} />{t("reload")}
            </Button>
          </div>
          <p className="text-sm leading-6 text-gray-500">{t("workspace.historyHint")}</p>
          {quota && (
            <p
              role="status"
              className={cn("rounded-lg border px-3 py-2 text-xs leading-5", quotaNearLimit ? "border-amber-200 bg-amber-50 text-amber-800" : "border-gray-200 bg-gray-50 text-gray-600")}
            >
              {t("manage.quota", {
                docs: quota.documents.used,
                docLimit: quota.documents.limit,
                mb: megabytes(quota.bytes.used),
                mbLimit: megabytes(quota.bytes.limit),
              })}
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,11rem)_minmax(0,11rem)]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
              <Input
                className="pl-9"
                type="search"
                value={searchInput}
                placeholder={t("manage.searchPlaceholder")}
                aria-label={t("manage.searchPlaceholder")}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <select
              className={selectClassName}
              aria-label={t("manage.filterTopic")}
              value={topicFilter}
              onChange={(e) => changeFilter(() => setTopicFilter(e.target.value))}
            >
              <option value="">{t("manage.allTopics")}</option>
              {topics.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
            <select
              className={selectClassName}
              aria-label={t("manage.filterStatus")}
              value={archivedFilter}
              onChange={(e) =>
                changeFilter(() => setArchivedFilter(e.target.value as DocumentArchiveFilter))
              }
            >
              <option value="false">{t("manage.filterActive")}</option>
              <option value="true">{t("manage.filterArchived")}</option>
              <option value="all">{t("manage.filterAll")}</option>
            </select>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-5 sm:p-6" aria-busy={historyLoading}>
          {historyError && <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-800">{t("failed")}</div>}
          {!history && historyLoading && <div role="status" className="flex items-center justify-center gap-2 py-14 text-sm text-gray-500"><Loader2 className="size-5 animate-spin text-[#0066cc]" />{t("workspace.loading")}</div>}
          <div className="grid min-w-0 gap-3 md:grid-cols-2">
          {history?.data.map((v) => {
            const latest = v.versions[0];
            const selected = v.id === selectedId;
            return (
            <button
              type="button"
              key={v.id}
              disabled={busy}
              aria-pressed={selected}
              onClick={() => open(v)}
              className={cn("group flex min-w-0 items-start gap-3 rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066cc] disabled:opacity-50", selected ? "border-blue-300 bg-blue-50/70 shadow-xs" : "border-gray-200 bg-white hover:border-blue-200 hover:bg-blue-50/30")}
            >
              <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg", latest?.source_type === "PPTX" ? "bg-orange-50 text-orange-600" : "bg-blue-50 text-[#0066cc]")}><FileText className="size-5" aria-hidden="true" /></div>
              <div className="min-w-0 flex-1 space-y-2">
                <p className="break-words text-sm font-semibold leading-5 text-gray-800 [overflow-wrap:anywhere]">{v.title}</p>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
                  {latest && <><span>{latest.source_type}</span><span aria-hidden="true">·</span><span>{t("workspace.versionNumber", { version: latest.version })}</span></>}
                  {topics.find((item) => item.id === v.topic_id)?.name && <span className="truncate">{topics.find((item) => item.id === v.topic_id)?.name}</span>}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                {latest && <Badge variant="outline" className={cn("max-w-full whitespace-normal text-left", statusClassName[latest.status])}><span className="size-1.5 shrink-0 rounded-full bg-current" />{t(`status.${latest.status}`)}</Badge>}
                {v.archived_at && <Badge variant="outline" className="border-gray-300 bg-gray-100 text-gray-600">{t("manage.archived")}</Badge>}
                </div>
                {v.last_used_at && <p className="text-xs text-gray-400">{t("manage.lastUsed", { date: format.dateTime(new Date(v.last_used_at), { dateStyle: "medium" }) })}</p>}
              </div>
              {selected ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#0066cc]" aria-hidden="true" /> : <ChevronRight className="mt-0.5 size-4 shrink-0 text-gray-300 group-hover:text-[#0066cc]" aria-hidden="true" />}
            </button>
          );})}
          </div>
          {!historyError && history?.data.length === 0 && <div className="flex flex-col items-center rounded-xl border border-dashed border-gray-200 bg-gray-50/60 px-5 py-12 text-center">
            <div className="mb-4 flex size-16 items-center justify-center rounded-2xl border border-blue-100 bg-white text-[#0066cc] shadow-xs"><FolderOpen className="size-8" aria-hidden="true" /></div>
            <h3 className="font-semibold text-gray-800">{t("empty")}</h3><p className="mt-2 max-w-sm text-sm leading-6 text-gray-500">{t("workspace.emptyHint")}</p>
          </div>}
          {history && history.total > 0 && <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
            <span className="text-xs text-gray-500">{t("page", { page })}</span>
            <div className="flex gap-2">
              <Button size="sm" className="border-gray-200" variant="outline" disabled={page <= 1 || busy || historyLoading} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="size-4" />{t("previous")}</Button>
              <Button size="sm" className="border-gray-200" variant="outline" disabled={page * history.limit >= history.total || busy || historyLoading} onClick={() => setPage((p) => p + 1)}>{t("next")}<ChevronRight className="size-4" /></Button>
            </div>
          </div>}
          {document && <Button asChild variant="ghost" className="h-auto min-h-9 w-full whitespace-normal text-[#0066cc] hover:bg-blue-50"><a href="#document-preview"><ScanText className="size-4 shrink-0" />{t("workspace.viewSelected")}<ArrowRight className="size-4 shrink-0" /></a></Button>}
        </CardContent>
      </Card>
      </div>
      {!document && <section className="flex flex-col items-start gap-4 rounded-xl border border-gray-200 bg-white p-5 sm:flex-row sm:items-center sm:p-6">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#0066cc]"><BookOpen className="size-6" aria-hidden="true" /></div>
        <div className="space-y-1"><h2 className="text-sm font-semibold text-gray-800">{t("workspace.previewTitle")}</h2><p className="text-sm leading-6 text-gray-500">{t("workspace.previewHint")}</p></div>
      </section>}
      {document && (
        <Card id="document-preview" className="min-w-0 scroll-mt-6 gap-0 border-gray-200 py-0 shadow-sm">
          <CardHeader className="gap-3 border-b border-gray-100 p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#0066cc]"><ScanText className="size-5" aria-hidden="true" /></div>
              <div className="min-w-0 space-y-1"><p className="text-xs font-medium text-[#0066cc]">{t("preview")}</p><CardTitle className="break-words text-lg leading-7 text-gray-900 [overflow-wrap:anywhere]">{document.title}</CardTitle></div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 p-5 sm:p-6">
            <div className="max-w-2xl space-y-2">
            <Label htmlFor="document-version">{t("workspace.selectedVersion")}</Label>
            <select
              id="document-version"
              className={selectClassName}
              value={versionId}
              disabled={busy}
              onChange={(e) => {
                setVersionId(e.target.value);
                setContent(null);
                setContentPage(1);
              }}
            >
              {allVersions.map((v) => (
                <option key={v.id} value={v.id}>
                  {t("version", { version: v.version, name: v.file_name })} —{" "}
                  {t(`status.${v.status}`)}
                </option>
              ))}
            </select>
            {canLoadMoreVersions && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busy || versionsLoading}
                onClick={() => { void loadMoreVersions(); }}
              >
                {versionsLoading && <Loader2 className="size-3.5 animate-spin" />}
                {t("manage.loadMoreVersions")}
              </Button>
            )}
            </div>
            <DocumentManagePanel
              key={document.id}
              document={document}
              disabled={busy}
              onChanged={(next) => {
                setDocument(next);
                refresh();
              }}
              onPurged={() => {
                setDocument(null);
                setContent(null);
                setVersionId("");
                refresh();
              }}
            />
            {document.archived_at && (
              <p role="status" className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm leading-6 text-gray-600">{t("manage.archivedNotice")}</p>
            )}
            {version?.error_code && (
              <p role="alert" className="rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-700">{t("errorCode", { code: version.error_code })}</p>
            )}
            {status === "OCR_REQUIRED" && (
              <p role="alert" className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
                <Info className="mt-1 size-4 shrink-0" aria-hidden="true" />{t("ocr")}
              </p>
            )}
            {status === "EXTRACTED" && <p className="flex items-start gap-2 text-sm leading-6 text-gray-500"><Info className="mt-1 size-4 shrink-0 text-[#0066cc]" aria-hidden="true" />{t("extracted")}</p>}
            {version &&
              !document.archived_at &&
              (status === "EXTRACTED" ||
                status === "QUEUED" ||
                status === "PROCESSING") && (
                <Button asChild variant="outline" className="w-fit cursor-pointer">
                  <Link
                    href={`/lecturer/questions/generate?topic=${document.topic_id}&document=${document.id}&version=${version.id}`}
                  >
                    <Sparkles className="size-4" aria-hidden="true" />
                    {t("workspace.generateFromVersion")}
                  </Link>
                </Button>
              )}
            {version && <DocumentRagPanel key={version.id} documentId={document.id} version={version} refresh={refresh} disabled={busy} />}
            {status === "UPLOADING" && (
              <Button
                disabled={busy}
                onClick={() => {
                  void confirmUpload();
                }}
              >
                {t("resume")}
              </Button>
            )}
            <section aria-label={t("preview")} className="space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-800"><FileText className="size-4 text-[#0066cc]" aria-hidden="true" />{t("preview")}</h3>
            {!content && <p role="status" className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-5 text-sm leading-6 text-gray-500">{t("noPreview")}</p>}
            {content?.data.map((span) => (
              <section
                key={`${span.kind}:${span.position}`}
                className="overflow-hidden rounded-xl border border-gray-200 bg-white"
              >
                <h4 className="border-b border-gray-100 bg-gray-50 px-4 py-3 text-xs font-semibold text-gray-600">
                  {t(`kind.${span.kind}`, { position: span.position })}
                </h4>
                <pre className="whitespace-pre-wrap break-words p-4 font-sans text-sm leading-7 text-gray-700 [overflow-wrap:anywhere]">
                  {span.text || t("emptyUnit")}
                </pre>
              </section>
            ))}
            </section>
            {content && (
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  disabled={contentPage <= 1}
                  onClick={() => {
                    setContent(null);
                    setContentPage((p) => p - 1);
                  }}
                >
                  {t("previous")}
                </Button>
                <Button
                  variant="outline"
                  disabled={contentPage * content.limit >= content.total}
                  onClick={() => {
                    setContent(null);
                    setContentPage((p) => p + 1);
                  }}
                >
                  {t("next")}
                </Button>
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 pt-5">
              <p className="max-w-2xl text-xs leading-5 text-gray-500">{t("workspace.revokeHint")}</p>
              <Button
                variant="outline"
                className="shrink-0 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                disabled={busy}
                onClick={() => { void revoke(); }}
              ><Trash2 className="size-4" />{t("revoke")}</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
