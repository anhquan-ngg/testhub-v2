"use client";

import { useEffect, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import { useEnumLabels } from "@/i18n/useEnumLabels";
import { knowledgePlanService as api } from "@/services/knowledgePlanService";
import type {
  KnowledgePlan,
  PlanMatrix,
  SourceUnit,
} from "@/types/knowledge-plan";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  GENERATION_QUESTION_FORMATS as levels,
  GENERATION_QUESTION_TYPES as types,
} from "./generation-validation";
import { planMatrixSchema } from "./plan-validation";

const unitKey = (unit: SourceUnit) => `${unit.kind}:${unit.position}`;
const unitText = (units: SourceUnit[]) => units.map(unitKey).join(", ");

function UnitInput({
  units,
  allowed,
  disabled,
  label,
  onChange,
}: {
  units: SourceUnit[];
  allowed: SourceUnit[];
  disabled: boolean;
  label: string;
  onChange: (units: SourceUnit[]) => void;
}) {
  const [text, setText] = useState(unitText(units));
  const parsed = text
    .split(",")
    .map((value) => allowed.find((unit) => unitKey(unit) === value.trim()));
  const valid =
    parsed.length > 0 &&
    parsed.every((unit) => unit !== undefined) &&
    new Set(parsed.map((unit) => unit && unitKey(unit))).size === parsed.length;
  return (
    <Input
      aria-label={label}
      value={text}
      disabled={disabled}
      aria-invalid={!valid}
      onChange={(event) => {
        const next = event.target.value;
        setText(next);
        const values = next
          .split(",")
          .map((value) =>
            allowed.find((unit) => unitKey(unit) === value.trim()),
          );
        // Invalid input invalidates the form too; it must never save the previous source silently.
        onChange(
          values.every((unit): unit is SourceUnit => Boolean(unit)) &&
            new Set(values.map(unitKey)).size === values.length
            ? values
            : [],
        );
      }}
    />
  );
}

/** Source outline and topic × cognition review. No chapter is created by this component. */
export function KnowledgePlanWorkspace({
  planId,
  disabled,
  onGenerated,
}: {
  planId: string | null;
  disabled: boolean;
  onGenerated: (id: string) => void;
}) {
  const t = useTranslations("shared.questionGeneration.plan");
  const { questionType, questionFormat } = useEnumLabels();
  const [plan, setPlan] = useState<KnowledgePlan | null>(null);
  const [formVersion, setFormVersion] = useState(0);
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const [history, setHistory] = useState<KnowledgePlan[]>([]);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(false);
  const lock = useRef(false),
    generationKey = useRef<{
      plan: string;
      revision: number;
      key: string;
    } | null>(null);
  const form = useForm<PlanMatrix>({
    resolver: zodResolver(planMatrixSchema),
    defaultValues: { nodes: [], rows: [] },
  });
  const {
    reset,
    register,
    setValue,
    watch,
    handleSubmit,
    formState: { isDirty },
  } = form;
  const matrix = watch();
  const accept = (value: KnowledgePlan) => {
    setPlan(value);
    if (value.matrix) {
      reset(value.matrix);
      setFormVersion((version) => version + 1);
    }
  };
  useEffect(() => {
    const controller = new AbortController();
    api
      .list(controller.signal)
      .then((value) => setHistory(value.data))
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      });
    return () => controller.abort();
  }, [planId]);
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    setPlan(null);
    reset({ nodes: [], rows: [] });
    setError(false);
    if (!planId) return () => controller.abort();
    const load = async () => {
      try {
        const value = await api.get(planId, controller.signal);
        if (controller.signal.aborted) return;
        setPlan(value);
        if (value.matrix) {
          reset(value.matrix);
          setFormVersion((version) => version + 1);
        }
        setError(false);
        if (["WAITING_SOURCE", "PREPARING"].includes(value.status))
          timer = setTimeout(() => void load(), 5000);
      } catch {
        if (!controller.signal.aborted) setError(true);
      }
    };
    void load();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [planId, reset]);
  const mutate = async (operation: () => Promise<void>) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError(false);
    try {
      await operation();
    } catch {
      setError(true);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const editable =
    ["REVIEW_REQUIRED", "APPROVED"].includes(plan?.status ?? "") &&
    !busy &&
    !disabled;
  const total = matrix.rows.reduce(
    (sum, row) =>
      sum +
      levels.reduce(
        (n, level) =>
          n + (Number.isFinite(row.counts[level]) ? row.counts[level] : 0),
        0,
      ),
    0,
  );
  const parentIds = new Set(matrix.nodes.map((node) => node.parent_id));
  const covered = new Set(
    matrix.rows
      .filter((row) => levels.some((level) => row.counts[level] > 0))
      .map((row) => row.node_id),
  );
  const uncovered = matrix.nodes.filter(
    (node) => !parentIds.has(node.id) && !covered.has(node.id),
  ).length;
  const nodeById = new Map(matrix.nodes.map((node) => [node.id, node]));
  // Truncate display breadcrumbs only; parent references retain arbitrary depth.
  const path = (id: string) => {
    const parts: string[] = [],
      seen = new Set<string>();
    let node = nodeById.get(id);
    while (node && !seen.has(node.id) && parts.length < 6) {
      seen.add(node.id);
      parts.unshift(node.name);
      node = node.parent_id ? nodeById.get(node.parent_id) : undefined;
    }
    if (node && !seen.has(node.id)) parts.unshift("…");
    return parts.join(" / ");
  };
  const removeNode = (id: string) => {
    const removed = new Set([id]);
    let previous = 0;
    while (previous !== removed.size) {
      previous = removed.size;
      matrix.nodes.forEach((node) => {
        if (node.parent_id && removed.has(node.parent_id)) removed.add(node.id);
      });
    }
    if (matrix.rows.some((row) => removed.has(row.node_id))) {
      toast.error(t("removeRowsFirst"));
      return;
    }
    setValue(
      "nodes",
      matrix.nodes.filter((node) => !removed.has(node.id)),
      { shouldDirty: true },
    );
  };
  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="min-w-0 space-y-5">
        <p className="text-sm text-muted-foreground">{t("explanation")}</p>
        {error && (
          <p role="alert" className="text-destructive">
            {t("error")}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {history.map((value) => (
            <Button
              asChild
              key={value.id}
              variant="outline"
              size="sm"
              disabled={busy || disabled}
            >
              <Link
                href={`/lecturer/questions/generate?plan=${value.id}`}
                onClick={(event) => {
                  if (busy || disabled || isDirty) {
                    event.preventDefault();
                    if (isDirty) toast.info(t("unsaved"));
                  }
                }}
              >
                {value.sourceVersion.file_name} · {t(`status.${value.status}`)}
              </Link>
            </Button>
          ))}
        </div>
        {plan && (
          <>
            <Button
              type="button"
              variant="outline"
              disabled={busy || disabled}
              onClick={() =>
                void mutate(async () => accept(await api.get(plan.id)))
              }
            >
              {t("reload")}
            </Button>
            <p className="font-medium">
              {plan.sourceVersion.file_name} · {t(`status.${plan.status}`)} ·{" "}
              {t("revision", { revision: plan.revision })}
            </p>
            {plan.error_code && <p role="alert">{plan.error_code}</p>}
            {plan.matrix && plan.content_map && (
              <form
                onSubmit={handleSubmit(
                  (value) =>
                    void mutate(async () =>
                      accept(await api.save(plan, value)),
                    ),
                  () => toast.error(t("invalid")),
                )}
                className="min-w-0 space-y-5"
              >
                <fieldset disabled={!editable} className="min-w-0 space-y-3">
                  <legend className="font-semibold">{t("tree")}</legend>
                  <p className="text-xs text-muted-foreground">
                    {t("sourceHint")}
                  </p>
                  <div className="max-h-[480px] space-y-3 overflow-auto rounded border p-3">
                    {matrix.nodes.map((node, index) => {
                      const origin = plan.content_map?.nodes.find(
                        (value) => value.id === node.id,
                      );
                      const match = plan.chapter_matches?.find(
                        (value) => value.node_id === node.id,
                      );
                      return (
                        <div
                          key={node.id}
                          className="space-y-2 rounded border p-3"
                        >
                          <p className="break-words text-xs">
                            {path(node.id)} ·{" "}
                            {origin
                              ? t(
                                  origin.origin === "HEADING"
                                    ? "heading"
                                    : "inferred",
                                )
                              : t("edited")}{" "}
                            ·{" "}
                            {t(
                              match?.ambiguous
                                ? "ambiguous"
                                : match?.chapter_id
                                  ? "existing"
                                  : "new",
                            )}
                          </p>
                          {origin && (
                            <p className="text-xs text-muted-foreground">
                              {origin.evidence}
                            </p>
                          )}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setActiveNode(
                                activeNode === node.id ? null : node.id,
                              )
                            }
                          >
                            {t("editNode")}
                          </Button>
                          {activeNode === node.id && (
                            <>
                              <div className="grid gap-2 md:grid-cols-3">
                                <Input
                                  aria-label={t("name")}
                                  {...register(`nodes.${index}.name`)}
                                />
                                <select
                                  aria-label={t("parent")}
                                  className="min-w-0 rounded border bg-background p-2"
                                  value={node.parent_id ?? ""}
                                  onChange={(event) =>
                                    setValue(
                                      `nodes.${index}.parent_id`,
                                      event.target.value || null,
                                      { shouldDirty: true },
                                    )
                                  }
                                >
                                  <option value="">{t("root")}</option>
                                  {matrix.nodes
                                    .filter((value) => value.id !== node.id)
                                    .map((value) => (
                                      <option key={value.id} value={value.id}>
                                        {path(value.id)}
                                      </option>
                                    ))}
                                </select>
                                <UnitInput
                                  key={`${plan.revision}-${formVersion}-${node.id}`}
                                  label={t("sources")}
                                  units={node.source_units}
                                  allowed={plan.content_map?.source_units ?? []}
                                  disabled={!editable}
                                  onChange={(units) =>
                                    setValue(
                                      `nodes.${index}.source_units`,
                                      units,
                                      {
                                        shouldDirty: true,
                                      },
                                    )
                                  }
                                />
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => removeNode(node.id)}
                              >
                                {t("removeNode")}
                              </Button>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!editable || matrix.nodes.length >= 1000}
                    onClick={() =>
                      setValue(
                        "nodes",
                        [
                          ...matrix.nodes,
                          {
                            id: crypto.randomUUID(),
                            name: "",
                            parent_id: null,
                            source_units:
                              plan.content_map?.source_units.slice(0, 1) ?? [],
                          },
                        ],
                        { shouldDirty: true },
                      )
                    }
                  >
                    {t("addNode")}
                  </Button>
                </fieldset>
                <fieldset
                  disabled={!editable}
                  className="@container/matrix min-w-0 space-y-3"
                >
                  <legend className="font-semibold">{t("matrix")}</legend>
                  <div className="min-w-0 rounded border">
                    <table className="block w-full min-w-0 text-sm @min-[64rem]/matrix:table @min-[64rem]/matrix:table-fixed">
                      <colgroup className="hidden @min-[64rem]/matrix:table-column-group">
                        <col className="w-[18%]" />
                        <col className="w-[22%]" />
                        <col className="w-[12%]" />
                        <col className="w-[14%]" />
                        {levels.map((level) => (
                          <col key={level} className="w-[7%]" />
                        ))}
                        <col className="w-[6%]" />
                      </colgroup>
                      <thead className="hidden bg-muted/40 @min-[64rem]/matrix:table-header-group [&_th]:break-words [&_th]:px-2 [&_th]:py-3 [&_th]:text-left [&_th]:align-middle [&_th]:text-xs [&_th]:font-medium">
                        <tr>
                          <th>{t("tree")}</th>
                          <th>{t("objective")}</th>
                          <th>{t("sources")}</th>
                          <th>{t("type")}</th>
                          {levels.map((level) => (
                            <th key={level} className="hyphens-auto">
                              {questionFormat(level)}
                            </th>
                          ))}
                          <th>{t("actions")}</th>
                        </tr>
                      </thead>
                      <tbody className="grid min-w-0 gap-3 p-3 @min-[64rem]/matrix:table-row-group @min-[64rem]/matrix:p-0">
                        {matrix.rows.map((row, index) => (
                          <tr
                            key={row.id}
                            className="grid min-w-0 grid-cols-1 gap-3 rounded-lg border p-3 align-top sm:grid-cols-2 @min-[64rem]/matrix:table-row @min-[64rem]/matrix:rounded-none @min-[64rem]/matrix:border-x-0 @min-[64rem]/matrix:p-0"
                          >
                            <td className="min-w-0 space-y-1.5 @min-[64rem]/matrix:p-2">
                              <span className="block text-xs font-medium @min-[64rem]/matrix:hidden">
                                {t("tree")}
                              </span>
                              <select
                                aria-label={t("tree")}
                                title={path(row.node_id)}
                                className="h-9 w-full min-w-0 max-w-full rounded border bg-background px-2 text-sm"
                                {...register(`rows.${index}.node_id`, {
                                  onChange: (event) => {
                                    const target = matrix.nodes.find(
                                      (node) => node.id === event.target.value,
                                    );
                                    if (target)
                                      setValue(
                                        `rows.${index}.source_units`,
                                        target.source_units,
                                        { shouldDirty: true },
                                      );
                                  },
                                })}
                              >
                                {matrix.nodes.map((node) => (
                                  <option key={node.id} value={node.id}>
                                    {path(node.id)}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="min-w-0 space-y-1.5 @min-[64rem]/matrix:p-2">
                              <span className="block text-xs font-medium @min-[64rem]/matrix:hidden">
                                {t("objective")}
                              </span>
                              <Textarea
                                rows={2}
                                className="min-h-16 min-w-0 resize-y text-sm"
                                aria-label={t("objective")}
                                {...register(`rows.${index}.objective`)}
                              />
                            </td>
                            <td className="min-w-0 space-y-1.5 @min-[64rem]/matrix:p-2">
                              <span className="block text-xs font-medium @min-[64rem]/matrix:hidden">
                                {t("sources")}
                              </span>
                              <UnitInput
                                key={`${plan.revision}-${formVersion}-${row.id}-${row.node_id}`}
                                label={t("sources")}
                                units={row.source_units}
                                allowed={plan.content_map?.source_units ?? []}
                                disabled={!editable}
                                onChange={(units) =>
                                  setValue(
                                    `rows.${index}.source_units`,
                                    units,
                                    { shouldDirty: true },
                                  )
                                }
                              />
                            </td>
                            <td className="min-w-0 space-y-1.5 @min-[64rem]/matrix:p-2">
                              <span className="block text-xs font-medium @min-[64rem]/matrix:hidden">
                                {t("type")}
                              </span>
                              <select
                                aria-label={t("type")}
                                className="h-9 w-full min-w-0 max-w-full rounded border bg-background px-2 text-sm"
                                {...register(`rows.${index}.question_type`)}
                              >
                                {types.map((type) => (
                                  <option key={type} value={type}>
                                    {questionType(type)}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td colSpan={4} className="min-w-0 sm:col-span-2 @min-[64rem]/matrix:p-2">
                              <div className="grid min-w-0 grid-cols-4 gap-2">
                                {levels.map((level) => (
                                  <label key={level} className="flex min-w-0 flex-col justify-end gap-1.5">
                                    <span className="block break-words text-xs font-medium @min-[64rem]/matrix:sr-only">
                                      {questionFormat(level)}
                                    </span>
                                    <Input
                                      aria-label={`${path(row.node_id)} ${questionFormat(level)}`}
                                      className="w-full min-w-0 px-1 text-center"
                                      type="number"
                                      min={0}
                                      max={20}
                                      {...register(
                                        `rows.${index}.counts.${level}`,
                                        { valueAsNumber: true },
                                      )}
                                    />
                                  </label>
                                ))}
                              </div>
                            </td>
                            <td className="min-w-0 text-right sm:col-span-2 @min-[64rem]/matrix:p-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                aria-label={t("remove")}
                                title={t("remove")}
                                onClick={() =>
                                  setValue(
                                    "rows",
                                    matrix.rows.filter(
                                      (value) => value.id !== row.id,
                                    ),
                                    { shouldDirty: true },
                                  )
                                }
                              >
                                <Trash2 className="size-4" aria-hidden="true" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={
                      !editable ||
                      matrix.rows.length >= 20 ||
                      !matrix.nodes.length
                    }
                    onClick={() =>
                      setValue(
                        "rows",
                        [
                          ...matrix.rows,
                          {
                            id: crypto.randomUUID(),
                            node_id: matrix.nodes[0].id,
                            objective: "",
                            source_units: matrix.nodes[0].source_units,
                            question_type: "SINGLE_CHOICE",
                            counts: {
                              KNOWLEDGE: 1,
                              UNDERSTANDING: 0,
                              APPLYING: 0,
                              ADVANCED: 0,
                            },
                          },
                        ],
                        { shouldDirty: true },
                      )
                    }
                  >
                    {t("addRow")}
                  </Button>
                </fieldset>
                <p>{t("total", { total, uncovered })}</p>
                <p className="text-sm text-muted-foreground">
                  {t("reviewWarning")}
                </p>
                {isDirty && <p className="text-sm">{t("unsaved")}</p>}
                <div className="flex flex-wrap gap-3">
                  <Button type="submit" disabled={!editable || !isDirty}>
                    {t("save")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={
                      !editable ||
                      plan.status !== "REVIEW_REQUIRED" ||
                      isDirty ||
                      plan.chapter_matches?.some((match) => match.ambiguous)
                    }
                    onClick={() =>
                      void mutate(async () => accept(await api.approve(plan)))
                    }
                  >
                    {t("approve")}
                  </Button>
                  <Button
                    type="button"
                    disabled={
                      plan.status !== "APPROVED" || isDirty || busy || disabled
                    }
                    onClick={() =>
                      void mutate(async () => {
                        if (
                          generationKey.current?.plan !== plan.id ||
                          generationKey.current.revision !== plan.revision
                        )
                          generationKey.current = {
                            plan: plan.id,
                            revision: plan.revision,
                            key: crypto.randomUUID(),
                          };
                        const result = await api.generate(
                          plan,
                          generationKey.current.key,
                        );
                        onGenerated(result.batch_id);
                      })
                    }
                  >
                    {t("generate")}
                  </Button>
                </div>
              </form>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
