"use client";
import { useTranslations } from "next-intl";
import { useEnumLabels } from "@/i18n/useEnumLabels";
import type { FrozenPlan } from "@/types/knowledge-plan";
import type { QuestionGenerationItem } from "@/types/question-generation";
import { Badge } from "@/components/ui/badge";
import { formatClass } from "./generation-style";

/** Compare frozen requested cells with validated drafts and explicit bank commits. */
export function PlanCoverage({
  plan,
  items,
}: {
  plan: FrozenPlan;
  items: QuestionGenerationItem[];
}) {
  const t = useTranslations("shared.questionGeneration.plan");
  const { questionFormat } = useEnumLabels();
  const path = (id: string) => {
    const names: string[] = [],
      seen = new Set<string>();
    let node = plan.nodes.find((value) => value.id === id);
    while (node && !seen.has(node.id)) {
      seen.add(node.id);
      names.unshift(node.name);
      node = plan.nodes.find((value) => value.id === node?.parent_id);
    }
    return names.join(" / ");
  };
  return (
    <details
      className="rounded-xl border border-gray-300 bg-white p-4 text-sm shadow-sm"
      open
    >
      <summary className="cursor-pointer font-semibold text-neutral-900">
        {t("coverage")}
      </summary>
      <ul className="mt-3 space-y-3">
        {plan.items.map((cell) => {
          const drafts = items.filter((item) => item.plan_item_id === cell.id);
          return (
            <li
              key={cell.id}
              className="rounded-md border border-gray-200 bg-gray-50/60 p-3"
            >
              <p className="flex flex-wrap items-center gap-2 font-medium text-neutral-900">
                {path(cell.node_id)}
                <Badge
                  variant="outline"
                  className={formatClass(cell.question_format)}
                >
                  {questionFormat(cell.question_format)}
                </Badge>
              </p>
              <p className="mt-1 text-neutral-700">{cell.objective}</p>
              <p className="text-xs text-neutral-500">
                {cell.source_units
                  .map((unit) => `${unit.kind}:${unit.position}`)
                  .join(", ")}
              </p>
              <p className="mt-2 inline-block rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs text-emerald-800">
                {t("coverageCounts", {
                  requested: cell.count,
                  generated: drafts.length,
                  approved: drafts.filter((item) =>
                    ["APPROVED", "COMMITTED"].includes(item.status),
                  ).length,
                  committed: drafts.filter(
                    (item) => item.status === "COMMITTED",
                  ).length,
                })}
              </p>
            </li>
          );
        })}
      </ul>
    </details>
  );
}
