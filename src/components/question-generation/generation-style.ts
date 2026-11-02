import { questionTypeClass } from "@/lib/regrading";

const NEUTRAL = "border-gray-200 bg-gray-50 text-gray-700";

const BATCH_STATUS_CLASSES: Record<string, string> = {
  WAITING_SOURCE: "border-sky-200 bg-sky-50 text-sky-700",
  QUEUED: NEUTRAL,
  GENERATING: "border-blue-200 bg-blue-50 text-blue-700",
  REVIEW_REQUIRED: "border-amber-200 bg-amber-50 text-amber-800",
  FAILED: "border-red-200 bg-red-50 text-red-700",
  COMPLETED: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

const ITEM_STATUS_CLASSES: Record<string, string> = {
  VALID: NEUTRAL,
  APPROVED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  INVALID: "border-red-200 bg-red-50 text-red-700",
  REJECTED: "border-rose-200 bg-rose-50 text-rose-700",
  COMMITTED: "border-sky-200 bg-sky-50 text-sky-700",
  SKIPPED: NEUTRAL,
};

const PLAN_STATUS_CLASSES: Record<string, string> = {
  WAITING_SOURCE: "border-sky-200 bg-sky-50 text-sky-700",
  PREPARING: "border-blue-200 bg-blue-50 text-blue-700",
  REVIEW_REQUIRED: "border-amber-200 bg-amber-50 text-amber-800",
  APPROVED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  FAILED: "border-red-200 bg-red-50 text-red-700",
};

const FORMAT_CLASSES: Record<string, string> = {
  KNOWLEDGE: "border-sky-200 bg-sky-50 text-sky-700",
  UNDERSTANDING: "border-teal-200 bg-teal-50 text-teal-700",
  APPLYING: "border-amber-200 bg-amber-50 text-amber-800",
  ADVANCED: "border-rose-200 bg-rose-50 text-rose-700",
};

/** Badge colors for a generation batch status; unknown values stay neutral. */
export const batchStatusClass = (status: string) =>
  BATCH_STATUS_CLASSES[status] ?? NEUTRAL;

/** Badge colors for a generated draft item status. */
export const itemStatusClass = (status: string) =>
  ITEM_STATUS_CLASSES[status] ?? NEUTRAL;

/** Badge colors for a knowledge plan status. */
export const planStatusClass = (status: string) =>
  PLAN_STATUS_CLASSES[status] ?? NEUTRAL;

/** Badge colors for a cognitive level (question format). */
export const formatClass = (format: string) =>
  FORMAT_CLASSES[format] ?? NEUTRAL;

export { questionTypeClass };
