export type ExamFormValues = {
  title: string;
  topic_id: string;
  exam_start_time: string;
  exam_end_time: string;
  duration: string;
  practice: boolean;
  is_public: boolean;
};

export const emptyExamForm: ExamFormValues = {
  title: "", topic_id: "", exam_start_time: "", exam_end_time: "", duration: "",
  practice: false, is_public: false,
};

export type ExamFormErrors = Partial<Record<keyof ExamFormValues,
  "requiredField" | "positiveDuration" | "invalidDate" | "invalidExamTime">>;

export const examFieldIds = {
  title: "exam-title", topic_id: "exam-topic", exam_start_time: "start-time",
  exam_end_time: "end-time", duration: "duration", practice: "practice", is_public: "is_public",
} satisfies Record<keyof ExamFormValues, string>;

/** Validate the same metadata constraints before both create and update requests. */
export function validateExamForm(values: ExamFormValues): ExamFormErrors {
  const errors: ExamFormErrors = {};
  if (!values.title.trim()) errors.title = "requiredField";
  if (!values.topic_id) errors.topic_id = "requiredField";
  const start = new Date(values.exam_start_time).getTime();
  const end = new Date(values.exam_end_time).getTime();
  if (!Number.isFinite(start)) errors.exam_start_time = "invalidDate";
  if (!Number.isFinite(end)) errors.exam_end_time = "invalidDate";
  else if (Number.isFinite(start) && end <= start) errors.exam_end_time = "invalidExamTime";
  const duration = Number(values.duration);
  if (!/^\d+$/.test(values.duration) || !Number.isSafeInteger(duration) || duration < 1) {
    errors.duration = "positiveDuration";
  }
  return errors;
}

/** Only return to the exam list, never an arbitrary redirect supplied in a URL. */
export function examListReturnHref(value: string | null): string {
  if (!value) return "/lecturer/exams";
  const [path, query] = value.split("?", 2);
  return path === "/lecturer/exams" ? path + (query ? `?${query}` : "") : "/lecturer/exams";
}
