"use client";

import axios from "axios";
import Image from "next/image";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  ImageIcon,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Textarea } from "@/components/ui/textarea";
import { ENDPOINTS } from "@/constants/endpoints";
import apiClient from "@/lib/api-client";
import {
  ImportQuestionData,
  ImportQuestionOption,
  QuestionImportItem,
  QuestionImportRecord,
  QuestionImportSourceType,
} from "@/types/question-import";

type ChapterOption = {
  id: string;
  name: string;
  topic_id: string;
  parent_id?: string | null;
};

type TopicOption = {
  id: string;
  name: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Fixed topic (e.g. the exam's). When absent, the lecturer picks one. */
  topicId?: string | null;
  /** Topics offered in the picker when `topicId` is not fixed. */
  topics?: TopicOption[];
  defaultChapterId?: string | null;
  examId?: string;
  onCompleted: () => void | Promise<void>;
};

/** `chapterId` is an existing chapter, or NEW_CHAPTER to use `chapterName`. */
type EditForm = ImportQuestionData & { chapterId: string; chapterName: string };

const FROM_FILE = "__FROM_FILE__";
const NEW_CHAPTER = "__NEW_CHAPTER__";
const PATH_SEPARATOR = " > ";
const CHAPTER_PAGE_SIZE = 100;

/** Full "Parent > Child" label for each chapter, so same-named sub-chapters stay distinguishable. */
const buildChapterPaths = (chapters: ChapterOption[]) => {
  const byId = new Map(chapters.map((chapter) => [chapter.id, chapter]));
  const paths = new Map<string, string>();
  const pathOf = (chapter: ChapterOption, seen = new Set<string>()): string => {
    const cached = paths.get(chapter.id);
    if (cached) return cached;
    const parent =
      chapter.parent_id && !seen.has(chapter.id)
        ? byId.get(chapter.parent_id)
        : undefined;
    seen.add(chapter.id);
    const path = parent
      ? `${pathOf(parent, seen)}${PATH_SEPARATOR}${chapter.name}`
      : chapter.name;
    paths.set(chapter.id, path);
    return path;
  };
  chapters.forEach((chapter) => pathOf(chapter));
  return paths;
};
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const optionKeys = ["A", "B", "C", "D", "E", "F"];

const statusLabels: Record<QuestionImportRecord["status"], string> = {
  UPLOADING: "Đang tải file",
  QUEUED: "Đang chờ xử lý",
  PARSING: "Đang phân tích",
  REVIEW_REQUIRED: "Chờ duyệt",
  COMMITTING: "Đang tạo câu hỏi",
  COMPLETED: "Hoàn tất",
  FAILED: "Xử lý thất bại",
  CANCELLED: "Đã hủy",
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    return Array.isArray(message) ? message.join(", ") : message || fallback;
  }
  return error instanceof Error ? error.message : fallback;
};

export function QuestionImportDialog({
  open,
  onOpenChange,
  topicId,
  topics,
  defaultChapterId,
  examId,
  onCompleted,
}: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState(topicId ?? "");
  const [chapters, setChapters] = useState<ChapterOption[]>([]);
  const [isLoadingChapters, setIsLoadingChapters] = useState(false);
  const [chapterId, setChapterId] = useState(defaultChapterId ?? FROM_FILE);
  const [questionImport, setQuestionImport] =
    useState<QuestionImportRecord | null>(null);
  const [items, setItems] = useState<QuestionImportItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBusy, setIsBusy] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);

  const activeTopicId = topicId ?? selectedTopicId;
  const chapterPaths = useMemo(() => buildChapterPaths(chapters), [chapters]);
  const sortedChapters = useMemo(
    () =>
      [...chapters].sort((a, b) =>
        (chapterPaths.get(a.id) ?? "").localeCompare(
          chapterPaths.get(b.id) ?? "",
          "vi",
        ),
      ),
    [chapterPaths, chapters],
  );

  const validItems = useMemo(
    () => items.filter((item) => item.status === "VALID"),
    [items],
  );

  useEffect(() => {
    if (!open || questionImport) return;
    setChapterId(defaultChapterId ?? FROM_FILE);
  }, [defaultChapterId, open, questionImport]);

  useEffect(() => {
    if (topicId) setSelectedTopicId(topicId);
  }, [topicId]);

  useEffect(() => {
    setChapters([]);
    if (!open || !activeTopicId) {
      setIsLoadingChapters(false);
      return;
    }
    let cancelled = false;
    setIsLoadingChapters(true);
    // The API caps `limit` at 100, so fetch every page before building
    // paths — a missing parent would break the "Parent > Child" labels.
    const fetchPage = (page: number) =>
      apiClient.get<{ data: ChapterOption[]; total: number }>(
        ENDPOINTS.CHAPTERS.BASE,
        {
          params: {
            page,
            limit: CHAPTER_PAGE_SIZE,
            topic_id: activeTopicId,
          },
        },
      );
    (async () => {
      try {
        const first = await fetchPage(1);
        const pages = Math.ceil((first.data.total ?? 0) / CHAPTER_PAGE_SIZE);
        const rest = await Promise.all(
          Array.from({ length: Math.max(0, pages - 1) }, (_, index) =>
            fetchPage(index + 2),
          ),
        );
        if (!cancelled) {
          setChapters(
            [first, ...rest].flatMap((response) => response.data.data ?? []),
          );
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(getErrorMessage(error, "Không thể tải danh sách chapter"));
        }
      } finally {
        if (!cancelled) setIsLoadingChapters(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeTopicId, open]);

  useEffect(() => {
    if (!open || !questionImport) return;
    if (!["QUEUED", "PARSING", "COMMITTING"].includes(questionImport.status)) {
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const response = await apiClient.get<QuestionImportRecord>(
          ENDPOINTS.QUESTION_IMPORTS.DETAIL(questionImport.id),
        );
        if (!cancelled) setQuestionImport(response.data);
      } catch (error) {
        if (!cancelled) {
          toast.error(
            getErrorMessage(error, "Không thể cập nhật trạng thái import"),
          );
        }
      }
    }, 1500);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, questionImport]);

  useEffect(() => {
    if (questionImport?.status !== "REVIEW_REQUIRED" || items.length) return;
    void loadItems(questionImport.id);
  }, [items.length, questionImport?.id, questionImport?.status]);

  const loadItems = async (importId: string) => {
    setIsBusy(true);
    try {
      const first = await apiClient.get<{
        data: QuestionImportItem[];
        total: number;
      }>(ENDPOINTS.QUESTION_IMPORTS.ITEMS(importId), {
        params: { page: 1, limit: 100 },
      });
      const pages = Math.ceil(first.data.total / 100);
      const rest = await Promise.all(
        Array.from({ length: Math.max(0, pages - 1) }, (_, index) =>
          apiClient.get<{ data: QuestionImportItem[] }>(
            ENDPOINTS.QUESTION_IMPORTS.ITEMS(importId),
            { params: { page: index + 2, limit: 100 } },
          ),
        ),
      );
      const loaded = [
        first.data.data,
        ...rest.map((page) => page.data.data),
      ].flat();
      setItems(loaded);
      setSelectedIds(
        new Set(
          loaded
            .filter((item) => item.status === "VALID")
            .map((item) => item.id),
        ),
      );
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể tải dữ liệu review"));
    } finally {
      setIsBusy(false);
    }
  };

  const handleUpload = async () => {
    if (!activeTopicId || !file) {
      toast.error("Vui lòng chọn file và Topic");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error("File import không được vượt quá 20 MB");
      return;
    }
    const extension = file.name.toLowerCase().split(".").pop();
    const sourceType: QuestionImportSourceType | null =
      extension === "docx" ? "DOCX" : extension === "xlsx" ? "XLSX" : null;
    if (!sourceType) {
      toast.error("Chỉ hỗ trợ template .docx và .xlsx");
      return;
    }
    const mimeType =
      sourceType === "DOCX"
        ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    setIsBusy(true);
    try {
      const created = await apiClient.post<{
        import: QuestionImportRecord;
        upload_url: string;
      }>(ENDPOINTS.QUESTION_IMPORTS.BASE, {
        topic_id: activeTopicId,
        ...(chapterId !== FROM_FILE && { default_chapter_id: chapterId }),
        ...(examId && { exam_id: examId }),
        source_type: sourceType,
        file_name: file.name,
        mime_type: mimeType,
        size: file.size,
      });
      setQuestionImport(created.data.import);
      await axios.put(created.data.upload_url, file, {
        headers: { "Content-Type": mimeType },
        timeout: 120_000,
        withCredentials: false,
      });
      const completed = await apiClient.post<{
        status: QuestionImportRecord["status"];
      }>(ENDPOINTS.QUESTION_IMPORTS.COMPLETE(created.data.import.id));
      setQuestionImport({
        ...created.data.import,
        status: completed.data.status,
      });
    } catch (error) {
      setQuestionImport(null);
      toast.error(getErrorMessage(error, "Không thể tải và xử lý file import"));
    } finally {
      setIsBusy(false);
    }
  };

  const startEditing = (item: QuestionImportItem) => {
    const baseOptions = item.data.options.length
      ? item.data.options
      : optionKeys
          .slice(0, 2)
          .map((key) => ({ key, text: "", isCorrect: false }));
    const pendingPath = item.data.chapterPath?.join(PATH_SEPARATOR) ?? "";
    setEditingItemId(item.id);
    setEditForm({
      ...item.data,
      chapterId: pendingPath
        ? NEW_CHAPTER
        : (item.chapter_id ?? (chapterId === FROM_FILE ? "" : chapterId)),
      chapterName: pendingPath,
      options: baseOptions.map((option) => ({ ...option })),
    });
  };

  /** Label for the chapter a review row will land in. */
  const renderItemChapter = (item: QuestionImportItem) => {
    if (item.data.chapterPath?.length) {
      return (
        <div className="space-y-1">
          <Badge className="bg-amber-100 text-amber-800">Tạo mới</Badge>
          <div className="text-xs">
            {item.data.chapterPath.join(PATH_SEPARATOR)}
          </div>
        </div>
      );
    }
    if (item.chapter_id) {
      return (
        chapterPaths.get(item.chapter_id) ?? item.chapter?.name ?? "Chapter"
      );
    }
    return <span className="text-gray-500">Chưa xác định</span>;
  };

  const updateOption = (
    index: number,
    patch: Partial<ImportQuestionOption>,
  ) => {
    setEditForm((current) => {
      if (!current) return current;
      return {
        ...current,
        options: current.options.map((option, optionIndex) =>
          optionIndex === index ? { ...option, ...patch } : option,
        ),
      };
    });
  };

  const saveItem = async () => {
    if (!questionImport || !editingItemId || !editForm) return;
    setIsBusy(true);
    try {
      const response = await apiClient.patch<QuestionImportItem>(
        ENDPOINTS.QUESTION_IMPORTS.ITEM(questionImport.id, editingItemId),
        {
          ...(editForm.chapterId === NEW_CHAPTER
            ? editForm.chapterName.trim() && {
                chapter_name: editForm.chapterName.trim(),
              }
            : editForm.chapterId && { chapter_id: editForm.chapterId }),
          question_text: editForm.questionText,
          question_type: editForm.questionType,
          question_format: editForm.questionFormat,
          options: editForm.options.filter((option) => option.text.trim()),
          correct_answer: editForm.correctAnswer ?? undefined,
        },
      );
      setItems((current) =>
        current.map((item) =>
          item.id === editingItemId
            ? { ...response.data, assets: item.assets }
            : item,
        ),
      );
      setSelectedIds((current) => {
        const next = new Set(current);
        if (response.data.status === "VALID") next.add(response.data.id);
        else next.delete(response.data.id);
        return next;
      });
      setEditingItemId(null);
      setEditForm(null);
      toast.success("Đã kiểm tra lại dòng import");
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể cập nhật dòng import"));
    } finally {
      setIsBusy(false);
    }
  };

  const handleCommit = async () => {
    if (!questionImport || selectedIds.size === 0) return;
    setIsBusy(true);
    try {
      const response = await apiClient.post<QuestionImportRecord>(
        ENDPOINTS.QUESTION_IMPORTS.COMMIT(questionImport.id),
        { item_ids: [...selectedIds], duplicate_policy: "SKIP" },
      );
      setQuestionImport(response.data);
      await onCompleted();
      toast.success(
        examId
          ? "Đã import và gắn câu hỏi vào bài thi"
          : "Đã import câu hỏi vào ngân hàng",
      );
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể hoàn tất import"));
    } finally {
      setIsBusy(false);
    }
  };

  const handleCancel = async () => {
    if (
      questionImport &&
      !["COMPLETED", "CANCELLED"].includes(questionImport.status)
    ) {
      try {
        await apiClient.delete(
          ENDPOINTS.QUESTION_IMPORTS.DETAIL(questionImport.id),
        );
      } catch {
        // Closing the dialog must remain possible if cleanup cannot finish.
      }
    }
    reset();
    onOpenChange(false);
  };

  const reset = () => {
    setFile(null);
    setSelectedTopicId(topicId ?? "");
    setChapterId(defaultChapterId ?? FROM_FILE);
    setQuestionImport(null);
    setItems([]);
    setSelectedIds(new Set());
    setEditingItemId(null);
    setEditForm(null);
    setIsBusy(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !isBusy) void handleCancel();
        else if (nextOpen) onOpenChange(true);
      }}
    >
      <DialogContent className="max-h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] max-w-6xl overflow-y-auto border-gray-300 bg-white">
        <DialogHeader>
          <DialogTitle>
            {examId ? "Import câu hỏi vào bài thi" : "Import ngân hàng câu hỏi"}
          </DialogTitle>
          <DialogDescription>
            Dùng template cố định, kiểm tra các dòng hợp lệ rồi mới tạo câu hỏi.
          </DialogDescription>
        </DialogHeader>

        {!questionImport && (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" asChild>
                <a href="/templates/question-import-template.docx" download>
                  <FileText className="mr-2 h-4 w-4" />
                  Template Word
                  <Download className="ml-2 h-4 w-4" />
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a href="/templates/question-import-template.xlsx" download>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Template Excel
                  <Download className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>

            {!topicId && (
              <div className="space-y-2">
                <Label>Topic</Label>
                <Select
                  value={selectedTopicId}
                  disabled={isBusy}
                  onValueChange={(value) => {
                    setChapters([]);
                    setSelectedTopicId(value);
                    setChapterId(FROM_FILE);
                  }}
                >
                  <SelectTrigger className="border-gray-300 bg-white">
                    <SelectValue placeholder="Chọn Topic nhận câu hỏi" />
                  </SelectTrigger>
                  <SelectContent className="border-gray-300 bg-white">
                    {(topics ?? []).map((topic) => (
                      <SelectItem key={topic.id} value={topic.id}>
                        {topic.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="question-import-file">
                  File .docx hoặc .xlsx
                </Label>
                <Input
                  id="question-import-file"
                  type="file"
                  accept=".docx,.xlsx"
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                  className="border-gray-300 bg-white"
                />
                <p className="text-xs text-gray-500">
                  Tối đa 20 MB, hỗ trợ ảnh nhúng.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Chapter mặc định</Label>
                <Select
                  value={chapterId}
                  onValueChange={setChapterId}
                  disabled={!activeTopicId || isLoadingChapters || isBusy}
                >
                  <SelectTrigger className="border-gray-300 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-gray-300 bg-white">
                    <SelectItem value={FROM_FILE}>
                      Không dùng (chỉ đọc cột chapter)
                    </SelectItem>
                    {sortedChapters.map((chapter) => (
                      <SelectItem key={chapter.id} value={chapter.id}>
                        {chapterPaths.get(chapter.id)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  Dùng cho các dòng để trống cột chapter.
                </p>
              </div>
            </div>

            <div className="rounded-md border border-blue-100 bg-blue-50 p-3 text-xs leading-relaxed text-gray-700">
              Cột <code className="font-semibold">chapter</code> ghi tên
              Chapter, ví dụ <code>Hàm số</code>, hoặc đường dẫn Chapter cha
              &gt; Chapter con, ví dụ <code>Chương 1 &gt; Hàm số</code>. Hệ
              thống tìm theo tên (không phân biệt hoa thường) trong các Chapter
              và Chapter con của Topic; Chapter chưa có sẽ được tạo mới khi bạn
              xác nhận import. Nếu một tên trùng ở nhiều nơi, hãy ghi rõ đường
              dẫn.
            </div>
          </div>
        )}

        {questionImport && questionImport.status !== "REVIEW_REQUIRED" && (
          <div className="flex min-h-44 flex-col items-center justify-center gap-3 py-8 text-center">
            {questionImport.status === "FAILED" ? (
              <AlertCircle className="h-10 w-10 text-red-600" />
            ) : questionImport.status === "COMPLETED" ? (
              <CheckCircle2 className="h-10 w-10 text-emerald-600" />
            ) : (
              <Loader2 className="h-10 w-10 animate-spin text-[#0066cc]" />
            )}
            <div className="font-medium">
              {statusLabels[questionImport.status]}
            </div>
            {questionImport.error_message && (
              <p className="max-w-2xl text-sm text-red-700">
                {questionImport.error_message}
              </p>
            )}
            {questionImport.status === "COMPLETED" && (
              <p className="text-sm text-gray-600">
                Đã tạo {questionImport.committed_items} câu hỏi, bỏ qua{" "}
                {questionImport.skipped_items} câu trùng.
              </p>
            )}
          </div>
        )}

        {questionImport?.status === "REVIEW_REQUIRED" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge variant="outline">Tổng {questionImport.total_items}</Badge>
              <Badge className="bg-emerald-100 text-emerald-800">
                Hợp lệ {validItems.length}
              </Badge>
              <Badge className="bg-red-100 text-red-800">
                Cần sửa{" "}
                {items.filter((item) => item.status === "INVALID").length}
              </Badge>
              <span className="ml-auto text-gray-600">
                Đã chọn {selectedIds.size}
              </span>
            </div>

            <div className="max-h-80 overflow-auto rounded-md border border-gray-300">
              <Table className="min-w-[900px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={
                          validItems.length > 0 &&
                          validItems.every((item) => selectedIds.has(item.id))
                        }
                        onCheckedChange={(checked) =>
                          setSelectedIds(
                            checked
                              ? new Set(validItems.map((item) => item.id))
                              : new Set(),
                          )
                        }
                      />
                    </TableHead>
                    <TableHead className="w-20">Dòng</TableHead>
                    <TableHead>Nội dung</TableHead>
                    <TableHead className="w-40">Chapter</TableHead>
                    <TableHead className="w-28">Ảnh</TableHead>
                    <TableHead className="w-56">Kiểm tra</TableHead>
                    <TableHead className="w-16" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Checkbox
                          disabled={item.status !== "VALID"}
                          checked={selectedIds.has(item.id)}
                          onCheckedChange={(checked) =>
                            setSelectedIds((current) => {
                              const next = new Set(current);
                              if (checked) next.add(item.id);
                              else next.delete(item.id);
                              return next;
                            })
                          }
                        />
                      </TableCell>
                      <TableCell>{item.source_index}</TableCell>
                      <TableCell>
                        <div className="max-w-xl truncate font-medium">
                          {item.data.questionText || "Chưa có nội dung"}
                        </div>
                        <div className="mt-1 text-xs text-gray-500">
                          {item.data.questionType} · {item.data.questionFormat}
                        </div>
                      </TableCell>
                      <TableCell>{renderItemChapter(item)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {item.assets.map((asset) =>
                            asset.view_url ? (
                              <Image
                                key={asset.id}
                                src={asset.view_url}
                                alt={asset.name}
                                width={40}
                                height={40}
                                unoptimized
                                className="h-10 w-10 rounded border object-cover"
                              />
                            ) : (
                              <ImageIcon
                                key={asset.id}
                                className="h-5 w-5 text-gray-500"
                              />
                            ),
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {item.errors.length ? (
                          <ul className="space-y-1 text-xs text-red-700">
                            {item.errors.map((error) => (
                              <li key={error}>{error}</li>
                            ))}
                          </ul>
                        ) : (
                          <span className="text-xs text-emerald-700">
                            Hợp lệ
                          </span>
                        )}
                        {item.warnings.map((warning) => (
                          <div
                            key={warning}
                            className="mt-1 text-xs text-amber-700"
                          >
                            {warning}
                          </div>
                        ))}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Sửa dòng"
                          onClick={() => startEditing(item)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {editingItemId && editForm && (
              <div className="space-y-4 border-t border-gray-200 pt-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Sửa dòng import</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingItemId(null);
                      setEditForm(null);
                    }}
                  >
                    Đóng
                  </Button>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2 md:col-span-3">
                    <Label>Nội dung câu hỏi</Label>
                    <Textarea
                      value={editForm.questionText}
                      onChange={(event) =>
                        setEditForm({
                          ...editForm,
                          questionText: event.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Chapter</Label>
                    <Select
                      value={editForm.chapterId}
                      onValueChange={(value) =>
                        setEditForm({ ...editForm, chapterId: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn Chapter" />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value={NEW_CHAPTER}>
                          + Nhập tên Chapter mới
                        </SelectItem>
                        {sortedChapters.map((chapter) => (
                          <SelectItem key={chapter.id} value={chapter.id}>
                            {chapterPaths.get(chapter.id)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {editForm.chapterId === NEW_CHAPTER && (
                      <Input
                        value={editForm.chapterName}
                        placeholder="Chương 1 > Hàm số"
                        onChange={(event) =>
                          setEditForm({
                            ...editForm,
                            chapterName: event.target.value,
                          })
                        }
                      />
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Loại câu hỏi</Label>
                    <Select
                      value={editForm.questionType}
                      onValueChange={(value) =>
                        setEditForm({
                          ...editForm,
                          questionType: value as EditForm["questionType"],
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="SINGLE_CHOICE">
                          Một đáp án
                        </SelectItem>
                        <SelectItem value="MULTIPLE_CHOICE">
                          Nhiều đáp án
                        </SelectItem>
                        <SelectItem value="ESSAY">Tự luận</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Định dạng</Label>
                    <Select
                      value={editForm.questionFormat}
                      onValueChange={(value) =>
                        setEditForm({
                          ...editForm,
                          questionFormat: value as EditForm["questionFormat"],
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="KNOWLEDGE">Nhận biết</SelectItem>
                        <SelectItem value="UNDERSTANDING">
                          Thông hiểu
                        </SelectItem>
                        <SelectItem value="APPLYING">Vận dụng</SelectItem>
                        <SelectItem value="ADVANCED">Vận dụng cao</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {editForm.questionType === "ESSAY" ? (
                  <div className="space-y-2">
                    <Label>Đáp án tự luận</Label>
                    <Textarea
                      value={editForm.correctAnswer ?? ""}
                      onChange={(event) =>
                        setEditForm({
                          ...editForm,
                          correctAnswer: event.target.value,
                        })
                      }
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Lựa chọn và đáp án đúng</Label>
                    {editForm.options.map((option, index) => (
                      <div
                        key={`${option.key}-${index}`}
                        className="flex items-center gap-2"
                      >
                        <Checkbox
                          checked={option.isCorrect}
                          onCheckedChange={(checked) =>
                            updateOption(index, { isCorrect: Boolean(checked) })
                          }
                        />
                        <span className="w-5 text-sm font-medium">
                          {option.key}
                        </span>
                        <Input
                          value={option.text}
                          onChange={(event) =>
                            updateOption(index, { text: event.target.value })
                          }
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Xóa lựa chọn"
                          disabled={editForm.options.length <= 2}
                          onClick={() =>
                            setEditForm({
                              ...editForm,
                              options: editForm.options
                                .filter(
                                  (_, optionIndex) => optionIndex !== index,
                                )
                                .map((item, optionIndex) => ({
                                  ...item,
                                  key: optionKeys[optionIndex],
                                })),
                            })
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    {editForm.options.length < optionKeys.length && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setEditForm({
                            ...editForm,
                            options: [
                              ...editForm.options,
                              {
                                key: optionKeys[editForm.options.length],
                                text: "",
                                isCorrect: false,
                              },
                            ],
                          })
                        }
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Thêm lựa chọn
                      </Button>
                    )}
                  </div>
                )}
                <div className="flex justify-end">
                  <Button onClick={saveItem} disabled={isBusy}>
                    Lưu và kiểm tra lại
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => void handleCancel()}
            disabled={isBusy}
          >
            {questionImport?.status === "COMPLETED" ? "Đóng" : "Hủy"}
          </Button>
          {!questionImport && (
            <Button
              onClick={handleUpload}
              disabled={isBusy || !file || !activeTopicId}
            >
              {isBusy ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              Tải lên và kiểm tra
            </Button>
          )}
          {questionImport?.status === "REVIEW_REQUIRED" && (
            <Button
              onClick={handleCommit}
              disabled={
                isBusy || selectedIds.size === 0 || Boolean(editingItemId)
              }
            >
              {isBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Import {selectedIds.size} câu hỏi
            </Button>
          )}
          {questionImport?.status === "FAILED" && (
            <Button onClick={reset}>Chọn file khác</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
