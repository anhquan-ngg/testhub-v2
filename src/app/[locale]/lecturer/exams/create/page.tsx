"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { ExamQuestionSelector } from "@/components/exams/ExamQuestionSelector";
import { createQuestionSelection, questionSelectionPayload, selectionValidationKey } from "@/components/exams/question-selection";
import { fetchAllPages } from "@/lib/pagination";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { ExamDetailsFields } from "@/components/exams/ExamDetailsFields";
import { emptyExamForm, examFieldIds, examListReturnHref, validateExamForm } from "@/components/exams/exam-form";
import { useSearchParams } from "next/navigation";
import { useExamLeaveGuard } from "@/components/exams/use-exam-leave-guard";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import apiClient from "@/lib/api-client";
import { ENDPOINTS } from "@/constants/endpoints";

type Topic = {
  id: string;
  name: string;
};

export default function CreateExamPage() {
  const t = useTranslations("lecturer.createExam");
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnHref = examListReturnHref(searchParams.get("returnTo"));
  const selectionT = useTranslations("lecturer.editExam");
  const [selection, setSelection] = useState(createQuestionSelection);
  const [createdExamId, setCreatedExamId] = useState<string | null>(null);
  const submittingRef = useRef(false);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isLoadingTopics, setIsLoadingTopics] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [examForm, setExamForm] = useState(emptyExamForm);
  const [validationAttempted, setValidationAttempted] = useState(false);
  const errors = validationAttempted ? validateExamForm(examForm) : {};
  const dirty = JSON.stringify(examForm) !== JSON.stringify(emptyExamForm) ||
    JSON.stringify(selection) !== JSON.stringify(createQuestionSelection()) || !!createdExamId;
  const leaveGuard = useExamLeaveGuard(dirty, isSubmitting);

  useEffect(() => {
    const fetchTopics = async () => {
      setIsLoadingTopics(true);
      try {
        setTopics(await fetchAllPages<Topic>(ENDPOINTS.TOPICS.BASE, {}));
      } catch (error) {
        console.error("Fetch topics error:", error);
        toast.error(t("unableToLoadTopicList"));
      } finally {
        setIsLoadingTopics(false);
      }
    };

    void fetchTopics();
  }, [t]);

  const handleAddExam = async () => {
    if (submittingRef.current) return;
    const duration = Number(examForm.duration);
    const start = new Date(examForm.exam_start_time);
    const end = new Date(examForm.exam_end_time);
    const validation = validateExamForm(examForm);
    setValidationAttempted(true);
    const firstError = Object.keys(validation)[0] as keyof typeof examFieldIds | undefined;
    if (firstError) {
      document.getElementById(examFieldIds[firstError])?.focus();
      return;
    }
    const selectionError = selectionValidationKey(selection);
    if (selectionError) {
      toast.warning(selectionT(selectionError));
      return;
    }

    const manualQuestions = selection.mode === "MANUAL" ? selection.selectedQuestions : [];
    let examId = createdExamId;
    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      if (!examId) {
        const response = await apiClient.post<{ id: string; }>(ENDPOINTS.EXAMS.BASE, {
          title: examForm.title.trim(),
          topic_id: examForm.topic_id,
          exam_start_time: start.toISOString(),
          exam_end_time: end.toISOString(),
          duration,
          practice: examForm.practice,
          ...questionSelectionPayload(selection),
          // Manual questions use a separate endpoint; publish only after all are attached.
          is_public: manualQuestions.length > 0 ? false : examForm.is_public,
        });
        examId = response.data.id;
        setCreatedExamId(examId);
      }
      const existing = createdExamId
        ? (await apiClient.get<{ questions?: { question_id: string; }[]; }>(ENDPOINTS.EXAMS.DETAIL(examId))).data.questions ?? []
        : [];
      const existingIds = new Set(existing.map((item) => item.question_id));
      for (const questionId of manualQuestions) {
        if (!existingIds.has(questionId)) {
          await apiClient.post(ENDPOINTS.EXAMS.QUESTIONS.BASE(examId), { question_id: questionId });
        }
      }
      if (manualQuestions.length > 0 && examForm.is_public) {
        await apiClient.patch(ENDPOINTS.EXAMS.DETAIL(examId), { is_public: true });
      }
      toast.success(t("createASuccessfulTest"));
      leaveGuard.allowNavigation();
      router.push(returnHref);
    } catch (error) {
      toast.error(examId ? t("questionSaveIncomplete") :
        axios.isAxiosError(error) && error.response?.data?.code === "CHAPTER_DISTRIBUTION_INSUFFICIENT"
          ? selectionT("insufficientDistinctQuestions") : t("createFailedTestPleaseTryAgain"));
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-neutral-900">{t("createANewTest")}</h2>
        <p className="mt-1 text-sm text-neutral-500">{t("fillInTheDetailsToCreate")}</p>
      </div>

      <Card className="bg-white border-gray-300 shadow-sm">
        <CardHeader>
          <CardTitle>{t("examInformation")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {createdExamId && !isSubmitting && (
              <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-800">
                {t("questionSaveIncomplete")}
              </div>
            )}
            <fieldset disabled={isSubmitting || !!createdExamId} className="min-w-0 space-y-6">
              <form id="exam-metadata" noValidate onSubmit={(event) => { event.preventDefault(); void handleAddExam(); }}>
              <ExamDetailsFields
                value={examForm}
                topics={topics}
                loadingTopics={isLoadingTopics}
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
                disabled={isSubmitting || !!createdExamId}
              />
            </fieldset>

            <div className="flex flex-col gap-3 pt-6 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                onClick={() => leaveGuard.requestLeave(() => router.push(createdExamId ? `/lecturer/exams/edit/${createdExamId}?returnTo=${encodeURIComponent(returnHref)}` : returnHref))}
                disabled={isSubmitting}
                className="flex-1 border-gray-300 hover:bg-gray-100 hover:border-none hover:cursor-pointer"
              >
                {createdExamId ? t("continueEditing") : t("cancel")}
              </Button>
              <Button
                type="submit"
                form="exam-metadata"
                disabled={isSubmitting}
                className="flex-1 bg-[#0066cc] hover:bg-[#0052a3] text-white hover:cursor-pointer"
              >
                {isSubmitting ? t("creating") : createdExamId ? t("retrySavingQuestions") : t("createTest")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      {leaveGuard.dialog}
    </div>
  );
}
