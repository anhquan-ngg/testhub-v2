"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { examFieldIds, type ExamFormErrors, type ExamFormValues } from "./exam-form";

type Props = {
  value: ExamFormValues;
  onChange: (next: ExamFormValues) => void;
  topics: { id: string; name: string }[];
  errors: ExamFormErrors;
  loadingTopics?: boolean;
};

/** Shared, labelled metadata fields keep create/edit validation and spacing consistent. */
export function ExamDetailsFields({ value, onChange, topics, errors, loadingTopics = false }: Props) {
  const t = useTranslations("lecturer.createExam");
  const accessibility = (field: keyof ExamFormValues) => ({
    id: examFieldIds[field],
    "aria-invalid": !!errors[field],
    "aria-describedby": errors[field] ? `${examFieldIds[field]}-error` : undefined,
  });
  const error = (field: keyof ExamFormValues) => {
    const key = errors[field];
    return key ? <p id={`${examFieldIds[field]}-error`} className="text-sm text-red-700">{t(key)}</p> : null;
  };
  const inputClass = "min-w-0 w-full border-gray-300 bg-white";
  const selectClass = `${inputClass} [&>span]:min-w-0 [&>span]:truncate`;

  return (
    <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="min-w-0 space-y-2">
        <Label htmlFor="exam-title">{t("testName")}<span aria-hidden="true" className="text-red-500">*</span></Label>
        <Input {...accessibility("title")} aria-required="true" value={value.title} placeholder={t("enterTheTestName")} onChange={(event) => onChange({ ...value, title: event.target.value })} className={inputClass} />
        {error("title")}
      </div>
      <div className="min-w-0 space-y-2">
        <Label htmlFor="exam-topic">{t("topic")}<span aria-hidden="true" className="text-red-500">*</span></Label>
        <Select value={value.topic_id} onValueChange={(topic_id) => onChange({ ...value, topic_id })} disabled={loadingTopics}>
          <SelectTrigger {...accessibility("topic_id")} aria-required="true" className={selectClass}><SelectValue placeholder={loadingTopics ? t("loadingTheme") : t("chooseATopic")} /></SelectTrigger>
          <SelectContent className="max-w-[calc(100vw-2rem)] border-gray-300 bg-white">
            {topics.map((topic) => <SelectItem key={topic.id} value={topic.id} className="break-words">{topic.name}</SelectItem>)}
          </SelectContent>
        </Select>
        {error("topic_id")}
      </div>
      <div className="min-w-0 space-y-2">
        <Label htmlFor="start-time">{t("startTime")}<span aria-hidden="true" className="text-red-500">*</span></Label>
        <Input {...accessibility("exam_start_time")} aria-required="true" type="datetime-local" value={value.exam_start_time} onChange={(event) => onChange({ ...value, exam_start_time: event.target.value })} className={inputClass} />
        {error("exam_start_time")}
      </div>
      <div className="min-w-0 space-y-2">
        <Label htmlFor="end-time">{t("endTime")}<span aria-hidden="true" className="text-red-500">*</span></Label>
        <Input {...accessibility("exam_end_time")} aria-required="true" type="datetime-local" value={value.exam_end_time} onChange={(event) => onChange({ ...value, exam_end_time: event.target.value })} className={inputClass} />
        {error("exam_end_time")}
      </div>
      <div className="min-w-0 space-y-2">
        <Label htmlFor="duration">{t("durationMinutes")}<span aria-hidden="true" className="text-red-500">*</span></Label>
        <Input {...accessibility("duration")} aria-required="true" type="number" min={1} step={1} placeholder="90" value={value.duration} onChange={(event) => onChange({ ...value, duration: event.target.value })} className={inputClass} />
        {error("duration")}
      </div>
      <div className="min-w-0 space-y-2">
        <Label htmlFor="practice">{t("examType")}</Label>
        <Select value={value.practice ? "practice" : "test"} onValueChange={(mode) => onChange({ ...value, practice: mode === "practice" })}>
          <SelectTrigger id="practice" className={selectClass}><SelectValue /></SelectTrigger>
          <SelectContent className="border-gray-300 bg-white">
            <SelectItem value="test">{t("officialTest")}</SelectItem>
            <SelectItem value="practice">{t("practiceExam")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex min-w-0 items-start gap-2 py-2 lg:col-span-2">
        <Checkbox id="is_public" checked={value.is_public} onCheckedChange={(checked) => onChange({ ...value, is_public: checked === true })} className="mt-0.5 border-gray-300 bg-white" />
        <Label htmlFor="is_public" className="min-w-0 text-sm leading-relaxed">{t("makeTheExamPublicStudentsCan")}</Label>
      </div>
    </div>
  );
}
