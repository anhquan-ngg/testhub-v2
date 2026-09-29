export type QuestionImportSourceType = "DOCX" | "XLSX";
export type QuestionImportStatus =
  | "UPLOADING"
  | "QUEUED"
  | "PARSING"
  | "REVIEW_REQUIRED"
  | "COMMITTING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";
export type QuestionImportItemStatus =
  "VALID" | "INVALID" | "COMMITTED" | "SKIPPED";

export type ImportQuestionOption = {
  key: string;
  text: string;
  isCorrect: boolean;
};

export type ImportQuestionData = {
  questionText: string;
  questionType: "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "ESSAY";
  questionFormat: "KNOWLEDGE" | "UNDERSTANDING" | "APPLYING" | "ADVANCED";
  options: ImportQuestionOption[];
  correctAnswer: string | null;
  /** Chapter path that does not exist yet; it is created when the import is committed. */
  chapterPath?: string[] | null;
};

export type QuestionImportAsset = {
  id: string;
  name: string;
  mime_type: string;
  size: number;
  order: number;
  view_url?: string;
};

export type QuestionImportItem = {
  id: string;
  source_index: number;
  source_code?: string | null;
  chapter_id?: string | null;
  status: QuestionImportItemStatus;
  data: ImportQuestionData;
  errors: string[];
  warnings: string[];
  chapter?: { id: string; name: string } | null;
  assets: QuestionImportAsset[];
};

export type QuestionImportRecord = {
  id: string;
  topic_id: string;
  default_chapter_id?: string | null;
  exam_id?: string | null;
  source_name: string;
  source_type: QuestionImportSourceType;
  status: QuestionImportStatus;
  total_items: number;
  valid_items: number;
  invalid_items: number;
  committed_items: number;
  skipped_items: number;
  error_message?: string | null;
};
