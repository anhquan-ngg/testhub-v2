"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Pencil, X } from "lucide-react";
import { useEnumLabels } from "@/i18n/useEnumLabels";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { MathRenderer } from "@/components/MathRenderer";
import type {
  GeneratedChoiceQuestion,
  QuestionGenerationItem,
} from "@/types/question-generation";
import type { QuestionFormat } from "@/types/backend-enums";
import {
  GENERATION_QUESTION_FORMATS,
  generationDraftSchema,
} from "./generation-validation";
import {
  formatClass,
  itemStatusClass,
  questionTypeClass,
} from "./generation-style";

type Props = {
  item: QuestionGenerationItem;
  selected: boolean;
  busy: boolean;
  editable: boolean;
  onSelect: (selected: boolean) => void;
  onEdit: (data: GeneratedChoiceQuestion) => Promise<boolean>;
  onReview: (decision: "APPROVE" | "REJECT") => Promise<boolean>;
  onEditingChange: (id: string, editing: boolean) => void;
};

const ITEM_ACCENT: Record<string, string> = {
  VALID: "border-l-gray-300",
  APPROVED: "border-l-emerald-500",
  INVALID: "border-l-red-500",
  REJECTED: "border-l-rose-400",
  COMMITTED: "border-l-sky-500",
  SKIPPED: "border-l-gray-300",
};

/** One explicit edit/review unit. Editing never auto-approves the new revision. */
export function GenerationDraftCard({
  item,
  selected,
  busy,
  editable,
  onSelect,
  onEdit,
  onReview,
  onEditingChange,
}: Props) {
  const t = useTranslations("shared.questionGeneration");
  const documentText = useTranslations("shared.learningDocuments");
  const { questionFormat, questionType } = useEnumLabels();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.data);
  const [invalid, setInvalid] = useState(false);
  useEffect(
    () => () => onEditingChange(item.id, false),
    [item.id, onEditingChange],
  );
  const canEdit = editable && !["COMMITTED", "SKIPPED"].includes(item.status);
  const multiple = draft.question_type === "MULTIPLE_CHOICE";
  async function save() {
    const parsed = generationDraftSchema.safeParse(draft);
    if (!parsed.success) {
      setInvalid(true);
      return;
    }
    if (await onEdit(parsed.data)) {
      setEditing(false);
      setInvalid(false);
      onEditingChange(item.id, false);
    }
  }
  return (
    <Card
      className={`border-l-4 border-gray-300 bg-white shadow-sm ${ITEM_ACCENT[item.status] ?? "border-l-gray-300"}`}
    >
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 pb-3">
        <div className="flex items-center gap-3">
          <Checkbox
            aria-label={t("selectItem", { number: item.source_index })}
            checked={selected}
            disabled={
              busy || editing || item.status !== "APPROVED" || !editable
            }
            onCheckedChange={(value) => onSelect(value === true)}
          />
          <span className="font-semibold text-neutral-900">
            {t("questionNumber", { number: item.source_index })}
          </span>
          <Badge variant="outline" className={itemStatusClass(item.status)}>
            {t(`itemStatus.${item.status}`)}
          </Badge>
        </div>
        <span className="text-xs text-neutral-500">
          {t("revision", { revision: item.revision })}
        </span>
      </CardHeader>
      <CardContent className="space-y-4">
        {item.provenance?.knowledge_title && (
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
            <p className="font-medium text-slate-900">
              {item.provenance.knowledge_title}
            </p>
            <p className="text-slate-600">{item.provenance.objective}</p>
          </div>
        )}
        {item.provenance && (
          <details className="rounded-md border border-sky-200 bg-sky-50/50 p-3 text-sm">
            <summary className="cursor-pointer font-medium text-sky-800">
              {t("citationsTitle")}
            </summary>
            <p className="my-2 text-neutral-500">{t("citationsHint")}</p>
            {item.warnings.includes("AI_SOURCE_RECHECK_AFTER_EDIT") && (
              <p className="my-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800">
                {t("citationsEdited")}
              </p>
            )}
            {item.provenance.citations.map((citation, index) => (
              <section
                key={`${citation.chunk.chunk_id}-${index}`}
                className="my-2 rounded-md border border-sky-100 bg-white p-2"
              >
                <h4 className="font-medium">
                  {documentText(`kind.${citation.chunk.kind}`, {
                    position: citation.chunk.position,
                  })}
                </h4>
                <blockquote className="mt-1 whitespace-pre-wrap break-words">
                  {citation.quote}
                </blockquote>
              </section>
            ))}
          </details>
        )}

        {editing ? (
          <div className="space-y-4">
            <Label htmlFor={`question-${item.id}`}>{t("questionText")}</Label>
            <Textarea
              id={`question-${item.id}`}
              value={draft.question_text}
              disabled={busy}
              onChange={(event) =>
                setDraft({ ...draft, question_text: event.target.value })
              }
              rows={3}
            />
            <fieldset className="space-y-3" disabled={busy}>
              <legend className="mb-2 text-sm font-medium">
                {t(`optionsHint.${draft.question_type}`)}
              </legend>
              {draft.options.map((option, index) => (
                <div key={index} className="flex items-center gap-3">
                  <input
                    type={multiple ? "checkbox" : "radio"}
                    name={`answer-${item.id}`}
                    aria-label={t("correctOption", {
                      option: String.fromCharCode(65 + index),
                    })}
                    checked={option.isCorrect}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        // Single choice keeps exactly one answer; multiple choice toggles.
                        options: draft.options.map(
                          (candidate, candidateIndex) => ({
                            ...candidate,
                            isCorrect: multiple
                              ? candidateIndex === index
                                ? event.target.checked
                                : candidate.isCorrect
                              : candidateIndex === index,
                          }),
                        ),
                      })
                    }
                  />
                  <Label
                    className="sr-only"
                    htmlFor={`${item.id}-option-${index}`}
                  >
                    {t("optionLabel", {
                      option: String.fromCharCode(65 + index),
                    })}
                  </Label>
                  <Input
                    id={`${item.id}-option-${index}`}
                    value={option.text}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        options: draft.options.map(
                          (candidate, candidateIndex) =>
                            candidateIndex === index
                              ? { ...candidate, text: event.target.value }
                              : candidate,
                        ),
                      })
                    }
                  />
                </div>
              ))}
            </fieldset>
            <Label htmlFor={`level-${item.id}`}>{t("level")}</Label>
            <select
              id={`level-${item.id}`}
              className="h-9 w-full cursor-pointer rounded-md border border-gray-300 bg-white px-2 text-sm focus:border-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-600/20 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={busy}
              value={draft.question_format}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  question_format: event.target.value as QuestionFormat,
                })
              }
            >
              {GENERATION_QUESTION_FORMATS.map((value) => (
                <option key={value} value={value}>
                  {questionFormat(value)}
                </option>
              ))}
            </select>
            {invalid && (
              <p
                role="alert"
                className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
              >
                {t("invalidDraft")}
              </p>
            )}
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {t("editResetsApproval")}
            </p>
            <div className="flex gap-2">
              <Button
                className="cursor-pointer bg-accent-600 text-white hover:bg-accent-700"
                disabled={busy}
                onClick={() => void save()}
              >
                {t("save")}
              </Button>
              <Button
                variant="outline"
                className="cursor-pointer border-gray-300 bg-white"
                disabled={busy}
                onClick={() => {
                  setEditing(false);
                  setInvalid(false);
                  onEditingChange(item.id, false);
                }}
              >
                {t("cancel")}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <MathRenderer
              content={item.data.question_text}
              className="whitespace-pre-wrap font-medium"
            />
            <div className="grid gap-2 md:grid-cols-2">
              {item.data.options.map((option, index) => (
                <div
                  key={index}
                  className={`rounded-md border p-3 text-sm ${option.isCorrect ? "border-emerald-300 bg-emerald-50 text-emerald-950" : "border-gray-200 bg-white"}`}
                >
                  <div className="flex gap-2">
                    <span
                      className={`font-semibold ${option.isCorrect ? "text-emerald-700" : "text-neutral-500"}`}
                    >
                      {String.fromCharCode(65 + index)}.
                    </span>
                    <MathRenderer content={option.text} />
                    {option.isCorrect && (
                      <Check
                        className="ml-auto size-4 shrink-0 text-emerald-600"
                        aria-label={t("correctAnswer")}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge
                variant="outline"
                className={questionTypeClass(item.data.question_type)}
              >
                {questionType(item.data.question_type)}
              </Badge>
              <Badge
                variant="outline"
                className={formatClass(item.data.question_format)}
              >
                {questionFormat(item.data.question_format)}
              </Badge>
            </div>
            {item.question_id && (
              <p className="break-all text-xs text-muted-foreground">
                {t("bankId", { id: item.question_id })}
              </p>
            )}
            {canEdit && (
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="cursor-pointer gap-1.5 border-gray-300 bg-white"
                  disabled={busy}
                  onClick={() => {
                    setDraft(item.data);
                    setEditing(true);
                    onSelect(false);
                    onEditingChange(item.id, true);
                  }}
                >
                  <Pencil className="size-4" />
                  {t("edit")}
                </Button>
                <Button
                  size="sm"
                  className="cursor-pointer gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
                  disabled={
                    busy ||
                    item.status === "APPROVED" ||
                    item.status === "INVALID"
                  }
                  onClick={() => void onReview("APPROVE")}
                >
                  <Check className="size-4" />
                  {t("approve")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="cursor-pointer gap-1.5 border-red-300 bg-white text-red-600 hover:bg-red-50 hover:text-red-700"
                  disabled={busy || item.status === "REJECTED"}
                  onClick={() => void onReview("REJECT")}
                >
                  <X className="size-4" />
                  {t("reject")}
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
