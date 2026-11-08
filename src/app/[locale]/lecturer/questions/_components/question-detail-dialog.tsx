"use client";

import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { MathRenderer } from "@/components/MathRenderer";
import { optionLabels } from "../constants";
import { getQuestionAnswerText, parseQuestionOptions } from "../utils";
import type { Question } from "../types";
import { QuestionFormatBadge, QuestionTypeBadge } from "./question-badges";
import { QuestionFilesList } from "./question-files";

export function QuestionDetailDialog({
  question,
  onOpenChange,
}: {
  question: Question | null;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("lecturer.questions");
  return (
    <Dialog open={Boolean(question)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] w-[calc(100vw-2rem)] sm:max-w-3xl overflow-y-auto overflow-x-hidden bg-white border-gray-300">
        <DialogHeader>
          <DialogTitle>{t("questionDetails")}</DialogTitle>
        </DialogHeader>
        {question && (
          <div className="min-w-0 space-y-4">
            <div className="min-w-0 overflow-hidden rounded-md border border-gray-300 bg-white p-3">
              <MathRenderer content={question.question_text} />
            </div>
            <div className="grid gap-3 grid-rows-3">
              <div>
                <Label>{t("questionTypeLabel")}</Label>
                <div className="mt-1 text-sm">
                  <QuestionTypeBadge type={question.question_type} />
                </div>
              </div>
              <div>
                <Label>{t("questionFormatLabel")}</Label>
                <div className="mt-1 text-sm">
                  <QuestionFormatBadge format={question.question_format} />
                </div>
              </div>
              <div>
                <Label>{t("answer")}</Label>
                <div className="mt-1 text-sm">
                  {getQuestionAnswerText(question)}
                </div>
              </div>
            </div>
            {parseQuestionOptions(question).length > 0 && (
              <div className="space-y-2">
                <Label>{t("options")}</Label>
                <div className="grid gap-2">
                  {parseQuestionOptions(question).map((option, index) => (
                    <div
                      key={`${question.id}-${index}`}
                      className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                    >
                      {option.label ?? optionLabels[index]}. {option.text}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="min-w-0 space-y-2">
              <Label>{t("files")}</Label>
              <QuestionFilesList files={question.files} />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
