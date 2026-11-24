"use client";

import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { Network, Trash2 } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import { ICON_TONE, iconLabelProps, useIconLabels } from "@/lib/icon-button";
import { useEnumLabels } from "@/i18n/useEnumLabels";
import { knowledgePlanService as api } from "@/services/knowledgePlanService";
import type {
  KnowledgePlan,
  PlanMatrix,
  SourceUnit,
} from "@/types/knowledge-plan";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  GENERATION_QUESTION_FORMATS as levels,
  GENERATION_QUESTION_TYPES as types,
} from "./generation-validation";
import { planMatrixSchema } from "./plan-validation";
import { planStatusClass } from "./generation-style";
import { PlanOcrRecovery } from "./PlanOcrRecovery";

const unitKey = (unit: SourceUnit) => `${unit.kind}:${unit.position}`;
const unitText = (units: SourceUnit[]) => units.map(unitKey).join(", ");

type EvidenceGap = { row_id: string; node_name: string; body_chars: number; substantive_chars?: number; fact_count?: number; reason: string; formats: string[] };

function evidenceGaps(details: unknown): EvidenceGap[] {
  const values = Array.isArray(details) ? details :
    details && typeof details === "object" && "issues" in details && Array.isArray(details.issues) ? details.issues : [];
  return values.filter((value): value is Record<string, unknown> => Boolean(value) && typeof value === "object").map((value, index) => ({
    row_id: typeof value.row_id === "string" ? value.row_id : String(index),
    node_name: typeof value.node_name === "string" ? value.node_name : "",
    body_chars: typeof value.body_chars === "number" && Number.isFinite(value.body_chars) ? value.body_chars : 0,
    substantive_chars: typeof value.substantive_chars === "number" && Number.isFinite(value.substantive_chars) ? value.substantive_chars : undefined,
    fact_count: typeof value.fact_count === "number" && Number.isFinite(value.fact_count) ? value.fact_count : undefined,
    reason: typeof value.reason === "string" ? value.reason : typeof value.status === "string" ? value.status : "UNKNOWN",
    formats: Array.isArray(value.formats) ? value.formats.filter((format): format is string => typeof format === "string") : [],
  }));
}

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
  const iconLabels = useIconLabels();
  const { questionType, questionFormat } = useEnumLabels();
  const planErrorMessage = (code: string) => {
    switch (code) {
      case "PLAN_OUTLINE_INVALID":
        return t("errors.PLAN_OUTLINE_INVALID");
      case "PLAN_SOURCE_UNAVAILABLE":
        return t("errors.PLAN_SOURCE_UNAVAILABLE");
      case "PLAN_SOURCE_TIMEOUT":
        return t("errors.PLAN_SOURCE_TIMEOUT");
      case "PLAN_SCOPE_REVOKED":
        return t("errors.PLAN_SCOPE_REVOKED");
      default:
        return code;
    }
  };
  const [plan, setPlan] = useState<KnowledgePlan | null>(null);
  const [formVersion, setFormVersion] = useState(0);
  const [loadKey, setLoadKey] = useState(0);
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const [history, setHistory] = useState<KnowledgePlan[]>([]);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(false),
    [evidence, setEvidence] = useState<EvidenceGap[] | null>(null),
    [evidenceUnavailable, setEvidenceUnavailable] = useState(false);
  const lock = useRef(false),
    generationKey = useRef<{
      plan: string;
      revision: number;
      key: string;
    } | null>(null);
  const newBatchKey = useRef<{
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
    setEvidence(null);
    setEvidenceUnavailable(false);
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
  }, [planId, reset, loadKey]);
  const mutate = async (operation: () => Promise<void>) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError(false);
    setEvidence(null);
    setEvidenceUnavailable(false);
    try {
      await operation();
    } catch (caught) {
      const data = axios.isAxiosError<unknown>(caught) ? caught.response?.data : null;
      if (data && typeof data === "object" && "code" in data && typeof data.code === "string" && data.code.startsWith("PLAN_EVIDENCE_")) {
        setEvidence(evidenceGaps("details" in data ? data.details : null));
        setEvidenceUnavailable(data.code === "PLAN_EVIDENCE_CHECK_UNAVAILABLE");
      } else {
        setError(true);
      }
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
  const targetTotal = plan?.target_total ?? null;
  const nodeIds = new Set(matrix.nodes.map((node) => node.id));
  const chaptersChanged =
    !!plan?.matrix &&
    JSON.stringify(matrix.nodes) !== JSON.stringify(plan.matrix.nodes);
  const orphanRows = matrix.rows.some((row) => !nodeIds.has(row.node_id));
  const totalMismatch = targetTotal !== null && total !== targetTotal;
  const matrixStale = chaptersChanged || orphanRows || totalMismatch;
  const removeNode = (id: string) => {
    const removed = new Set([id]);
    let previous = 0;
    while (previous !== removed.size) {
      previous = removed.size;
      matrix.nodes.forEach((node) => {
        if (node.parent_id && removed.has(node.parent_id)) removed.add(node.id);
      });
    }
    setValue(
      "nodes",
      matrix.nodes.filter((node) => !removed.has(node.id)),
      { shouldDirty: true },
    );
    // Rows of deleted chapters are dropped here; the matrix is rebuilt afterwards.
    setValue(
      "rows",
      matrix.rows.filter((row) => !removed.has(row.node_id)),
      { shouldDirty: true },
    );
  };
  return (
    <Card className="min-w-0 gap-0 overflow-hidden border-gray-200 bg-white py-0 shadow-sm">
      <CardHeader className="border-b border-gray-100 p-4 sm:p-5">
        <CardTitle className="flex items-center gap-2 text-base text-neutral-900">
          <span className="flex size-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <Network className="size-4" />
          </span>
          {t("title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="min-w-0 space-y-4 p-4 sm:p-5">
        <p className="max-w-4xl text-sm leading-6 text-neutral-500">{t("explanation")}</p>
        {error && (
          <p
            role="alert"
            className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {t("error")}
          </p>
        )}
        {evidence !== null && (
          <div
            role="alert"
            className="space-y-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
          >
            <p className="font-medium">{t(evidenceUnavailable ? "evidenceUnavailableTitle" : "evidenceTitle")}</p>
            <p>{t(evidenceUnavailable ? "evidenceUnavailableHint" : "evidenceHint")}</p>
            {!evidenceUnavailable && evidence.length === 0 && <p>{t("evidenceReasons.UNKNOWN")}</p>}
            <ul className="list-disc space-y-1 pl-5">
              {evidence.map((gap, index) => {
                const reasons = ["THIN_TEXT", "NO_TEXT", "TITLE_ONLY", "OCR_INCOMPLETE", "INSUFFICIENT_DEPTH", "SOURCE_MISSING"] as const;
                const reason = reasons.find((value) => value === gap.reason) ?? "UNKNOWN";
                const formats = levels.filter((format) => gap.formats.includes(format));
                return (
                  <li key={`${gap.row_id}-${index}`}>
                    {t("evidenceItem", { name: gap.node_name || t("evidenceUnknownItem"), chars: gap.body_chars })}
                    {gap.substantive_chars !== undefined && gap.fact_count !== undefined && <> {t("evidenceMetrics", { chars: gap.substantive_chars, facts: gap.fact_count })}</>}
                    {" "}{t(`evidenceReasons.${reason}`)}
                    {formats.length > 0 && <span> ({formats.map(questionFormat).join(", ")})</span>}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {history.map((value) => (
            <Button
              asChild
              key={value.id}
              variant="outline"
              size="sm"
              className={`h-auto min-h-9 max-w-full cursor-pointer justify-start gap-2 border-gray-200 bg-white py-2 ${value.id === plan?.id ? "border-blue-300 bg-blue-50 ring-1 ring-blue-100" : ""}`}
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
                <span className="min-w-0 truncate" title={value.sourceVersion.file_name}>
                  {value.sourceVersion.file_name}
                </span>
                <Badge
                  variant="outline"
                  className={planStatusClass(value.status)}
                >
                  {t(`status.${value.status}`)}
                </Badge>
              </Link>
            </Button>
          ))}
        </div>
        {plan && (
          <>
            <Button
              type="button"
              variant="outline"
              className="cursor-pointer gap-1.5 border-gray-300 bg-white"
              disabled={busy || disabled}
              onClick={() =>
                void mutate(async () => accept(await api.get(plan.id)))
              }
            >
              {t("reload")}
            </Button>
            {plan.status === "FAILED" &&
              plan.error_code?.startsWith("PLAN_") &&
              plan.error_code !== "PLAN_SCOPE_REVOKED" && (
                <Button
                  type="button"
                  variant="outline"
                  className="cursor-pointer gap-1.5 border-gray-300 bg-white"
                  disabled={busy || disabled}
                  onClick={() =>
                    void mutate(async () => {
                      await api.retry(plan);
                      setLoadKey((key) => key + 1);
                    })
                  }
                >
                  {t("retry")}
                </Button>
              )}
            <div className="flex flex-wrap items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
              <span className="min-w-0 break-words font-medium text-neutral-900">
                {plan.sourceVersion.file_name}
              </span>
              <Badge variant="outline" className={planStatusClass(plan.status)}>
                {t(`status.${plan.status}`)}
              </Badge>
              <span className="text-xs text-neutral-500">
                {t("revision", { revision: plan.revision })}
              </span>
            </div>
            {plan.error_code && (
              <p
                role="alert"
                className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
              >
                {planErrorMessage(plan.error_code)}
              </p>
            )}
            <PlanOcrRecovery key={plan.id} plan={plan} disabled={busy || disabled} dirty={isDirty} />
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
                  <legend className="font-semibold text-neutral-900">
                    {t("tree")}
                  </legend>
                  <p className="text-xs text-neutral-700">{t("sourceHint")}</p>
                  <div className="max-h-[480px] space-y-3 overflow-auto rounded-md border border-gray-300 bg-gray-50/60 p-3">
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
                          className="space-y-2 rounded-md border border-gray-200 bg-white p-3 shadow-sm"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="break-words text-sm font-medium text-neutral-900">
                              {path(node.id)}
                            </span>
                            <Badge
                              variant="outline"
                              className={
                                !origin
                                  ? "border-amber-200 bg-amber-50 text-amber-700"
                                  : origin.origin === "HEADING"
                                    ? "border-blue-200 bg-blue-50 text-blue-700"
                                    : "border-teal-200 bg-teal-50 text-teal-700"
                              }
                            >
                              {origin
                                ? t(
                                    origin.origin === "HEADING"
                                      ? "heading"
                                      : "inferred",
                                  )
                                : t("edited")}
                            </Badge>
                            <Badge
                              variant="outline"
                              className={
                                match?.ambiguous
                                  ? "border-amber-200 bg-amber-50 text-amber-700"
                                  : match?.chapter_id
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                    : "border-sky-200 bg-sky-50 text-sky-700"
                              }
                            >
                              {t(
                                match?.ambiguous
                                  ? "ambiguous"
                                  : match?.chapter_id
                                    ? "existing"
                                    : "new",
                              )}
                            </Badge>
                          </div>
                          {origin && (
                            <p className="text-xs text-neutral-500">
                              {origin.evidence}
                            </p>
                          )}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="cursor-pointer border-gray-300 bg-white"
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
                                <Select
                                  disabled={!editable}
                                  value={node.parent_id ?? "__root__"}
                                  onValueChange={(value) =>
                                    setValue(
                                      `nodes.${index}.parent_id`,
                                      value === "__root__" ? null : value,
                                      { shouldDirty: true },
                                    )
                                  }
                                >
                                  <SelectTrigger
                                    aria-label={t("parent")}
                                    className="w-full min-w-0 cursor-pointer border-gray-300 bg-white"
                                  >
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="__root__">{t("root")}</SelectItem>
                                    {matrix.nodes
                                      .filter((value) => value.id !== node.id)
                                      .map((value) => (
                                        <SelectItem key={value.id} value={value.id}>
                                          {path(value.id)}
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
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
                  <legend className="font-semibold text-neutral-900">
                    {t("matrix")}
                  </legend>
                  <div className="min-w-0 rounded-md border border-gray-300 bg-white">
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
                      <thead className="hidden bg-blue-50/60 text-blue-900 @min-[64rem]/matrix:table-header-group [&_th]:break-words [&_th]:px-2 [&_th]:py-3 [&_th]:text-left [&_th]:align-middle [&_th]:text-xs [&_th]:font-medium">
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
                            className="grid min-w-0 grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-white p-3 align-top sm:grid-cols-2 @min-[64rem]/matrix:table-row @min-[64rem]/matrix:rounded-none @min-[64rem]/matrix:border-x-0 @min-[64rem]/matrix:p-0"
                          >
                            <td className="min-w-0 space-y-1.5 @min-[64rem]/matrix:p-2">
                              <span className="block text-xs font-medium @min-[64rem]/matrix:hidden">
                                {t("tree")}
                              </span>
                              <Controller
                                control={form.control}
                                name={`rows.${index}.node_id`}
                                render={({ field }) => (
                                  <Select
                                    name={field.name}
                                    disabled={!editable}
                                    value={field.value}
                                    onValueChange={(value) => {
                                      if (!value) return;
                                      field.onChange(value);
                                      const target = matrix.nodes.find(
                                        (node) => node.id === value,
                                      );
                                      if (target)
                                        setValue(
                                          `rows.${index}.source_units`,
                                          target.source_units,
                                          { shouldDirty: true },
                                        );
                                    }}
                                  >
                                    <SelectTrigger
                                      ref={field.ref}
                                      onBlur={field.onBlur}
                                      aria-label={t("tree")}
                                      title={path(row.node_id)}
                                      className="w-full min-w-0 max-w-full cursor-pointer border-gray-300 bg-white"
                                    >
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {matrix.nodes.map((node) => (
                                        <SelectItem key={node.id} value={node.id}>
                                          {path(node.id)}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                )}
                              />
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
                              <Controller
                                control={form.control}
                                name={`rows.${index}.question_type`}
                                render={({ field }) => (
                                  <Select
                                    name={field.name}
                                    disabled={!editable}
                                    value={field.value}
                                    onValueChange={(value) => {
                                      if (!value) return;
                                      field.onChange(value);
                                    }}
                                  >
                                    <SelectTrigger
                                      ref={field.ref}
                                      onBlur={field.onBlur}
                                      aria-label={t("type")}
                                      className="w-full min-w-0 max-w-full cursor-pointer border-gray-300 bg-white"
                                    >
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {types.map((type) => (
                                        <SelectItem key={type} value={type}>
                                          {questionType(type)}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                )}
                              />
                            </td>
                            <td
                              colSpan={4}
                              className="min-w-0 sm:col-span-2 @min-[64rem]/matrix:p-2"
                            >
                              <div className="grid min-w-0 grid-cols-4 gap-2">
                                {levels.map((level) => (
                                  <label
                                    key={level}
                                    className="flex min-w-0 flex-col justify-end gap-1.5"
                                  >
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
                                className={ICON_TONE.danger}
                                {...iconLabelProps(iconLabels.removeItem)}
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
                    className="cursor-pointer border-gray-300 bg-white"
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
                {matrixStale && (
                  <div
                    role="alert"
                    className="flex flex-wrap items-center gap-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
                  >
                    <p className="min-w-0 flex-1">
                      {chaptersChanged || orphanRows
                        ? t("matrixStale")
                        : t("matrixMismatch", {
                            total,
                            target: targetTotal ?? 0,
                          })}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-auto min-h-8 max-w-full cursor-pointer whitespace-normal border-amber-300 bg-white text-amber-800 hover:bg-amber-100"
                      disabled={!editable || !matrix.nodes.length}
                      onClick={() =>
                        void mutate(async () =>
                          accept(await api.rebuildMatrix(plan, matrix.nodes)),
                        )
                      }
                    >
                      {t("rebuildMatrix")}
                    </Button>
                  </div>
                )}
                <p className="inline-block rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
                  {t("total", { total, uncovered })}
                </p>
                <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  {t("reviewWarning")}
                </p>
                {isDirty && (
                  <p className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-800">
                    {t("unsaved")}
                  </p>
                )}
                <div className="flex flex-wrap gap-3">
                  <Button
                    type="submit"
                    className="h-auto min-h-9 max-w-full cursor-pointer whitespace-normal bg-[#0066cc] text-white hover:bg-[#0052a3]"
                    disabled={!editable || !isDirty}
                  >
                    {t("save")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-auto min-h-9 max-w-full cursor-pointer gap-1.5 whitespace-normal border-emerald-300 bg-white text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                    disabled={
                      !editable ||
                      plan.status !== "REVIEW_REQUIRED" ||
                      isDirty ||
                      totalMismatch ||
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
                    className="h-auto min-h-9 max-w-full cursor-pointer gap-1.5 whitespace-normal bg-[#0066cc] text-white hover:bg-[#0052a3]"
                    disabled={
                      plan.status !== "APPROVED" ||
                      isDirty ||
                      totalMismatch ||
                      busy ||
                      disabled
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
                  <Button
                    type="button"
                    variant="outline"
                    className="h-auto min-h-9 max-w-full cursor-pointer gap-1.5 whitespace-normal border-blue-300 bg-white text-blue-700 hover:bg-blue-50 hover:text-blue-800"
                    title={t("generateNewHint")}
                    disabled={
                      plan.status !== "APPROVED" ||
                      isDirty ||
                      totalMismatch ||
                      busy ||
                      disabled
                    }
                    onClick={() =>
                      void mutate(async () => {
                        if (
                          newBatchKey.current?.plan !== plan.id ||
                          newBatchKey.current.revision !== plan.revision
                        )
                          newBatchKey.current = {
                            plan: plan.id,
                            revision: plan.revision,
                            key: crypto.randomUUID(),
                          };
                        const result = await api.generate(
                          plan,
                          newBatchKey.current.key,
                        );
                        newBatchKey.current = null;
                        onGenerated(result.batch_id);
                      })
                    }
                  >
                    {t("generateNew")}
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
