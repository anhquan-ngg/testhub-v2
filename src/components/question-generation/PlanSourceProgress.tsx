"use client";

import { Database, FileSearch, Loader2, Timer } from "lucide-react";
import { useTranslations } from "next-intl";
import type { PlanSourceProgress as SourceProgress } from "@/types/knowledge-plan";

/** Read-only preparation progress; reaching 100% indexing still requires an outline. */
export function PlanSourceProgress({ progress }: { progress?: SourceProgress | null }) {
  const t = useTranslations("shared.questionGeneration.plan.preparation");
  const stage = progress?.stage;
  const hasCounts = Boolean(progress && Number.isFinite(progress.total_chunks) && progress.total_chunks > 0 &&
    Number.isFinite(progress.completed_chunks) && progress.completed_chunks >= 0);
  const percent = hasCounts && typeof progress?.percent === "number" && Number.isFinite(progress.percent)
    ? Math.max(0, Math.min(100, Math.floor(progress.percent))) : null;
  const rateLimited = progress?.error_code === "RAG_EMBEDDING_RATE_LIMITED";
  const Icon = stage === "INDEXING" ? Database : stage === "OUTLINING" ? FileSearch : Loader2;

  return (
    <section className="min-w-0 space-y-3 rounded-lg border border-blue-100 bg-blue-50/50 p-3 sm:p-4" aria-label={t("title")}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-blue-100 bg-white text-[#0066cc]">
            <Icon className={`size-4 ${!stage || stage === "EXTRACTING" ? "motion-safe:animate-spin" : ""}`} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-neutral-900">{stage ? t(`stage.${stage}`) : t("starting")}</p>
            <p className="text-xs text-neutral-600">{hasCounts && progress
              ? t("chunks", { completed: progress.completed_chunks, total: progress.total_chunks })
              : t("unknown")}</p>
          </div>
        </div>
        {percent !== null && <span className="rounded-md border border-blue-100 bg-white px-2.5 py-1 text-sm font-semibold tabular-nums text-[#0066cc]">{percent}%</span>}
      </div>
      <div role="progressbar" aria-label={t("title")} aria-valuemin={0} aria-valuemax={100}
        aria-valuenow={percent ?? undefined} aria-valuetext={percent === null ? t("unknown") : t("percent", { percent })}
        className="h-2.5 overflow-hidden rounded-full bg-blue-100">
        <div className={`h-full rounded-full bg-[#0066cc] motion-safe:transition-[width] motion-safe:duration-500 ${percent === null ? "w-1/3 motion-safe:animate-pulse" : ""}`}
          style={percent === null ? undefined : { width: `${percent}%` }} />
      </div>
      <p role="status" className="flex items-start gap-1.5 text-xs leading-5 text-neutral-600">
        {rateLimited && <Timer className="mt-0.5 size-3.5 shrink-0 text-amber-600" aria-hidden="true" />}
        {rateLimited ? t("rateLimited") : stage === "OUTLINING" ? t("outlining") : t("waitingHint")}
      </p>
      <p className="text-xs leading-5 text-neutral-500">{t("resumeHint")}</p>
    </section>
  );
}
