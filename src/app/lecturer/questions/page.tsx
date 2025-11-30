"use client";

import { useEffect, useState } from "react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import {
  useCreateQuestion,
  useDeleteQuestion,
  useFindManyQuestion,
  useUpdateQuestion,
} from "../../../../generated/hooks";
import { toast } from "sonner";
import { useAppSelector, useAppStore, useUser } from "@/store/hook";
import { Question, QuestionFormat, QuestionType } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { IQuestion, QuestionOption } from "@/types/question";
import { useMinIO } from "@/hook/useMinIO";
import { get } from "http";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
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
import { QuestionTypeMap, QuestionFormatMap } from "@/lib/constansts";
import { MathInput } from "@/components/MathInput";
import { MathRenderer } from "@/components/MathRenderer";

const getInitialFormState = () => ({
  question_text: "",
  topic: "",
  options: [
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
  ],
  correct_answer: "",
  image_url: "",
  question_type: "SINGLE_CHOICE" as any,
  question_format: "KNOWLEDGE" as any,
});

export default function LecturerQuestions() {
  const lecturerId = useAppSelector((state) => state.user.id);
  const { uploadFile, checkAndUpload, getDownloadUrl, removeFile } =
    useMinIO("questions-images");
  const [image, setImage] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string>("");
  const [questions, setQuestions] = useState([] as any);
  const [searchTerm, setSearchTerm] = useState("");
  const [questionForm, setQuestionForm] = useState(getInitialFormState());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");

  const { data: questionsData } = useFindManyQuestion({
    orderBy: { created_at: "desc" },
  });

  useEffect(() => {
    setQuestions(questionsData);
  }, [questionsData]);

  useEffect(() => {
    const loadPreviewUrl = async () => {
      if (questionForm.image_url && image) {
        const url = URL.createObjectURL(image);
        setPreviewUrl(url);
      } else if (questionForm.image_url && editingId) {
        try {
          const url = await getDownloadUrl(questionForm.image_url);
          setPreviewUrl(url);
        } catch (error) {
          console.error("Failed to load preview:", error);
          setPreviewUrl("");
        }
      } else {
        setPreviewUrl("");
      }
    };
    loadPreviewUrl();
    // getDownloadUrl comes from a custom hook and may not be stable across renders;
    // including it in deps can cause this effect to run repeatedly and trigger an
    // infinite update loop. We intentionally omit it here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionForm.image_url, image, editingId]);

  const createQuestionMutation = useCreateQuestion({
    onSuccess: () => {
      toast.success("Tạo câu hỏi thành công!");
    },
    onError: (error) => {
      toast.error("Lỗi khi tạo câu hỏi!");
      console.log(error);
    },
  });

  const updateQuestionMutation = useUpdateQuestion({
    onSuccess: () => {
      toast.success("Cập nhật câu hỏi thành công!");
    },
    onError: (error) => {
      toast.error("Lỗi khi cập nhật câu hỏi!");
      console.log(error);
    },
  });

  const deleteQuestionMutation = useDeleteQuestion({
    onSuccess: () => {
      toast.success("Xoá câu hỏi thành công!");
    },
  });

  const handleAddQuestion = async () => {
    const newQuestion = {
      lecturer_id: lecturerId,
      question_text: questionForm.question_text,
      topic: questionForm.topic,
      options:
        questionForm.question_type === QuestionType.ESSAY
          ? null
          : JSON.stringify(questionForm.options),
      correct_answer:
        questionForm.question_type === QuestionType.ESSAY
          ? questionForm.correct_answer
          : null,
      image_url: questionForm.image_url ? questionForm.image_url : null,
      question_type: questionForm.question_type,
      question_format: questionForm.question_format,
    };
    console.log("Adding question:", newQuestion);
    await Promise.all([
      createQuestionMutation.mutateAsync({
        data: newQuestion,
      }),
      image && uploadFile(image),
    ]);
    setImage(null);
    setQuestionForm(getInitialFormState());
  };

  const handleUpdateQuestion = async (questionId: string) => {
    await Promise.all([
      updateQuestionMutation.mutateAsync({
        where: { id: questionId },
        data: {
          question_text: questionForm.question_text,
          topic: questionForm.topic,
          options:
            questionForm.question_type === QuestionType.ESSAY
              ? null
              : JSON.stringify(questionForm.options),
          correct_answer:
            questionForm.question_type === QuestionType.ESSAY
              ? questionForm.correct_answer
              : null,
          image_url: questionForm.image_url ? questionForm.image_url : null,
          question_type: questionForm.question_type,
          question_format: questionForm.question_format,
        },
      }),
      image && checkAndUpload(image),
    ]);
    setImage(null);
    setEditingId(null);
    setQuestionForm(getInitialFormState());
  };

  const handleDeleteQuestion = async (questionId: string) => {
    // lưu snapshot để rollback nếu lỗi
    const previous = questions;

    const image_url = questions.find(
      (q: any) => q.id === questionId
    )?.image_url;
    try {
      // gọi API delete
      await Promise.all([
        deleteQuestionMutation.mutateAsync({
          where: { id: questionId },
        }),
        removeFile(image_url),
      ]);
      // thành công => toast handled in onSuccess
      setQuestions((q: any[]) =>
        q.filter((item: any) => item.id !== questionId)
      );
    } catch (err) {
      // rollback UI
      setQuestions(previous);
      toast.error("Không thể xoá câu hỏi. Vui lòng thử lại.");
      console.error(err);
    }
  };

  const correctOptionIndex = questionForm.options.findIndex(
    (option) => option.isCorrect
  );

  const selectedValue =
    correctOptionIndex !== -1 ? String(correctOptionIndex) : "";

  const handleSelectionChange = (newIndexString: string) => {
    const newSelectedIndex = Number(newIndexString);
    if (!questionForm || !questionForm.options) return;
    const newOptions = questionForm.options.map(
      (option: any, index: number) => ({
        ...option,
        isCorrect: index === newSelectedIndex,
      })
    );

    setQuestionForm({
      ...questionForm,
      options: newOptions,
    });
  };

  const handleTextChange = (e: any, index: number) => {
    if (!questionForm.options) return;
    const newOptions = [...questionForm.options];
    newOptions[index].text = e.target.value;
    setQuestionForm({
      ...questionForm,
      options: newOptions,
    });
  };

  const handleCorrectChange = (indexToToggle: number) => {
    if (!questionForm.options) return;
    const newOptions = questionForm.options.map(
      (option: any, index: number) => {
        if (index === indexToToggle) {
          return {
            ...option,
            isCorrect: !option.isCorrect,
          };
        }
        return option;
      }
    );

    setQuestionForm({
      ...questionForm,
      options: newOptions,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-900">Ngân hàng câu hỏi</h2>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="bg-[#0066cc] hover:bg-[#0052a3] text-white hover:cursor-pointer">
              <Plus className="h-4 w-4 mr-2" />
              Thêm câu hỏi
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white border-gray-300">
            <DialogHeader>
              <DialogTitle>Thêm câu hỏi mới</DialogTitle>
              <DialogDescription>
                Nhập thông tin chi tiết câu hỏi
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="question-text">
                  Nội dung câu hỏi <span className="text-red-500">*</span>
                </Label>
                <MathInput
                  id="question-text"
                  placeholder="Nhập câu hỏi (có thể sử dụng $công thức$ cho toán học)"
                  value={questionForm.question_text}
                  onChange={(value) =>
                    setQuestionForm({
                      ...questionForm,
                      question_text: value,
                    })
                  }
                  className="bg-white border-gray-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="question-topic">
                    Chủ đề <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="question-topic"
                    placeholder="Nhập chủ đề"
                    value={questionForm.topic}
                    onChange={(e) =>
                      setQuestionForm({
                        ...questionForm,
                        topic: e.target.value,
                      })
                    }
                    className="bg-white border-gray-300"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="question-type">
                    Loại câu hỏi <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={questionForm.question_type}
                    onValueChange={(value) =>
                      setQuestionForm({
                        ...questionForm,
                        question_type: value as QuestionType,
                      })
                    }
                  >
                    <SelectTrigger className="bg-white border-gray-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-300">
                      <SelectItem value={`${QuestionType.SINGLE_CHOICE}`}>
                        Trắc nghiệm một đáp án
                      </SelectItem>
                      <SelectItem value={`${QuestionType.MULTIPLE_CHOICE}`}>
                        Trắc nghiệm nhiều đáp án
                      </SelectItem>
                      <SelectItem value={`${QuestionType.ESSAY}`}>
                        Tự luận
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="question-format">
                  Định dạng câu hỏi <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={questionForm.question_format}
                  onValueChange={(value) =>
                    setQuestionForm({
                      ...questionForm,
                      question_format: value as QuestionFormat,
                    })
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

              <div className="space-y-2">
                <Label htmlFor="image-url">Hình ảnh (tùy chọn)</Label>
                <Input
                  id="image-file"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    if (!file) return;
                    setImage(file);
                    setQuestionForm({
                      ...questionForm,
                      image_url: file.name,
                    });
                  }}
                  className="bg-white border-gray-300"
                />
                {questionForm.image_url && image && (
                  <img src={URL.createObjectURL(image)} alt="Preview" />
                )}
              </div>

              {questionForm.question_type === "SINGLE_CHOICE" && (
                <>
                  <div className="space-y-3">
                    <Label>
                      Các lựa chọn <span className="text-red-500">*</span>
                    </Label>
                    <RadioGroup
                      value={selectedValue}
                      onValueChange={handleSelectionChange}
                    >
                      {questionForm.options.map((option, index) => (
                        <div className="flex items-center gap-2" key={index}>
                          <div className="flex-1">
                            <MathInput
                              id={`option-${index}`}
                              placeholder={`Lựa chọn ${index + 1}`}
                              value={option.text}
                              onChange={(value) => {
                                const newOptions = [...questionForm.options];
                                newOptions[index].text = value;
                                setQuestionForm({
                                  ...questionForm,
                                  options: newOptions,
                                });
                              }}
                              className="bg-white border-gray-300"
                            />
                          </div>
                          <RadioGroupItem
                            value={String(index)}
                            id={`option-${index}`}
                            className="bg-white border-gray-300"
                          />
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                </>
              )}

              {questionForm.question_type === "MULTIPLE_CHOICE" && (
                <div className="space-y-3">
                  <Label>
                    Các lựa chọn <span className="text-red-500">*</span>
                  </Label>
                  {questionForm.options.map((option, index) => (
                    <div className="flex items-center gap-2" key={index}>
                      <div className="flex-1">
                        <MathInput
                          id={`multi-option-${index}`}
                          placeholder={`Lựa chọn ${index + 1}`}
                          value={option.text}
                          onChange={(value) => {
                            const newOptions = [...questionForm.options];
                            newOptions[index].text = value;
                            setQuestionForm({
                              ...questionForm,
                              options: newOptions,
                            });
                          }}
                          className="bg-white border-gray-300"
                        />
                      </div>
                      <Checkbox
                        checked={option.isCorrect}
                        onCheckedChange={() => handleCorrectChange(index)}
                        value={String(index)}
                        id={`option-${index}`}
                        className="bg-white border-gray-300"
                      />
                    </div>
                  ))}
                </div>
              )}

              {questionForm.question_type === "ESSAY" && (
                <div className="space-y-2">
                  <Label htmlFor="correct-answer">
                    Đáp án tham khảo <span className="text-red-500">*</span>
                  </Label>
                  <MathInput
                    id="correct-answer"
                    placeholder="Nhập đáp án tham khảo (có thể dùng công thức toán học)"
                    value={questionForm.correct_answer}
                    onChange={(value) =>
                      setQuestionForm({
                        ...questionForm,
                        correct_answer: value,
                      })
                    }
                    className="bg-white border-gray-300"
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                onClick={() => handleAddQuestion()}
                className="bg-[#0066cc] hover:bg-[#0052a3] text-white hover:cursor-pointer"
              >
                Thêm câu hỏi
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-white border-gray-300">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Ngân hàng câu hỏi của bạn</CardTitle>
              <CardDescription>
                Quản lý, chỉnh sửa và xóa câu hỏi
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm câu hỏi..."
                className="pl-10 bg-white border-gray-300"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="border-gray-300">
                <TableHead>Câu hỏi</TableHead>
                <TableHead>Chủ đề</TableHead>
                <TableHead>Loại</TableHead>
                <TableHead>Định dạng</TableHead>
                <TableHead>Đáp án</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {questions
                ?.filter((q: any) =>
                  q.question_text
                    .toLowerCase()
                    .includes(searchTerm.toLowerCase())
                )
                .map((question: IQuestion) => (
                  <TableRow key={question.id} className="border-gray-300">
                    <TableCell className="font-medium max-w-xs truncate">
                      {question.question_text}
                    </TableCell>
                    <TableCell>{question.topic}</TableCell>
                    <TableCell>
                      <Badge
                        className={`px-2 py-1 text-white rounded-lg ${
                          question.question_type === "SINGLE_CHOICE"
                            ? "text-red-500 bg-red-100"
                            : question.question_type === "MULTIPLE_CHOICE"
                            ? "text-green-500 bg-green-100"
                            : "text-blue-500 bg-blue-100"
                        }`}
                      >
                        {QuestionTypeMap[question.question_type]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`px-2 py-1 text-white rounded-lg ${
                          question.question_format === "ADVANCED"
                            ? "text-red-500 bg-red-100"
                            : question.question_format === "APPLYING"
                            ? "text-orange-500 bg-orange-100"
                            : question.question_format === "UNDERSTANDING"
                            ? "text-green-500 bg-green-100"
                            : "text-blue-500 bg-blue-100"
                        }`}
                      >
                        {QuestionFormatMap[question.question_format]}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {question.question_type === "ESSAY" ? (
                        <MathRenderer content={question.correct_answer || ""} />
                      ) : question.options ? (
                        <MathRenderer
                          content={JSON.parse(
                            question.options as unknown as string
                          )
                            .filter(
                              (option: QuestionOption) => option.isCorrect
                            )
                            .map((option: QuestionOption) => option.text)
                            .join(", ")}
                        />
                      ) : (
                        ""
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Dialog
                          open={editingId === question.id}
                          onOpenChange={(open) => {
                            if (!open) {
                              setEditingId(null);
                              setQuestionForm(getInitialFormState());
                              setImage(null);
                            }
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditingId(question.id);
                                const parsedOptions = question.options
                                  ? JSON.parse(
                                      question.options as unknown as string
                                    )
                                  : getInitialFormState().options;
                                setQuestionForm({
                                  question_text: question.question_text,
                                  topic: question.topic,
                                  options: parsedOptions as any,
                                  correct_answer: question.correct_answer || "",
                                  image_url: question.image_url || "",
                                  question_type: question.question_type as any,
                                  question_format:
                                    question.question_format as any,
                                });
                              }}
                              className="hover:cursor-pointer"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white border-gray-300">
                            <DialogHeader>
                              <DialogTitle>Chỉnh sửa câu hỏi</DialogTitle>
                              <DialogDescription>
                                Cập nhật thông tin câu hỏi
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div className="space-y-2">
                                <Label htmlFor="edit-question-text">
                                  Nội dung câu hỏi{" "}
                                  <span className="text-red-500">*</span>
                                </Label>
                                <MathInput
                                  id="edit-question-text"
                                  placeholder="Nhập câu hỏi"
                                  value={questionForm.question_text}
                                  onChange={(value) =>
                                    setQuestionForm({
                                      ...questionForm,
                                      question_text: value,
                                    })
                                  }
                                  className="bg-white border-gray-300"
                                />
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label htmlFor="edit-question-topic">
                                    Chủ đề{" "}
                                    <span className="text-red-500">*</span>
                                  </Label>
                                  <Input
                                    id="edit-question-topic"
                                    placeholder="Nhập chủ đề"
                                    value={questionForm.topic}
                                    onChange={(e) =>
                                      setQuestionForm({
                                        ...questionForm,
                                        topic: e.target.value,
                                      })
                                    }
                                    className="bg-white border-gray-300"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="edit-question-type">
                                    Loại câu hỏi{" "}
                                    <span className="text-red-500">*</span>
                                  </Label>
                                  <Select
                                    value={questionForm.question_type}
                                    onValueChange={(value) =>
                                      setQuestionForm({
                                        ...questionForm,
                                        question_type: value as any,
                                      })
                                    }
                                  >
                                    <SelectTrigger className="bg-white border-gray-300">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white border-gray-300">
                                      <SelectItem value="SINGLE_CHOICE">
                                        Trắc nghiệm một đáp án
                                      </SelectItem>
                                      <SelectItem value="MULTIPLE_CHOICE">
                                        Trắc nghiệm nhiều đáp án
                                      </SelectItem>
                                      <SelectItem value="ESSAY">
                                        Tự luận
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="edit-question-format">
                                  Định dạng câu hỏi{" "}
                                  <span className="text-red-500">*</span>
                                </Label>
                                <Select
                                  value={questionForm.question_format}
                                  onValueChange={(value) =>
                                    setQuestionForm({
                                      ...questionForm,
                                      question_format: value as any,
                                    })
                                  }
                                >
                                  <SelectTrigger className="bg-white border-gray-300">
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
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="edit-image-file">
                                  Hình ảnh (tùy chọn)
                                </Label>
                                <Input
                                  id="edit-image-file"
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0] || null;
                                    if (!file) return;
                                    setImage(file);
                                    setQuestionForm({
                                      ...questionForm,
                                      image_url: file.name,
                                    });
                                  }}
                                  className="bg-white border-gray-300"
                                />
                                {previewUrl && (
                                  <img
                                    src={previewUrl}
                                    alt="Preview"
                                    className="max-w-xs max-h-64 mt-2"
                                  />
                                )}
                              </div>

                              {questionForm.question_type ===
                                "SINGLE_CHOICE" && (
                                <>
                                  <div className="space-y-3">
                                    <Label>
                                      Các lựa chọn{" "}
                                      <span className="text-red-500">*</span>
                                    </Label>
                                    <RadioGroup
                                      value={selectedValue}
                                      onValueChange={handleSelectionChange}
                                    >
                                      {questionForm.options.map(
                                        (option, index) => (
                                          <div
                                            className="flex items-center gap-2"
                                            key={index}
                                          >
                                            <div className="flex-1">
                                              <MathInput
                                                id={`option-${index}`}
                                                placeholder={`Lựa chọn ${
                                                  index + 1
                                                }`}
                                                value={option.text}
                                                onChange={(value) => {
                                                  const newOptions = [
                                                    ...questionForm.options,
                                                  ];
                                                  newOptions[index].text =
                                                    value;
                                                  setQuestionForm({
                                                    ...questionForm,
                                                    options: newOptions,
                                                  });
                                                }}
                                                className="bg-white border-gray-300"
                                              />
                                            </div>
                                            <RadioGroupItem
                                              value={String(index)}
                                              id={`edit-option-${index}`}
                                              className="bg-white border-gray-300"
                                            />
                                          </div>
                                        )
                                      )}
                                    </RadioGroup>
                                  </div>
                                </>
                              )}

                              {questionForm.question_type ===
                                "MULTIPLE_CHOICE" && (
                                <div className="space-y-3">
                                  <Label>
                                    Các lựa chọn{" "}
                                    <span className="text-red-500">*</span>
                                  </Label>
                                  {questionForm.options.map((option, index) => (
                                    <div
                                      className="flex items-center gap-2"
                                      key={index}
                                    >
                                      <div className="flex-1">
                                        <MathInput
                                          id={`multi-option-${index}`}
                                          placeholder={`Lựa chọn ${index + 1}`}
                                          value={option.text}
                                          onChange={(value) => {
                                            const newOptions = [
                                              ...questionForm.options,
                                            ];
                                            newOptions[index].text = value;
                                            setQuestionForm({
                                              ...questionForm,
                                              options: newOptions,
                                            });
                                          }}
                                          className="bg-white border-gray-300"
                                        />
                                      </div>
                                      <Checkbox
                                        checked={option.isCorrect}
                                        onCheckedChange={() =>
                                          handleCorrectChange(index)
                                        }
                                        value={String(index)}
                                        id={`edit-option-${index}`}
                                        className="bg-white border-gray-300"
                                      />
                                    </div>
                                  ))}
                                </div>
                              )}

                              {questionForm.question_type === "ESSAY" && (
                                <div className="space-y-2">
                                  <Label htmlFor="edit-correct-answer">
                                    Đáp án tham khảo{" "}
                                    <span className="text-red-500">*</span>
                                  </Label>
                                  <MathInput
                                    id="edit-correct-answer"
                                    placeholder="Nhập đáp án tham khảo (có thể dùng công thức toán học)"
                                    value={questionForm.correct_answer}
                                    onChange={(value) =>
                                      setQuestionForm({
                                        ...questionForm,
                                        correct_answer: value,
                                      })
                                    }
                                    className="bg-white border-gray-300"
                                  />
                                </div>
                              )}
                            </div>
                            <DialogFooter>
                              <Button
                                className="bg-[#0066cc] hover:bg-[#0052a3] text-white hover:cursor-pointer"
                                onClick={() =>
                                  handleUpdateQuestion(question.id)
                                }
                              >
                                Cập nhật
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-600 hover:text-red-700 hover:cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="top-28 bg-black/80 text-white border-none">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Xác nhận xoá</AlertDialogTitle>
                              <AlertDialogDescription>
                                Bạn có chắc muốn xoá câu hỏi này? Hành động
                                không thể hoàn tác.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="bg-gray-800 border-none hover:cursor-pointer">
                                Huỷ
                              </AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-red-600 hover:bg-red-700 text-white hover:cursor-pointer"
                                onClick={() =>
                                  handleDeleteQuestion(question.id)
                                }
                              >
                                Xoá
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
