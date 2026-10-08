"use client";

import { useTranslations } from "next-intl";
import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, Upload } from "lucide-react";
import { useEnumLabels } from "@/i18n/useEnumLabels";
import apiClient from "@/lib/api-client";
import { ENDPOINTS } from "@/constants/endpoints";
import { QuestionImportDialog } from "@/components/question-import/QuestionImportDialog";

type EditExamPageProps = {
  params: Promise<{ id: string }>;
};

type ExamMode = "MANUAL" | "RANDOM_N" | "BY_TYPE" | "BY_CHAPTER";

interface QuestionConfig {
  id: number;
  chapter_id?: string;
  child_chapter_id?: string;
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

type PageResult<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
};

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
  questions?: ExamQuestionItem[];
};

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
  if (item.child_chapter_id && item.child_chapter_id !== ALL_CHAPTERS_VALUE) {
    return item.child_chapter_id;
  }

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
          child_chapter_id: ALL_CHAPTERS_VALUE,
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

export default function EditExamPage({ params }: EditExamPageProps) {
  const t = useTranslations("lecturer.editExam");
  const enumLabel = useEnumLabels();
  const examId = use(params).id;
  const router = useRouter();
  const [exam, setExam] = useState<ExamDetail | null>(null);
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
      child_chapter_id: ALL_CHAPTERS_VALUE,
      question_type: "SINGLE_CHOICE",
      question_format: "KNOWLEDGE",
      quantity: 0,
    },
  ]);
  const [distribution, setDistribution] = useState<ExamDistributionConfig[]>(
    [],
  );
  const [nextRowId, setNextRowId] = useState(2);
  const questionChapterIds = useMemo(
    () =>
      new Set(
        questionBank
          .map((question) => question.chapter_id)
          .filter((chapterId): chapterId is string => Boolean(chapterId)),
      ),
    [questionBank],
  );
  const parentChapterOptions = useMemo(() => {
    const parentIdsWithQuestionChildren = new Set<string>();

    chapters.forEach((chapter) => {
      if (chapter.parent_id && questionChapterIds.has(chapter.id)) {
        parentIdsWithQuestionChildren.add(chapter.parent_id);
      }
    });

    return chapters.filter(
      (chapter) =>
        !chapter.parent_id &&
        (questionChapterIds.has(chapter.id) ||
          parentIdsWithQuestionChildren.has(chapter.id)),
    );
  }, [chapters, questionChapterIds]);
  const childChaptersByParent = useMemo(
    () =>
      chapters.reduce((acc, chapter) => {
        if (!chapter.parent_id || !questionChapterIds.has(chapter.id)) {
          return acc;
        }

        const childChapters = acc.get(chapter.parent_id) ?? [];
        childChapters.push(chapter);
        acc.set(chapter.parent_id, childChapters);
        return acc;
      }, new Map<string, ChapterItem[]>()),
    [chapters, questionChapterIds],
  );

  const resolveChapterSelection = useCallback(
    (chapterId?: string) => {
      if (!chapterId) {
        return {
          chapter_id: ALL_CHAPTERS_VALUE,
          child_chapter_id: ALL_CHAPTERS_VALUE,
        };
      }

      const chapter = chapters.find((item) => item.id === chapterId);

      if (chapter?.parent_id) {
        return {
          chapter_id: chapter.parent_id,
          child_chapter_id: chapter.id,
        };
      }

      return {
        chapter_id: chapterId,
        child_chapter_id: ALL_CHAPTERS_VALUE,
      };
    },
    [chapters],
  );

  const handleAddConfigRow = () => {
    setConfigRows([
      ...configRows,
      {
        id: nextRowId,
        chapter_id: ALL_CHAPTERS_VALUE,
        child_chapter_id: ALL_CHAPTERS_VALUE,
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
              ...(field === "chapter_id" && {
                child_chapter_id: ALL_CHAPTERS_VALUE,
              }),
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
    exam_start_time: "",
    exam_end_time: "",
    duration: "",
    practice: false,
    is_public: false,
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

  const handleToggleQuestion = (questionId: string) => {
    setSelectedQuestions((prev) =>
      prev.includes(questionId)
        ? prev.filter((id) => id !== questionId)
        : [...prev, questionId],
    );
  };

  const handleSelectByConfig = () => {
    const distribution =
      questionSelectionMode === "BY_CHAPTER"
        ? mergeChapterQuestionConfigs(configRows).flatMap((item) => {
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
        : mergeTypeQuestionConfigs(configRows).map((item) => ({
            question_type: item.question_type,
            question_format: item.question_format,
            quantity: item.quantity,
          }));

    if (questionSelectionMode === "BY_CHAPTER" && distribution.length === 0) {
      toast.warning(t("pleaseSelectAtLeastOneChapter"));
      return;
    }

    setDistribution(distribution);
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

  const fetchQuestions = useCallback(async () => {
    try {
      const response = await apiClient.get<PageResult<QuestionItem>>(
        ENDPOINTS.QUESTIONS.BASE,
        {
          params: {
            page: 1,
            limit: 100,
          },
        },
      );
      setQuestionBank(response.data.data);
    } catch (error) {
      toast.error(t("unableToLoadQuestionBank"));
      console.log(error);
    }
  }, [t]);

  const fetchChapters = useCallback(async (topicId?: string) => {
    if (!topicId) {
      setChapters([]);
      return;
    }

    try {
      const response = await apiClient.get<PageResult<ChapterItem>>(
        ENDPOINTS.CHAPTERS.BASE,
        {
          params: {
            topic_id: topicId,
            limit: 100,
          },
        },
      );
      setChapters(response.data.data ?? []);
    } catch (error) {
      toast.error(t("unableToLoadChapterList"));
      console.log(error);
    }
  }, [t]);
  const existingQuestionIdsRef = useRef(existingQuestionIds);
  useEffect(() => {
    existingQuestionIdsRef.current = existingQuestionIds;
  }, [existingQuestionIds]);

  /**
   * After an import attached questions on the server, picks up only those
   * new ids. It deliberately bypasses setExam: that would re-run the effect
   * that re-initialises the whole form and drop unsaved edits. Ids are added
   * to both lists so they are selected and not re-POSTed on save (409).
   * Existing local selections and deselections are left untouched.
   */
  const mergeImportedQuestions = useCallback(async () => {
    try {
      const response = await apiClient.get<ExamDetail>(
        ENDPOINTS.EXAMS.DETAIL(examId),
      );
      const known = new Set(existingQuestionIdsRef.current);
      const attached = (response.data.questions ?? [])
        .map((item) => item.question_id)
        .filter((id) => Boolean(id) && !known.has(id));
      if (!attached.length) return;

      const addMissing = (prev: string[]) => [
        ...prev,
        ...attached.filter((id) => !prev.includes(id)),
      ];
      setExistingQuestionIds(addMissing);
      setSelectedQuestions(addMissing);
    } catch (error) {
      toast.error(t("unableToUpdateTheExamQuestion"));
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
      !examForm.topic ||
      !examForm.exam_start_time ||
      !examForm.exam_end_time ||
      !/^[0-9]+$/.test(examForm.duration) ||
      !Number.isFinite(parsedDuration)
    ) {
      toast.warning(t("pleaseFillInAllInformation"));
      return;
    }

    const payload = {
      title: examForm.title,
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
    };

    try {
      await apiClient.patch(ENDPOINTS.EXAMS.DETAIL(id), payload);
      await syncExamQuestions(id);
      toast.success(t("successfullyUpdatedExam"));
      router.push("/lecturer/exams");
    } catch (error) {
      toast.error(t("updateFailedTestPleaseTryAgain"));
      console.log(error);
    }
  };
  useEffect(() => {
    void fetchExam();
    void fetchQuestions();
  }, [fetchExam, fetchQuestions]);

  useEffect(() => {
    void fetchChapters(exam?.topic_id);
  }, [exam?.topic_id, fetchChapters]);

  useEffect(() => {
    if (!exam) return;

    const questionIds =
      exam.questions?.map((item) => item.question_id).filter(Boolean) ?? [];

    setExamForm({
      title: exam.title,
      topic: getExamTopicName(exam.topic),
      exam_start_time: formatToLocalISO(exam.exam_start_time),
      exam_end_time: formatToLocalISO(exam.exam_end_time),
      duration: exam.duration.toString(),
      practice: exam.practice,
      is_public: exam.is_public,
    });
    setQuestionSelectionMode(exam.mode);
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
          child_chapter_id: ALL_CHAPTERS_VALUE,
          question_type: item.question_type,
          question_format: item.question_format,
          quantity: item.quantity,
        };
      });
      setConfigRows(configRowsWithIds);
      setNextRowId(configRowsWithIds.length + 1);
      setDistribution(parsedDistribution);
    }
  }, [exam]);

  // Kept apart from the effect above: resolveChapterSelection changes every
  // time chapters are refetched (e.g. after an import), and that must not
  // reset the form or the question selection.
  useEffect(() => {
    if (!exam || exam.mode !== "BY_CHAPTER" || !exam.distribution) return;

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
    setDistribution(parsedDistribution);
  }, [exam, resolveChapterSelection]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <h2 className="text-3xl font-bold text-gray-900">{t("editExam")}</h2>
      </div>

      <Card className="bg-white border-gray-300">
        <CardHeader>
          <CardTitle>{t("examInformation")}</CardTitle>
          <CardDescription>
            {t("fillInTheDetailsToCreate")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
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
                <Input
                  id="exam-topic"
                  placeholder={t("enterSubject")}
                  value={examForm.topic}
                  onChange={(e) =>
                    setExamForm({ ...examForm, topic: e.target.value })
                  }
                  className="bg-white border-gray-300"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-time">
                  {t("startTime")}<span className="text-red-500">*</span>
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
                  {t("endTime")}<span className="text-red-500">*</span>
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
                  {t("makeTheExamPublicStudentsCan")}</Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t("chooseQuestionsFromTheBank")}</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={exam?.mode !== "MANUAL"}
                  title={
                    exam?.mode === "MANUAL"
                      ? t("importQuestionsIntoTheTopic")
                      : t("pleaseSaveTheTestInManual")
                  }
                  onClick={() => setIsImportDialogOpen(true)}
                  className="border-gray-300"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {t("importWordExcel")}
                </Button>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-[#0066cc] hover:bg-[#0052a3] text-white">
                      {t("selectQuestion")}</Button>
                  </DialogTrigger>
                  <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-4xl max-h-[calc(100vh-4rem)] overflow-y-auto bg-white border-gray-300">
                    <DialogHeader>
                      <DialogTitle>{t("selectQuestion")}</DialogTitle>
                      <DialogDescription>
                        {t("chooseQuestionsForExam", { title: examForm.title })}
                      </DialogDescription>
                    </DialogHeader>
                    <Select
                      value={questionSelectionMode}
                      onValueChange={(value) =>
                        setQuestionSelectionMode(value as ExamMode)
                      }
                    >
                      <SelectTrigger className="w-full max-w-full sm:w-[370px] bg-white border-gray-300">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-300">
                        <SelectItem value="MANUAL">{t("manualSelection")}</SelectItem>
                        <SelectItem value="RANDOM_N">
                          {t("randomlySelectNSentences")}</SelectItem>
                        <SelectItem value="BY_TYPE">
                          {t("configurableByTypeAndFormat")}</SelectItem>
                        <SelectItem value="BY_CHAPTER">
                          {t("configureByChapter")}</SelectItem>
                      </SelectContent>
                    </Select>

                    {questionSelectionMode === "MANUAL" && (
                      <div className="space-y-2">
                        <div className="border border-gray-300 rounded-lg p-4 space-y-3 max-h-64 overflow-y-auto">
                          {questionBank?.length > 0 ? (
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
                                      type: enumLabel.questionType(question.question_type),
                                      format: enumLabel.questionFormat(question.question_format),
                                    })}
                                  </div>
                                </label>
                              </div>
                            ))
                          ) : (
                            <div className="text-center text-gray-500 py-4">
                              {t("noQuestionsAsked")}</div>
                          )}
                        </div>
                        <div className="text-sm text-gray-600">
                          {t("selectedQuestionCount", { count: selectedQuestions.length })}</div>
                      </div>
                    )}

                    {questionSelectionMode === "RANDOM_N" && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-3 gap-4 items-end">
                          <div className="space-y-2">
                            <Label htmlFor="random-count">
                              {t("numberOfQuestions")}</Label>
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
                        <div className="text-sm text-gray-600">
                          {t("selectedQuestionCount", { count: selectedQuestions.length })}</div>
                      </div>
                    )}

                    {(questionSelectionMode === "BY_TYPE" ||
                      questionSelectionMode === "BY_CHAPTER") && (
                      <div className="min-w-0 space-y-4">
                        <Label className="text-base font-semibold block">
                          {t("questionConfiguration")}</Label>
                        <div className="max-w-full overflow-x-auto rounded-lg border border-gray-300">
                          <Table
                            className={
                              questionSelectionMode === "BY_CHAPTER"
                                ? "min-w-[650px] table-fixed"
                                : "min-w-[650px] table-fixed"
                            }
                          >
                            <TableHeader>
                              <TableRow className="border-gray-300">
                                {questionSelectionMode === "BY_CHAPTER" && (
                                  <>
                                    <TableHead className="w-[210px]">
                                      {t("chapter")}
                                    </TableHead>
                                    <TableHead className="w-[210px]">
                                      {t("subchapter")}
                                    </TableHead>
                                  </>
                                )}
                                {questionSelectionMode === "BY_TYPE" && (
                                  <>
                                    <TableHead className="w-[260px]">
                                      {t("questionType")}</TableHead>
                                    <TableHead className="w-[190px]">
                                      {t("format2")}</TableHead>
                                  </>
                                )}
                                <TableHead className="w-[120px]">
                                  {t("quantity")}</TableHead>
                                <TableHead className="w-[80px]">
                                  {t("operation")}</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody className="bg-white border-gray-300">
                              {configRows.map((row) => (
                                <TableRow
                                  key={row.id}
                                  className="border-gray-300"
                                >
                                  {questionSelectionMode === "BY_CHAPTER" && (
                                    <>
                                      <TableCell className="align-middle">
                                        <Select
                                          value={
                                            row.chapter_id ?? ALL_CHAPTERS_VALUE
                                          }
                                          onValueChange={(value) =>
                                            handleUpdateConfigRow(
                                              row.id,
                                              "chapter_id",
                                              value,
                                            )
                                          }
                                        >
                                          <SelectTrigger className="w-full min-w-0 bg-white border-gray-300">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent className="bg-white border-gray-300">
                                            <SelectItem
                                              value={ALL_CHAPTERS_VALUE}
                                            >
                                              {t("allChapters")}</SelectItem>
                                            {parentChapterOptions.map(
                                              (chapter) => (
                                                <SelectItem
                                                  key={chapter.id}
                                                  value={chapter.id}
                                                >
                                                  {chapter.name}
                                                </SelectItem>
                                              ),
                                            )}
                                          </SelectContent>
                                        </Select>
                                      </TableCell>
                                      <TableCell className="align-middle">
                                        <Select
                                          value={
                                            row.child_chapter_id ??
                                            ALL_CHAPTERS_VALUE
                                          }
                                          disabled={
                                            !row.chapter_id ||
                                            row.chapter_id ===
                                              ALL_CHAPTERS_VALUE ||
                                            !childChaptersByParent.get(
                                              row.chapter_id,
                                            )?.length
                                          }
                                          onValueChange={(value) =>
                                            handleUpdateConfigRow(
                                              row.id,
                                              "child_chapter_id",
                                              value,
                                            )
                                          }
                                        >
                                          <SelectTrigger className="w-full min-w-0 bg-white border-gray-300">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent className="bg-white border-gray-300">
                                            <SelectItem
                                              value={ALL_CHAPTERS_VALUE}
                                            >
                                              {t("doNotSelect")}</SelectItem>
                                            {(
                                              childChaptersByParent.get(
                                                row.chapter_id ?? "",
                                              ) ?? []
                                            ).map((chapter) => (
                                              <SelectItem
                                                key={chapter.id}
                                                value={chapter.id}
                                              >
                                                {chapter.name}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </TableCell>
                                    </>
                                  )}
                                  {questionSelectionMode === "BY_TYPE" && (
                                    <>
                                      <TableCell className="align-middle">
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
                                          <SelectTrigger className="w-full min-w-0 bg-white border-gray-300">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent className="bg-white border-gray-300">
                                            <SelectItem value="SINGLE_CHOICE">
                                              {t("multipleChoice1Answer")}</SelectItem>
                                            <SelectItem value="MULTIPLE_CHOICE">
                                              {t("multipleChoiceTestWithMultipleAnswers")}</SelectItem>
                                            <SelectItem value="ESSAY">
                                              {t("essay")}</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </TableCell>
                                      <TableCell className="align-middle">
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
                                          <SelectTrigger className="w-full min-w-0 bg-white border-gray-300">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent className="bg-white border-gray-300">
                                            <SelectItem value="KNOWLEDGE">
                                              {t("recognize")}</SelectItem>
                                            <SelectItem value="UNDERSTANDING">
                                              {t("understanding")}</SelectItem>
                                            <SelectItem value="APPLYING">
                                              {t("manipulate")}</SelectItem>
                                            <SelectItem value="ADVANCED">
                                              {t("advanced")}</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </TableCell>
                                    </>
                                  )}
                                  <TableCell className="align-middle">
                                    <Input
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
                                  </TableCell>
                                  <TableCell className="align-middle">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-9 w-9 p-0"
                                      onClick={() =>
                                        handleRemoveConfigRow(row.id)
                                      }
                                    >
                                      <Trash2 className="h-4 w-4 text-red-500" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>

                        <Button
                          onClick={handleAddConfigRow}
                          variant="outline"
                          className="w-full border-gray-300 bg-white hover:cursor-pointer"
                        >
                          <Plus className="h-3 w-3" strokeWidth={3} /> {t("addGoodsConfiguration")}</Button>

                        <Button
                          onClick={handleSelectByConfig}
                          className="w-full bg-[#0066cc] hover:bg-[#0052a3] text-white"
                        >
                          {t("takeRandomAccordingToConfiguration")}</Button>
                        <div className="text-sm text-gray-600">
                          {t("selectedQuestionCount", { count: selectedQuestions.length })}</div>
                      </div>
                    )}
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
                {t("cancel")}</Button>
              <Button
                onClick={() => handleEditExam(examId)}
                className="flex-1 bg-[#0066cc] hover:bg-[#0052a3] text-white hover:cursor-pointer"
              >
                {t("updateExam")}</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <QuestionImportDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        topicId={exam?.topic_id}
        examId={examId}
        onCompleted={async () => {
          // The import may have created chapters from names in the file, and
          // the backend has already attached the imported questions.
          await Promise.all([
            fetchQuestions(),
            fetchChapters(exam?.topic_id),
            mergeImportedQuestions(),
          ]);
        }}
      />
    </div>
  );
}
