

export type ViewMode = "topics" | "chapters" | "questions";
export type BreadcrumbTarget =
  | { type: "root" }
  | { type: "topic" }
  | { type: "chapter"; index: number };
export type QuestionType = "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "ESSAY";
export type QuestionFormat = "KNOWLEDGE" | "UNDERSTANDING" | "APPLYING" | "ADVANCED";
export type FileType = "AUDIO" | "IMAGE" | "VIDEO";

export type Topic = {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type Chapter = {
  id: string;
  topic_id: string;
  parent_id?: string | null;
  name: string;
  order: number;
  created_at: string;
  updated_at: string;
};

export type FileRecord = {
  id: string;
  name: string;
  url: string;
  s3_key: string;
  type: FileType;
  size?: number;
  entity_type?: string | null;
  entity_id?: string | null;
  status: "PENDING" | "ACTIVE" | "DELETED";
};

export type QuestionFile = {
  order: number;
  file: FileRecord;
};

export type Question = {
  id: string;
  chapter_id: string;
  question_text: string;
  options?: string | null;
  correct_answer?: string | null;
  question_type: QuestionType;
  question_format: QuestionFormat;
  created_at: string;
  updated_at: string;
  chapter?: Chapter;
  files?: QuestionFile[];
};

export type QuestionOption = {
  text: string;
  isCorrect: boolean;
};

export type ParsedQuestionOption = {
  label?: string;
  text: string;
  isCorrect?: boolean;
};

export type QuestionForm = {
  chapter_id: string;
  question_text: string;
  question_type: QuestionType;
  question_format: QuestionFormat;
  options: QuestionOption[];
  correct_answer: string;
};
