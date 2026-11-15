"use client";

import { useTranslations } from "next-intl";
import { Plus, Trash2 } from "lucide-react";
import { useEnumLabels } from "@/i18n/useEnumLabels";
import { cn } from "@/lib/utils";
import { ICON_TONE, useIconLabels } from "@/lib/icon-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { QuestionFormat } from "@/types/backend-enums";
import type {
  GenerationQuestionType,
  QuestionGenerationConfig,
} from "@/types/question-generation";
import {
  GENERATION_QUESTION_FORMATS,
  GENERATION_QUESTION_TYPES,
  MAX_GENERATION_CONFIGS,
  MAX_GENERATION_QUESTIONS,
} from "./generation-validation";

/** Editable row; the id only keys React rows and is never sent to the API. */
export type QuestionConfigRow = QuestionGenerationConfig & { id: string };

/** Default row: single-choice knowledge questions. */
export function newQuestionConfigRow(count = 1): QuestionConfigRow {
  return {
    id: crypto.randomUUID(),
    question_type: "SINGLE_CHOICE",
    question_format: "KNOWLEDGE",
    count,
  };
}

type Props = {
  rows: QuestionConfigRow[];
  disabled: boolean;
  onChange: (rows: QuestionConfigRow[]) => void;
};

/** Generation blueprint: question type × cognitive level × count, generated in row order. */
export function QuestionConfigTable({ rows, disabled, onChange }: Props) {
  const t = useTranslations("shared.questionGeneration.config");
  const iconLabels = useIconLabels();
  const { questionType, questionFormat } = useEnumLabels();
  const total = rows.reduce(
    (sum, row) => sum + (Number.isNaN(row.count) ? 0 : row.count),
    0,
  );
  const update = (id: string, change: Partial<QuestionGenerationConfig>) =>
    onChange(rows.map((row) => (row.id === id ? { ...row, ...change } : row)));

  return (
    <div className="@container/config min-w-0 space-y-3">
      <h2 className="text-sm font-semibold text-neutral-900">{t("title")}</h2>
      <div className="space-y-2">
        {rows.map((row, index) => (
          <div
            key={row.id}
            className="grid min-w-0 grid-cols-[minmax(0,1fr)_5rem_2.25rem] items-end gap-3 rounded-lg border border-gray-200 bg-gray-50/50 p-3 @min-[36rem]/config:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_4.5rem_2.25rem]"
          >
            <div className="col-span-3 min-w-0 space-y-1.5 @min-[36rem]/config:col-span-1">
              <p className="text-xs font-medium text-neutral-500">{t("type")}</p>
              <Select
                value={row.question_type}
                disabled={disabled}
                onValueChange={(value) =>
                  update(row.id, {
                    question_type: value as GenerationQuestionType,
                  })
                }
              >
                <SelectTrigger
                  className="w-full min-w-0"
                  aria-label={t("typeOf", { number: index + 1 })}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GENERATION_QUESTION_TYPES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {questionType(value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0 space-y-1.5">
              <p className="text-xs font-medium text-neutral-500">{t("format")}</p>
              <Select
                value={row.question_format}
                disabled={disabled}
                onValueChange={(value) =>
                  update(row.id, {
                    question_format: value as QuestionFormat,
                  })
                }
              >
                <SelectTrigger
                  className="w-full min-w-0"
                  aria-label={t("formatOf", { number: index + 1 })}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GENERATION_QUESTION_FORMATS.map((value) => (
                    <SelectItem key={value} value={value}>
                      {questionFormat(value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0 space-y-1.5">
              <p className="text-xs font-medium text-neutral-500">{t("count")}</p>
              <Input
                type="number"
                min={1}
                max={MAX_GENERATION_QUESTIONS}
                aria-label={t("countOf", { number: index + 1 })}
                value={Number.isNaN(row.count) ? "" : row.count}
                disabled={disabled}
                onChange={(event) =>
                  update(row.id, { count: event.target.valueAsNumber })
                }
              />
            </div>
            <div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={`cursor-pointer ${ICON_TONE.danger}`}
                aria-label={t("remove", { number: index + 1 })}
                title={iconLabels.removeItem}
                disabled={disabled || rows.length === 1}
                onClick={() =>
                  onChange(rows.filter((candidate) => candidate.id !== row.id))
                }
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="cursor-pointer gap-1.5 border-gray-300 bg-white"
          disabled={disabled || rows.length >= MAX_GENERATION_CONFIGS}
          onClick={() => onChange([...rows, newQuestionConfigRow()])}
        >
          <Plus className="size-4" />
          {t("add")}
        </Button>
        <p
          aria-live="polite"
          className={cn(
            "rounded-full border px-3 py-1 text-sm font-medium",
            total > MAX_GENERATION_QUESTIONS
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-blue-200 bg-blue-50 text-blue-700",
          )}
        >
          {t("total", { total, max: MAX_GENERATION_QUESTIONS })}
        </p>
      </div>
      <p className="text-xs text-neutral-700">
        {t("hint", {
          rows: MAX_GENERATION_CONFIGS,
          max: MAX_GENERATION_QUESTIONS,
        })}
      </p>
    </div>
  );
}
