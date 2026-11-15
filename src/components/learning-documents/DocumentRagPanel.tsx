"use client";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Database, Info, Loader2, Search, Sparkles } from "lucide-react";
import { learningDocumentService as api } from "@/services/learningDocumentService";
import { isUsableVersion, type DocumentVersion, type RetrievalResult } from "@/types/learning-document";

/** Explicit indexing and source retrieval preview. No automatic question generation. */
export function DocumentRagPanel({
  documentId, version, refresh, disabled,
}: {
  documentId: string;
  version: DocumentVersion;
  refresh: () => void;
  disabled: boolean;
}) {
  const t = useTranslations("shared.learningDocuments");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<RetrievalResult | null>(null);
  const controller = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      controller.current?.abort();
    };
  }, []);
  const indexes = version.indexes ?? [];
  const pending = indexes.some((i) => i.status === "QUEUED" || i.status === "INDEXING");
  const run = async (operation: () => Promise<unknown>) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      await operation();
    } catch {
      if (mounted.current) toast.error(t("failed"));
    } finally {
      lock.current = false;
      if (mounted.current) {
        setBusy(false);
        refresh();
      }
    }
  };
  if (!isUsableVersion(version)) return null;
  return (
    <section aria-labelledby={`rag-title-${version.id}`} className="space-y-5 rounded-xl border border-blue-100 bg-blue-50/30 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-gray-900">
          <Database className="size-5 shrink-0 text-[#0066cc]" aria-hidden="true" />
          <h3 id={`rag-title-${version.id}`} className="text-sm font-semibold">{t("rag.title")}</h3>
        </div>
        <Badge variant="outline" className="border-blue-200 bg-white text-[#0066cc]">{t("workspace.selectedVersionOnly")}</Badge>
      </div>
      <p className="flex items-start gap-2 text-xs leading-6 text-gray-600">
        <Info className="mt-1 size-4 shrink-0 text-[#0066cc]" aria-hidden="true" />
        {t("rag.disclosure")}
      </p>
      <div className="grid min-w-0 gap-5 lg:grid-cols-2">
        <div className="min-w-0 space-y-3 rounded-xl border border-gray-200 bg-white p-4">
          <h4 className="text-sm font-medium text-gray-800">{t("workspace.indexTitle")}</h4>
          <p className="text-xs leading-5 text-gray-500">{t("workspace.indexHint")}</p>
          <Button
            className="h-auto min-h-9 max-w-full whitespace-normal border-blue-200 text-[#0066cc] hover:bg-blue-50"
            variant="outline"
            disabled={disabled || busy || pending}
            onClick={() => { void run(() => api.index(documentId, version.id)); }}
          >
            <Sparkles className="size-4 shrink-0" />{t("rag.index")}
          </Button>
          {indexes.map((index) => (
            <div key={index.id} className="space-y-2 rounded-lg border border-gray-100 bg-gray-50 p-3 text-xs text-gray-600">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">{t(`rag.status.${index.status}`)}</span>
                <span className="tabular-nums">{index.completed_chunks}/{index.chunk_count}</span>
              </div>
              <progress
                className="h-1.5 w-full overflow-hidden rounded-full accent-[#0066cc] [&::-moz-progress-bar]:bg-[#0066cc] [&::-webkit-progress-bar]:bg-gray-100 [&::-webkit-progress-value]:bg-[#0066cc]"
                aria-label={t(`rag.status.${index.status}`)}
                max={Math.max(1, index.chunk_count)}
                value={index.completed_chunks}
              />
              {index.error_code && <p role="alert" className="break-words text-red-600">{t("errorCode", { code: index.error_code })}</p>}
              {index.status === "FAILED" && (
                <Button
                  className="h-auto min-h-9 max-w-full whitespace-normal"
                  variant="outline"
                  size="sm"
                  disabled={disabled || busy}
                  onClick={() => { void run(() => api.retryIndex(index.id)); }}
                >
                  {t("rag.retry")}
                </Button>
              )}
            </div>
          ))}
        </div>
        <form
          className="min-w-0 space-y-3 rounded-xl border border-gray-200 bg-white p-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!query.trim() || new TextEncoder().encode(query.trim()).length > 1800) {
              toast.error(t("invalid"));
              return;
            }
            setResult(null);
            void run(async () => {
              const abort = new AbortController();
              controller.current = abort;
              const value = await api.retrieve(version.id, query.trim(), abort.signal);
              if (mounted.current && !abort.signal.aborted) setResult(value);
            });
          }}
        >
          <Label className="text-sm font-medium text-gray-800" htmlFor={`retrieval-${version.id}`}>{t("rag.query")}</Label>
          <p id={`retrieval-hint-${version.id}`} className="text-xs leading-5 text-gray-500">{t("workspace.queryHint")}</p>
          <Input
            className="border-gray-200 bg-white"
            id={`retrieval-${version.id}`}
            aria-describedby={`retrieval-hint-${version.id}`}
            placeholder={t("workspace.queryPlaceholder")}
            value={query}
            maxLength={1000}
            disabled={busy || disabled}
            onChange={(event) => { setQuery(event.target.value); setResult(null); }}
          />
          <Button
            className="h-auto min-h-9 max-w-full whitespace-normal bg-[#0066cc] hover:bg-[#0052a3]"
            type="submit"
            disabled={busy || disabled || !indexes.some((index) => index.status === "READY") || !query.trim()}
          >
            {busy ? <Loader2 className="size-4 shrink-0 animate-spin" /> : <Search className="size-4 shrink-0" />}
            {t("rag.search")}
          </Button>
        </form>
      </div>
      {result && (
        <div className="space-y-3">
          <p role="status" className="rounded-lg border border-amber-100 bg-amber-50 p-3 text-xs leading-6 text-amber-800">{t("rag.unassessed")}</p>
          {result.chunks.length === 0 && <p className="py-3 text-sm text-gray-500">{t("workspace.noResults")}</p>}
          {result.chunks.map((chunk) => (
            <article key={chunk.chunk_id} className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
              <h4 className="flex flex-wrap items-center justify-between gap-2 text-xs font-medium text-gray-600">
                <span className="text-[#0066cc]">{t(`kind.${chunk.kind}`, { position: chunk.position })}</span>
                <span>{t("rag.similarity", { score: chunk.similarity.toFixed(3) })}</span>
              </h4>
              <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-7 text-gray-700 [overflow-wrap:anywhere]">{chunk.text}</pre>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
