"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { z } from "zod";
import axios from "axios";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import apiClient from "@/lib/api-client";
import { ENDPOINTS } from "@/constants/endpoints";
import { learningDocumentService as api } from "@/services/learningDocumentService";
import type {
  DocumentContent,
  DocumentPage,
  DocumentReservation,
  DocumentUpload,
  LearningDocument,
} from "@/types/learning-document";
import { DocumentRagPanel } from "./DocumentRagPanel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Target = { id: string; name: string; parent_id?: string | null };
const metadata = z.object({
  title: z.string().trim().min(1).max(200),
  topic_id: z.string().uuid(),
  chapter_id: z.string().uuid(),
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
  const [history, setHistory] = useState<DocumentPage<LearningDocument> | null>(
    null,
  );
  const [document, setDocument] = useState<LearningDocument | null>(null);
  const [versionId, setVersionId] = useState("");
  const [contentPage, setContentPage] = useState(1);
  const [content, setContent] = useState<DocumentContent | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const selectedId = document?.id;
  const version = document?.versions.find((v) => v.id === versionId);
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
      try {
        const list = await api.list(page, controller.signal);
        if (!controller.signal.aborted) setHistory(list);
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
        if (notify && !controller.signal.aborted) toast.error(t("failed"));
      } finally {
        running = false;
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
  }, [page, selectedId, reloadKey, shouldPoll, t]);
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

  const open = (value: LearningDocument) => {
    setDocument(value);
    setVersionId(value.versions[0]?.id ?? "");
    setContent(null);
    setContentPage(1);
  };
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
      await api.complete(reservation.document_id, reservation.version_id);
      toast.success(t("success"));
    } catch {
      toast.error(t("failed"));
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
      await api.complete(document.id, version.id);
      toast.success(t("success"));
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
    <div className="space-y-6 p-6">
      <Button asChild variant="outline">
        <Link href="/lecturer/questions">{t("back")}</Link>
      </Button>
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <p className="text-muted-foreground">{t("intro")}</p>
      <Card>
        <CardHeader>
          <CardTitle>{t("upload")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void upload(false);
            }}
          >
            <div>
              <Label htmlFor="document-title">{t("documentTitle")}</Label>
              <Input
                id="document-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                disabled={busy}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="document-topic">{t("topic")}</Label>
                <select
                  id="document-topic"
                  className="w-full rounded border p-2"
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
              <div>
                <Label htmlFor="document-chapter">{t("chapter")}</Label>
                <select
                  id="document-chapter"
                  className="w-full rounded border p-2"
                  value={chapter}
                  disabled={busy || !topic}
                  onChange={(e) => setChapter(e.target.value)}
                >
                  <option value="">{t("choose")}</option>
                  {chapters.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <Label htmlFor="document-file">{t("file")}</Label>
              <Input
                id="document-file"
                type="file"
                accept=".pdf,.pptx"
                disabled={busy}
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={notes}
                disabled={busy || !file?.name.toLowerCase().endsWith(".pptx")}
                onChange={(e) => setNotes(e.target.checked)}
              />
              {t("notes")}
            </label>
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={consent}
                disabled={busy}
                onChange={(e) => setConsent(e.target.checked)}
              />
              {t("consent")}
            </label>
            <div className="flex flex-wrap gap-2">
              <Button disabled={busy} type="submit">
                {busy ? t("uploading") : t("upload")}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={busy || !document}
                onClick={() => {
                  void upload(true);
                }}
              >
                {t("newVersion")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t("history")}</CardTitle>
          <Button variant="outline" onClick={refresh}>
            {t("reload")}
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {history?.data.map((v) => (
            <button
              type="button"
              key={v.id}
              disabled={busy}
              onClick={() => open(v)}
              className={`block w-full rounded border p-3 text-left ${v.id === selectedId ? "border-blue-500" : ""}`}
            >
              <strong>{v.title}</strong> —{" "}
              {v.versions[0] ? t(`status.${v.versions[0].status}`) : ""}
            </button>
          ))}
          {history?.data.length === 0 && <p>{t("empty")}</p>}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              disabled={page <= 1 || busy}
              onClick={() => setPage((p) => p - 1)}
            >
              {t("previous")}
            </Button>
            <span>{t("page", { page })}</span>
            <Button
              variant="outline"
              disabled={
                !history || page * history.limit >= history.total || busy
              }
              onClick={() => setPage((p) => p + 1)}
            >
              {t("next")}
            </Button>
          </div>
        </CardContent>
      </Card>
      {document && (
        <Card>
          <CardHeader>
            <CardTitle>
              {document.title} — {t("preview")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <select
              aria-label={t("preview")}
              className="w-full rounded border p-2"
              value={versionId}
              disabled={busy}
              onChange={(e) => {
                setVersionId(e.target.value);
                setContent(null);
                setContentPage(1);
              }}
            >
              {document.versions.map((v) => (
                <option key={v.id} value={v.id}>
                  {t("version", { version: v.version, name: v.file_name })} —{" "}
                  {t(`status.${v.status}`)}
                </option>
              ))}
            </select>
            {version?.error_code && (
              <p role="alert">{t("errorCode", { code: version.error_code })}</p>
            )}
            {status === "OCR_REQUIRED" && (
              <p role="alert" className="rounded bg-amber-50 p-3">
                {t("ocr")}
              </p>
            )}
            {status === "EXTRACTED" && <p>{t("extracted")}</p>}
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
            {!content && <p>{t("noPreview")}</p>}
            {content?.data.map((span) => (
              <section
                key={`${span.kind}:${span.position}`}
                className="rounded border p-3"
              >
                <h3 className="font-medium">
                  {t(`kind.${span.kind}`, { position: span.position })}
                </h3>
                <pre className="whitespace-pre-wrap break-words font-sans">
                  {span.text || t("emptyUnit")}
                </pre>
              </section>
            ))}
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
            <Button
              variant="destructive"
              disabled={busy}
              onClick={() => {
                void revoke();
              }}
            >
              {t("revoke")}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
