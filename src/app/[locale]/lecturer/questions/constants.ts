import { CheckCircle, Copy, PenTool } from "lucide-react";
import type { QuestionFormat, QuestionForm, QuestionOption, QuestionType } from "./types";

export const optionLabels = ["A", "B", "C", "D", "E", "F"];
export const ITEMS_PER_PAGE = 5;
export const QUESTION_PREVIEW_MAX_LENGTH = 80;

export const questionTypeConfig = {
  SINGLE_CHOICE: {
    color: "text-emerald-700",
    bgColor: "bg-emerald-100",
    Icon: CheckCircle,
  },
  MULTIPLE_CHOICE: {
    color: "text-blue-700",
    bgColor: "bg-blue-100",
    Icon: Copy,
  },
  ESSAY: {
    color: "text-amber-700",
    bgColor: "bg-amber-100",
    Icon: PenTool,
  },
} satisfies Record<
  QuestionType,
  {
    color: string;
    bgColor: string;
    Icon: React.ComponentType<{ className?: string }>;
  }
>;

export const questionFormatConfig = {
  KNOWLEDGE: {
    color: "text-cyan-700",
    bgColor: "bg-cyan-100",
    level: 1,
  },
  UNDERSTANDING: {
    color: "text-sky-700",
    bgColor: "bg-sky-100",
    level: 2,
  },
  APPLYING: {
    color: "text-purple-700",
    bgColor: "bg-purple-100",
    level: 3,
  },
  ADVANCED: {
    color: "text-indigo-700",
    bgColor: "bg-indigo-100",
    level: 4,
  },
} satisfies Record<
  QuestionFormat,
  {
    color: string;
    bgColor: string;
    level: number;
  }
>;

export const emptyOptions = (): QuestionOption[] => [
  { text: "", isCorrect: false },
  { text: "", isCorrect: false },
  { text: "", isCorrect: false },
  { text: "", isCorrect: false },
];

export const initialQuestionForm = (chapterId = ""): QuestionForm => ({
  chapter_id: chapterId,
  question_text: "",
  question_type: "SINGLE_CHOICE",
  question_format: "KNOWLEDGE",
  options: emptyOptions(),
  correct_answer: "",
});
