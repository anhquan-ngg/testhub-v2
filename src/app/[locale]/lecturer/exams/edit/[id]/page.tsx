"use client";

import axios from "axios";

import { useTranslations } from "next-intl";
import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { QuestionFormat, QuestionType } from "@/types/backend-enums";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { fetchAllPages } from "@/lib/pagination";
import apiClient from "@/lib/api-client";
import { ENDPOINTS } from "@/constants/endpoints";
import { ExamQuestionSelector } from "@/components/exams/ExamQuestionSelector";
import { ALL_CHAPTERS_VALUE, questionSelectionPayload, selectionValidationKey, type ExamMode, type QuestionConfig, type ExamTypeDistributionConfig, type ExamChapterDistributionConfig } from "@/components/exams/question-selection";

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

const getExamTopicName = (topic: ExamDetail["topic"]) => {
  if (!topic) return "";
  if (typeof topic === "string") return topic;
  return topic.name ?? "";
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
  const [existingQuestionIds, setExistingQuestionIds] = useState<string[]>([]);
  const [questionSelectionMode, setQuestionSelectionMode] =
    useState<ExamMode>("MANUAL");
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [randomCount, setRandomCount] = useState("10");
  const [configRows, setConfigRows] = useState<QuestionConfig[]>([
    {
      id: 1,
      chapter_id: ALL_CHAPTERS_VALUE,
      question_type: "SINGLE_CHOICE",
      question_format: "KNOWLEDGE",
      quantity: 0,
    },
  ]);

  const [examForm, setExamForm] = useState({
    title: "",
    topic: "",
    topic_id: "",
    exam_start_time: "",
    exam_end_time: "",
    duration: "",
    practice: false,
    is_public: false,
  });
  const [distributionDelta, setDistributionDelta] = useState(0);
  const [distributionDeltaOnline, setDistributionDeltaOnline] = useState(false);
  const selection = { mode: questionSelectionMode, selectedQuestions, randomCount, configRows, distributionDelta, distributionDeltaOnline };
  const resolveChapterSelection = useCallback((chapterId?: string) => ({ chapter_id: chapterId ?? ALL_CHAPTERS_VALUE }), []);

  const fetchExam = useCallback(async () => {
    try {
      const response = await apiClient.get<ExamDetail>(
        ENDPOINTS.EXAMS.DETAIL(examId),
      );
      setExam(response.data);
    } catch (error) {
      toast.error(t("unableToDownloadTestInformation"));
      console.log(error);
    }
  }, [examId, t]);

  const syncExamQuestions = async (id: string) => {
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
    const parsedDuration = Number.parseInt(examForm.duration, 10);

    if (
      !examForm.title ||
      !examForm.topic_id ||
      !examForm.exam_start_time ||
      !examForm.exam_end_time ||
      !/^[0-9]+$/.test(examForm.duration) ||
      !Number.isFinite(parsedDuration)
    ) {
      toast.warning(t("pleaseFillInAllInformation"));
      return;
    }

    const selectionError = selectionValidationKey(selection);
    if (selectionError) { toast.warning(t(selectionError)); return; }
    const payload = {
      title: examForm.title,
      topic_id: examForm.topic_id,
      exam_start_time: new Date(examForm.exam_start_time).toISOString(),
      exam_end_time: new Date(examForm.exam_end_time).toISOString(),
      duration: parsedDuration,
      practice: examForm.practice,
      is_public: examForm.is_public,
      ...questionSelectionPayload(selection),
    };

    try {
      await apiClient.patch(ENDPOINTS.EXAMS.DETAIL(id), payload);
      await syncExamQuestions(id);
      toast.success(t("successfullyUpdatedExam"));
      router.push("/lecturer/exams");
    } catch (error) {
      toast.error(
        t(
          axios.isAxiosError(error) &&
            error.response?.data?.code === "CHAPTER_DISTRIBUTION_INSUFFICIENT"
            ? "insufficientDistinctQuestions"
            : "updateFailedTestPleaseTryAgain",
        ),
      );
      console.log(error);
    }
  };
  useEffect(() => {
    void fetchAllPages<TopicItem>(ENDPOINTS.TOPICS.BASE, {})
      .then(setTopics)
      .catch(() => toast.error(t("unableToLoadQuestionBank")));
  }, [t]);

  useEffect(() => {
    void fetchExam();
  }, [fetchExam]);

  useEffect(() => {
    if (!exam) return;

    const questionIds =
      exam.questions?.map((item) => item.question_id).filter(Boolean) ?? [];

    setExamForm({
      title: exam.title,
      topic: getExamTopicName(exam.topic),
      topic_id: exam.topic_id ?? "",
      exam_start_time: formatToLocalISO(exam.exam_start_time),
      exam_end_time: formatToLocalISO(exam.exam_end_time),
      duration: exam.duration.toString(),
      practice: exam.practice,
      is_public: exam.is_public,
    });
    setQuestionSelectionMode(exam.mode);
    setDistributionDelta(exam.distribution_delta ?? 0);
    setDistributionDeltaOnline(exam.distribution_delta_online ?? false);
    setSelectedQuestions(questionIds);
    setExistingQuestionIds(questionIds);

    if (exam.mode === "RANDOM_N" && exam.sample_size) {
      setRandomCount(exam.sample_size.toString());
    } else if (exam.mode === "BY_TYPE" && exam.distribution) {
      const parsedDistribution = JSON.parse(
        exam.distribution,
      ) as ExamTypeDistributionConfig[];
      const configRowsWithIds = parsedDistribution.map((item, index) => {
        return {
          id: index + 1,
          chapter_id: ALL_CHAPTERS_VALUE,
          question_type: item.question_type,
          question_format: item.question_format,
          quantity: item.quantity,
        };
      });
      setConfigRows(configRowsWithIds);
    }
  }, [exam]);

  // Reload stored chapter IDs independently from question-bank refreshes.
  // A chapter may be at any depth; no root/direct-child remapping is needed.
  useEffect(() => {
    if (
      !exam ||
      examForm.topic_id !== exam.topic_id ||
      exam.mode !== "BY_CHAPTER" ||
      !exam.distribution
    )
      return;

    const parsedDistribution = JSON.parse(
      exam.distribution,
    ) as ExamChapterDistributionConfig[];
    const configRowsWithIds = parsedDistribution.map((item, index) => {
      const chapterSelection = resolveChapterSelection(item.chapter_id);

      return {
        id: index + 1,
        ...chapterSelection,
        question_type: "SINGLE_CHOICE" as QuestionType,
        question_format: "KNOWLEDGE" as QuestionFormat,
        quantity: item.quantity,
      };
    });
    setConfigRows(configRowsWithIds);
  }, [exam, examForm.topic_id, resolveChapterSelection]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-neutral-900">{t("editExam")}</h2>
        <p className="mt-1 text-sm text-neutral-500">
          {t("fillInTheDetailsToCreate")}
        </p>
      </div>

      <Card className="bg-white border-gray-300 shadow-sm">
        <CardHeader>
          <CardTitle>{t("examInformation")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="exam-title">
                  {t("testName")}
                  <span className="text-red-500">*</span>
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
                  {t("topic")}
                  <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={examForm.topic_id}
                  onValueChange={(topicId) => {
                    setExamForm((current) => ({
                      ...current,
                      topic_id: topicId,
                    }));
                    setSelectedQuestions([]);
                    setConfigRows([]);
                  }}
                >
                  <SelectTrigger
                    id="exam-topic"
                    className="bg-white border-gray-300"
                  >
                    <SelectValue />
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-time">
                  {t("startTime")}
                  <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="start-time"
                  type="datetime-local"
                  value={formatToLocalISO(examForm.exam_start_time)}
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
                  {t("endTime")}
                  <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="end-time"
                  type="datetime-local"
                  value={formatToLocalISO(examForm.exam_end_time)}
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="duration">
                  {t("durationMinutes")}
                  <span className="text-red-500">*</span>
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
                    <SelectItem value="practice">
                      {t("practiceExam")}
                    </SelectItem>
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
              onChange={(next) => {
                setQuestionSelectionMode(next.mode);
                setSelectedQuestions(next.selectedQuestions);
                setRandomCount(next.randomCount);
                setConfigRows(next.configRows);
                setDistributionDelta(next.distributionDelta);
                setDistributionDeltaOnline(next.distributionDeltaOnline);
              }}
            />

            <div className="flex gap-3 pt-6">
              <Button
                variant="outline"
                onClick={() => router.push("/lecturer/exams")}
                className="flex-1 border-gray-300 hover:bg-gray-100 hover:border-none hover:cursor-pointer"
              >
                {t("cancel")}
              </Button>
              <Button
                onClick={() => handleEditExam(examId)}
                className="flex-1 bg-[#0066cc] hover:bg-[#0052a3] text-white hover:cursor-pointer"
              >
                {t("updateExam")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
