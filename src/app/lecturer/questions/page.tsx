"use client";

import axios from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Copy,
  Eye,
  ExternalLink,
  FileAudio,
  FileImage,
  FileQuestion,
  FileVideo,
  Loader2,
  Pencil,
  PenTool,
  Plus,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MathInput } from "@/components/MathInput";
import { MathRenderer } from "@/components/MathRenderer";
import { QuestionImportDialog } from "@/components/question-import/QuestionImportDialog";
import { ENDPOINTS } from "@/constants/endpoints";
import apiClient from "@/lib/api-client";

type ViewMode = "topics" | "chapters" | "questions";
type QuestionType = "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "ESSAY";
type QuestionFormat = "KNOWLEDGE" | "UNDERSTANDING" | "APPLYING" | "ADVANCED";
type FileType = "AUDIO" | "IMAGE" | "VIDEO";

type PageResult<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
};

type Topic = {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};

type Chapter = {
  id: string;
  topic_id: string;
  parent_id?: string | null;
  name: string;
  order: number;
  created_at: string;
  updated_at: string;
};

type FileRecord = {
  id: string;
  name: string;
  url: string;
  s3_key: string;
  type: FileType;
  size?: number;
  entity_type?: string | null;
  entity_id?: string | null;
  status: "PENDING" | "ACTIVE" | "DELETED";
};

type QuestionFile = {
  order: number;
  file: FileRecord;
};

type Question = {
  id: string;
  chapter_id: string;
  question_text: string;
  options?: string | null;
  correct_answer?: string | null;
  question_type: QuestionType;
  question_format: QuestionFormat;
  created_at: string;
  updated_at: string;
  chapter?: Chapter;
  files?: QuestionFile[];
};

type QuestionOption = {
  text: string;
  isCorrect: boolean;
};

type ParsedQuestionOption = {
  label?: string;
  text: string;
  isCorrect?: boolean;
};

type QuestionForm = {
  chapter_id: string;
  question_text: string;
  question_type: QuestionType;
  question_format: QuestionFormat;
  options: QuestionOption[];
  correct_answer: string;
};

const optionLabels = ["A", "B", "C", "D", "E", "F"];
const ITEMS_PER_PAGE = 5;
const QUESTION_PREVIEW_MAX_LENGTH = 80;

const questionTypeConfig = {
  SINGLE_CHOICE: {
    label: "Trắc nghiệm một đáp án",
    color: "text-emerald-700",
    bgColor: "bg-emerald-100",
    Icon: CheckCircle,
  },
  MULTIPLE_CHOICE: {
    label: "Trắc nghiệm nhiều đáp án",
    color: "text-blue-700",
    bgColor: "bg-blue-100",
    Icon: Copy,
  },
  ESSAY: {
    label: "Tự luận",
    color: "text-amber-700",
    bgColor: "bg-amber-100",
    Icon: PenTool,
  },
} satisfies Record<
  QuestionType,
  {
    label: string;
    color: string;
    bgColor: string;
    Icon: React.ComponentType<{ className?: string }>;
  }
>;

const questionFormatConfig = {
  KNOWLEDGE: {
    label: "Nhận biết",
    color: "text-cyan-700",
    bgColor: "bg-cyan-100",
    level: 1,
  },
  UNDERSTANDING: {
    label: "Thông hiểu",
    color: "text-sky-700",
    bgColor: "bg-sky-100",
    level: 2,
  },
  APPLYING: {
    label: "Vận dụng",
    color: "text-purple-700",
    bgColor: "bg-purple-100",
    level: 3,
  },
  ADVANCED: {
    label: "Vận dụng cao",
    color: "text-indigo-700",
    bgColor: "bg-indigo-100",
    level: 4,
  },
} satisfies Record<
  QuestionFormat,
  {
    label: string;
    color: string;
    bgColor: string;
    level: number;
  }
>;

const emptyOptions = (): QuestionOption[] => [
  { text: "", isCorrect: false },
  { text: "", isCorrect: false },
  { text: "", isCorrect: false },
  { text: "", isCorrect: false },
];

const initialQuestionForm = (chapterId = ""): QuestionForm => ({
  chapter_id: chapterId,
  question_text: "",
  question_type: "SINGLE_CHOICE",
  question_format: "KNOWLEDGE",
  options: emptyOptions(),
  correct_answer: "",
});

const getFileType = (file: File): FileType | null => {
  if (file.type.startsWith("image/")) return "IMAGE";
  if (file.type.startsWith("audio/")) return "AUDIO";
  if (file.type.startsWith("video/")) return "VIDEO";
  return null;
};

const fileIcon = (type: FileType) => {
  if (type === "IMAGE") return <FileImage className="h-4 w-4" />;
  if (type === "AUDIO") return <FileAudio className="h-4 w-4" />;
  return <FileVideo className="h-4 w-4" />;
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

const formatFileSize = (size?: number) => {
  if (!size) return "";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const getQuestionPreviewText = (questionText: string) => {
  const normalizedText = questionText.replace(/\s+/g, " ").trim();
  if (normalizedText.length <= QUESTION_PREVIEW_MAX_LENGTH) {
    return normalizedText;
  }

  let previewText = normalizedText
    .slice(0, QUESTION_PREVIEW_MAX_LENGTH)
    .trimEnd();

  const hasUnclosedLatex = (value: string) => {
    const singleDollarCount = (value.match(/(^|[^\\])\$/g) || []).length;
    const inlineOpenCount = (value.match(/\\\(/g) || []).length;
    const inlineCloseCount = (value.match(/\\\)/g) || []).length;
    const displayOpenCount = (value.match(/\\\[/g) || []).length;
    const displayCloseCount = (value.match(/\\\]/g) || []).length;
    const beginCount = (value.match(/\\begin\{/g) || []).length;
    const endCount = (value.match(/\\end\{/g) || []).length;

    return (
      singleDollarCount % 2 === 1 ||
      inlineOpenCount > inlineCloseCount ||
      displayOpenCount > displayCloseCount ||
      beginCount > endCount
    );
  };

  while (previewText && hasUnclosedLatex(previewText)) {
    const cutCandidates = [
      previewText.lastIndexOf("$$"),
      previewText.lastIndexOf("\\("),
      previewText.lastIndexOf("\\["),
      previewText.lastIndexOf("\\begin{"),
      previewText.lastIndexOf("$"),
      previewText.lastIndexOf(" "),
    ].filter((index) => index >= 0);

    const cutIndex =
      cutCandidates.length > 0
        ? Math.min(...cutCandidates)
        : previewText.length - 1;
    previewText = previewText.slice(0, Math.max(0, cutIndex)).trimEnd();
  }

  return `${previewText}...`;
};

export default function LecturerQuestions() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("topics");
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [chapterStack, setChapterStack] = useState<Chapter[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [topicPage, setTopicPage] = useState(1);
  const [chapterPage, setChapterPage] = useState(1);
  const [questionPage, setQuestionPage] = useState(1);

  const [isTopicDialogOpen, setIsTopicDialogOpen] = useState(false);
  const [isChapterDialogOpen, setIsChapterDialogOpen] = useState(false);
  const [isQuestionDialogOpen, setIsQuestionDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [detailQuestion, setDetailQuestion] = useState<Question | null>(null);
  const [loadingDetailId, setLoadingDetailId] = useState<string | null>(null);
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(
    null,
  );
  const [editingQuestionFiles, setEditingQuestionFiles] = useState<
    QuestionFile[]
  >([]);
  const [replaceQuestionFiles, setReplaceQuestionFiles] = useState(false);
  const [isQuestionSubmitting, setIsQuestionSubmitting] = useState(false);
  const [loadingEditId, setLoadingEditId] = useState<string | null>(null);
  const [topicName, setTopicName] = useState("");
  const [chapterForm, setChapterForm] = useState({
    topic_id: "",
    parent_id: "",
    name: "",
    order: 0,
  });
  const [questionForm, setQuestionForm] =
    useState<QuestionForm>(initialQuestionForm);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const currentChapter = chapterStack[chapterStack.length - 1] ?? null;

  const fetchTopics = useCallback(async () => {
    const res = await apiClient.get<PageResult<Topic>>(ENDPOINTS.TOPICS.BASE, {
      params: { page: 1, limit: 100 },
    });
    setTopics(res.data.data);
  }, []);

  const fetchChapters = useCallback(async (topicId?: string) => {
    const res = await apiClient.get<PageResult<Chapter>>(
      ENDPOINTS.CHAPTERS.BASE,
      {
        params: { page: 1, limit: 100, ...(topicId && { topic_id: topicId }) },
      },
    );
    setChapters(res.data.data);
  }, []);

  const fetchQuestions = useCallback(async (chapterId?: string) => {
    const res = await apiClient.get<PageResult<Question>>(
      ENDPOINTS.QUESTIONS.BASE,
      {
        params: {
          page: 1,
          limit: 100,
          ...(chapterId && { chapter_id: chapterId }),
        },
      },
    );
    setQuestions(res.data.data);
  }, []);

  const refreshAll = useCallback(async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchTopics(),
        fetchChapters(selectedTopic?.id),
        fetchQuestions(currentChapter?.id),
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [
    currentChapter?.id,
    fetchChapters,
    fetchQuestions,
    fetchTopics,
    selectedTopic?.id,
  ]);

  useEffect(() => {
    refreshAll().catch(() =>
      toast.error("Không thể tải dữ liệu question bank"),
    );
  }, [refreshAll]);

  const topicRows = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return topics;
    return topics.filter((topic) => topic.name.toLowerCase().includes(keyword));
  }, [searchTerm, topics]);

  const chapterRows = useMemo(() => {
    const parentId = currentChapter?.id ?? null;
    return chapters
      .filter((chapter) => chapter.parent_id === parentId)
      .sort((a, b) => a.order - b.order);
  }, [chapters, currentChapter?.id]);

  const questionRows = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    return questions.filter((question) => {
      const matchesChapter =
        !currentChapter || question.chapter_id === currentChapter.id;
      const matchesSearch =
        !keyword || question.question_text.toLowerCase().includes(keyword);
      return matchesChapter && matchesSearch;
    });
  }, [currentChapter, questions, searchTerm]);

  const topicTotalPages = Math.ceil(topicRows.length / ITEMS_PER_PAGE);
  const chapterTotalPages = Math.ceil(chapterRows.length / ITEMS_PER_PAGE);
  const questionTotalPages = Math.ceil(questionRows.length / ITEMS_PER_PAGE);

  const paginatedTopicRows = useMemo(
    () =>
      topicRows.slice(
        (topicPage - 1) * ITEMS_PER_PAGE,
        topicPage * ITEMS_PER_PAGE,
      ),
    [topicPage, topicRows],
  );

  const paginatedChapterRows = useMemo(
    () =>
      chapterRows.slice(
        (chapterPage - 1) * ITEMS_PER_PAGE,
        chapterPage * ITEMS_PER_PAGE,
      ),
    [chapterPage, chapterRows],
  );

  const paginatedQuestionRows = useMemo(
    () =>
      questionRows.slice(
        (questionPage - 1) * ITEMS_PER_PAGE,
        questionPage * ITEMS_PER_PAGE,
      ),
    [questionPage, questionRows],
  );

  useEffect(() => {
    setTopicPage((prev) => Math.min(prev, Math.max(topicTotalPages, 1)));
  }, [topicTotalPages]);

  useEffect(() => {
    setChapterPage((prev) => Math.min(prev, Math.max(chapterTotalPages, 1)));
  }, [chapterTotalPages]);

  useEffect(() => {
    setQuestionPage((prev) => Math.min(prev, Math.max(questionTotalPages, 1)));
  }, [questionTotalPages]);

  const getChildCount = (chapterId: string) =>
    chapters.filter((chapter) => chapter.parent_id === chapterId).length;

  const getDescendantChapterIds = (chapterId: string) => {
    const ids = new Set<string>([chapterId]);
    let parentIds = [chapterId];

    while (parentIds.length) {
      const childIds = chapters
        .filter((chapter) => parentIds.includes(chapter.parent_id ?? ""))
        .map((chapter) => chapter.id)
        .filter((id) => !ids.has(id));

      childIds.forEach((id) => ids.add(id));
      parentIds = childIds;
    }

    return ids;
  };

  const openTopic = async (topic: Topic) => {
    setSelectedTopic(topic);
    setChapterStack([]);
    setSearchTerm("");
    setChapterPage(1);
    setViewMode("chapters");
    await fetchChapters(topic.id);
  };

  const openChapterChildren = (chapter: Chapter) => {
    setChapterStack((prev) => [...prev, chapter]);
    setSearchTerm("");
    setChapterPage(1);
    setViewMode("chapters");
  };

  const openChapterQuestions = async (chapter: Chapter) => {
    setChapterStack((prev) =>
      prev.some((item) => item.id === chapter.id) ? prev : [...prev, chapter],
    );
    setSearchTerm("");
    setQuestionPage(1);
    setViewMode("questions");
    await fetchQuestions(chapter.id);
  };

  const goBack = async () => {
    if (viewMode === "questions") {
      setChapterStack((prev) => prev.slice(0, -1));
      setChapterPage(1);
      setViewMode("chapters");
      await fetchChapters(selectedTopic?.id);
      return;
    }

    if (chapterStack.length > 0) {
      setChapterStack((prev) => prev.slice(0, -1));
      setChapterPage(1);
      return;
    }

    setSelectedTopic(null);
    setSearchTerm("");
    setTopicPage(1);
    setViewMode("topics");
  };

  const resetTopicDialog = () => {
    setTopicName("");
    setIsTopicDialogOpen(false);
  };

  const resetChapterDialog = () => {
    setChapterForm({
      topic_id: selectedTopic?.id ?? "",
      parent_id: currentChapter?.id ?? "",
      name: "",
      order: chapterRows.length,
    });
    setEditingChapterId(null);
    setIsChapterDialogOpen(false);
  };

  const resetQuestionDialog = () => {
    setQuestionForm(initialQuestionForm(currentChapter?.id));
    setSelectedFiles([]);
    setEditingQuestionId(null);
    setEditingQuestionFiles([]);
    setReplaceQuestionFiles(false);
    setIsQuestionSubmitting(false);
    setIsQuestionDialogOpen(false);
  };

  const openCreateChapterDialog = () => {
    setChapterForm({
      topic_id: selectedTopic?.id ?? "",
      parent_id: currentChapter?.id ?? "",
      name: "",
      order: chapterRows.length,
    });
    setEditingChapterId(null);
    setIsChapterDialogOpen(true);
  };

  const openEditChapterDialog = (chapter: Chapter) => {
    setChapterForm({
      topic_id: chapter.topic_id,
      parent_id: chapter.parent_id ?? "",
      name: chapter.name,
      order: chapter.order,
    });
    setEditingChapterId(chapter.id);
    setIsChapterDialogOpen(true);
  };

  const openCreateQuestionDialog = () => {
    setQuestionForm(initialQuestionForm(currentChapter?.id));
    setSelectedFiles([]);
    setEditingQuestionId(null);
    setEditingQuestionFiles([]);
    setReplaceQuestionFiles(false);
    setIsQuestionDialogOpen(true);
  };

  const handleCreateTopic = async () => {
    if (!topicName.trim()) {
      toast.error("Vui lòng nhập tên topic");
      return;
    }

    await apiClient.post<Topic>(ENDPOINTS.TOPICS.BASE, {
      name: topicName.trim(),
    });
    toast.success("Đã tạo topic");
    resetTopicDialog();
    await fetchTopics();
  };

  const handleDeleteTopic = async (topicId: string) => {
    const res = await apiClient.delete<{
      chapters?: number;
      questions?: number;
    }>(ENDPOINTS.TOPICS.DETAIL(topicId));
    toast.success(
      `Đã xoá topic cùng ${res.data.chapters ?? 0} chapter và ${
        res.data.questions ?? 0
      } câu hỏi`,
    );
    if (selectedTopic?.id === topicId) {
      setSelectedTopic(null);
      setChapterStack([]);
      setViewMode("topics");
    }
    await fetchTopics();
  };

  const handleSaveChapter = async () => {
    if (!chapterForm.topic_id || !chapterForm.name.trim()) {
      toast.error("Vui lòng nhập topic và tên chapter");
      return;
    }

    const payload = {
      topic_id: chapterForm.topic_id,
      parent_id: chapterForm.parent_id || undefined,
      name: chapterForm.name.trim(),
      order: Number(chapterForm.order) || 0,
    };

    if (editingChapterId) {
      await apiClient.patch(
        ENDPOINTS.CHAPTERS.DETAIL(editingChapterId),
        payload,
      );
      toast.success("Đã cập nhật chapter");
    } else {
      await apiClient.post(ENDPOINTS.CHAPTERS.BASE, payload);
      toast.success("Đã tạo chapter");
    }

    resetChapterDialog();
    await fetchChapters(selectedTopic?.id);
  };

  const handleDeleteChapter = async (chapterId: string) => {
    const deletedChapterIds = getDescendantChapterIds(chapterId);
    const res = await apiClient.delete<{
      chapters?: number;
      questions?: number;
    }>(ENDPOINTS.CHAPTERS.DETAIL(chapterId));
    toast.success(
      `Đã xoá ${res.data.chapters ?? 0} chapter và ${
        res.data.questions ?? 0
      } câu hỏi`,
    );
    setChapterStack((prev) =>
      prev.filter((chapter) => !deletedChapterIds.has(chapter.id)),
    );
    await fetchChapters(selectedTopic?.id);
    await fetchQuestions(currentChapter?.id);
  };

  const uploadQuestionFiles = async () => {
    const uploaded: { id: string; order: number }[] = [];

    for (const [index, file] of selectedFiles.entries()) {
      const type = getFileType(file);
      if (!type)
        throw new Error(`File ${file.name} không đúng định dạng media`);

      const uploadRes = await apiClient.post<{
        file: FileRecord;
        uploadUrl: string;
      }>(ENDPOINTS.FILES.UPLOAD_URL, {
        name: file.name,
        type,
        size: file.size,
        entity_type: "questions",
      });

      await axios.put(uploadRes.data.uploadUrl, file, {
        headers: { "Content-Type": file.type },
      });

      const confirmRes = await apiClient.post<FileRecord>(
        ENDPOINTS.FILES.CONFIRM(uploadRes.data.file.id),
      );
      uploaded.push({ id: confirmRes.data.id, order: index + 1 });
    }

    return uploaded;
  };

  const buildQuestionPayload = async ({
    includeFiles = true,
  }: { includeFiles?: boolean } = {}) => {
    const isEssay = questionForm.question_type === "ESSAY";
    const activeOptions = questionForm.options
      .map((option) => ({
        text: option.text.trim(),
        isCorrect: option.isCorrect,
      }))
      .filter((option) => option.text);

    if (!isEssay && activeOptions.length < 2) {
      throw new Error("Câu hỏi trắc nghiệm cần ít nhất 2 lựa chọn");
    }

    if (!isEssay && !activeOptions.some((option) => option.isCorrect)) {
      throw new Error("Vui lòng chọn đáp án đúng");
    }

    if (isEssay && !questionForm.correct_answer.trim()) {
      throw new Error("Vui lòng nhập đáp án đúng");
    }

    const file_ids = includeFiles ? await uploadQuestionFiles() : undefined;

    return {
      chapter_id: questionForm.chapter_id,
      question_text: questionForm.question_text,
      question_type: questionForm.question_type,
      question_format: questionForm.question_format,
      options: isEssay ? null : JSON.stringify(activeOptions),
      correct_answer: isEssay ? questionForm.correct_answer.trim() : null,
      ...(file_ids && { file_ids }),
    };
  };

  const handleCreateQuestion = async () => {
    if (isQuestionSubmitting) return;

    if (!questionForm.chapter_id || !questionForm.question_text.trim()) {
      toast.error("Vui lòng nhập đầy đủ chapter và nội dung câu hỏi");
      return;
    }

    setIsQuestionSubmitting(true);
    try {
      const payload = await buildQuestionPayload();
      await apiClient.post(ENDPOINTS.QUESTIONS.BASE, payload);
      toast.success("Đã tạo câu hỏi");
      resetQuestionDialog();
      await fetchQuestions(currentChapter?.id);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể tạo câu hỏi",
      );
    } finally {
      setIsQuestionSubmitting(false);
    }
  };

  const handleUpdateQuestion = async () => {
    if (isQuestionSubmitting) return;

    if (
      !editingQuestionId ||
      !questionForm.chapter_id ||
      !questionForm.question_text.trim()
    ) {
      toast.error("Vui lòng nhập đầy đủ chapter và nội dung câu hỏi");
      return;
    }

    setIsQuestionSubmitting(true);
    try {
      const payload = await buildQuestionPayload({
        includeFiles: replaceQuestionFiles,
      });
      await apiClient.patch(
        ENDPOINTS.QUESTIONS.DETAIL(editingQuestionId),
        payload,
      );
      toast.success("Đã cập nhật câu hỏi");
      resetQuestionDialog();
      await fetchQuestions(currentChapter?.id);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể cập nhật câu hỏi",
      );
    } finally {
      setIsQuestionSubmitting(false);
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    await apiClient.delete(ENDPOINTS.QUESTIONS.DETAIL(questionId));
    toast.success("Đã xoá câu hỏi");
    await fetchQuestions(currentChapter?.id);
  };

  const openQuestionDetail = async (questionId: string) => {
    setLoadingDetailId(questionId);
    try {
      const res = await apiClient.get<Question>(
        ENDPOINTS.QUESTIONS.DETAIL(questionId),
      );
      setDetailQuestion(res.data);
    } catch {
      toast.error("Không thể tải chi tiết câu hỏi");
    } finally {
      setLoadingDetailId(null);
    }
  };

  const parseQuestionOptions = (question: Question) => {
    if (!question.options) return [];
    try {
      return JSON.parse(question.options) as ParsedQuestionOption[];
    } catch {
      return [];
    }
  };

  const getLegacyCorrectLabels = (question: Question) => {
    const legacyAnswer = question.correct_answer?.trim();
    if (!legacyAnswer) return new Set<string>();

    try {
      const labels = JSON.parse(legacyAnswer);
      if (Array.isArray(labels)) {
        return new Set(labels.map((label) => String(label)));
      }
    } catch {
      // Old single-choice questions stored the correct answer as a plain label.
    }

    return new Set([legacyAnswer]);
  };

  const getQuestionFormFromQuestion = (question: Question): QuestionForm => {
    const parsedOptions = parseQuestionOptions(question);
    const hasCorrectFlag = parsedOptions.some(
      (option) => typeof option.isCorrect === "boolean",
    );
    const legacyCorrectLabels = getLegacyCorrectLabels(question);
    const normalizedOptions =
      question.question_type === "ESSAY"
        ? emptyOptions()
        : parsedOptions.map((option, index) => ({
            text: option.text ?? "",
            isCorrect: hasCorrectFlag
              ? Boolean(option.isCorrect)
              : legacyCorrectLabels.has(option.label ?? optionLabels[index]),
          }));

    while (normalizedOptions.length < 4) {
      normalizedOptions.push({ text: "", isCorrect: false });
    }

    return {
      chapter_id: question.chapter_id,
      question_text: question.question_text,
      question_type: question.question_type,
      question_format: question.question_format,
      options: normalizedOptions.slice(0, optionLabels.length),
      correct_answer:
        question.question_type === "ESSAY"
          ? (question.correct_answer ?? "")
          : "",
    };
  };

  const openEditQuestionDialog = async (questionId: string) => {
    setLoadingEditId(questionId);
    try {
      const res = await apiClient.get<Question>(
        ENDPOINTS.QUESTIONS.DETAIL(questionId),
      );
      setQuestionForm(getQuestionFormFromQuestion(res.data));
      setEditingQuestionId(res.data.id);
      setEditingQuestionFiles(res.data.files ?? []);
      setSelectedFiles([]);
      setReplaceQuestionFiles(false);
      setIsQuestionDialogOpen(true);
    } catch {
      toast.error("Không thể tải câu hỏi để cập nhật");
    } finally {
      setLoadingEditId(null);
    }
  };

  const getQuestionAnswerText = (question: Question) => {
    if (question.question_type === "ESSAY") {
      return question.correct_answer?.trim() || "-";
    }

    const options = parseQuestionOptions(question);
    const correctOptions = options
      .map((option, index) =>
        option.isCorrect
          ? `${option.label ?? optionLabels[index]}. ${option.text}`
          : null,
      )
      .filter(Boolean);

    if (correctOptions.length) return correctOptions.join(", ");

    const legacyAnswer = question.correct_answer?.trim();
    if (!legacyAnswer) return "-";

    try {
      const labels = JSON.parse(legacyAnswer);
      if (Array.isArray(labels)) {
        return labels
          .map((label) => {
            const optionIndex = optionLabels.indexOf(String(label));
            const option = options[optionIndex];
            return option ? `${label}. ${option.text}` : String(label);
          })
          .join(", ");
      }
    } catch {
      // Old single-choice questions stored the correct answer as a plain label.
    }

    const optionIndex = optionLabels.indexOf(legacyAnswer);
    const option = options[optionIndex];
    return option ? `${legacyAnswer}. ${option.text}` : legacyAnswer;
  };

  const panelTitle =
    viewMode === "topics"
      ? "Quản lí topic"
      : viewMode === "chapters"
        ? "Quản lí Chapter"
        : "Quản lí Câu hỏi";

  return (
    <div className="w-full max-w-full space-y-6 overflow-hidden">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-3">
          <h2 className="text-3xl font-bold text-gray-900">
            Ngân hàng câu hỏi
          </h2>
          {viewMode !== "topics" && (
            <Button
              variant="ghost"
              onClick={() =>
                goBack().catch(() => toast.error("Không thể quay lại"))
              }
              className="h-8 gap-2 px-0 text-gray-700 hover:bg-transparent hover:text-[#0066cc] hover:cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              {viewMode === "questions"
                ? "Quay lại Chapter"
                : chapterStack.length > 0
                  ? "Quay lại Chapter cha"
                  : "Quay lại Topic"}
            </Button>
          )}
        </div>

        {selectedTopic && (
          <div className="rounded-md border border-gray-300 bg-white/70 px-4 py-2 text-sm text-gray-700">
            <div>
              Topic: <span className="font-medium">{selectedTopic.name}</span>
            </div>
            {currentChapter && (
              <div>
                Chapter:{" "}
                <span className="font-medium">{currentChapter.name}</span>
              </div>
            )}
          </div>
        )}
      </div>

      <Card className="bg-white border-gray-300 space-y-4">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>{panelTitle}</CardTitle>
          {viewMode === "topics" && (
            <div className="flex w-full gap-2 sm:w-auto">
              <div className="relative min-w-0 flex-1 sm:w-[520px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(event) => {
                    setSearchTerm(event.target.value);
                    setTopicPage(1);
                  }}
                  placeholder="Tìm kiếm topic"
                  className="pl-10 bg-white border-gray-300"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setIsImportDialogOpen(true)}
                className="shrink-0 border-gray-300 hover:cursor-pointer"
              >
                <Upload className="mr-2 h-4 w-4" />
                Import Word, Excel
              </Button>
              <Button
                onClick={() => setIsTopicDialogOpen(true)}
                className="shrink-0 bg-[#0066cc] hover:bg-[#0052a3] text-white hover:cursor-pointer"
              >
                <Plus className="mr-2 h-4 w-4" />
                Tạo Topic
              </Button>
            </div>
          )}

          {viewMode === "chapters" && (
            <Button
              onClick={openCreateChapterDialog}
              className="bg-[#0066cc] hover:bg-[#0052a3] text-white hover:cursor-pointer"
            >
              <Plus className="mr-2 h-4 w-4" />
              Tạo Chapter
            </Button>
          )}

          {viewMode === "questions" && (
            <Button
              onClick={openCreateQuestionDialog}
              className="bg-[#0066cc] hover:bg-[#0052a3] text-white hover:cursor-pointer"
            >
              <Plus className="mr-2 h-4 w-4" />
              Tạo Câu hỏi
            </Button>
          )}
        </CardHeader>

        <CardContent>
          {viewMode === "topics" && (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-300">
                    <TableHead>Tên Topic</TableHead>
                    <TableHead>Ngày tạo</TableHead>
                    <TableHead className="text-center">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topicRows.length > 0 ? (
                    paginatedTopicRows.map((topic) => (
                      <TableRow key={topic.id} className="border-gray-300">
                        <TableCell className="font-medium">
                          {topic.name}
                        </TableCell>
                        <TableCell>{formatDate(topic.created_at)}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-[#0066cc] hover:text-[#0066cc] font-medium hover:cursor-pointer"
                              onClick={() =>
                                openTopic(topic).catch(() =>
                                  toast.error("Không thể mở chapter"),
                                )
                              }
                            >
                              Quản lý Chapter
                            </Button>
                            <DeleteButton
                              title="Xoá topic?"
                              description="Topic này cùng toàn bộ Chapter, Chapter con và Câu hỏi thuộc Topic sẽ bị xoá. Hành động này không thể hoàn tác."
                              onConfirm={() => handleDeleteTopic(topic.id)}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <EmptyRow
                      colSpan={3}
                      text={isLoading ? "Đang tải dữ liệu..." : "Chưa có topic"}
                    />
                  )}
                </TableBody>
              </Table>

              <PaginationControls
                currentPage={topicPage}
                totalPages={topicTotalPages}
                setCurrentPage={setTopicPage}
              />
            </>
          )}

          {viewMode === "chapters" && (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-300">
                    <TableHead>Chapter</TableHead>
                    <TableHead>Chapter cha</TableHead>
                    <TableHead>Thứ tự</TableHead>
                    <TableHead>Ngày tạo</TableHead>
                    <TableHead>Ngày cập nhật</TableHead>
                    <TableHead className="text-center">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {chapterRows.length > 0 ? (
                    paginatedChapterRows.map((chapter) => {
                      const childCount = getChildCount(chapter.id);
                      const parent = chapters.find(
                        (item) => item.id === chapter.parent_id,
                      );
                      return (
                        <TableRow key={chapter.id} className="border-gray-300">
                          <TableCell className="font-medium">
                            {chapter.name}
                          </TableCell>
                          <TableCell>{parent?.name ?? "Không có"}</TableCell>
                          <TableCell>{chapter.order}</TableCell>
                          <TableCell>
                            {formatDate(chapter.created_at)}
                          </TableCell>
                          <TableCell>
                            {formatDate(chapter.updated_at)}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-[#0066cc] hover:text-[#0066cc] font-medium hover:cursor-pointer"
                                onClick={() =>
                                  childCount > 0
                                    ? openChapterChildren(chapter)
                                    : openChapterQuestions(chapter).catch(() =>
                                        toast.error("Không thể tải câu hỏi"),
                                      )
                                }
                              >
                                {childCount > 0
                                  ? "Quản lý Chapter con"
                                  : "Quản lý Câu hỏi"}
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 hover:cursor-pointer"
                                onClick={() => openEditChapterDialog(chapter)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <DeleteButton
                                title="Xoá chapter?"
                                description="Chapter này cùng toàn bộ Chapter con và Câu hỏi thuộc các Chapter đó sẽ bị xoá. Hành động này không thể hoàn tác."
                                onConfirm={() =>
                                  handleDeleteChapter(chapter.id)
                                }
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <EmptyRow
                      colSpan={6}
                      text={
                        isLoading
                          ? "Đang tải dữ liệu..."
                          : "Chưa có chapter ở cấp này"
                      }
                    />
                  )}
                </TableBody>
              </Table>

              <PaginationControls
                currentPage={chapterPage}
                totalPages={chapterTotalPages}
                setCurrentPage={setChapterPage}
              />
            </>
          )}

          {viewMode === "questions" && (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-300">
                    <TableHead className="w-[34%]">Câu hỏi</TableHead>
                    <TableHead>Question type</TableHead>
                    <TableHead>Question Format</TableHead>
                    <TableHead>Answer</TableHead>
                    <TableHead>Ngày tạo</TableHead>
                    <TableHead>Ngày cập nhật</TableHead>
                    <TableHead className="text-center">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {questionRows.length > 0 ? (
                    paginatedQuestionRows.map((question) => (
                      <TableRow key={question.id} className="border-gray-300">
                        <TableCell className="w-[34%] max-w-[420px]">
                          <div
                            className="line-clamp-2 max-w-[420px] overflow-hidden text-sm leading-5"
                            title={question.question_text}
                          >
                            <MathRenderer
                              content={getQuestionPreviewText(
                                question.question_text,
                              )}
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <QuestionTypeBadge type={question.question_type} />
                        </TableCell>
                        <TableCell>
                          <QuestionFormatBadge
                            format={question.question_format}
                          />
                        </TableCell>
                        <TableCell className="max-w-[180px] truncate">
                          {getQuestionAnswerText(question)}
                        </TableCell>
                        <TableCell>{formatDate(question.created_at)}</TableCell>
                        <TableCell>{formatDate(question.updated_at)}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-[#0066cc] hover:text-[#0066cc] font-medium hover:cursor-pointer"
                              disabled={loadingDetailId === question.id}
                              onClick={() => openQuestionDetail(question.id)}
                            >
                              {loadingDetailId === question.id ? (
                                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                              ) : (
                                <Eye className="mr-1 h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 hover:cursor-pointer"
                              disabled={loadingEditId === question.id}
                              title="Cập nhật câu hỏi"
                              onClick={() =>
                                openEditQuestionDialog(question.id)
                              }
                            >
                              {loadingEditId === question.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Pencil className="h-4 w-4" />
                              )}
                            </Button>
                            <DeleteButton
                              title="Xoá câu hỏi?"
                              description="Câu hỏi sẽ bị xoá khỏi ngân hàng câu hỏi."
                              onConfirm={() =>
                                handleDeleteQuestion(question.id)
                              }
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <EmptyRow
                      colSpan={7}
                      text={
                        isLoading ? "Đang tải dữ liệu..." : "Chưa có câu hỏi"
                      }
                    />
                  )}
                </TableBody>
              </Table>

              <PaginationControls
                currentPage={questionPage}
                totalPages={questionTotalPages}
                setCurrentPage={setQuestionPage}
              />
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={isTopicDialogOpen} onOpenChange={setIsTopicDialogOpen}>
        <DialogContent className="bg-white border-gray-300">
          <DialogHeader>
            <DialogTitle>Tạo Topic</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Tên topic</Label>
            <Input
              value={topicName}
              onChange={(event) => setTopicName(event.target.value)}
              className="bg-white border-gray-300"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={resetTopicDialog}
              className="hover:cursor-pointer"
            >
              Huỷ
            </Button>
            <Button
              onClick={() =>
                handleCreateTopic().catch(() =>
                  toast.error("Không thể tạo topic"),
                )
              }
              className="bg-[#0066cc] hover:bg-[#0052a3] text-white hover:cursor-pointer"
            >
              Tạo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isChapterDialogOpen} onOpenChange={setIsChapterDialogOpen}>
        <DialogContent className="bg-white border-gray-300">
          <DialogHeader>
            <DialogTitle>
              {editingChapterId ? "Cập nhật Chapter" : "Tạo Chapter"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Tên chapter</Label>
              <Input
                value={chapterForm.name}
                onChange={(event) =>
                  setChapterForm((prev) => ({
                    ...prev,
                    name: event.target.value,
                  }))
                }
                className="bg-white border-gray-300"
              />
            </div>
            <div className="space-y-2">
              <Label>Parent</Label>
              <Select
                value={chapterForm.parent_id || "none"}
                onValueChange={(value) =>
                  setChapterForm((prev) => ({
                    ...prev,
                    parent_id: value === "none" ? "" : value,
                  }))
                }
              >
                <SelectTrigger className="bg-white border-gray-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-300">
                  <SelectItem value="none">Không có</SelectItem>
                  {chapters
                    .filter(
                      (chapter) =>
                        chapter.topic_id === selectedTopic?.id &&
                        chapter.id !== editingChapterId,
                    )
                    .map((chapter) => (
                      <SelectItem key={chapter.id} value={chapter.id}>
                        {chapter.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Order</Label>
              <Input
                type="number"
                min={0}
                value={chapterForm.order}
                onChange={(event) =>
                  setChapterForm((prev) => ({
                    ...prev,
                    order: Number(event.target.value),
                  }))
                }
                className="bg-white border-gray-300"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={resetChapterDialog}
              className="hover:cursor-pointer"
            >
              Huỷ
            </Button>
            <Button
              onClick={() =>
                handleSaveChapter().catch(() =>
                  toast.error("Không thể lưu chapter"),
                )
              }
              className="bg-[#0066cc] hover:bg-[#0052a3] text-white hover:cursor-pointer"
            >
              Lưu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <QuestionDialog
        open={isQuestionDialogOpen}
        onOpenChange={(open) => {
          if (open) {
            setIsQuestionDialogOpen(true);
            return;
          }
          if (isQuestionSubmitting) return;
          resetQuestionDialog();
        }}
        mode={editingQuestionId ? "edit" : "create"}
        questionForm={questionForm}
        setQuestionForm={setQuestionForm}
        selectedFiles={selectedFiles}
        setSelectedFiles={setSelectedFiles}
        existingFiles={editingQuestionFiles}
        replaceFiles={replaceQuestionFiles}
        setReplaceFiles={setReplaceQuestionFiles}
        isSubmitting={isQuestionSubmitting}
        onCancel={resetQuestionDialog}
        onSubmit={
          editingQuestionId ? handleUpdateQuestion : handleCreateQuestion
        }
      />

      <QuestionDetailDialog
        question={detailQuestion}
        onOpenChange={(open) => !open && setDetailQuestion(null)}
        parseQuestionOptions={parseQuestionOptions}
        getQuestionAnswerText={getQuestionAnswerText}
      />

      <QuestionImportDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        topics={topics}
        onCompleted={refreshAll}
      />
    </div>
  );
}

function PaginationControls({
  currentPage,
  totalPages,
  setCurrentPage,
}: {
  currentPage: number;
  totalPages: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
}) {
  if (totalPages <= 0) return null;

  return (
    <div className="flex items-center justify-end space-x-2 py-4">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
        className="bg-[#0066cc] hover:bg-[#0052a3] border-none text-white hover:cursor-pointer"
        disabled={currentPage === 1}
      >
        <ChevronLeft className="h-4 w-4" />
        Trước
      </Button>
      <div className="text-sm font-medium">
        Trang {currentPage} / {totalPages}
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
        className="bg-[#0066cc] hover:bg-[#0052a3] border-none text-white hover:cursor-pointer"
        disabled={currentPage === totalPages}
      >
        Sau
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

function QuestionTypeBadge({ type }: { type: QuestionType }) {
  const config = questionTypeConfig[type];
  const Icon = config.Icon;

  return (
    <div
      className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full ${config.bgColor} px-3 py-1.5`}
    >
      <Icon className={`h-3.5 w-3.5 ${config.color}`} />
      <span className={`text-xs font-semibold ${config.color}`}>
        {config.label}
      </span>
    </div>
  );
}

function QuestionFormatBadge({ format }: { format: QuestionFormat }) {
  const config = questionFormatConfig[format];

  return (
    <div
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full ${config.bgColor} px-3 py-1.5`}
    >
      <div className="flex gap-0.5">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className={`h-2 w-2 rounded-full bg-current ${config.color} ${
              index < config.level ? "" : "opacity-30"
            }`}
          />
        ))}
      </div>
      <span className={`text-xs font-semibold ${config.color}`}>
        {config.label}
      </span>
    </div>
  );
}

function EmptyRow({ colSpan, text }: { colSpan: number; text: string }) {
  return (
    <TableRow className="border-gray-300">
      <TableCell colSpan={colSpan} className="h-72 text-center">
        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="p-4 bg-gray-50 rounded-full">
            <FileQuestion className="h-10 w-10 text-gray-400" />
          </div>
          <div className="space-y-1">
            <p className="text-lg font-medium text-gray-900">{text}</p>
          </div>
        </div>
      </TableCell>
    </TableRow>
  );
}

function DeleteButton({
  title,
  description,
  onConfirm,
}: {
  title: string;
  description: string;
  onConfirm: () => Promise<void>;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-red-600 hover:text-red-700 hover:cursor-pointer"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="bg-white border-gray-300">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="hover:cursor-pointer">
            Huỷ
          </AlertDialogCancel>
          <AlertDialogAction
            className="bg-red-600 hover:bg-red-700 text-white hover:cursor-pointer"
            onClick={() =>
              onConfirm().catch(() => toast.error("Không thể xoá dữ liệu"))
            }
          >
            Xoá
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function QuestionFilesList({ files }: { files?: QuestionFile[] }) {
  if (!files?.length) {
    return (
      <div className="rounded-md border border-dashed border-gray-300 bg-white px-3 py-4 text-sm text-gray-500">
        Không có file đính kèm
      </div>
    );
  }

  return (
    <div className="grid min-w-0 max-w-full gap-2">
      {files.map((item) => {
        const fileSize = formatFileSize(item.file.size);

        return (
          <div
            key={item.file.id}
            className="flex min-w-0 max-w-full flex-col gap-3 overflow-hidden rounded-md border border-gray-300 bg-white px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-gray-50 text-gray-600">
                {fileIcon(item.file.type)}
              </div>
              <div className="min-w-0 flex-1 overflow-hidden">
                <div
                  className="block max-w-full truncate font-medium text-gray-900"
                  title={item.file.name}
                >
                  {item.file.name}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                  <Badge variant="outline" className="h-5 px-2">
                    {item.file.type}
                  </Badge>
                  {fileSize && <span>{fileSize}</span>}
                </div>
              </div>
            </div>

            {item.file.url && (
              <Button
                asChild
                variant="outline"
                size="sm"
                className="shrink-0 self-start border-gray-300 hover:cursor-pointer sm:self-center"
              >
                <a href={item.file.url} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  Mở file
                </a>
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function SelectedFilesList({ files }: { files: File[] }) {
  return (
    <div className="grid gap-2 md:grid-cols-2">
      {files.map((file, index) => {
        const type = getFileType(file);
        return (
          <div
            key={`${file.name}-${index}`}
            className="flex min-w-0 items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
          >
            {type ? fileIcon(type) : <FileQuestion className="h-4 w-4" />}
            <span className="min-w-0 flex-1 truncate" title={file.name}>
              {file.name}
            </span>
            {type && <Badge variant="outline">{type}</Badge>}
          </div>
        );
      })}
    </div>
  );
}

function QuestionDialog({
  open,
  onOpenChange,
  mode,
  questionForm,
  setQuestionForm,
  selectedFiles,
  setSelectedFiles,
  existingFiles,
  replaceFiles,
  setReplaceFiles,
  isSubmitting,
  onCancel,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  questionForm: QuestionForm;
  setQuestionForm: React.Dispatch<React.SetStateAction<QuestionForm>>;
  selectedFiles: File[];
  setSelectedFiles: React.Dispatch<React.SetStateAction<File[]>>;
  existingFiles: QuestionFile[];
  replaceFiles: boolean;
  setReplaceFiles: React.Dispatch<React.SetStateAction<boolean>>;
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: () => Promise<void>;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto bg-white border-gray-300">
        <DialogHeader>
          <DialogTitle>
            {mode === "edit" ? "Cập nhật Câu hỏi" : "Tạo Câu hỏi"}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="space-y-2">
            <Label>Nội dung câu hỏi</Label>
            <MathInput
              value={questionForm.question_text}
              onChange={(value) =>
                setQuestionForm((prev) => ({ ...prev, question_text: value }))
              }
              placeholder="Nhập nội dung câu hỏi"
              className="bg-white border-gray-300"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Question type</Label>
              <Select
                value={questionForm.question_type}
                onValueChange={(value) =>
                  setQuestionForm((prev) => ({
                    ...prev,
                    question_type: value as QuestionType,
                    options: value === "ESSAY" ? emptyOptions() : prev.options,
                  }))
                }
              >
                <SelectTrigger className="bg-white border-gray-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-300">
                  <SelectItem value="SINGLE_CHOICE">Một đáp án</SelectItem>
                  <SelectItem value="MULTIPLE_CHOICE">Nhiều đáp án</SelectItem>
                  <SelectItem value="ESSAY">Tự luận</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Question Format</Label>
              <Select
                value={questionForm.question_format}
                onValueChange={(value) =>
                  setQuestionForm((prev) => ({
                    ...prev,
                    question_format: value as QuestionFormat,
                  }))
                }
              >
                <SelectTrigger className="bg-white border-gray-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-300">
                  <SelectItem value="KNOWLEDGE">Nhận biết</SelectItem>
                  <SelectItem value="UNDERSTANDING">Thông hiểu</SelectItem>
                  <SelectItem value="APPLYING">Vận dụng</SelectItem>
                  <SelectItem value="ADVANCED">Nâng cao</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {questionForm.question_type === "ESSAY" ? (
            <div className="space-y-2">
              <Label>Answer</Label>
              <MathInput
                value={questionForm.correct_answer}
                onChange={(value) =>
                  setQuestionForm((prev) => ({
                    ...prev,
                    correct_answer: value,
                  }))
                }
                placeholder="Nhập đáp án tham khảo"
                className="bg-white border-gray-300"
              />
            </div>
          ) : (
            <QuestionOptionsEditor
              questionForm={questionForm}
              setQuestionForm={setQuestionForm}
            />
          )}

          {mode === "edit" ? (
            <div className="min-w-0 space-y-4">
              <div className="min-w-0 space-y-2">
                <Label>File đính kèm hiện tại</Label>
                <QuestionFilesList
                  files={replaceFiles ? undefined : existingFiles}
                />
              </div>

              <div className="space-y-2">
                <Label>File thay thế</Label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <label className="flex flex-1 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-gray-300 bg-white p-5 text-sm text-gray-600 hover:border-[#0066cc]">
                    <Upload className="mb-2 h-5 w-5" />
                    Chọn audio, video hoặc image
                    <Input
                      type="file"
                      multiple
                      accept="image/*,audio/*,video/*"
                      className="hidden"
                      onChange={(event) => {
                        const files = Array.from(event.target.files ?? []);
                        if (!files.length) return;
                        const validFiles = files.filter((file) =>
                          getFileType(file),
                        );
                        if (validFiles.length !== files.length) {
                          toast.error("Chỉ hỗ trợ audio, video hoặc image");
                        }
                        if (validFiles.length) {
                          setSelectedFiles(validFiles);
                          setReplaceFiles(true);
                        }
                      }}
                    />
                  </label>

                  <div className="flex gap-2 sm:flex-col">
                    <Button
                      type="button"
                      variant="outline"
                      className="border-gray-300 hover:cursor-pointer"
                      onClick={() => {
                        setSelectedFiles([]);
                        setReplaceFiles(false);
                      }}
                    >
                      Giữ file hiện tại
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:cursor-pointer"
                      onClick={() => {
                        setSelectedFiles([]);
                        setReplaceFiles(true);
                      }}
                    >
                      Xoá file hiện tại
                    </Button>
                  </div>
                </div>

                {replaceFiles && selectedFiles.length > 0 && (
                  <SelectedFilesList files={selectedFiles} />
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>File đính kèm</Label>
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-gray-300 bg-white p-5 text-sm text-gray-600 hover:border-[#0066cc]">
                <Upload className="mb-2 h-5 w-5" />
                Chọn audio, video hoặc image
                <Input
                  type="file"
                  multiple
                  accept="image/*,audio/*,video/*"
                  className="hidden"
                  onChange={(event) => {
                    const files = Array.from(event.target.files ?? []);
                    const validFiles = files.filter((file) =>
                      getFileType(file),
                    );
                    if (validFiles.length !== files.length) {
                      toast.error("Chỉ hỗ trợ audio, video hoặc image");
                    }
                    setSelectedFiles(validFiles);
                  }}
                />
              </label>
              {selectedFiles.length > 0 && (
                <SelectedFilesList files={selectedFiles} />
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
            className="hover:cursor-pointer"
          >
            Huỷ
          </Button>
          <Button
            disabled={isSubmitting}
            onClick={() =>
              onSubmit().catch(() =>
                toast.error(
                  mode === "edit"
                    ? "Không thể cập nhật câu hỏi"
                    : "Không thể tạo câu hỏi",
                ),
              )
            }
            className="bg-[#0066cc] hover:bg-[#0052a3] text-white hover:cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang xử lý...
              </>
            ) : mode === "edit" ? (
              "Lưu"
            ) : (
              "Tạo"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function QuestionOptionsEditor({
  questionForm,
  setQuestionForm,
}: {
  questionForm: QuestionForm;
  setQuestionForm: React.Dispatch<React.SetStateAction<QuestionForm>>;
}) {
  if (questionForm.question_type === "SINGLE_CHOICE") {
    return (
      <div className="space-y-3">
        <Label>Answer</Label>
        <RadioGroup
          value={String(
            questionForm.options.findIndex((option) => option.isCorrect),
          )}
          onValueChange={(value) => {
            const selected = Number(value);
            setQuestionForm((prev) => ({
              ...prev,
              options: prev.options.map((option, index) => ({
                ...option,
                isCorrect: index === selected,
              })),
            }));
          }}
        >
          {questionForm.options.map((option, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="w-5 text-sm font-medium">
                {optionLabels[index]}
              </span>
              <MathInput
                value={option.text}
                onChange={(value) => {
                  const next = [...questionForm.options];
                  next[index] = { ...next[index], text: value };
                  setQuestionForm((prev) => ({ ...prev, options: next }));
                }}
                placeholder={`Lựa chọn ${optionLabels[index]}`}
                className="bg-white border-gray-300"
              />
              <RadioGroupItem value={String(index)} />
            </div>
          ))}
        </RadioGroup>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Label>Answer</Label>
      {questionForm.options.map((option, index) => (
        <div key={index} className="flex items-center gap-2">
          <span className="w-5 text-sm font-medium">{optionLabels[index]}</span>
          <MathInput
            value={option.text}
            onChange={(value) => {
              const next = [...questionForm.options];
              next[index] = { ...next[index], text: value };
              setQuestionForm((prev) => ({ ...prev, options: next }));
            }}
            placeholder={`Lựa chọn ${optionLabels[index]}`}
            className="bg-white border-gray-300"
          />
          <Checkbox
            checked={option.isCorrect}
            onCheckedChange={(checked) => {
              const next = [...questionForm.options];
              next[index] = { ...next[index], isCorrect: Boolean(checked) };
              setQuestionForm((prev) => ({ ...prev, options: next }));
            }}
          />
        </div>
      ))}
    </div>
  );
}

function QuestionDetailDialog({
  question,
  onOpenChange,
  parseQuestionOptions,
  getQuestionAnswerText,
}: {
  question: Question | null;
  onOpenChange: (open: boolean) => void;
  parseQuestionOptions: (question: Question) => ParsedQuestionOption[];
  getQuestionAnswerText: (question: Question) => string;
}) {
  return (
    <Dialog open={Boolean(question)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] w-[calc(100vw-2rem)] max-w-3xl overflow-y-auto overflow-x-hidden bg-white border-gray-300">
        <DialogHeader>
          <DialogTitle>Chi tiết câu hỏi</DialogTitle>
        </DialogHeader>
        {question && (
          <div className="min-w-0 space-y-4">
            <div className="min-w-0 overflow-hidden rounded-md border border-gray-300 bg-white p-3">
              <MathRenderer content={question.question_text} />
            </div>
            <div className="grid gap-3 grid-rows-3">
              <div>
                <Label>Question type</Label>
                <div className="mt-1 text-sm">
                  <QuestionTypeBadge type={question.question_type} />
                </div>
              </div>
              <div>
                <Label>Question Format</Label>
                <div className="mt-1 text-sm">
                  <QuestionFormatBadge format={question.question_format} />
                </div>
              </div>
              <div>
                <Label>Answer</Label>
                <div className="mt-1 text-sm">
                  {getQuestionAnswerText(question)}
                </div>
              </div>
            </div>
            {parseQuestionOptions(question).length > 0 && (
              <div className="space-y-2">
                <Label>Options</Label>
                <div className="grid gap-2">
                  {parseQuestionOptions(question).map((option, index) => (
                    <div
                      key={`${question.id}-${index}`}
                      className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                    >
                      {option.label ?? optionLabels[index]}. {option.text}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {question.files?.length ? (
              <div className="min-w-0 space-y-2">
                <Label>Files</Label>
                <div className="grid min-w-0 max-w-full gap-2">
                  {question.files.map((item) => {
                    const fileSize = formatFileSize(item.file.size);

                    return (
                      <div
                        key={item.file.id}
                        className="flex min-w-0 max-w-full flex-col gap-3 overflow-hidden rounded-md border border-gray-300 bg-white px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-gray-50 text-gray-600">
                            {fileIcon(item.file.type)}
                          </div>
                          <div className="min-w-0 flex-1 overflow-hidden">
                            <div
                              className="block max-w-full truncate font-medium text-gray-900"
                              title={item.file.name}
                            >
                              {item.file.name}
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                              <Badge variant="outline" className="h-5 px-2">
                                {item.file.type}
                              </Badge>
                              {fileSize && <span>{fileSize}</span>}
                            </div>
                          </div>
                        </div>

                        {item.file.url && (
                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="shrink-0 self-start border-gray-300 hover:cursor-pointer sm:self-center"
                          >
                            <a
                              href={item.file.url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <ExternalLink className="h-4 w-4" />
                              Mở file
                            </a>
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Files</Label>
                <div className="rounded-md border border-dashed border-gray-300 bg-white px-3 py-4 text-sm text-gray-500">
                  Không có file đính kèm
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
