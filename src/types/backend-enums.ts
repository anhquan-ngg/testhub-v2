// Keep these API values in sync with ../testhub-v2-backend/prisma/schema.prisma.
export const UserRole = {
  ADMIN: "ADMIN",
  LECTURER: "LECTURER",
  STUDENT: "STUDENT",
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const QuestionType = {
  SINGLE_CHOICE: "SINGLE_CHOICE",
  MULTIPLE_CHOICE: "MULTIPLE_CHOICE",
  ESSAY: "ESSAY",
} as const;
export type QuestionType = (typeof QuestionType)[keyof typeof QuestionType];

export const QuestionFormat = {
  KNOWLEDGE: "KNOWLEDGE",
  UNDERSTANDING: "UNDERSTANDING",
  APPLYING: "APPLYING",
  ADVANCED: "ADVANCED",
} as const;
export type QuestionFormat =
  (typeof QuestionFormat)[keyof typeof QuestionFormat];

export const SubmissionStatus = {
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const;
export type SubmissionStatus =
  (typeof SubmissionStatus)[keyof typeof SubmissionStatus];
