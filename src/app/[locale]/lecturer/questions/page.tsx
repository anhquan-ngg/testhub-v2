"use client";

import { chapterPath } from "@/lib/chapter-tree";
import { useTranslations } from "next-intl";
import axios from "axios";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  BookOpen,
  List,
  ListTree,
  Plus,
  Search,
  Sparkles,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link } from "@/i18n/navigation";
import { ENDPOINTS } from "@/constants/endpoints";
import { fetchAllPages } from "@/lib/pagination";
import apiClient from "@/lib/api-client";
import { IconTooltip } from "@/components/ui/icon-tooltip";
import { ChapterSidebar } from "./_components/chapter-sidebar";
import { ChapterList } from "./_components/chapter-list";
import { ChapterTreeView } from "./_components/chapter-tree-view";
import { QuestionDetailDialog } from "./_components/question-detail-dialog";
import { QuestionDialog } from "./_components/question-dialog";
import { QuestionEmptyState } from "./_components/question-empty-state";
import { QuestionList } from "./_components/question-list";
import { TopicList } from "./_components/topic-list";
import { ITEMS_PER_PAGE, initialQuestionForm } from "./constants";
import {
  getFileType,
  getQuestionFormFromQuestion,
} from "./utils";
import type {
  BreadcrumbTarget,
  Chapter,
  FileRecord,
  Question,
  QuestionFile,
  QuestionForm,
  QuestionFormat,
  QuestionType,
  Topic,
  ViewMode,
} from "./types";

type ChapterLayout = "list" | "tree";

const QUESTION_TYPES: QuestionType[] = ["SINGLE_CHOICE", "MULTIPLE_CHOICE", "ESSAY"];
const QUESTION_FORMATS: QuestionFormat[] = ["KNOWLEDGE", "UNDERSTANDING", "APPLYING", "ADVANCED"];


export default function LecturerQuestions() {
  const t = useTranslations("lecturer.questions");
  const generationText = useTranslations("shared.questionGeneration");
  const documentText = useTranslations("shared.learningDocuments");
  const [topics, setTopics] = useState<Topic[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("topics");
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [chapterStack, setChapterStack] = useState<Chapter[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<QuestionType | "ALL">("ALL");
  const [formatFilter, setFormatFilter] = useState<QuestionFormat | "ALL">(
    "ALL",
  );
  const [isLoading, setIsLoading] = useState(false);
  const [chapterLayout, setChapterLayout] = useState<ChapterLayout>("list");
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(
    () => new Set(),
  );
  const navKeyRef = useRef<string | null>(null);
  const hasStartedUrlRestore = useRef(false);
  const [isUrlReady, setIsUrlReady] = useState(false);
  const [topicPage, setTopicPage] = useState(1);
  const [chapterPage, setChapterPage] = useState(1);
  const [questionPage, setQuestionPage] = useState(1);

  const [isTopicDialogOpen, setIsTopicDialogOpen] = useState(false);
  const [isChapterDialogOpen, setIsChapterDialogOpen] = useState(false);
  const [isQuestionDialogOpen, setIsQuestionDialogOpen] = useState(false);
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
    setTopics(await fetchAllPages<Topic>(ENDPOINTS.TOPICS.BASE, {}));
  }, []);
  const fetchChapters = useCallback(async (topicId?: string) => {
    setChapters(await fetchAllPages<Chapter>(ENDPOINTS.CHAPTERS.BASE, { ...(topicId && { topic_id: topicId }) }));
  }, []);
  const fetchQuestions = useCallback(async (chapterId?: string) => {
    if (!chapterId) {
      setQuestions([]);
      return;
    }
    setQuestions(await fetchAllPages<Question>(ENDPOINTS.QUESTIONS.BASE, { chapter_id: chapterId }));
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
      toast.error(t("unableToLoadQuestionBankData")),
    );
  }, [refreshAll, t]);

  const topicRows = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return topics;
    return topics.filter((topic) => topic.name.toLowerCase().includes(keyword));
  }, [searchTerm, topics]);

  const chapterRows = useMemo(() => {
    const parentId = currentChapter?.id ?? null;
    const keyword = searchTerm.trim().toLowerCase();
    return chapters
      .filter((chapter) => (chapter.parent_id ?? null) === parentId)
      .filter(
        (chapter) => !keyword || chapter.name.toLowerCase().includes(keyword),
      )
      .sort((a, b) => a.order - b.order);
  }, [chapters, currentChapter?.id, searchTerm]);

  const questionsInChapter = useMemo(
    () =>
      questions.filter(
        (question) =>
          !currentChapter || question.chapter_id === currentChapter.id,
      ),
    [currentChapter, questions],
  );

  const questionRows = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    return questionsInChapter.filter((question) => {
      const matchesSearch =
        !keyword || question.question_text.toLowerCase().includes(keyword);
      const matchesType =
        typeFilter === "ALL" || question.question_type === typeFilter;
      const matchesFormat =
        formatFilter === "ALL" || question.question_format === formatFilter;
      return matchesSearch && matchesType && matchesFormat;
    });
  }, [formatFilter, questionsInChapter, searchTerm, typeFilter]);

  const isQuestionFiltering =
    searchTerm.trim() !== "" || typeFilter !== "ALL" || formatFilter !== "ALL";

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

  const chaptersById = useMemo(()=>new Map(chapters.map(chapter=>[chapter.id,chapter])),[chapters]);

  const getChapterPathStack = (chapter: Chapter) => {
    const path: Chapter[] = [];
    const seen = new Set<string>();
    let cursor: Chapter | undefined = chapter;
    while (cursor && !seen.has(cursor.id)) {
      seen.add(cursor.id);
      path.unshift(cursor);
      cursor = cursor.parent_id ? chaptersById.get(cursor.parent_id) : undefined;
    }
    return path;
  };

  useEffect(() => {
    setSelectedQuestionIds(new Set());
  }, [currentChapter?.id, viewMode, searchTerm, typeFilter, formatFilter, questionPage]);

  const applyUrlState = useCallback(async (params: URLSearchParams) => {
    const topicId = params.get("topic");
    if (!topicId) {
      setSelectedTopic(null);
      setChapterStack([]);
      setViewMode("topics");
      setSearchTerm("");
      setTypeFilter("ALL");
      setFormatFilter("ALL");
      return;
    }

    const [allTopics, topicChapters] = await Promise.all([
      fetchAllPages<Topic>(ENDPOINTS.TOPICS.BASE, {}),
      fetchAllPages<Chapter>(ENDPOINTS.CHAPTERS.BASE, { topic_id: topicId }),
    ]);
    const topic = allTopics.find((item) => item.id === topicId);
    if (!topic) return;

    const byId = new Map(topicChapters.map((item) => [item.id, item]));
    const stack: Chapter[] = [];
    const seen = new Set<string>();
    let cursor = byId.get(params.get("chapter") ?? "");
    while (cursor && !seen.has(cursor.id)) {
      seen.add(cursor.id);
      stack.unshift(cursor);
      cursor = cursor.parent_id ? byId.get(cursor.parent_id) : undefined;
    }

    const type = params.get("type") as QuestionType | null;
    const format = params.get("format") as QuestionFormat | null;
    setSelectedTopic(topic);
    setChapterStack(stack);
    setViewMode(
      stack.length > 0 && params.get("view") === "questions"
        ? "questions"
        : "chapters",
    );
    setSearchTerm(params.get("q") ?? "");
    setTypeFilter(type && QUESTION_TYPES.includes(type) ? type : "ALL");
    setFormatFilter(format && QUESTION_FORMATS.includes(format) ? format : "ALL");
    setChapterLayout(params.get("layout") === "tree" ? "tree" : "list");
  }, []);

  useEffect(() => {
    if (hasStartedUrlRestore.current) return;
    hasStartedUrlRestore.current = true;
    applyUrlState(new URLSearchParams(window.location.search))
      .catch(() => toast.error(t("unableToLoadQuestionBankData")))
      .finally(() => setIsUrlReady(true));
  }, [applyUrlState, t]);

  useEffect(() => {
    const handlePopState = () => {
      applyUrlState(new URLSearchParams(window.location.search)).catch(() =>
        toast.error(t("unableToLoadQuestionBankData")),
      );
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [applyUrlState, t]);

  useEffect(() => {
    if (!isUrlReady) return;
    const params = new URLSearchParams();
    if (selectedTopic) {
      params.set("topic", selectedTopic.id);
      if (currentChapter) params.set("chapter", currentChapter.id);
      if (viewMode === "questions") params.set("view", "questions");
      if (viewMode === "chapters" && chapterLayout === "tree") params.set("layout", "tree");
      if (viewMode !== "topics" && searchTerm.trim()) params.set("q", searchTerm.trim());
      if (viewMode === "questions") {
        if (typeFilter !== "ALL") params.set("type", typeFilter);
        if (formatFilter !== "ALL") params.set("format", formatFilter);
      }
    }
    const query = params.toString();
    const url = `${window.location.pathname}${query ? `?${query}` : ""}`;
    const navKey = `${selectedTopic?.id ?? ""}|${currentChapter?.id ?? ""}|${viewMode}`;
    const isNavigation = navKeyRef.current !== null && navKeyRef.current !== navKey;
    navKeyRef.current = navKey;
    if (url !== `${window.location.pathname}${window.location.search}`) {
      if (isNavigation) {
        window.history.pushState(window.history.state, "", url);
      } else {
        window.history.replaceState(window.history.state, "", url);
      }
    }
  }, [
    chapterLayout,
    currentChapter,
    formatFilter,
    isUrlReady,
    searchTerm,
    selectedTopic,
    typeFilter,
    viewMode,
  ]);

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

  const resetFilters = () => {
    setSearchTerm("");
    setTypeFilter("ALL");
    setFormatFilter("ALL");
  };

  const openTopic = async (topic: Topic) => {
    setSelectedTopic(topic);
    setChapterStack([]);
    resetFilters();
    setChapterPage(1);
    setViewMode("chapters");
    await fetchChapters(topic.id);
  };

  const openChapterChildren = (chapter: Chapter) => {
    setChapterStack((prev) => [...prev, chapter]);
    resetFilters();
    setChapterPage(1);
    setViewMode("chapters");
  };

  const openChapterQuestions = async (chapter: Chapter) => {
    setChapterStack((prev) =>
      prev.some((item) => item.id === chapter.id) ? prev : [...prev, chapter],
    );
    resetFilters();
    setQuestionPage(1);
    setViewMode("questions");
    await fetchQuestions(chapter.id);
  };

  const goToBreadcrumb = async (target: BreadcrumbTarget) => {
    const wasQuestions = viewMode === "questions";
    resetFilters();

    if (target.type === "root") {
      setSelectedTopic(null);
      setChapterStack([]);
      setTopicPage(1);
      setViewMode("topics");
      return;
    }

    setChapterStack((prev) =>
      target.type === "topic" ? [] : prev.slice(0, target.index + 1),
    );
    setChapterPage(1);
    setViewMode("chapters");
    if (wasQuestions) await fetchChapters(selectedTopic?.id);
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
      toast.error(t("pleaseEnterTopicName"));
      return;
    }

    await apiClient.post<Topic>(ENDPOINTS.TOPICS.BASE, {
      name: topicName.trim(),
    });
    toast.success(t("topicCreated"));
    resetTopicDialog();
    await fetchTopics();
  };

  const handleDeleteTopic = async (topicId: string) => {
    const res = await apiClient.delete<{
      chapters?: number;
      questions?: number;
    }>(ENDPOINTS.TOPICS.DETAIL(topicId));
    toast.success(t("topicDeletedWithCounts", { chapters: res.data.chapters ?? 0, questions: res.data.questions ?? 0 }));
    if (selectedTopic?.id === topicId) {
      setSelectedTopic(null);
      setChapterStack([]);
      setViewMode("topics");
    }
    await fetchTopics();
  };

  const handleSaveChapter = async () => {
    if (!chapterForm.topic_id || !chapterForm.name.trim()) {
      toast.error(t("pleaseEnterTopicAndChapterName"));
      return;
    }

    const payload = {
      topic_id: chapterForm.topic_id,
      parent_id: chapterForm.parent_id || (editingChapterId ? null : undefined),
      name: chapterForm.name.trim(),
      order: Number(chapterForm.order) || 0,
    };

    if (editingChapterId) {
      await apiClient.patch(
        ENDPOINTS.CHAPTERS.DETAIL(editingChapterId),
        payload,
      );
      toast.success(t("updatedChapters"));
    } else {
      await apiClient.post(ENDPOINTS.CHAPTERS.BASE, payload);
      toast.success(t("chapterCreated"));
    }

    resetChapterDialog();
    await fetchChapters(selectedTopic?.id);
  };

  const handleReorderChapters = async (orderedSiblings: Chapter[]) => {
    const changed = orderedSiblings
      .map((chapter, index) => ({ chapter, order: index }))
      .filter(({ chapter, order }) => chapter.order !== order);
    if (changed.length === 0) return;

    const previous = chapters;
    const nextOrders = new Map(changed.map(({ chapter, order }) => [chapter.id, order]));
    setChapters((prev) =>
      prev.map((chapter) =>
        nextOrders.has(chapter.id)
          ? { ...chapter, order: nextOrders.get(chapter.id) ?? chapter.order }
          : chapter,
      ),
    );

    try {
      await Promise.all(
        changed.map(({ chapter, order }) =>
          apiClient.patch(ENDPOINTS.CHAPTERS.DETAIL(chapter.id), { order }),
        ),
      );
      toast.success(t("chaptersReordered"));
    } catch {
      setChapters(previous);
      toast.error(t("unableToReorderChapters"));
    }
    await fetchChapters(selectedTopic?.id);
  };

  const handleDeleteChapter = async (chapterId: string) => {
    const deletedChapterIds = getDescendantChapterIds(chapterId);
    const res = await apiClient.delete<{
      chapters?: number;
      questions?: number;
    }>(ENDPOINTS.CHAPTERS.DETAIL(chapterId));
    toast.success(t("chapterDeletedWithCounts", { chapters: res.data.chapters ?? 0, questions: res.data.questions ?? 0 }));
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
        throw new Error(t("invalidMediaFile", { name: file.name }));

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
      throw new Error(t("multipleChoiceQuestionsRequireAtLeast"));
    }

    if (!isEssay && !activeOptions.some((option) => option.isCorrect)) {
      throw new Error(t("pleaseChooseTheCorrectAnswer"));
    }

    if (isEssay && !questionForm.correct_answer.trim()) {
      throw new Error(t("pleaseEnterTheCorrectAnswer"));
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
      toast.error(t("pleaseEnterTheFullChapterAnd"));
      return;
    }

    setIsQuestionSubmitting(true);
    try {
      const payload = await buildQuestionPayload();
      await apiClient.post(ENDPOINTS.QUESTIONS.BASE, payload);
      toast.success(t("questionCreated"));
      resetQuestionDialog();
      await fetchQuestions(currentChapter?.id);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("cannotCreateQuestion"),
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
      toast.error(t("pleaseEnterTheFullChapterAnd"));
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
      toast.success(t("updatedQuestion"));
      resetQuestionDialog();
      await fetchQuestions(currentChapter?.id);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("unableToUpdateQuestion"),
      );
    } finally {
      setIsQuestionSubmitting(false);
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    await apiClient.delete(ENDPOINTS.QUESTIONS.DETAIL(questionId));
    toast.success(t("questionDeleted"));
    await fetchQuestions(currentChapter?.id);
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedQuestionIds);
    const results = await Promise.allSettled(
      ids.map((id) => apiClient.delete(ENDPOINTS.QUESTIONS.DETAIL(id))),
    );
    const success = results.filter((result) => result.status === "fulfilled").length;
    const failed = ids.length - success;
    if (failed === 0) {
      toast.success(t("bulkDeleteSuccess", { count: success }));
    } else {
      toast.error(t("bulkDeletePartial", { success, failed }));
    }
    setSelectedQuestionIds(new Set());
    await fetchQuestions(currentChapter?.id);
  };

  const toggleQuestionSelection = (questionId: string, checked: boolean) => {
    setSelectedQuestionIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(questionId);
      else next.delete(questionId);
      return next;
    });
  };

  const openChapterQuestionsFromTree = (chapter: Chapter) => {
    setChapterStack(getChapterPathStack(chapter));
    resetFilters();
    setQuestionPage(1);
    setViewMode("questions");
  };

  const openAddSubChapterDialog = (parent: Chapter) => {
    setChapterForm({
      topic_id: parent.topic_id,
      parent_id: parent.id,
      name: "",
      order: chapters.filter((item) => item.parent_id === parent.id).length,
    });
    setEditingChapterId(null);
    setIsChapterDialogOpen(true);
  };

  const openQuestionDetail = async (questionId: string) => {
    setLoadingDetailId(questionId);
    try {
      const res = await apiClient.get<Question>(
        ENDPOINTS.QUESTIONS.DETAIL(questionId),
      );
      setDetailQuestion(res.data);
    } catch {
      toast.error(t("unableToLoadQuestionDetails"));
    } finally {
      setLoadingDetailId(null);
    }
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
      toast.error(t("unableToLoadQuestionForUpdate"));
    } finally {
      setLoadingEditId(null);
    }
  };


  const breadcrumbItems: {
    key: string;
    label: string;
    target: BreadcrumbTarget;
  }[] = [
    { key: "root", label: t("topicsRoot"), target: { type: "root" } },
    ...(selectedTopic
      ? [
          {
            key: `topic-${selectedTopic.id}`,
            label: selectedTopic.name,
            target: { type: "topic" } as BreadcrumbTarget,
          },
        ]
      : []),
    ...chapterStack.map((chapter, index) => ({
      key: `chapter-${chapter.id}`,
      label: chapter.name,
      target: { type: "chapter", index } as BreadcrumbTarget,
    })),
  ];

  const showChapterSidebar =
    viewMode === "questions" && selectedTopic !== null && chapters.length > 0;
  const showQuestionEmptyState =
    !isLoading && questionsInChapter.length === 0 && !isQuestionFiltering;

  const panelTitle =    viewMode === "topics"
      ? t("topicManagement")
      : viewMode === "chapters"
        ? t("chapterManagement")
        : t("questionManagement");

  return (
    <div className="w-full max-w-full space-y-6 overflow-hidden">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-3">
          <div>
            <h2 className="text-2xl font-bold text-neutral-900">
              {t("questionBank")}</h2>
            <p className="mt-1 text-sm text-neutral-500">{t("questionBankSubtitle")}</p>
          </div>
          <nav aria-label={t("breadcrumbLabel")}>
            <ol className="flex flex-wrap items-center gap-1 text-sm text-gray-600">
              {breadcrumbItems.map((item, index) => {
                const isLast = index === breadcrumbItems.length - 1;
                return (
                  <li key={item.key} className="flex min-w-0 items-center gap-1">
                    {index > 0 && (
                      <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
                    )}
                    {isLast ? (
                      <span
                        className="max-w-[260px] truncate font-semibold text-neutral-900"
                        aria-current="page"
                        title={item.label}
                      >
                        {item.label}
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="max-w-[260px] truncate rounded-sm hover:cursor-pointer hover:text-[#0066cc] hover:underline"
                        title={item.label}
                        onClick={() =>
                          goToBreadcrumb(item.target).catch(() =>
                            toast.error(t("canTGoBack")),
                          )
                        }
                      >
                        {item.label}
                      </button>
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
        </div>

        <div className="flex flex-wrap gap-2">
          {selectedTopic && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="cursor-pointer gap-1.5 border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  {t("addQuestionsMenu")}
                  <ChevronDown className="h-4 w-4" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-white border-gray-300">
                <DropdownMenuItem asChild className="cursor-pointer gap-2 text-violet-700 focus:text-violet-800">
                  <Link href={{ pathname: "/lecturer/questions/generate", query: {
                    topic: selectedTopic.id,
                    ...(currentChapter ? { chapter: currentChapter.id } : {}),
                  } }}><Sparkles className="h-4 w-4" aria-hidden="true" />{generationText("title")}</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer gap-2 text-blue-700 focus:text-blue-800">
                  <Link href={{ pathname: "/lecturer/questions/import", query: {
                    topic: selectedTopic.id,
                    ...(currentChapter ? { chapter: currentChapter.id } : {}),
                  } }}><Upload className="h-4 w-4" aria-hidden="true" />{t("importWordExcel")}</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button asChild variant="outline" className="cursor-pointer gap-1.5 border-gray-300 bg-white">
            <Link href="/lecturer/questions/documents"><BookOpen className="h-4 w-4" />{documentText('title')}</Link>
          </Button>
        </div>
      </div>
      <div
        className={
          showChapterSidebar
            ? "grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]"
            : undefined
        }
      >
      {showChapterSidebar && selectedTopic && (
        <ChapterSidebar
          topicName={selectedTopic.name}
          chapters={chapters}
          activeChapterId={currentChapter?.id ?? null}
          onSelect={openChapterQuestionsFromTree}
        />
      )}
      <Card className="min-w-0 bg-white border-gray-300 shadow-sm space-y-4">
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
                  placeholder={t("searchTopics")}
                  className="pl-10 bg-white border-gray-300"
                />
              </div>
              <Button
                onClick={() => setIsTopicDialogOpen(true)}
                className="shrink-0 bg-[#0066cc] hover:bg-[#0052a3] text-white hover:cursor-pointer"
              >
                <Plus className="mr-2 h-4 w-4" />
                {t("createTopic")}</Button>
            </div>
          )}

          {viewMode === "chapters" && (
            <div className="flex w-full gap-2 sm:w-auto">
              <div className="relative min-w-0 flex-1 sm:w-[320px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(event) => {
                    setSearchTerm(event.target.value);
                    setChapterPage(1);
                  }}
                  placeholder={t("searchChapters")}
                  aria-label={t("searchChapters")}
                  className="pl-10 bg-white border-gray-300"
                />
              </div>
              <div className="flex shrink-0 rounded-md border border-gray-300 bg-white p-0.5">
                {(
                  [
                    { layout: "list", icon: List, label: t("viewList") },
                    { layout: "tree", icon: ListTree, label: t("viewTree") },
                  ] as const
                ).map(({ layout, icon: Icon, label }) => (
                  <IconTooltip key={layout} label={label}>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={label}
                      aria-pressed={chapterLayout === layout}
                      onClick={() => setChapterLayout(layout)}
                      className={`h-8 w-8 hover:cursor-pointer ${
                        chapterLayout === layout
                          ? "bg-blue-50 text-[#0066cc] hover:bg-blue-100"
                          : "text-gray-500 hover:bg-gray-100"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </Button>
                  </IconTooltip>
                ))}
              </div>
              <Button
                onClick={openCreateChapterDialog}
                className="shrink-0 bg-[#0066cc] hover:bg-[#0052a3] text-white hover:cursor-pointer"
              >
                <Plus className="mr-2 h-4 w-4" />
                {t("createChapter")}</Button>
            </div>
          )}

          {viewMode === "questions" && !showQuestionEmptyState && (
            <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
              <div className="relative min-w-[200px] flex-1 sm:w-[260px] sm:flex-none">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(event) => {
                    setSearchTerm(event.target.value);
                    setQuestionPage(1);
                  }}
                  placeholder={t("searchQuestions")}
                  aria-label={t("searchQuestions")}
                  className="pl-10 bg-white border-gray-300"
                />
              </div>
              <Select
                value={typeFilter}
                onValueChange={(value) => {
                  setTypeFilter(value as QuestionType | "ALL");
                  setQuestionPage(1);
                }}
              >
                <SelectTrigger
                  className="w-[170px] bg-white border-gray-300"
                  aria-label={t("questionTypeLabel")}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-300">
                  <SelectItem value="ALL">{t("allTypes")}</SelectItem>
                  <SelectItem value="SINGLE_CHOICE">{t("oneAnswer")}</SelectItem>
                  <SelectItem value="MULTIPLE_CHOICE">{t("manyAnswers")}</SelectItem>
                  <SelectItem value="ESSAY">{t("essay")}</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={formatFilter}
                onValueChange={(value) => {
                  setFormatFilter(value as QuestionFormat | "ALL");
                  setQuestionPage(1);
                }}
              >
                <SelectTrigger
                  className="w-[170px] bg-white border-gray-300"
                  aria-label={t("questionFormatLabel")}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-300">
                  <SelectItem value="ALL">{t("allFormats")}</SelectItem>
                  <SelectItem value="KNOWLEDGE">{t("recognize")}</SelectItem>
                  <SelectItem value="UNDERSTANDING">{t("understanding")}</SelectItem>
                  <SelectItem value="APPLYING">{t("manipulate")}</SelectItem>
                  <SelectItem value="ADVANCED">{t("advanced")}</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={openCreateQuestionDialog}
                className="shrink-0 bg-[#0066cc] hover:bg-[#0052a3] text-white hover:cursor-pointer"
              >
                <Plus className="mr-2 h-4 w-4" />
                {t("createQuestions")}</Button>
            </div>
          )}
        </CardHeader>

        <CardContent>
          {viewMode === "chapters" && chapterLayout === "list" && !isLoading && (
            <p className="mb-3 text-sm text-muted-foreground">
              {t("chapterCount", { count: chapterRows.length })}
            </p>
          )}
          {viewMode === "questions" && !isLoading && !showQuestionEmptyState && (
            <p className="mb-3 text-sm text-muted-foreground">
              {isQuestionFiltering
                ? t("questionCountFiltered", {
                    count: questionRows.length,
                    total: questionsInChapter.length,
                  })
                : t("questionCount", { count: questionsInChapter.length })}
            </p>
          )}
          {viewMode === "topics" && (
            <TopicList
              rows={paginatedTopicRows}
              hasAnyTopic={topicRows.length > 0}
              isLoading={isLoading}
              page={topicPage}
              totalPages={topicTotalPages}
              setPage={setTopicPage}
              onOpen={openTopic}
              onDelete={handleDeleteTopic}
            />
          )}

          {viewMode === "chapters" && chapterLayout === "tree" && (
            <ChapterTreeView
              chapters={chapters}
              rootParentId={currentChapter?.id ?? null}
              keyword={searchTerm}
              isLoading={isLoading}
              onOpenQuestions={openChapterQuestionsFromTree}
              onEdit={openEditChapterDialog}
              onAddChild={openAddSubChapterDialog}
              onDelete={handleDeleteChapter}
              onReorder={handleReorderChapters}
            />
          )}

          {viewMode === "chapters" && chapterLayout === "list" && (
            <ChapterList
              rows={paginatedChapterRows}
              hasAnyChapter={chapterRows.length > 0}
              isLoading={isLoading}
              isSearching={searchTerm.trim().length > 0}
              page={chapterPage}
              totalPages={chapterTotalPages}
              setPage={setChapterPage}
              getChildCount={getChildCount}
              onOpenChildren={openChapterChildren}
              onOpenQuestions={openChapterQuestions}
              onEdit={openEditChapterDialog}
              onDelete={handleDeleteChapter}
            />
          )}

          {viewMode === "questions" && (
            <QuestionList
              rows={paginatedQuestionRows}
              hasAnyQuestion={questionRows.length > 0}
              isLoading={isLoading}
              isFiltering={isQuestionFiltering}
              emptyState={
                selectedTopic && (
                  <QuestionEmptyState
                    topicId={selectedTopic.id}
                    chapterId={currentChapter?.id}
                    onCreate={openCreateQuestionDialog}
                  />
                )
              }
              page={questionPage}
              totalPages={questionTotalPages}
              setPage={setQuestionPage}
              selectedIds={selectedQuestionIds}
              onSelectAll={(checked) =>
                setSelectedQuestionIds(
                  checked ? new Set(paginatedQuestionRows.map((q) => q.id)) : new Set(),
                )
              }
              onToggleSelect={toggleQuestionSelection}
              onClearSelection={() => setSelectedQuestionIds(new Set())}
              onBulkDelete={handleBulkDelete}
              loadingDetailId={loadingDetailId}
              loadingEditId={loadingEditId}
              onView={openQuestionDetail}
              onEdit={openEditQuestionDialog}
              onDelete={handleDeleteQuestion}
            />
          )}
        </CardContent>
      </Card>
      </div>

      <Dialog open={isTopicDialogOpen} onOpenChange={setIsTopicDialogOpen}>
        <DialogContent className="bg-white border-gray-300">
          <DialogHeader>
            <DialogTitle>{t("createTopic")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>{t("topicName2")}</Label>
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
              {t("cancel")}</Button>
            <Button
              onClick={() =>
                handleCreateTopic().catch(() =>
                  toast.error(t("cannotCreateTopic")),
                )
              }
              className="bg-[#0066cc] hover:bg-[#0052a3] text-white hover:cursor-pointer"
            >
              {t("create")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isChapterDialogOpen} onOpenChange={setIsChapterDialogOpen}>
        <DialogContent className="bg-white border-gray-300">
          <DialogHeader>
            <DialogTitle>
              {editingChapterId ? t("updateChapters") : t("createChapter")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t("chapterName")}</Label>
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
              <Label>{t("parent")}</Label>
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
                  <SelectItem value="none">{t("doNotHave")}</SelectItem>
                  {chapters
                    .filter(
                      (chapter) =>
                        chapter.topic_id === selectedTopic?.id &&
                        (!editingChapterId || !getDescendantChapterIds(editingChapterId).has(chapter.id)),
                    )
                    .map((chapter) => (
                      <SelectItem key={chapter.id} value={chapter.id}>
                        {chapterPath(chapter.id,chaptersById,8)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("order")}</Label>
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
              {t("cancel")}</Button>
            <Button
              onClick={() =>
                handleSaveChapter().catch(() =>
                  toast.error(t("unableToSaveChapter")),
                )
              }
              className="bg-[#0066cc] hover:bg-[#0052a3] text-white hover:cursor-pointer"
            >
              {t("save")}</Button>
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
      />
    </div>
  );
}
