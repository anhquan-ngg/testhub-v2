import { z } from "zod";
import type { GenerationQuestionType } from "@/types/question-generation";

// Keep these limits and rules aligned with the backend question-generation contract.
export const MAX_GENERATION_QUESTIONS = 20;
export const MAX_GENERATION_CONFIGS = 10;
export const GENERATION_QUESTION_TYPES = [
  "SINGLE_CHOICE",
  "MULTIPLE_CHOICE",
] as const;
export const GENERATION_QUESTION_FORMATS = [
  "KNOWLEDGE",
  "UNDERSTANDING",
  "APPLYING",
  "ADVANCED",
] as const;

/** SINGLE_CHOICE has one correct option; MULTIPLE_CHOICE has two or more, never all. */
export function hasValidAnswers(
  questionType: GenerationQuestionType,
  options: { isCorrect: boolean }[],
) {
  const correct = options.filter((option) => option.isCorrect).length;
  return questionType === "SINGLE_CHOICE"
    ? correct === 1
    : correct >= 2 && correct < options.length;
}

const text = (max: number, min = 1) =>
  z
    .string()
    .trim()
    .refine(
      (value) =>
        Array.from(value).length >= min && Array.from(value).length <= max,
    );

export const generationDraftSchema = z
  .object({
    question_text: text(2_000),
    options: z
      .array(z.object({ text: text(500), isCorrect: z.boolean() }).strict())
      .length(4),
    question_type: z.enum(GENERATION_QUESTION_TYPES),
    question_format: z.enum(GENERATION_QUESTION_FORMATS),
    correct_answer: z.null(),
  })
  .strict()
  .refine(
    ({ question_type, options }) =>
      hasValidAnswers(question_type, options) &&
      new Set(options.map((option) => option.text.toLowerCase())).size === 4,
  );

export const questionConfigsSchema = z
  .array(
    z
      .object({
        question_type: z.enum(GENERATION_QUESTION_TYPES),
        question_format: z.enum(GENERATION_QUESTION_FORMATS),
        count: z.number().int().min(1).max(MAX_GENERATION_QUESTIONS),
      })
      .strict(),
  )
  .min(1)
  .max(MAX_GENERATION_CONFIGS)
  .refine(
    (configs) =>
      configs.reduce((total, config) => total + config.count, 0) <=
      MAX_GENERATION_QUESTIONS,
  );

export const generationCommandSchema = z
  .object({
    topic_id: z.uuid(),
    chapter_id: z.uuid(),
    source: z.discriminatedUnion("mode", [
      z.object({ mode: z.literal("text"), text: text(20_000, 20) }).strict(),
      z
        .object({
          mode: z.literal("document"),
          version_id: z.uuid(),
          query: text(400, 0).default(""),
        })
        .strict(),
    ]),
    question_configs: questionConfigsSchema,
    language: z.literal("vi"),
    external_processing_consent: z.literal(true),
  })
  .strict();

export const documentGenerationSettingsSchema = generationCommandSchema
  .omit({ source: true })
  .extend({ query: text(400, 0) });
