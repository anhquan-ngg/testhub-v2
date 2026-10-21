import type { QuestionFormat } from "./backend-enums";

/** text-generation.v1: command accepted by the NestJS batch endpoint. */
export type TextQuestionGenerationCommand = {
  topic_id: string;
  chapter_id: string;
  source: { mode: "text"; text: string };
  question_type: "SINGLE_CHOICE";
  question_format: QuestionFormat;
  count: number;
  language: "vi";
  external_processing_consent: true;
};

/** Review payload uses arrays; NestJS serializes choices only for bank writes. */
export type GeneratedSingleChoiceQuestion = {
  question_text: string;
  options: { text: string; isCorrect: boolean }[];
  question_type: "SINGLE_CHOICE";
  question_format: QuestionFormat;
  correct_answer: null;
};

// Current persisted states. Extra states must be added with backend transitions.
export type QuestionGenerationBatchStatus =
  | "QUEUED"
  | "GENERATING"
  | "REVIEW_REQUIRED"
  | "COMPLETED"
  | "FAILED";

export type QuestionGenerationDraftStatus =
  | "VALID"
  | "APPROVED"
  | "INVALID"
  | "REJECTED"
  | "COMMITTED"
  | "SKIPPED";

export type QuestionGenerationBatch = {
  id: string;
  topic_id: string;
  chapter_id: string;
  status: QuestionGenerationBatchStatus;
  requested_count: number;
  total_items: number;
  question_format: QuestionFormat;
  error_code: string | null;
  created_at: string;
};
export type QuestionGenerationItem = {
  id: string;
  source_index: number;
  revision: number;
  status: QuestionGenerationDraftStatus;
  data: GeneratedSingleChoiceQuestion;
  errors: string[];
  warnings: string[];
  question_id: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  committed_at: string | null;
};
export type GenerationPage<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
};
export type GenerationCommitResult = {
  batch_id: string;
  status: QuestionGenerationBatchStatus;
  questions: { item_id: string; question_id: string }[];
};
