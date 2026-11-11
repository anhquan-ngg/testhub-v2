"use client";

import axios from "axios";
import { ChapterPicker } from "@/components/ChapterPicker";
import { questionBearingChapterIds } from "@/lib/chapter-tree";

import { useTranslations } from "next-intl";
import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
// ... (skip lines)
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ListChecks, Plus, Trash2 } from "lucide-react";
import { useEnumLabels } from "@/i18n/useEnumLabels";
import { fetchAllPages } from "@/lib/pagination";
import apiClient from "@/lib/api-client";
import { ENDPOINTS } from "@/constants/endpoints";
import { ICON_TONE, iconLabelProps, useIconLabels } from "@/lib/icon-button";

type EditExamPageProps = {
  params: Promise<{ id: string }>;
};

type ExamMode = "MANUAL" | "RANDOM_N" | "BY_TYPE" | "BY_CHAPTER";

interface QuestionConfig {
  id: number;
  chapter_id?: string;
  question_type: QuestionType;
  question_format: QuestionFormat;
  quantity: number;
}

type ExamTypeDistributionConfig = {
  question_type: QuestionType;
  question_format: QuestionFormat;
  quantity: number;
};

type ExamChapterDistributionConfig = {
  chapter_id: string;
  quantity: number;
};

type ExamDistributionConfig =
  ExamTypeDistributionConfig | ExamChapterDistributionConfig;

type QuestionItem = {
  id: string;
  chapter_id?: string;
  question_text: string;
  question_type: QuestionType;
  question_format: QuestionFormat;
  topic?: string | null;
  chapter?: {
    name?: string | null;
    topic?: {
      name?: string | null;
    } | null;
  } | null;
};

type TopicItem = { id: string; name: string };

type ChapterItem = {
  id: string;
  name: string;
  topic_id: string;
  parent_id?: string | null;
};

type ExamQuestionItem = {
  question_id: string;
  question?: QuestionItem;
};

type ExamDetail = {
  id: string;
  title: string;
  topic?: string | { name?: string | null } | null;
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

type DeltaFeasibility = {
  baseline_feasible: boolean;
  delta_requested: number;
  max_feasible_d: number;
  total_questions: number;
  warnings: { code: string; message: string }[];
};

const DELTA_OPTIONS = [0, 1, 2] as const;
const DELTA_CHECK_DEBOUNCE_MS = 600;
const KNOWN_DELTA_WARNINGS = [
  "BASELINE_INSUFFICIENT",
  "NO_FEASIBLE_VARIATION",
  "DELTA_ABOVE_MAX_FEASIBLE",
  "DELTA_HIGH_FOR_TOTAL",
] as const;
type KnownDeltaWarning = (typeof KNOWN_DELTA_WARNINGS)[number];

const isKnownDeltaWarning = (code: string): code is KnownDeltaWarning =>
  (KNOWN_DELTA_WARNINGS as readonly string[]).includes(code);

const getQuestionTopicName = (question: QuestionItem) =>
  question.topic ??
  question.chapter?.topic?.name ??
  question.chapter?.name ??
  "";

const getExamTopicName = (topic: ExamDetail["topic"]) => {
  if (!topic) return "";
  if (typeof topic === "string") return topic;
  return topic.name ?? "";
};

const ALL_CHAPTERS_VALUE = "ALL";

const getConfigChapterId = (item: QuestionConfig) => {
  if (item.chapter_id && item.chapter_id !== ALL_CHAPTERS_VALUE) {
    return item.chapter_id;
  }

  return undefined;
};

const mergeTypeQuestionConfigs = (
  items: QuestionConfig[],
): QuestionConfig[] => {
  const groupedMap = items.reduce(
    (acc, current) => {
      const uniqueKey = `${current.question_type}|${current.question_format}`;
      if (acc[uniqueKey]) {
        // Nếu key đã tồn tại: Cộng dồn quantity
        acc[uniqueKey].quantity += current.quantity;
      } else {
        // Nếu key chưa tồn tại: Tạo mới entry (spread ...current để copy object)
        acc[uniqueKey] = { ...current };
      }

      return acc;
    },
    {} as Record<string, QuestionConfig>,
  );

  // Bước B: Lấy danh sách values từ Object đó trả về thành Array
  return Object.values(groupedMap);
};

const mergeChapterQuestionConfigs = (
  items: QuestionConfig[],
): QuestionConfig[] => {
  const groupedMap = items.reduce(
    (acc, current) => {
      const chapterId = getConfigChapterId(current);
      const uniqueKey = chapterId ?? ALL_CHAPTERS_VALUE;
      if (acc[uniqueKey]) {
        acc[uniqueKey].quantity += current.quantity;
      } else {
        acc[uniqueKey] = {
          ...current,
          chapter_id: chapterId ?? ALL_CHAPTERS_VALUE,
        };
      }

      return acc;
    },
    {} as Record<string, QuestionConfig>,
  );

  return Object.values(groupedMap);
};

// Hàm format Date thành YYYY-MM-DDThh:mm theo giờ local
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

const buildDistribution = (
  mode: ExamMode,
  rows: QuestionConfig[],
): ExamDistributionConfig[] => {
  rows = rows.filter(
    (row) => Number.isSafeInteger(row.quantity) && row.quantity > 0,
  );
  return mode === "BY_CHAPTER"
    ? mergeChapterQuestionConfigs(rows).flatMap((item) => {
        const chapterId = getConfigChapterId(item);

        if (!chapterId) {
          return [];
        }

        return [
          {
            chapter_id: chapterId,
            quantity: item.quantity,
          },
        ];
      })
    : mergeTypeQuestionConfigs(rows).map((item) => ({
        question_type: item.question_type,
        question_format: item.question_format,
        quantity: item.quantity,
      }));
};

export default function EditExamPage({ params }: EditExamPageProps) {
  const t = useTranslations("lecturer.editExam");
  const iconLabels = useIconLabels();
  const enumLabel = useEnumLabels();
  const examId = use(params).id;
  const router = useRouter();
  const [topics, setTopics] = useState<TopicItem[]>([]);
  const [exam, setExam] = useState<ExamDetail | null>(null);
  const [isLoadingQuestionBank, setIsLoadingQuestionBank] = useState(true);
  const [questionBank, setQuestionBank] = useState<QuestionItem[]>([]);
  const [chapters, setChapters] = useState<ChapterItem[]>([]);
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

  const [nextRowId, setNextRowId] = useState(2);
  const chapterOptions = useMemo(() => {
    const bearing = questionBearingChapterIds(chapters, questionBank);
    const selected = new Set(configRows.map((row) => row.chapter_id));
    return chapters.filter(
      (chapter) => bearing.has(chapter.id) || selected.has(chapter.id),
    );
  }, [chapters, questionBank, configRows]);
  const resolveChapterSelection = useCallback(
    (chapterId?: string) => ({ chapter_id: chapterId ?? ALL_CHAPTERS_VALUE }),
    [],
  );

  const handleAddConfigRow = () => {
    setConfigRows([
      ...configRows,
      {
        id: nextRowId,
        chapter_id: ALL_CHAPTERS_VALUE,
        question_type: "SINGLE_CHOICE",
        question_format: "KNOWLEDGE",
        quantity: 0,
      },
    ]);
    setNextRowId(nextRowId + 1);
  };

  const handleUpdateConfigRow = (
    id: number,
    field: keyof Omit<QuestionConfig, "id">,
    value: QuestionConfig[keyof Omit<QuestionConfig, "id">],
  ) => {
    setConfigRows(
      configRows.map((row) =>
        row.id === id
          ? {
              ...row,
              [field]: value,
            }
          : row,
      ),
    );
  };

  const handleRemoveConfigRow = (id: number) => {
    setConfigRows(configRows.filter((row) => row.id !== id));
  };
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
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [distributionDelta, setDistributionDelta] = useState(0);
  const [distributionDeltaOnline, setDistributionDeltaOnline] = useState(false);
  const [deltaFeasibility, setDeltaFeasibility] =
    useState<DeltaFeasibility | null>(null);

  const supportsDelta =
    questionSelectionMode === "BY_TYPE" ||
    questionSelectionMode === "BY_CHAPTER";
  const deltaTotal = useMemo(
    () =>
      supportsDelta
        ? buildDistribution(questionSelectionMode, configRows).reduce(
            (sum, item) => sum + item.quantity,
            0,
          )
        : 0,
    [supportsDelta, questionSelectionMode, configRows],
  );
  const deltaDistributionJson = useMemo(
    () =>
      supportsDelta
        ? JSON.stringify(buildDistribution(questionSelectionMode, configRows))
        : "",
    [supportsDelta, questionSelectionMode, configRows],
  );

  // Non-blocking feasibility hint; saving is never gated on the result.
  useEffect(() => {
    if (
      !supportsDelta ||
      distributionDelta <= 0 ||
      !examForm.topic_id ||
      deltaTotal <= 0
    ) {
      setDeltaFeasibility(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      apiClient
        .post<DeltaFeasibility>(ENDPOINTS.EXAMS.DISTRIBUTION_DELTA_CHECK, {
          topic_id: examForm.topic_id,
          mode: questionSelectionMode,
          distribution: deltaDistributionJson,
          distribution_delta: distributionDelta,
        })
        .then((response) => {
          if (!cancelled) setDeltaFeasibility(response.data);
        })
        .catch(() => {
          if (!cancelled) setDeltaFeasibility(null);
        });
    }, DELTA_CHECK_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    supportsDelta,
    distributionDelta,
    examForm.topic_id,
    questionSelectionMode,
    deltaDistributionJson,
    deltaTotal,
  ]);

  const handleToggleQuestion = (questionId: string) => {
    if (isLoadingQuestionBank) return;
    setSelectedQuestions((prev) =>
      prev.includes(questionId)
        ? prev.filter((id) => id !== questionId)
        : [...prev, questionId],
    );
  };

  const handleSelectByConfig = () => {
    const distribution = buildDistribution(questionSelectionMode, configRows);

    if (questionSelectionMode === "BY_TYPE" && distribution.length === 0) {
      toast.warning(t("pleaseAddValidDistribution"));
      return;
    }
    if (questionSelectionMode === "BY_CHAPTER" && distribution.length === 0) {
      toast.warning(t("pleaseSelectAtLeastOneChapter"));
      return;
    }

    setIsDialogOpen(false);
  };
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

  const topicIdRef = useRef(examForm.topic_id);
  useEffect(() => {
    topicIdRef.current = examForm.topic_id;
  }, [examForm.topic_id]);
  const bankRequestId = useRef(0);
  const chapterRequestId = useRef(0);
  const fetchQuestions = useCallback(async () => {
    const requestId = ++bankRequestId.current;
    const topicId = examForm.topic_id;
    setQuestionBank([]);
    setIsLoadingQuestionBank(true);
    if (!topicId) {
      setIsLoadingQuestionBank(false);
      return;
    }
    try {
      // Questions only support chapter_id filtering; topic_id is stripped by the backend DTO.
      const topicChapters = await fetchAllPages<ChapterItem>(
        ENDPOINTS.CHAPTERS.BASE,
        { topic_id: examForm.topic_id },
      );
      const lists = await Promise.all(
        topicChapters.map((chapter) =>
          fetchAllPages<QuestionItem>(ENDPOINTS.QUESTIONS.BASE, {
            chapter_id: chapter.id,
          }),
        ),
      );
      if (topicIdRef.current !== topicId || requestId !== bankRequestId.current)
        return;
      setQuestionBank(lists.flat());
    } catch (error) {
      if (topicIdRef.current !== topicId || requestId !== bankRequestId.current)
        return;
      toast.error(t("unableToLoadQuestionBank"));
      console.log(error);
    } finally {
      if (topicIdRef.current === topicId && requestId === bankRequestId.current)
        setIsLoadingQuestionBank(false);
    }
  }, [examForm.topic_id, t]);

  const fetchChapters = useCallback(
    async (topicId?: string) => {
      const requestId = ++chapterRequestId.current;
      if (!topicId) {
        setChapters([]);
        return;
      }

      try {
        const chapters = await fetchAllPages<ChapterItem>(
          ENDPOINTS.CHAPTERS.BASE,
          { topic_id: topicId },
        );
        if (
          topicIdRef.current !== topicId ||
          requestId !== chapterRequestId.current
        )
          return;
        setChapters(chapters);
      } catch (error) {
        toast.error(t("unableToLoadChapterList"));
        console.log(error);
      }
    },
    [t],
  );
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

    const distribution = buildDistribution(questionSelectionMode, configRows);
    if (questionSelectionMode === "BY_TYPE" && distribution.length === 0) {
      toast.warning(t("pleaseAddValidDistribution"));
      return;
    }
    if (questionSelectionMode === "BY_CHAPTER" && distribution.length === 0) {
      toast.warning(t("pleaseSelectAtLeastOneChapter"));
      return;
    }
    const payload = {
      title: examForm.title,
      topic_id: examForm.topic_id,
      exam_start_time: new Date(examForm.exam_start_time).toISOString(),
      exam_end_time: new Date(examForm.exam_end_time).toISOString(),
      duration: parsedDuration,
      practice: examForm.practice,
      is_public: examForm.is_public,
      mode: questionSelectionMode,
      sample_size:
        questionSelectionMode === "RANDOM_N"
          ? Number.parseInt(randomCount)
          : null,
      distribution:
        questionSelectionMode === "BY_TYPE" ||
        questionSelectionMode === "BY_CHAPTER"
          ? JSON.stringify(distribution)
          : null,
      distribution_delta: supportsDelta ? distributionDelta : 0,
      distribution_delta_online:
        supportsDelta && distributionDelta > 0 && distributionDeltaOnline,
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
    void fetchQuestions();
  }, [fetchQuestions]);

  useEffect(() => {
    void fetchChapters(examForm.topic_id);
  }, [examForm.topic_id, fetchChapters]);

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
      setNextRowId(configRowsWithIds.length + 1);
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
    setNextRowId(configRowsWithIds.length + 1);
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
                    topicIdRef.current = topicId;
                    setQuestionBank([]);
                    setChapters([]);
                    setIsLoadingQuestionBank(true);
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

            <div className="space-y-2">
              <Label>{t("chooseQuestionsFromTheBank")}</Label>
              <div className="flex flex-wrap gap-2">
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      disabled={isLoadingQuestionBank}
                      className="bg-[#0066cc] hover:bg-[#0052a3] text-white"
                    >
                      {t("selectQuestion")}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] flex-col gap-0 overflow-hidden border-gray-300 bg-white p-0 sm:max-w-3xl">
                    <DialogHeader className="shrink-0 border-b border-gray-200 p-5 pr-12 text-left sm:p-6 sm:pr-12">
                      <div className="flex items-start gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#0066cc]">
                          <ListChecks className="size-5" aria-hidden="true" />
                        </div>
                        <div className="min-w-0 space-y-1">
                          <DialogTitle className="text-lg font-semibold text-neutral-900">
                            {t("selectQuestion")}
                          </DialogTitle>
                          <DialogDescription className="break-words text-sm text-neutral-500">
                            {t("chooseQuestionsForExam", {
                              title: examForm.title,
                            })}
                          </DialogDescription>
                        </div>
                      </div>
                    </DialogHeader>
                    <div className="min-h-0 space-y-5 overflow-y-auto p-5 sm:p-6">
                      <div className="space-y-2">
                        <Label htmlFor="question-selection-mode">
                          {t("selectionMethod")}
                        </Label>
                        <Select
                          value={questionSelectionMode}
                          onValueChange={(value) =>
                            setQuestionSelectionMode(value as ExamMode)
                          }
                        >
                          <SelectTrigger
                            id="question-selection-mode"
                            className="w-full min-w-0 border-gray-300 bg-white"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-gray-300">
                            <SelectItem value="MANUAL">
                              {t("manualSelection")}
                            </SelectItem>
                            <SelectItem value="RANDOM_N">
                              {t("randomlySelectNSentences")}
                            </SelectItem>
                            <SelectItem value="BY_TYPE">
                              {t("configurableByTypeAndFormat")}
                            </SelectItem>
                            <SelectItem value="BY_CHAPTER">
                              {t("configureByChapter")}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {questionSelectionMode === "MANUAL" && (
                        <div className="space-y-2">
                          <div className="border border-gray-300 rounded-lg p-4 space-y-3 max-h-64 overflow-y-auto">
                            {!isLoadingQuestionBank &&
                            questionBank?.length > 0 ? (
                              questionBank.map((question) => (
                                <div
                                  key={question.id}
                                  className="flex items-start space-x-3 p-2 hover:bg-gray-50 rounded"
                                >
                                  <Checkbox
                                    id={`question-${question.id}`}
                                    checked={selectedQuestions.includes(
                                      question.id,
                                    )}
                                    onCheckedChange={() =>
                                      handleToggleQuestion(question.id)
                                    }
                                    className="mt-1 bg-white border-gray-300"
                                  />
                                  <label
                                    htmlFor={`question-${question.id}`}
                                    className="flex-1 cursor-pointer"
                                  >
                                    <div className="font-medium text-sm">
                                      {question.question_text}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">
                                      {t("questionMetadata", {
                                        topic: getQuestionTopicName(question),
                                        type: enumLabel.questionType(
                                          question.question_type,
                                        ),
                                        format: enumLabel.questionFormat(
                                          question.question_format,
                                        ),
                                      })}
                                    </div>
                                  </label>
                                </div>
                              ))
                            ) : (
                              <div className="text-center text-gray-500 py-4">
                                {t("noQuestionsAsked")}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {questionSelectionMode === "RANDOM_N" && (
                        <div className="space-y-3">
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor="random-count">
                                {t("numberOfQuestions")}
                              </Label>
                              <Input
                                id="random-count"
                                type="number"
                                min="1"
                                value={randomCount}
                                onChange={(e) => setRandomCount(e.target.value)}
                                placeholder="10"
                                className="bg-white border-gray-300"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {(questionSelectionMode === "BY_TYPE" ||
                        questionSelectionMode === "BY_CHAPTER") && (
                        <div className="min-w-0 space-y-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <h3 className="text-sm font-semibold text-neutral-900">
                              {t("questionConfiguration")}
                            </h3>
                            <Button
                              onClick={handleAddConfigRow}
                              variant="outline"
                              className="border-gray-300 bg-white hover:bg-gray-50"
                            >
                              <Plus className="size-4" aria-hidden="true" />
                              {t("addGoodsConfiguration")}
                            </Button>
                          </div>
                          {questionSelectionMode === "BY_CHAPTER" && (
                            <p className="text-sm leading-relaxed text-neutral-500">
                              {t("includesAllDescendants")}
                            </p>
                          )}
                          <div className="space-y-3">
                            {configRows.map((row) => (
                              <div
                                key={row.id}
                                className={`grid min-w-0 grid-cols-[minmax(0,1fr)_2.25rem] items-start gap-4 rounded-lg border border-gray-200 bg-gray-50/60 p-4 ${questionSelectionMode === "BY_CHAPTER" ? "sm:grid-cols-[minmax(0,1fr)_6rem_2.25rem]" : "sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_6rem_2.25rem]"}`}
                              >
                                {questionSelectionMode === "BY_CHAPTER" && (
                                  <div className="col-span-2 min-w-0 space-y-2 sm:col-span-1 [&_select]:h-9 [&_select]:rounded-md [&_select]:border-gray-300 [&_select]:shadow-xs">
                                    <Label
                                      htmlFor={`question-chapter-${row.id}`}
                                    >
                                      {t("chapter")}
                                    </Label>
                                    <ChapterPicker
                                      id={`question-chapter-${row.id}`}
                                      chapters={chapterOptions}
                                      value={row.chapter_id}
                                      onChange={(value) =>
                                        handleUpdateConfigRow(
                                          row.id,
                                          "chapter_id",
                                          value,
                                        )
                                      }
                                    />
                                  </div>
                                )}
                                {questionSelectionMode === "BY_TYPE" && (
                                  <>
                                    <div className="col-span-2 min-w-0 space-y-2 sm:col-span-1">
                                      <Label
                                        htmlFor={`question-type-${row.id}`}
                                      >
                                        {t("questionType")}
                                      </Label>
                                      <Select
                                        value={row.question_type}
                                        onValueChange={(value) =>
                                          handleUpdateConfigRow(
                                            row.id,
                                            "question_type",
                                            value,
                                          )
                                        }
                                      >
                                        <SelectTrigger
                                          id={`question-type-${row.id}`}
                                          className="w-full min-w-0 bg-white border-gray-300"
                                        >
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-white border-gray-300">
                                          <SelectItem value="SINGLE_CHOICE">
                                            {t("multipleChoice1Answer")}
                                          </SelectItem>
                                          <SelectItem value="MULTIPLE_CHOICE">
                                            {t(
                                              "multipleChoiceTestWithMultipleAnswers",
                                            )}
                                          </SelectItem>
                                          <SelectItem value="ESSAY">
                                            {t("essay")}
                                          </SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="col-span-2 min-w-0 space-y-2 sm:col-span-1">
                                      <Label
                                        htmlFor={`question-format-${row.id}`}
                                      >
                                        {t("format2")}
                                      </Label>
                                      <Select
                                        value={row.question_format}
                                        onValueChange={(value) =>
                                          handleUpdateConfigRow(
                                            row.id,
                                            "question_format",
                                            value,
                                          )
                                        }
                                      >
                                        <SelectTrigger
                                          id={`question-format-${row.id}`}
                                          className="w-full min-w-0 bg-white border-gray-300"
                                        >
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-white border-gray-300">
                                          <SelectItem value="KNOWLEDGE">
                                            {t("recognize")}
                                          </SelectItem>
                                          <SelectItem value="UNDERSTANDING">
                                            {t("understanding")}
                                          </SelectItem>
                                          <SelectItem value="APPLYING">
                                            {t("manipulate")}
                                          </SelectItem>
                                          <SelectItem value="ADVANCED">
                                            {t("advanced")}
                                          </SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </>
                                )}
                                <div className="min-w-0 space-y-2">
                                  <Label
                                    htmlFor={`question-quantity-${row.id}`}
                                  >
                                    {t("quantity")}
                                  </Label>
                                  <Input
                                    id={`question-quantity-${row.id}`}
                                    type="number"
                                    min="0"
                                    value={row.quantity}
                                    onChange={(e) =>
                                      handleUpdateConfigRow(
                                        row.id,
                                        "quantity",
                                        Number.parseInt(e.target.value) || 0,
                                      )
                                    }
                                    className="w-full bg-white border-gray-300"
                                  />
                                </div>
                                <div className="pt-[22px]">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className={`h-9 w-9 p-0 ${ICON_TONE.danger}`}
                                    onClick={() =>
                                      handleRemoveConfigRow(row.id)
                                    }
                                    {...iconLabelProps(iconLabels.delete)}
                                  >
                                    <Trash2
                                      className="h-4 w-4"
                                      aria-hidden="true"
                                    />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
                            <div className="space-y-2">
                              <Label htmlFor="distribution-delta">
                                {t("distributionDelta")}
                              </Label>
                              <Select
                                value={String(distributionDelta)}
                                onValueChange={(value) => {
                                  const next = Number.parseInt(value, 10);
                                  setDistributionDelta(next);
                                  if (next === 0)
                                    setDistributionDeltaOnline(false);
                                }}
                              >
                                <SelectTrigger
                                  id="distribution-delta"
                                  className="w-full min-w-0 bg-white border-gray-300 sm:w-64"
                                >
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-white border-gray-300">
                                  {DELTA_OPTIONS.map((option) => (
                                    <SelectItem
                                      key={option}
                                      value={String(option)}
                                    >
                                      {option === 0
                                        ? t("deltaOff")
                                        : t("deltaUpTo", { count: option })}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <p className="text-sm leading-relaxed text-neutral-500">
                                {t("distributionDeltaHint")}
                              </p>
                            </div>
                            {distributionDelta > 0 && deltaTotal > 0 && (
                              <p className="text-sm text-neutral-600">
                                {t("deltaImpact", {
                                  total: deltaTotal,
                                  percent: (
                                    (100 * distributionDelta) /
                                    deltaTotal
                                  ).toFixed(1),
                                })}
                              </p>
                            )}
                            <div className="flex items-start gap-2">
                              <Checkbox
                                id="distribution-delta-online"
                                checked={distributionDeltaOnline}
                                disabled={distributionDelta === 0}
                                onCheckedChange={(checked) =>
                                  setDistributionDeltaOnline(checked === true)
                                }
                              />
                              <div className="space-y-1">
                                <Label htmlFor="distribution-delta-online">
                                  {t("deltaApplyOnline")}
                                </Label>
                                <p className="text-sm leading-relaxed text-neutral-500">
                                  {t("deltaApplyOnlineHint")}
                                </p>
                              </div>
                            </div>
                            {deltaFeasibility &&
                              deltaFeasibility.warnings.length > 0 && (
                                <div
                                  role="status"
                                  className="space-y-1 rounded-md border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800"
                                >
                                  <p className="font-medium">
                                    {t("deltaWarningTitle")}
                                  </p>
                                  <ul className="list-disc pl-5">
                                    {deltaFeasibility.warnings.map(
                                      (warning) => (
                                        <li key={warning.code}>
                                          {isKnownDeltaWarning(warning.code)
                                            ? t(
                                                `deltaWarnings.${warning.code}`,
                                                {
                                                  max: deltaFeasibility.max_feasible_d,
                                                  total:
                                                    deltaFeasibility.total_questions,
                                                },
                                              )
                                            : warning.message}
                                        </li>
                                      ),
                                    )}
                                  </ul>
                                </div>
                              )}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col gap-3 border-t border-gray-200 bg-gray-50/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                      <p
                        className="text-sm font-medium text-neutral-600"
                        aria-live="polite"
                      >
                        {t("selectedQuestionCount", {
                          count: selectedQuestions.length,
                        })}
                      </p>
                      {(questionSelectionMode === "BY_TYPE" ||
                        questionSelectionMode === "BY_CHAPTER") && (
                        <Button
                          onClick={handleSelectByConfig}
                          className="h-auto min-h-9 whitespace-normal bg-[#0066cc] py-2 leading-snug text-white hover:bg-[#0052a3]"
                        >
                          {t("takeRandomAccordingToConfiguration")}
                        </Button>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

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
