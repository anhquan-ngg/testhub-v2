"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import { ExamStatus, QuestionFormat, QuestionType } from "@prisma/client";
import { toast } from "sonner";
import {
  useFindManyQuestion,
  useFindUniqueExam,
  useUpdateExam,
  useUpsertExamQuestions,
  useDeleteManyExamQuestions,
  useFindManyExamQuestions,
} from "../../../../../../generated/hooks";
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
import { Plus, Trash2 } from "lucide-react";
import { QuestionTypeMap, QuestionFormatMap } from "@/lib/constansts";
import { useAppSelector } from "@/store/hook";

type EditExamPageProps = {
  params: Promise<{ id: string }>;
};

interface QuestionConfig {
  id: number;
  question_type: QuestionType;
  question_format: QuestionFormat;
  quantity: number;
}

const mergeQuestionConfigs = (items: QuestionConfig[]): QuestionConfig[] => {
  const groupedMap = items.reduce((acc, current) => {
    const uniqueKey = `${current.question_type}|${current.question_format}`;
    if (acc[uniqueKey]) {
      // Nếu key đã tồn tại: Cộng dồn quantity
      acc[uniqueKey].quantity += current.quantity;
    } else {
      // Nếu key chưa tồn tại: Tạo mới entry (spread ...current để copy object)
      acc[uniqueKey] = { ...current };
    }

    return acc;
  }, {} as Record<string, QuestionConfig>);

  // Bước B: Lấy danh sách values từ Object đó trả về thành Array
  return Object.values(groupedMap);
};

export default function EditExamPage({ params }: EditExamPageProps) {
  const examId = use(params).id;
  const lecturerId = useAppSelector((state) => state.user.id);
  const router = useRouter();
  const [questionBank, setQuestionBank] = useState([] as any);
  const [questionSelectionMode, setQuestionSelectionMode] = useState<
    "MANUAL" | "RANDOM_N" | "BY_TYPE"
  >("MANUAL");
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [randomCount, setRandomCount] = useState("10");
  const [configRows, setConfigRows] = useState<QuestionConfig[]>([
    {
      id: 1,
      question_type: "SINGLE_CHOICE",
      question_format: "KNOWLEDGE",
      quantity: 0,
    },
  ]);
  const [distribution, setDistribution] = useState([] as any);
  const [nextRowId, setNextRowId] = useState(2);

  const handleAddConfigRow = () => {
    setConfigRows([
      ...configRows,
      {
        id: nextRowId,
        question_type: "SINGLE_CHOICE",
        question_format: "KNOWLEDGE",
        quantity: 0,
      },
    ]);
    setNextRowId(nextRowId + 1);
  };

  const handleUpdateConfigRow = (id: number, field: string, value: any) => {
    setConfigRows(
      configRows.map((row) =>
        row.id === id ? { ...row, [field]: value } : row
      )
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

  const handleToggleQuestion = (questionId: string) => {
    setSelectedQuestions((prev) =>
      prev.includes(questionId)
        ? prev.filter((id) => id !== questionId)
        : [...prev, questionId]
    );
  };

  const handleSelectByConfig = () => {
    const mergedConfigs = mergeQuestionConfigs(configRows);
    const distribution = mergedConfigs.map(({ id, ...rest }) => rest);
    setDistribution(distribution);
    setIsDialogOpen(false);
  };

  const { data: exam } = useFindUniqueExam({ where: { id: examId } });

  const updateExamMutation = useUpdateExam({
    onSuccess: () => {
      toast.success("Cập nhật bài thi thành công!");
      router.push("/lecturer/exams");
    },
    onError: (error) => {
      toast.error("Cập nhật bài thi thất bại. Vui lòng thử lại.");
      console.log(error);
    },
  });

  const { data: questionsData } = useFindManyQuestion({
    where: {
      lecturer_id: lecturerId,
    },
    orderBy: { created_at: "desc" },
  });

  const { data: examQuestionsData } = useFindManyExamQuestions({
    where: { exam_id: examId },
  });

  const upsertExamQuestions = useUpsertExamQuestions({
    onSuccess: () => {
      toast.success("Thêm câu hỏi vào bài thi thành công!");
    },
    onError: (error) => {
      toast.error("Thêm câu hỏi vào bài thi thất bại. Vui lòng thử lại.");
      console.log(error);
    },
  });

  const deleteManyExamQuestions = useDeleteManyExamQuestions({
    onSuccess: () => {
      console.log("Đã xóa các câu hỏi không được chọn");
    },
    onError: (error) => {
      console.error("Lỗi khi xóa câu hỏi:", error);
    },
  });

  const handleEditExam = async (id: string) => {
    if (
      !examForm.title ||
      !examForm.topic ||
      !examForm.exam_start_time ||
      !examForm.exam_end_time ||
      !examForm.duration
    ) {
      alert("Vui lòng điền đầy đủ thông tin!");
      return;
    }

    const payload = {
      ...examForm,
      exam_start_time: new Date(examForm.exam_start_time),
      exam_end_time: new Date(examForm.exam_end_time),
      duration: Number.parseInt(examForm.duration),
      is_public: examForm.is_public,
      status: ExamStatus.PENDING,
      mode: questionSelectionMode,
      sample_size:
        questionSelectionMode === "RANDOM_N"
          ? Number.parseInt(randomCount)
          : null,
      distribution:
        questionSelectionMode === "BY_TYPE"
          ? JSON.stringify(distribution)
          : null,
    } as const;

    const upsertPromises = selectedQuestions.map((questionId) =>
      upsertExamQuestions.mutateAsync({
        where: {
          exam_id_question_id: {
            exam_id: id,
            question_id: questionId,
          },
        },
        create: {
          exam_id: id,
          question_id: questionId,
        },
        update: {},
      })
    );

    await Promise.all([
      updateExamMutation.mutateAsync({
        where: { id },
        data: payload,
      }),
      deleteManyExamQuestions.mutateAsync({
        where: {
          exam_id: id,
          question_id: {
            notIn: selectedQuestions,
          },
        },
      }),
      ...upsertPromises,
    ]);
  };

  useEffect(() => {
    if (exam) {
      setExamForm({
        title: exam.title,
        topic: exam.topic,
        exam_start_time: exam.exam_start_time.toISOString().slice(0, 16),
        exam_end_time: exam.exam_end_time.toISOString().slice(0, 16),
        duration: exam.duration.toString(),
        practice: exam.practice,
        is_public: exam.is_public,
      });
      setQuestionSelectionMode(exam.mode);
      if (exam.mode === "RANDOM_N" && exam.sample_size) {
        setRandomCount(exam.sample_size.toString());
      } else if (exam.mode === "BY_TYPE" && exam.distribution) {
        const parsedDistribution = JSON.parse(exam.distribution);
        console.log(parsedDistribution);
        const configRowsWithIds = parsedDistribution.map(
          (item: any, index: number) => ({
            id: index + 1,
            question_type: item.question_type,
            question_format: item.question_format,
            quantity: item.quantity,
          })
        );
        console.log(configRowsWithIds);
        setConfigRows(configRowsWithIds);
        setNextRowId(configRowsWithIds.length + 1);
        setDistribution(parsedDistribution);
      }
    }
  }, [exam]);

  useEffect(() => {
    setQuestionBank(questionsData);
  }, [questionsData]);

  useEffect(() => {
    if (examQuestionsData) {
      setSelectedQuestions(examQuestionsData.map((q) => q.question_id));
    }
  }, [examQuestionsData]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <h2 className="text-3xl font-bold text-gray-900">Chỉnh sửa bài thi</h2>
      </div>

      <Card className="bg-white border-gray-300">
        <CardHeader>
          <CardTitle>Thông tin bài thi</CardTitle>
          <CardDescription>
            Điền thông tin chi tiết để tạo bài thi
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="exam-title">
                  Tên bài thi <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="exam-title"
                  placeholder="Nhập tên bài thi"
                  value={examForm.title}
                  onChange={(e) =>
                    setExamForm({ ...examForm, title: e.target.value })
                  }
                  className="bg-white border-gray-300"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="exam-topic">
                  Chủ đề <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="exam-topic"
                  placeholder="Nhập chủ đề"
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
                  Thời gian bắt đầu <span className="text-red-500">*</span>
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
                  Thời gian kết thúc <span className="text-red-500">*</span>
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="duration">
                  Thời lượng (phút) <span className="text-red-500">*</span>
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
                <Label htmlFor="practice">Loại bài thi</Label>
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
                    <SelectItem value="test">Bài thi chính thức</SelectItem>
                    <SelectItem value="practice">Bài thi thực hành</SelectItem>
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
                  Công khai bài thi (Sinh viên có thể thấy mà không cần đăng ký)
                </Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Chọn câu hỏi từ ngân hàng</Label>
              <div className="flex gap-2">
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-[#0066cc] hover:bg-[#0052a3] text-white">
                      Chọn câu hỏi
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="min-w-[600px] bg-white border-gray-300">
                    <DialogHeader>
                      <DialogTitle>Chọn câu hỏi</DialogTitle>
                      <DialogDescription>
                        Chọn câu hỏi cho bài thi: {examForm.title}
                      </DialogDescription>
                    </DialogHeader>
                    <Select
                      value={questionSelectionMode}
                      onValueChange={(value: any) =>
                        setQuestionSelectionMode(value)
                      }
                    >
                      <SelectTrigger className="bg-white border-gray-300">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-300">
                        <SelectItem value="MANUAL">Chọn thủ công</SelectItem>
                        <SelectItem value="RANDOM_N">
                          Lấy ngẫu nhiên N câu
                        </SelectItem>
                        <SelectItem value="BY_TYPE">
                          Cấu hình theo loại và định dạng
                        </SelectItem>
                      </SelectContent>
                    </Select>

                    {questionSelectionMode === "MANUAL" && (
                      <div className="space-y-2">
                        <div className="border border-gray-300 rounded-lg p-4 space-y-3 max-h-64 overflow-y-auto">
                          {questionBank?.length > 0 ? (
                            questionBank.map((question: any) => (
                              <div
                                key={question.id}
                                className="flex items-start space-x-3 p-2 hover:bg-gray-50 rounded"
                              >
                                <Checkbox
                                  id={`question-${question.id}`}
                                  checked={selectedQuestions.includes(
                                    question.id
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
                                    Chủ đề: {question.topic} | Loại:{" "}
                                    {
                                      QuestionTypeMap[
                                        question.question_type as keyof typeof QuestionTypeMap
                                      ]
                                    }{" "}
                                    | Định dạng:{" "}
                                    {
                                      QuestionFormatMap[
                                        question.question_format as keyof typeof QuestionFormatMap
                                      ]
                                    }
                                  </div>
                                </label>
                              </div>
                            ))
                          ) : (
                            <div className="text-center text-gray-500 py-4">
                              Không có câu hỏi nào
                            </div>
                          )}
                        </div>
                        <div className="text-sm text-gray-600">
                          Đã chọn {selectedQuestions.length} câu hỏi
                        </div>
                      </div>
                    )}

                    {questionSelectionMode === "RANDOM_N" && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-3 gap-4 items-end">
                          <div className="space-y-2">
                            <Label htmlFor="random-count">
                              Số lượng câu hỏi
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
                        <div className="text-sm text-gray-600">
                          Đã chọn {selectedQuestions.length} câu hỏi
                        </div>
                      </div>
                    )}

                    {questionSelectionMode === "BY_TYPE" && (
                      <div className="space-y-4">
                        <Label className="text-base font-semibold block">
                          Cấu hình câu hỏi
                        </Label>
                        <div className="border border-gray-300 rounded-lg overflow-hidden p-1">
                          <Table>
                            <TableHeader>
                              <TableRow className="border-gray-300">
                                <TableHead className="w-1/3">
                                  Loại câu hỏi
                                </TableHead>
                                <TableHead className="w-1/3">
                                  Định dạng
                                </TableHead>
                                <TableHead className="w-1/4">
                                  Số lượng
                                </TableHead>
                                <TableHead className="w-12">Thao tác</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody className="bg-white border-gray-300">
                              {configRows.map((row) => (
                                <TableRow
                                  key={row.id}
                                  className="border-gray-300"
                                >
                                  <TableCell>
                                    <Select
                                      value={row.question_type}
                                      onValueChange={(value) =>
                                        handleUpdateConfigRow(
                                          row.id,
                                          "question_type",
                                          value
                                        )
                                      }
                                    >
                                      <SelectTrigger className="w-full bg-white border-gray-300">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent className="bg-white border-gray-300">
                                        <SelectItem value="SINGLE_CHOICE">
                                          Trắc nghiệm 1 đáp án
                                        </SelectItem>
                                        <SelectItem value="MULTIPLE_CHOICE">
                                          Trắc nghiệm nhiều đáp án
                                        </SelectItem>
                                        <SelectItem value="ESSAY">
                                          Tự luận
                                        </SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </TableCell>
                                  <TableCell>
                                    <Select
                                      value={row.question_format}
                                      onValueChange={(value) =>
                                        handleUpdateConfigRow(
                                          row.id,
                                          "question_format",
                                          value
                                        )
                                      }
                                    >
                                      <SelectTrigger className="w-full bg-white border-gray-300">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent className="bg-white border-gray-300">
                                        <SelectItem value="KNOWLEDGE">
                                          Nhận biết
                                        </SelectItem>
                                        <SelectItem value="UNDERSTANDING">
                                          Thông hiểu
                                        </SelectItem>
                                        <SelectItem value="APPLYING">
                                          Vận dụng
                                        </SelectItem>
                                        <SelectItem value="ADVANCED">
                                          Nâng cao
                                        </SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </TableCell>
                                  <TableCell>
                                    <Input
                                      type="number"
                                      min="0"
                                      value={row.quantity}
                                      onChange={(e) =>
                                        handleUpdateConfigRow(
                                          row.id,
                                          "quantity",
                                          Number.parseInt(e.target.value) || 0
                                        )
                                      }
                                      className="w-20 bg-white border-gray-300"
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Button
                                      variant="ghost"
                                      size="sm"
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
                          <Plus className="h-3 w-3" strokeWidth={3} /> Thêm hàng
                          cấu hình
                        </Button>

                        <Button
                          onClick={handleSelectByConfig}
                          className="w-full bg-[#0066cc] hover:bg-[#0052a3] text-white"
                        >
                          Lấy ngẫu nhiên theo cấu hình
                        </Button>
                        <div className="text-sm text-gray-600">
                          Đã chọn {selectedQuestions.length} câu hỏi
                        </div>
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
                Hủy
              </Button>
              <Button
                onClick={() => handleEditExam(examId)}
                className="flex-1 bg-[#0066cc] hover:bg-[#0052a3] text-white hover:cursor-pointer"
              >
                Cập nhật bài thi
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
