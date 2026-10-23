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
  GeneratedSingleChoiceQuestion,
  QuestionGenerationItem,
} from "@/types/question-generation";
import type { QuestionFormat } from "@/types/backend-enums";
import { generationDraftSchema } from "./generation-validation";

type Props = {
  item: QuestionGenerationItem;
  selected: boolean;
  busy: boolean;
  editable: boolean;
  onSelect: (selected: boolean) => void;
  onEdit: (data: GeneratedSingleChoiceQuestion) => Promise<boolean>;
  onReview: (decision: "APPROVE" | "REJECT") => Promise<boolean>;
  onEditingChange: (id: string, editing: boolean) => void;
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
  const { questionFormat } = useEnumLabels();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.data);
  const [invalid, setInvalid] = useState(false);
  useEffect(
    () => () => onEditingChange(item.id, false),
    [item.id, onEditingChange],
  );
  const canEdit = editable && !["COMMITTED", "SKIPPED"].includes(item.status);
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
      className={
        item.status === "COMMITTED"
          ? "border-emerald-200 bg-emerald-50/30"
          : undefined
      }
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
          <span className="font-semibold">
            {t("questionNumber", { number: item.source_index })}
          </span>
          <Badge
            variant={
              item.status === "APPROVED" || item.status === "COMMITTED"
                ? "default"
                : "secondary"
            }
          >
            {t(`itemStatus.${item.status}`)}
          </Badge>
        </div>
        <span className="text-xs text-muted-foreground">
          {t("revision", { revision: item.revision })}
        </span>
      </CardHeader>
      <CardContent className="space-y-4">
        {item.provenance && (
          <details className="rounded border p-3 text-sm">
            <summary className="cursor-pointer font-medium">
              {t("citationsTitle")}
            </summary>
            <p className="my-2 text-muted-foreground">{t("citationsHint")}</p>
            {item.warnings.includes("AI_SOURCE_RECHECK_AFTER_EDIT") && (
              <p className="my-2 text-amber-700">{t("citationsEdited")}</p>
            )}
            {item.provenance.citations.map((citation, index) => (
              <section
                key={`${citation.chunk.chunk_id}-${index}`}
                className="my-2 rounded border p-2"
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
                {t("optionsHint")}
              </legend>
              {draft.options.map((option, index) => (
                <div key={index} className="flex items-center gap-3">
                  <input
                    type="radio"
                    name={`answer-${item.id}`}
                    aria-label={t("correctOption", {
                      option: String.fromCharCode(65 + index),
                    })}
                    checked={option.isCorrect}
                    onChange={() =>
                      setDraft({
                        ...draft,
                        options: draft.options.map(
                          (candidate, candidateIndex) => ({
                            ...candidate,
                            isCorrect: candidateIndex === index,
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
              className="w-full rounded-md border bg-background p-2 text-sm"
              disabled={busy}
              value={draft.question_format}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  question_format: event.target.value as QuestionFormat,
                })
              }
            >
              {(
                ["KNOWLEDGE", "UNDERSTANDING", "APPLYING", "ADVANCED"] as const
              ).map((value) => (
                <option key={value} value={value}>
                  {questionFormat(value)}
                </option>
              ))}
            </select>
            {invalid && (
              <p role="alert" className="text-sm text-destructive">
                {t("invalidDraft")}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              {t("editResetsApproval")}
            </p>
            <div className="flex gap-2">
              <Button disabled={busy} onClick={() => void save()}>
                {t("save")}
              </Button>
              <Button
                variant="outline"
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
                  className={`rounded-md border p-3 text-sm ${option.isCorrect ? "border-emerald-300 bg-emerald-50 text-emerald-950" : ""}`}
                >
                  <div className="flex gap-2">
                    <span className="font-semibold">
                      {String.fromCharCode(65 + index)}.
                    </span>
                    <MathRenderer content={option.text} />
                    {option.isCorrect && (
                      <Check
                        className="ml-auto size-4 shrink-0"
                        aria-label={t("correctAnswer")}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {questionFormat(item.data.question_format)}
            </p>
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
