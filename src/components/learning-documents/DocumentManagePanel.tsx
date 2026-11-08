"use client";

import { useEffect, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import axios from "axios";
import { toast } from "sonner";
import { learningDocumentService as api } from "@/services/learningDocumentService";
import type {
  DocumentHistory,
  LearningDocument,
} from "@/types/learning-document";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Archive,
  ArchiveRestore,
  Clock,
  History,
  Loader2,
  Pencil,
  Trash2,
} from "lucide-react";

type Props = {
  document: LearningDocument;
  disabled: boolean;
  onChanged: (document: LearningDocument) => void;
  onPurged: () => void;
};

/** Rename, archive/unarchive, purge and usage history for one library document. */
export function DocumentManagePanel({
  document,
  disabled,
  onChanged,
  onPurged,
}: Props) {
  const t = useTranslations("shared.learningDocuments.manage");
  const format = useFormatter();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(document.title);
  const [working, setWorking] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<DocumentHistory | null>(null);
  const [historyFailed, setHistoryFailed] = useState(false);
  const archived = Boolean(document.archived_at);
  const busy = disabled || working;
  const when = (value: string) =>
    format.dateTime(new Date(value), { dateStyle: "medium", timeStyle: "short" });

  useEffect(() => {
    if (!showHistory) return;
    const controller = new AbortController();
    setHistoryFailed(false);
    api
      .history(document.id, controller.signal)
      .then((value) => {
        if (!controller.signal.aborted) setHistory(value);
      })
      .catch(() => {
        if (!controller.signal.aborted) setHistoryFailed(true);
      });
    return () => controller.abort();
  }, [showHistory, document.id, document.last_used_at]);

  const run = async (action: () => Promise<void>) => {
    if (busy) return;
    setWorking(true);
    try {
      await action();
    } catch (error) {
      toast.error(
        axios.isAxiosError(error) && error.response?.status === 409
          ? t("conflict")
          : t("failed"),
      );
    } finally {
      setWorking(false);
    }
  };
  const rename = () => {
    const next = title.trim();
    if (!next || next === document.title) {
      setEditing(false);
      setTitle(document.title);
      return;
    }
    void run(async () => {
      onChanged(await api.rename(document.id, next));
      setEditing(false);
      toast.success(t("renamed"));
    });
  };
  const toggleArchive = () =>
    void run(async () => {
      onChanged(
        archived
          ? await api.unarchive(document.id)
          : await api.archive(document.id),
      );
      toast.success(archived ? t("unarchived") : t("archivedDone"));
    });
  const purge = () => {
    if (!window.confirm(t("purgeConfirm"))) return;
    void run(async () => {
      await api.purge(document.id);
      toast.success(t("purged"));
      onPurged();
    });
  };

  return (
    <section
      aria-label={t("title")}
      className="space-y-4 rounded-xl border border-gray-200 bg-gray-50/60 p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-gray-800">{t("title")}</h3>
        {archived && (
          <Badge
            variant="outline"
            className="border-amber-200 bg-amber-50 text-amber-800"
          >
            {t("archived")}
          </Badge>
        )}
      </div>
      {editing ? (
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            rename();
          }}
        >
          <Input
            aria-label={t("renameLabel")}
            value={title}
            maxLength={200}
            disabled={busy}
            onChange={(e) => setTitle(e.target.value)}
            className="h-9 min-w-0 flex-1 bg-white"
          />
          <Button size="sm" type="submit" disabled={busy || !title.trim()}>
            {t("save")}
          </Button>
          <Button
            size="sm"
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => {
              setEditing(false);
              setTitle(document.title);
            }}
          >
            {t("cancel")}
          </Button>
        </form>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => {
              setTitle(document.title);
              setEditing(true);
            }}
          >
            <Pencil className="size-3.5" />
            {t("rename")}
          </Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={toggleArchive}>
            {working ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : archived ? (
              <ArchiveRestore className="size-3.5" />
            ) : (
              <Archive className="size-3.5" />
            )}
            {archived ? t("unarchive") : t("archive")}
          </Button>
          {archived && (
            <Button
              size="sm"
              variant="outline"
              className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
              disabled={busy}
              onClick={purge}
            >
              <Trash2 className="size-3.5" />
              {t("purge")}
            </Button>
          )}
        </div>
      )}
      <p className="text-xs leading-5 text-gray-500">
        {archived ? t("purgeHint") : t("archiveHint")}
      </p>
      <p className="flex items-center gap-2 text-xs text-gray-600">
        <Clock className="size-3.5 shrink-0 text-[#0066cc]" aria-hidden="true" />
        {document.last_used_at
          ? t("lastUsed", { date: when(document.last_used_at) })
          : t("neverUsed")}
      </p>
      <div className="space-y-3">
        <Button
          size="sm"
          variant="ghost"
          className="-ml-2 text-[#0066cc] hover:bg-blue-50"
          aria-expanded={showHistory}
          onClick={() => setShowHistory((value) => !value)}
        >
          <History className="size-3.5" />
          {showHistory ? t("historyHide") : t("historyShow")}
        </Button>
        {showHistory && historyFailed && (
          <p role="alert" className="text-xs text-amber-800">
            {t("failed")}
          </p>
        )}
        {showHistory && !history && !historyFailed && (
          <p role="status" className="flex items-center gap-2 text-xs text-gray-500">
            <Loader2 className="size-3.5 animate-spin" />
            {t("historyLoading")}
          </p>
        )}
        {showHistory && history && (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-gray-700">{t("plans")}</h4>
              {history.plans.length === 0 && (
                <p className="text-xs text-gray-500">{t("historyEmpty")}</p>
              )}
              <ul className="space-y-2">
                {history.plans.map((plan) => (
                  <li
                    key={plan.id}
                    className="rounded-lg border border-gray-200 bg-white p-2 text-xs text-gray-600"
                  >
                    <p className="font-medium text-gray-800">
                      {t("planLine", {
                        revision: plan.revision,
                        version: plan.sourceVersion.version,
                      })}
                    </p>
                    <p>
                      {plan.status} · {when(plan.created_at)}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-gray-700">{t("batches")}</h4>
              {history.batches.length === 0 && (
                <p className="text-xs text-gray-500">{t("historyEmpty")}</p>
              )}
              <ul className="space-y-2">
                {history.batches.map((batch) => (
                  <li
                    key={batch.id}
                    className="rounded-lg border border-gray-200 bg-white p-2 text-xs text-gray-600"
                  >
                    <p className="font-medium text-gray-800">
                      {t("batchLine", {
                        requested: batch.requested_count,
                        total: batch.total_items,
                        version: batch.sourceVersion.version,
                      })}
                    </p>
                    <p>
                      {batch.status} · {when(batch.created_at)}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
