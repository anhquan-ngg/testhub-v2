"use client";

import { useTranslations } from "next-intl";
import { useEnumLabels } from "@/i18n/useEnumLabels";
import type { QuestionGenerationBatch } from "@/types/question-generation";

function slotTarget(batch: QuestionGenerationBatch, slot: number) {
  // A frozen snapshot takes precedence over configs and the currently edited plan.
  const targets = batch.plan_snapshot?.items ?? batch.question_configs ?? [];
  let remaining = slot;
  for (const target of targets) {
    if (!Number.isSafeInteger(target.count) || target.count < 1) return undefined;
    if (remaining <= target.count) return target;
    remaining -= target.count;
  }
  return undefined;
}

/** Explain failed batches without retrying generation or guessing missing slots. */
export function GenerationBatchFailure({
  batch,
}: {
  batch: QuestionGenerationBatch;
}) {
  const t = useTranslations("shared.questionGeneration");
  const { questionType, questionFormat } = useEnumLabels();
  if (batch.status !== "FAILED") return null;

  if (batch.error_code !== "AI_INSUFFICIENT_EVIDENCE") {
    return (
      <p
        role="alert"
        className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
      >
        {t("failed")}{" "}
        <span className="font-mono">{batch.error_code}</span>
      </p>
    );
  }

  const issues = (batch.error_details?.issues ?? []).filter(
    (issue) =>
      Number.isSafeInteger(issue.slot) &&
      issue.slot > 0 &&
      (issue.reason === "INSUFFICIENT_EVIDENCE" ||
        issue.reason === "NO_RETRIEVED_CONTEXT"),
  );

  return (
    <div
      role="alert"
      className="space-y-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
    >
      <p className="font-medium">{t("insufficientEvidence.title")}</p>
      <p>{t("insufficientEvidence.explanation")}</p>
      {issues.length ? (
        <ul className="list-inside list-disc space-y-2 break-words">
          {issues.map((issue, index) => {
            const target = slotTarget(batch, issue.slot);
            const title =
              target &&
              "knowledge_title" in target &&
              typeof target.knowledge_title === "string"
                ? target.knowledge_title
                : null;
            const label = target
              ? t(title ? "insufficientEvidence.planSlot" : "insufficientEvidence.configSlot", {
                  slot: issue.slot,
                  title: title ?? "",
                  type: questionType(target.question_type),
                  format: questionFormat(target.question_format),
                })
              : t("insufficientEvidence.slot", { slot: issue.slot });
            return (
              <li key={`${issue.slot}-${index}`}>
                <span className="font-medium">{label}</span>{" "}
                {t(`insufficientEvidence.reasons.${issue.reason}`)}
              </li>
            );
          })}
        </ul>
      ) : (
        <p>{t("insufficientEvidence.unknownSlots")}</p>
      )}
      <p>{t("insufficientEvidence.action")}</p>
      <p>{t("insufficientEvidence.noDrafts")}</p>
    </div>
  );
}
