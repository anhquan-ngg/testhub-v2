"use client";

import axios from "axios";

import { useTranslations } from "next-intl";
import { use, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { useSearchParams } from "next/navigation";
import { ExamDetailsFields } from "@/components/exams/ExamDetailsFields";
import { emptyExamForm, examFieldIds, examListReturnHref, validateExamForm } from "@/components/exams/exam-form";
import { useExamLeaveGuard } from "@/components/exams/use-exam-leave-guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { fetchAllPages } from "@/lib/pagination";
import apiClient from "@/lib/api-client";
import { ENDPOINTS } from "@/constants/endpoints";
import { ExamQuestionSelector } from "@/components/exams/ExamQuestionSelector";
import { ALL_CHAPTERS_VALUE, createQuestionSelection, questionSelectionPayload, selectionValidationKey, type ExamMode, type QuestionConfig, type ExamTypeDistributionConfig, type ExamChapterDistributionConfig } from "@/components/exams/question-selection";

type EditExamPageProps = {
  params: Promise<{ id: string; }>;
};

type TopicItem = { id: string; name: string; };

type ExamQuestionItem = {
  question_id: string;
};

type ExamDetail = {
  id: string;
  title: string;
  topic?: string | { name?: string | null; } | null;
  topic_id?: string;
  exam_start_time: string | Date;
  exam_end_time: string | Date;
  duration: number;
  practice: boolean;
  is_public: boolean;
  mode: ExamMode;
  sample_size?: number | null;
  distribution?: string | null;
  distribution_delta?: number;
  distribution_delta_online?: boolean;
  questions?: ExamQuestionItem[];
};

const formatToLocalISO = (dateString: string | Date) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "";

  const pad = (n: number) => n.toString().padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());

  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export default function EditExamPage({ params }: EditExamPageProps) {
  const t = useTranslations("lecturer.editExam");
  const examId = use(params).id;
  const router = useRouter();
  const [topics, setTopics] = useState<TopicItem[]>([]);
  const [exam, setExam] = useState<ExamDetail | null>(null);
  const [selection, setSelection] = useState(createQuestionSelection);
  const [examForm, setExamForm] = useState(emptyExamForm);
  const [baseline, setBaseline] = useState("");
  const [validationAttempted, setValidationAttempted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const submittingRef = useRef(false);
  const loadVersion = useRef(0);
  const searchParams = useSearchParams();
  const returnHref = examListReturnHref(searchParams.get("returnTo"));
  const errors = validationAttempted ? validateExamForm(examForm) : {};
  const dirty = !!baseline && baseline !== JSON.stringify({ form: examForm, selection });
  const leaveGuard = useExamLeaveGuard(dirty, isSubmitting);

  const fetchExam = useCallback(async () => {
    const version = ++loadVersion.current;
    setIsLoading(true);
    setLoadError(false);
    try {
      const { data } = await apiClient.get<ExamDetail>(ENDPOINTS.EXAMS.DETAIL(examId));
      if (version !== loadVersion.current) return;
      const form = {
        title: data.title, topic_id: data.topic_id ?? "",
        exam_start_time: formatToLocalISO(data.exam_start_time),
        exam_end_time: formatToLocalISO(data.exam_end_time),
        duration: String(data.duration), practice: data.practice, is_public: data.is_public,
      };
      const next = createQuestionSelection();
      next.mode = data.mode;
      next.selectedQuestions = data.questions?.map((item) => item.question_id) ?? [];
      next.distributionDelta = data.distribution_delta ?? 0;
      next.distributionDeltaOnline = data.distribution_delta_online ?? false;
      if (data.sample_size) next.randomCount = String(data.sample_size);
      if (data.mode === "BY_TYPE" && data.distribution) {
        next.configRows = (JSON.parse(data.distribution) as ExamTypeDistributionConfig[]).map((item, index) => ({ ...item, id: index + 1, chapter_id: ALL_CHAPTERS_VALUE }));
      } else if (data.mode === "BY_CHAPTER" && data.distribution) {
        next.configRows = (JSON.parse(data.distribution) as ExamChapterDistributionConfig[]).map((item, index): QuestionConfig => ({ ...item, id: index + 1, question_type: "SINGLE_CHOICE", question_format: "KNOWLEDGE" }));
      }
      setExam(data);
      setExamForm(form);
      setSelection(next);
      setBaseline(JSON.stringify({ form, selection: next }));
    } catch {
      if (version === loadVersion.current) setLoadError(true);
    } finally {
      if (version === loadVersion.current) setIsLoading(false);
    }
  }, [examId]);

  const syncExamQuestions = async (id: string) => {
    const { data } = await apiClient.get<ExamDetail>(ENDPOINTS.EXAMS.DETAIL(id));
    const existingQuestionIds = data.questions?.map((item) => item.question_id) ?? [];
    const selectedQuestions = selection.selectedQuestions;
    const selectedQuestionSet = new Set(selectedQuestions);
    const existingQuestionSet = new Set(existingQuestionIds);
    const questionsToAdd = selectedQuestions.filter(
      (questionId) => !existingQuestionSet.has(questionId),
    );
    const questionsToRemove = existingQuestionIds.filter(
      (questionId) => !selectedQuestionSet.has(questionId),
    );

    await Promise.all([
      ...questionsToAdd.map((questionId) =>
        apiClient.post(ENDPOINTS.EXAMS.QUESTIONS.BASE(id), {
          question_id: questionId,
        }),
      ),
      ...questionsToRemove.map((questionId) =>
        apiClient.delete(ENDPOINTS.EXAMS.QUESTIONS.DETAIL(id, questionId)),
      ),
    ]);
  };

  const handleEditExam = async (id: string) => {
    if (submittingRef.current || isLoading || loadError || !exam) return;
    const validation = validateExamForm(examForm);
    setValidationAttempted(true);
    const firstError = Object.keys(validation)[0] as keyof typeof examFieldIds | undefined;
    if (firstError) {
      document.getElementById(examFieldIds[firstError])?.focus();
      return;
    }
    const selectionError = selectionValidationKey(selection);
    if (selectionError) { toast.warning(t(selectionError)); return; }
    const payload = {
      title: examForm.title.trim(),
      topic_id: examForm.topic_id,
      exam_start_time: new Date(examForm.exam_start_time).toISOString(),
      exam_end_time: new Date(examForm.exam_end_time).toISOString(),
      duration: Number(examForm.duration),
      practice: examForm.practice,
      is_public: examForm.is_public,
      ...questionSelectionPayload(selection),
    };

    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      await apiClient.patch(ENDPOINTS.EXAMS.DETAIL(id), payload);
      await syncExamQuestions(id);
      toast.success(t("successfullyUpdatedExam"));
      leaveGuard.allowNavigation();
      router.push(returnHref);
    } catch (error) {
      toast.error(
        t(
          axios.isAxiosError(error) &&
            error.response?.data?.code === "CHAPTER_DISTRIBUTION_INSUFFICIENT"
            ? "insufficientDistinctQuestions"
            : "updateFailedTestPleaseTryAgain",
        ),
      );
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };
  useEffect(() => {
    void fetchAllPages<TopicItem>(ENDPOINTS.TOPICS.BASE, {})
      .then(setTopics)
      .catch(() => toast.error(t("unableToLoadQuestionBank")));
  }, [t]);

  useEffect(() => {
    void fetchExam();
    return () => { loadVersion.current += 1; };
  }, [fetchExam]);

  if (isLoading) return <p role="status" className="py-16 text-center text-neutral-600">{t("loadingExam")}</p>;
  if (loadError || !exam) return (
    <div role="alert" className="space-y-4 py-16 text-center">
      <p>{t("unableToDownloadTestInformation")}</p>
      <Button variant="outline" onClick={() => void fetchExam()}>{t("retryLoad")}</Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-neutral-900">{t("editExam")}</h2>
        <p className="mt-1 text-sm text-neutral-500">
          {t("editDetailsDescription")}
        </p>
      </div>

      <Card className="bg-white border-gray-300 shadow-sm">
        <CardHeader>
          <CardTitle>{t("examInformation")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <fieldset disabled={isSubmitting} className="min-w-0 space-y-6">
              <form id="exam-metadata" noValidate onSubmit={(event) => { event.preventDefault(); void handleEditExam(examId); }}>
                <ExamDetailsFields
                  value={examForm}
                  topics={topics}
                  errors={errors}
                  onChange={(next) => {
                    if (next.topic_id !== examForm.topic_id) setSelection(createQuestionSelection());
                    setExamForm(next);
                  }}
                />
              </form>
              <ExamQuestionSelector
                key={examForm.topic_id}
                topicId={examForm.topic_id}
                title={examForm.title}
                value={selection}
                onChange={setSelection}
                disabled={isSubmitting}
              />
            </fieldset>

            <div className="flex flex-col gap-3 pt-6 sm:flex-row">
              <Button
                variant="outline"
                onClick={() => leaveGuard.requestLeave(() => router.push(returnHref))}
                disabled={isSubmitting}
                className="flex-1 border-gray-300 hover:bg-gray-100 hover:border-none hover:cursor-pointer"
              >
                {t("cancel")}
              </Button>
              <Button
                type="submit"
                form="exam-metadata"
                disabled={isSubmitting}
                className="flex-1 bg-[#0066cc] hover:bg-[#0052a3] text-white hover:cursor-pointer"
              >
                {isSubmitting ? t("savingExam") : t("updateExam")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      {leaveGuard.dialog}
    </div>
  );
}
