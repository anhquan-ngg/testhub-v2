import { z } from "zod";

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
    question_type: z.literal("SINGLE_CHOICE"),
    question_format: z.enum([
      "KNOWLEDGE",
      "UNDERSTANDING",
      "APPLYING",
      "ADVANCED",
    ]),
    correct_answer: z.null(),
  })
  .strict()
  .refine(
    ({ options }) =>
      options.filter((option) => option.isCorrect).length === 1 &&
      new Set(options.map((option) => option.text.toLowerCase())).size === 4,
  );

export const generationCommandSchema = z
  .object({
    topic_id: z.uuid(),
    chapter_id: z.uuid(),
    source: z
      .object({ mode: z.literal("text"), text: text(20_000, 20) })
      .strict(),
    question_type: z.literal("SINGLE_CHOICE"),
    question_format: z.enum([
      "KNOWLEDGE",
      "UNDERSTANDING",
      "APPLYING",
      "ADVANCED",
    ]),
    count: z.number().int().min(1).max(20),
    language: z.literal("vi"),
    external_processing_consent: z.literal(true),
  })
  .strict();
