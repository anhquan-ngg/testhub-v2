"use client";

import { useTranslations } from "next-intl";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { MathRenderer } from "@/components/MathRenderer";
import { optionLabels } from "../constants";
import { fileIcon, formatFileSize, getQuestionAnswerText, parseQuestionOptions } from "../utils";
import type { Question } from "../types";
import { QuestionFormatBadge, QuestionTypeBadge } from "./question-badges";

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
            {question.files?.length ? (
              <div className="min-w-0 space-y-2">
                <Label>{t("files")}</Label>
                <div className="grid min-w-0 max-w-full gap-2">
                  {question.files.map((item) => {
                    const fileSize = formatFileSize(item.file.size);

                    return (
                      <div
                        key={item.file.id}
                        className="flex min-w-0 max-w-full flex-col gap-3 overflow-hidden rounded-md border border-gray-300 bg-white px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-gray-50 text-gray-600">
                            {fileIcon(item.file.type)}
                          </div>
                          <div className="min-w-0 flex-1 overflow-hidden">
                            <div
                              className="block max-w-full truncate font-medium text-gray-900"
                              title={item.file.name}
                            >
                              {item.file.name}
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                              <Badge variant="outline" className="h-5 px-2">
                                {item.file.type}
                              </Badge>
                              {fileSize && <span>{fileSize}</span>}
                            </div>
                          </div>
                        </div>

                        {item.file.url && (
                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="shrink-0 self-start border-gray-300 hover:cursor-pointer sm:self-center"
                          >
                            <a
                              href={item.file.url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <ExternalLink className="h-4 w-4" />
                              {t("openTheFile")}</a>
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>{t("files")}</Label>
                <div className="rounded-md border border-dashed border-gray-300 bg-white px-3 py-4 text-sm text-gray-500">
                  {t("thereAreNoAttachedFiles")}</div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
