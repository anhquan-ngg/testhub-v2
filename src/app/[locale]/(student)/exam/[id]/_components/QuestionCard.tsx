"use client";

import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MathRenderer } from "@/components/MathRenderer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useEnumLabels } from "@/i18n/useEnumLabels";
import { questionTypeClass } from "@/lib/regrading";
import type { QuestionType } from "@/types/backend-enums";
import { QuestionAnswer } from "./QuestionAnswer";
import { QuestionMedia } from "./QuestionMedia";
import type { AnswerValue, ExamQuestionItem, ResolvedQuestionFile } from "./types";

type QuestionCardProps = {
  question: ExamQuestionItem;
  index: number;
  total: number;
  answer: AnswerValue | undefined;
  files: ResolvedQuestionFile[];
  onAnswer: (value: string, type: QuestionType) => void;
  onPrevious: () => void;
  onNext: () => void;
  onSubmitQuestion: () => void;
};

/** The current question with its media, answer input and previous/submit/next controls. */
export function QuestionCard({
  question,
  index,
  total,
  answer,
  files,
  onAnswer,
  onPrevious,
  onNext,
  onSubmitQuestion,
}: QuestionCardProps) {
  const t = useTranslations("student.exam");
  const enumLabels = useEnumLabels();

  return (
    <Card className="gap-0 overflow-hidden border border-gray-300 bg-white py-0 shadow-sm">
      <CardContent className="space-y-6 p-6 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-bold text-gray-900">
            {t("questionNumber", { number: index + 1 })}
          </h2>
          <Badge
            variant="outline"
            className={questionTypeClass(question.question_type)}
          >
            {enumLabels.questionType(question.question_type)}
          </Badge>
        </div>

        <div className="prose max-w-none">
          <div className="text-lg leading-relaxed text-gray-800">
            <MathRenderer content={question.question_text || ""} />
          </div>
        </div>

        <QuestionMedia files={files} />

        <QuestionAnswer question={question} answer={answer} onAnswer={onAnswer} />

        <div className="flex items-center justify-between pt-4">
          <Button
            variant="outline"
            onClick={onPrevious}
            disabled={index === 0}
            className="w-32"
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            {t("previousSentence")}
          </Button>
          <Button
            onClick={onSubmitQuestion}
            className="w-36 bg-[#0066cc] text-white hover:bg-[#0052a3]"
          >
            {t("submitThisQuestion")}
          </Button>
          <Button
            variant="outline"
            onClick={onNext}
            disabled={index === total - 1}
            className="w-32"
          >
            {t("nextSentence")}
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
