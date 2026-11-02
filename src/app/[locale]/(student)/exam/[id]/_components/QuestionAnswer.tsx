"use client";

import { useTranslations } from "next-intl";
import { MathRenderer } from "@/components/MathRenderer";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import type { QuestionType } from "@/types/backend-enums";
import type { AnswerValue, ExamQuestionItem } from "./types";

type QuestionAnswerProps = {
  question: ExamQuestionItem;
  answer: AnswerValue | undefined;
  onAnswer: (value: string, type: QuestionType) => void;
};

const ROW_BASE =
  "flex cursor-pointer items-center space-x-3 rounded-lg border p-4 transition-all";
const ROW_SELECTED = "border-[#0066cc] bg-sky-50 ring-1 ring-[#0066cc]";
const ROW_IDLE =
  "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50";

/** Answer input matching the question type (single, multiple choice or essay). */
export function QuestionAnswer({ question, answer, onAnswer }: QuestionAnswerProps) {
  const t = useTranslations("student.exam");

  if (question.question_type === "ESSAY") {
    return (
      <div className="space-y-4">
        <Textarea
          placeholder={t("enterYourAnswer")}
          value={typeof answer === "string" ? answer : ""}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            onAnswer(e.target.value, "ESSAY")
          }
          className="min-h-[200px] border-gray-300 bg-white p-4 text-base"
        />
      </div>
    );
  }

  if (question.question_type === "MULTIPLE_CHOICE") {
    const selected = Array.isArray(answer) ? answer : [];
    return (
      <div className="space-y-4">
        {question.options.map((option) => {
          const optionId = String(option.id);
          const isSelected = selected.includes(optionId);
          return (
            <div
              key={option.id}
              className={`${ROW_BASE} ${isSelected ? ROW_SELECTED : ROW_IDLE}`}
              onClick={() => onAnswer(optionId, "MULTIPLE_CHOICE")}
            >
              {/* The row owns the toggle; the checkbox only reflects state so a click is not handled twice. */}
              <Checkbox
                checked={isSelected}
                id={optionId}
                className="pointer-events-none"
              />
              <Label className="flex-1 cursor-pointer font-medium text-gray-700">
                <MathRenderer content={option.text} />
              </Label>
            </div>
          );
        })}
      </div>
    );
  }

  const selectedId = typeof answer === "string" ? answer : "";
  return (
    <RadioGroup
      value={selectedId}
      onValueChange={(value) => onAnswer(value, "SINGLE_CHOICE")}
      className="space-y-4"
    >
      {question.options.map((option) => {
        const optionId = String(option.id);
        return (
          <div
            key={option.id}
            className={`${ROW_BASE} ${selectedId === optionId ? ROW_SELECTED : ROW_IDLE}`}
            onClick={() => onAnswer(optionId, "SINGLE_CHOICE")}
          >
            <RadioGroupItem value={optionId} id={optionId} className="text-[#0066cc]" />
            <Label
              htmlFor={optionId}
              className="flex-1 cursor-pointer font-medium text-gray-700"
            >
              <MathRenderer content={option.text} />
            </Label>
          </div>
        );
      })}
    </RadioGroup>
  );
}
