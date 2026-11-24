"use client";

import { useTranslations } from "next-intl";
import type { ExtractionQuality, OcrPage, OcrRequest } from "@/types/learning-document";

/** Read-only persisted OCR outcomes; missing metadata in older versions is supported. */
export function OcrSummary({ quality, request }: {
  quality?: ExtractionQuality | null;
  request?: OcrRequest | null;
}) {
  const t = useTranslations("shared.learningDocuments.ocrSummary");
  const pages = request?.pages ?? quality?.ocr_pages ?? [];
  const statuses: OcrPage["status"][] = ["PENDING", "COMPLETED", "NO_TEXT", "FAILED", "BUDGET_EXHAUSTED", "DISABLED"];
  if (!request && !quality?.ocr_pages && !quality?.ocr_candidate_units && !quality?.ocr_units?.length) return null;
  return (
    <section className="min-w-0 space-y-2 rounded-lg border border-blue-100 bg-blue-50/40 p-3 text-sm" aria-label={t("title")}>
      <p className="font-medium">{t("title")}</p>
      <p>{t("counts", { total: pages.length, added: quality?.ocr_units?.length ?? 0, candidates: quality?.ocr_candidate_units?.length ?? 0 })}</p>
      <div className="flex flex-wrap gap-x-4 gap-y-1" role="status" aria-live="polite">
        {statuses.map((status) => {
          const count = pages.filter((page) => page.status === status).length;
          return count ? <span key={status}>{t(`status.${status}`)}: {count}</span> : null;
        })}
      </div>
      {pages.length > 0 && (
        <details>
          <summary className="cursor-pointer">{t("pages")}</summary>
          <ul className="mt-2 max-h-60 space-y-1 overflow-auto">
            {pages.map((page) => (
              <li key={page.position} className="break-words">
                {t("page", { position: page.position })}: {statuses.includes(page.status) ? t(`status.${page.status}`) : t("unknown")}
                {page.reason && <span className="ml-2 font-mono text-xs">{page.reason}</span>}
              </li>
            ))}
          </ul>
        </details>
      )}
      <p className="text-xs text-neutral-600">{t("hint")}</p>
    </section>
  );
}
