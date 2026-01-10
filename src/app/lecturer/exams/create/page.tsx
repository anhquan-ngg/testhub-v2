"use client";

import { useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useCreateExam } from "../../../../../generated/hooks";
import { ExamStatus } from "@prisma/client";
import { toast } from "sonner";
import { useAppSelector } from "@/store/hook";

export default function CreateExamPage() {
  const lecturerId = useAppSelector((state) => state.user.id);
  const router = useRouter();
  const [examForm, setExamForm] = useState({
    title: "",
    topic: "",
    exam_start_time: "",
    exam_end_time: "",
    duration: "",
    practice: false,
    is_public: false,
  });

  const createExamMutation = useCreateExam({
    onSuccess: () => {
      toast.success("Tạo bài thi thành công!");
      router.push("/lecturer/exams");
    },
    onError: (error) => {
      toast.error("Tạo bài thi thất bại. Vui lòng thử lại.");
      console.log(error);
    },
  });

  const handleAddExam = async () => {
    if (
      !examForm.title ||
      !examForm.topic ||
      !examForm.exam_start_time ||
      !examForm.exam_end_time ||
      !examForm.duration
    ) {
      toast.warning("Vui lòng điền đầy đủ thông tin!");
      return;
    }

    const newExam = {
      ...examForm,
      lecturer_id: lecturerId,
      exam_start_time: new Date(examForm.exam_start_time),
      exam_end_time: new Date(examForm.exam_end_time),
      duration: Number.parseInt(examForm.duration),
      is_public: examForm.is_public,
      status: ExamStatus.ACTIVE,
    } as const;

    console.log("New exam:", newExam);
    await createExamMutation.mutateAsync({
      data: newExam,
    });

    // Reset form và quay lại
    setExamForm({
      title: "",
      topic: "",
      exam_start_time: "",
      exam_end_time: "",
      duration: "",
      practice: false,
      is_public: false,
    });
    router.push("/lecturer/exams");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <h2 className="text-3xl font-bold text-gray-900">Tạo bài thi mới</h2>
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

            <div className="flex gap-3 pt-6">
              <Button
                variant="outline"
                onClick={() => router.push("/lecturer/exams")}
                className="flex-1 border-gray-300 hover:bg-gray-100 hover:border-none hover:cursor-pointer"
              >
                Hủy
              </Button>
              <Button
                onClick={handleAddExam}
                className="flex-1 bg-[#0066cc] hover:bg-[#0052a3] text-white hover:cursor-pointer"
              >
                Tạo bài thi
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
