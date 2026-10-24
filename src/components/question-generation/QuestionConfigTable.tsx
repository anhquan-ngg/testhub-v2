"use client";

import { useTranslations } from "next-intl";
import { Plus, Trash2 } from "lucide-react";
import { useEnumLabels } from "@/i18n/useEnumLabels";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  const { questionType, questionFormat } = useEnumLabels();
  const total = rows.reduce(
    (sum, row) => sum + (Number.isNaN(row.count) ? 0 : row.count),
    0,
  );
  const update = (id: string, change: Partial<QuestionGenerationConfig>) =>
    onChange(rows.map((row) => (row.id === id ? { ...row, ...change } : row)));

  return (
    <div className="space-y-3">
      <h3 className="text-base font-semibold">{t("title")}</h3>
      <div className="rounded-lg border">
        <Table className="min-w-[520px] table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[38%]">{t("type")}</TableHead>
              <TableHead className="w-[30%]">{t("format")}</TableHead>
              <TableHead className="w-[18%]">{t("count")}</TableHead>
              <TableHead className="w-[14%]">{t("actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, index) => (
              <TableRow key={row.id}>
                <TableCell>
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
                </TableCell>
                <TableCell>
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
                </TableCell>
                <TableCell>
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
                </TableCell>
                <TableCell>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    aria-label={t("remove", { number: index + 1 })}
                    disabled={disabled || rows.length === 1}
                    onClick={() =>
                      onChange(rows.filter((candidate) => candidate.id !== row.id))
                    }
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || rows.length >= MAX_GENERATION_CONFIGS}
          onClick={() => onChange([...rows, newQuestionConfigRow()])}
        >
          <Plus className="size-4" />
          {t("add")}
        </Button>
        <p
          aria-live="polite"
          className={cn(
            "text-sm",
            total > MAX_GENERATION_QUESTIONS
              ? "text-destructive"
              : "text-muted-foreground",
          )}
        >
          {t("total", { total, max: MAX_GENERATION_QUESTIONS })}
        </p>
      </div>
      <p className="text-xs text-muted-foreground">
        {t("hint", {
          rows: MAX_GENERATION_CONFIGS,
          max: MAX_GENERATION_QUESTIONS,
        })}
      </p>
    </div>
  );
}
