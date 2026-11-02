"use client";

import { useTranslations } from "next-intl";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { AnswerMap, ExamQuestionItem } from "./types";

type QuestionNavigatorProps = {
  questions: ExamQuestionItem[];
  answers: AnswerMap;
  submittedQuestionIds: Set<string>;
  currentQuestionIndex: number;
  isOpen: boolean;
  onSelect: (index: number) => void;
};

const CELL_CLASS = {
  current:
    "border-[#0066cc] bg-sky-100 font-bold text-[#0066cc] ring-1 ring-[#0066cc]",
  submitted: "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700",
  answered: "border-amber-400 bg-amber-400 text-white hover:bg-amber-500",
  idle: "border-gray-300 bg-white text-gray-700 hover:bg-gray-50",
};

function hasLocalAnswer(value: AnswerMap[string] | undefined): boolean {
  return (
    value !== undefined &&
    value !== "" &&
    !(Array.isArray(value) && value.length === 0)
  );
}

/** Sidebar grid showing every question and its answered/submitted state. */
export function QuestionNavigator({
  questions,
  answers,
  submittedQuestionIds,
  currentQuestionIndex,
  isOpen,
  onSelect,
}: QuestionNavigatorProps) {
  const t = useTranslations("student.exam");

  const legend = [
    { label: t("havenTDoneItYet"), swatch: "border border-gray-300 bg-white" },
    { label: t("selectedNotSubmitted"), swatch: "bg-amber-400" },
    { label: t("submitted"), swatch: "bg-emerald-600" },
    { label: t("watching"), swatch: "border border-[#0066cc] bg-sky-100" },
  ];

  return (
    <aside
      className={`${
        isOpen ? "translate-x-0" : "-translate-x-full"
      } fixed z-40 flex h-[calc(100vh-64px)] w-72 flex-col border-r border-gray-300 bg-white shadow-lg transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 lg:shadow-none`}
    >
      <div className="border-b border-gray-200 bg-gray-50 p-4">
        <h3 className="font-semibold text-gray-800">{t("listOfQuestions")}</h3>
        <div className="mt-2 flex flex-wrap gap-4 text-xs text-gray-500">
          {legend.map(({ label, swatch }) => (
            <div key={label} className="flex items-center gap-1">
              <div className={`h-3 w-3 rounded-sm ${swatch}`} />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="grid grid-cols-5 gap-2">
          {questions.map((question, index) => {
            const isCurrent = index === currentQuestionIndex;
            const isSubmitted = submittedQuestionIds.has(question.id);
            const isAnswered = !isSubmitted && hasLocalAnswer(answers[question.id]);
            const stateClass = isCurrent
              ? CELL_CLASS.current
              : isSubmitted
                ? CELL_CLASS.submitted
                : isAnswered
                  ? CELL_CLASS.answered
                  : CELL_CLASS.idle;

            return (
              <button
                key={question.id}
                onClick={() => onSelect(index)}
                className={`flex h-10 w-10 items-center justify-center rounded-md border text-sm transition-all ${stateClass}`}
              >
                {index + 1}
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </aside>
  );
}
