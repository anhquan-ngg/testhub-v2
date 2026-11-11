"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { ExamQuestionSelector } from "@/components/exams/ExamQuestionSelector";
import { createQuestionSelection, questionSelectionPayload, selectionValidationKey } from "@/components/exams/question-selection";
import { fetchAllPages } from "@/lib/pagination";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
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
  const selectionT = useTranslations("lecturer.editExam");
  const [selection, setSelection] = useState(createQuestionSelection);
  const [createdExamId, setCreatedExamId] = useState<string | null>(null);
  const submittingRef = useRef(false);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isLoadingTopics, setIsLoadingTopics] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [examForm, setExamForm] = useState({
    title: "",
    topic_id: "",
    exam_start_time: "",
    exam_end_time: "",
    duration: "",
    practice: false,
    is_public: false,
  });

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
    if (!examForm.title.trim() || !examForm.topic_id ||
      !/^[0-9]+$/.test(examForm.duration) || !Number.isSafeInteger(duration) || duration < 1 ||
      !Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) {
      toast.warning(t("pleaseFillInAllInformation"));
      return;
    }
    if (end <= start) {
      toast.warning(t("invalidExamTime"));
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
      router.push("/lecturer/exams");
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
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="exam-title">
                    {t("testName")}<span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="exam-title"
                    placeholder={t("enterTheTestName")}
                    value={examForm.title}
                    onChange={(e) =>
                      setExamForm({ ...examForm, title: e.target.value })
                    }
                    className="bg-white border-gray-300"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="exam-topic">
                    {t("topic")}<span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={examForm.topic_id}
                    onValueChange={(value) => {
                      setExamForm({ ...examForm, topic_id: value });
                      setSelection(createQuestionSelection());
                    }}
                    disabled={isLoadingTopics}
                  >
                    <SelectTrigger
                      id="exam-topic"
                      className="bg-white border-gray-300"
                    >
                      <SelectValue
                        placeholder={
                          isLoadingTopics ? t("loadingTheme") : t("chooseATopic")
                        }
                      />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-300">
                      {topics.map((topic) => (
                        <SelectItem key={topic.id} value={topic.id}>
                          {topic.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="start-time">
                    {t("startTime")}<span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="start-time"
                    type="datetime-local"
                    value={examForm.exam_start_time}
                    onChange={(e) =>
                      setExamForm({
                        ...examForm,
                        exam_start_time: e.target.value,
                      })
                    }
                    className="bg-white border-gray-300"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-time">
                    {t("endTime")}<span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="end-time"
                    type="datetime-local"
                    value={examForm.exam_end_time}
                    onChange={(e) =>
                      setExamForm({
                        ...examForm,
                        exam_end_time: e.target.value,
                      })
                    }
                    className="bg-white border-gray-300"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="duration">
                    {t("durationMinutes")}<span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="duration"
                    type="number"
                    placeholder="90"
                    value={examForm.duration}
                    onChange={(e) =>
                      setExamForm({ ...examForm, duration: e.target.value })
                    }
                    className="bg-white border-gray-300"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="practice">{t("examType")}</Label>
                  <Select
                    value={examForm.practice ? "practice" : "test"}
                    onValueChange={(value) =>
                      setExamForm({
                        ...examForm,
                        practice: value === "practice",
                      })
                    }
                  >
                    <SelectTrigger className="bg-white border-gray-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-300">
                      <SelectItem value="test">{t("officialTest")}</SelectItem>
                      <SelectItem value="practice">{t("practiceExam")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2 py-4">
                  <Checkbox
                    id="is_public"
                    checked={examForm.is_public}
                    onCheckedChange={(checked) =>
                      setExamForm({
                        ...examForm,
                        is_public: checked as boolean,
                      })
                    }
                    className="bg-white border-gray-300"
                  />
                  <Label
                    htmlFor="is_public"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {t("makeTheExamPublicStudentsCan")}
                  </Label>
                </div>
              </div>

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
                variant="outline"
                onClick={() => router.push(createdExamId ? "/lecturer/exams/edit/" + createdExamId : "/lecturer/exams")}
                disabled={isSubmitting}
                className="flex-1 border-gray-300 hover:bg-gray-100 hover:border-none hover:cursor-pointer"
              >
                {createdExamId ? t("continueEditing") : t("cancel")}
              </Button>
              <Button
                onClick={handleAddExam}
                disabled={isSubmitting}
                className="flex-1 bg-[#0066cc] hover:bg-[#0052a3] text-white hover:cursor-pointer"
              >
                {isSubmitting ? t("creating") : createdExamId ? t("retrySavingQuestions") : t("createTest")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
