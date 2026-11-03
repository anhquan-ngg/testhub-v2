import type { QuestionType } from "@/types/backend-enums";
import type { QuestionFile } from "@/types/exam";

export type QuestionOption = {
  id: string;
  text: string;
  isCorrect?: boolean;
};

/** A question as rendered in the exam: options are parsed and re-indexed. */
export type ExamQuestionItem = {
  id: string;
  question_text: string;
  image_url: string | null;
  files?: QuestionFile[];
  options: QuestionOption[];
  question_type: QuestionType;
  submitted_answer?: string | null;
  submitted_options?: string | null;
  answered?: boolean;
};

export type ResolvedQuestionFile = {
  id: string;
  url: string;
  name: string;
  type: "IMAGE" | "VIDEO" | "AUDIO" | "DOCUMENT" | string;
};

/** Single choice / essay store a string, multiple choice stores option ids. */
export type AnswerValue = string | string[];
export type AnswerMap = Record<string, AnswerValue>;
