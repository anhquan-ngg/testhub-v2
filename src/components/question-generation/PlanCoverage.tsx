"use client";
import { useTranslations } from "next-intl";
import { useEnumLabels } from "@/i18n/useEnumLabels";
import type { FrozenPlan } from "@/types/knowledge-plan";
import type { QuestionGenerationItem } from "@/types/question-generation";

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
    <details className="rounded border p-3 text-sm" open>
      <summary className="cursor-pointer font-semibold">
        {t("coverage")}
      </summary>
      <ul className="mt-3 space-y-3">
        {plan.items.map((cell) => {
          const drafts = items.filter((item) => item.plan_item_id === cell.id);
          return (
            <li key={cell.id}>
              <p className="font-medium">
                {path(cell.node_id)} · {questionFormat(cell.question_format)}
              </p>
              <p>{cell.objective}</p>
              <p className="text-muted-foreground">
                {cell.source_units
                  .map((unit) => `${unit.kind}:${unit.position}`)
                  .join(", ")}
              </p>
              <p>
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
