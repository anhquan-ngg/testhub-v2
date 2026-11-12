import type { QuestionFormat, QuestionType } from "@/types/backend-enums";

export type ExamMode = "MANUAL" | "RANDOM_N" | "BY_TYPE" | "BY_CHAPTER";

export type QuestionConfig = {
  id: number;
  chapter_id?: string;
  question_type: QuestionType;
  question_format: QuestionFormat;
  quantity: number;
};

export type ExamTypeDistributionConfig = Pick<
  QuestionConfig,
  "question_type" | "question_format" | "quantity"
>;
export type ExamChapterDistributionConfig = {
  chapter_id: string;
  quantity: number;
};
export type ExamDistributionConfig =
  | ExamTypeDistributionConfig
  | ExamChapterDistributionConfig;

export type ExamQuestionSelection = {
  mode: ExamMode;
  selectedQuestions: string[];
  randomCount: string;
  configRows: QuestionConfig[];
  distributionDelta: number;
  distributionDeltaOnline: boolean;
};

export const ALL_CHAPTERS_VALUE = "ALL";

/** Creates independent initial state for a new exam's question selection. */
export function createQuestionSelection(): ExamQuestionSelection {
  return {
    mode: "MANUAL",
    selectedQuestions: [],
    randomCount: "10",
    configRows: [{
      id: 1,
      chapter_id: ALL_CHAPTERS_VALUE,
      question_type: "SINGLE_CHOICE",
      question_format: "KNOWLEDGE",
      quantity: 0,
    }],
    distributionDelta: 0,
    distributionDeltaOnline: false,
  };
}

/** Combines duplicate distribution rows while preserving chapter IDs at any depth. */
export function buildDistribution(
  mode: ExamMode,
  rows: QuestionConfig[],
): ExamDistributionConfig[] {
  const grouped = new Map<string, ExamDistributionConfig>();
  for (const row of rows) {
    if (!Number.isSafeInteger(row.quantity) || row.quantity <= 0) continue;
    const chapterId = row.chapter_id;
    if (mode === "BY_CHAPTER" && (!chapterId || chapterId === ALL_CHAPTERS_VALUE)) continue;
    const key = mode === "BY_CHAPTER"
      ? chapterId as string
      : `${row.question_type}|${row.question_format}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.quantity += row.quantity;
    } else {
      grouped.set(key, mode === "BY_CHAPTER"
        ? { chapter_id: chapterId as string, quantity: row.quantity }
        : { question_type: row.question_type, question_format: row.question_format, quantity: row.quantity });
    }
  }
  return [...grouped.values()];
}

/** Validates the active selection mode without preventing empty manual drafts. */
export function selectionValidationKey(selection: ExamQuestionSelection) {
  if (selection.mode === "RANDOM_N") {
    const count = Number(selection.randomCount);
    if (!Number.isSafeInteger(count) || count < 1) return "invalidRandomCount";
  }
  if (selection.mode === "BY_TYPE" || selection.mode === "BY_CHAPTER") {
    if (selection.configRows.some((row) => !Number.isSafeInteger(row.quantity) || row.quantity < 0)) {
      return "invalidQuantity";
    }
    if (selection.mode === "BY_CHAPTER" && selection.configRows.some(
      (row) => row.quantity > 0 && (!row.chapter_id || row.chapter_id === ALL_CHAPTERS_VALUE),
    )) return "pleaseSelectAtLeastOneChapter";
    const distribution = buildDistribution(selection.mode, selection.configRows);
    if (distribution.length === 0) return selection.mode === "BY_CHAPTER"
      ? "pleaseSelectAtLeastOneChapter" : "pleaseAddValidDistribution";
    if (!Number.isSafeInteger(distribution.reduce((sum, row) => sum + row.quantity, 0))) {
      return "invalidQuantity";
    }
  }
  return null;
}

/** Serializes only the active mode's configuration to the existing exam API contract. */
export function questionSelectionPayload(selection: ExamQuestionSelection) {
  const distributed = selection.mode === "BY_TYPE" || selection.mode === "BY_CHAPTER";
  return {
    mode: selection.mode,
    sample_size: selection.mode === "RANDOM_N" ? Number(selection.randomCount) : null,
    distribution: distributed ? JSON.stringify(buildDistribution(selection.mode, selection.configRows)) : null,
    distribution_delta: distributed ? selection.distributionDelta : 0,
    distribution_delta_online: distributed && selection.distributionDelta > 0 && selection.distributionDeltaOnline,
  };
}
