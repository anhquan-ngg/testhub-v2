import type { QuestionFormat } from "./backend-enums";

export type GenerationQuestionType = "SINGLE_CHOICE" | "MULTIPLE_CHOICE";

/** One requested row; questions are generated in row order. */
export type QuestionGenerationConfig = {
  question_type: GenerationQuestionType;
  question_format: QuestionFormat;
  count: number;
};

/** text-generation.v1: command accepted by the NestJS batch endpoint. */
export type TextQuestionGenerationCommand = {
  topic_id: string;
  chapter_id: string;
  source: { mode: "text"; text: string };
  question_configs: QuestionGenerationConfig[];
  language: "vi";
  external_processing_consent: true;
};

export type DocumentQuestionGenerationCommand = Omit<
  TextQuestionGenerationCommand,
  "source"
> & { source: { mode: "document"; version_id: string; query: string } };
export type QuestionGenerationCommand =
  | TextQuestionGenerationCommand
  | DocumentQuestionGenerationCommand;
export type QuestionProvenance = {
  contract_version: "rag-generation.v1";
  profile_id: string;
  quality_status: "UNASSESSED";
  citations: {
    quote: string;
    chunk: {
      chunk_id: string;
      document_id: string;
      version_id: string;
      kind: "PAGE" | "SLIDE" | "NOTES";
      position: number;
      text: string;
      start_offset: number;
      end_offset: number;
      source_sha256: string;
      text_sha256: string;
    };
  }[];
};

/** Review payload uses arrays; NestJS serializes choices only for bank writes. */
export type GeneratedChoiceQuestion = {
  question_text: string;
  options: { text: string; isCorrect: boolean }[];
  question_type: GenerationQuestionType;
  question_format: QuestionFormat;
  correct_answer: null;
};

// Current persisted states. Extra states must be added with backend transitions.
export type QuestionGenerationBatchStatus =
  | "WAITING_SOURCE"
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
  sourceVersion?: {
    file_name: string;
    version: number;
    document_id: string;
  } | null;
  source_mode?: "text" | "document";
  source_version_id?: string | null;
  preparation_stage?: "EXTRACTING" | "INDEXING" | "READY" | null;
  /** Total of question_configs counts. */
  requested_count: number;
  total_items: number;
  question_configs: QuestionGenerationConfig[];
  error_code: string | null;
  created_at: string;
};
export type QuestionGenerationItem = {
  id: string;
  source_index: number;
  revision: number;
  status: QuestionGenerationDraftStatus;
  data: GeneratedChoiceQuestion;
  provenance?: QuestionProvenance | null;
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
