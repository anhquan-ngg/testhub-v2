"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  Calendar,
  AlertCircle,
  CheckCircle2,
  FileText,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useFindUniqueExam } from "../../../../../generated/hooks";
import StudentSideBar from "@/components/common/student/sidebar";
import StudentMenu from "@/components/common/student/menu";

export default function ExamLandingPage() {
  const params = useParams();
  const examId = params.id as string;

  const { data: exam, isLoading } = useFindUniqueExam({
    where: {
      id: examId,
    },
    include: {
      questions: {
        select: {
          question: {
            select: {
              id: true,
              question_text: true,
              image_url: true,
              options: true,
            },
          },
        },
      },
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">
            Không tìm thấy bài thi
          </h2>
          <Button className="mt-4" asChild>
            <Link href="/home">Quay lại trang chủ</Link>
          </Button>
        </div>
      </div>
    );
  }
  return (
    <div
      className="min-h-screen flex"
      style={{
        background: "linear-gradient(to bottom right, #a8c5e6, #d4e4f7)",
      }}
    >
      <div className="flex-1 flex flex-col">
        <main className="flex-1 px-8 pb-8 flex items-center justify-center">
          <Card className="w-full max-w-4xl shadow-2xl border-0 bg-white/95 backdrop-blur">
            <CardHeader className="p-8">
              <div className="flex justify-between items-start">
                <div>
                  <Badge
                    className={`border-0 mb-4 text-white ${
                      exam.practice ? "bg-purple-500" : "bg-blue-500"
                    }`}
                  >
                    {exam.practice ? "Luyện tập" : "Bài thi chính thức"}
                  </Badge>
                  <CardTitle className="text-3xl font-bold mb-4">
                    {exam.title}
                  </CardTitle>
                  <p className="text-lg opacity-90">
                    <span className="font-semibold">Chủ đề:</span> {exam.topic}
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="px-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-center gap-4 p-4 rounded-lg bg-blue-50 border border-blue-100">
                  <div className="p-3 bg-blue-100 rounded-full text-blue-600">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Thời gian làm bài</p>
                    <p className="font-semibold text-gray-900">
                      {exam.duration} phút
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 rounded-lg bg-green-50 border border-green-100">
                  <div className="p-3 bg-green-100 rounded-full text-green-600">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Thời gian bắt đầu</p>
                    <p className="font-semibold text-gray-900">
                      {new Date(exam.exam_start_time).toLocaleDateString(
                        "vi-VN"
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 rounded-lg bg-purple-50 border border-purple-100">
                  <div className="p-3 bg-purple-100 rounded-full text-purple-600">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Số lượng câu hỏi</p>
                    <p className="font-semibold text-gray-900">
                      {exam.questions?.length || 0} câu
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-blue-600" />
                  Nội quy phòng thi
                </h3>
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <p className="text-gray-700">
                      <span className="font-semibold">Lưu ý:</span> Bài thi
                      chính thức chỉ cho phép thực hiện một lần duy nhất. Bài
                      luyện tập có thể thực hiện nhiều lần
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <p className="text-gray-700">
                      Không được phép sử dụng tài liệu trái phép trong quá trình
                      làm bài.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <p className="text-gray-700">
                      Hệ thống sẽ tự động nộp bài khi hết thời gian làm bài.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <p className="text-gray-700">
                      Đảm bảo kết nối internet ổn định trong suốt quá trình thi.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-4">
                <Button variant="outline" size="lg" className="px-8" asChild>
                  <Link href="/home">Quay lại</Link>
                </Button>
                <Button
                  size="lg"
                  className="px-12 bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all"
                  asChild
                >
                  <Link href={`/exam/${examId}/take`}>Làm bài ngay</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
