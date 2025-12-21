"use client";

import { useRouter } from "next/navigation";
import { use } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Award,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
} from "lucide-react";
import StudentSideBar from "@/components/common/student/sidebar";
import StudentMenu from "@/components/common/student/menu";
import { useFindUniqueSubmission } from "../../../../../generated/hooks";
import { MathRenderer } from "@/components/MathRenderer";
import { useAppSelector } from "@/store/hook";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

// Helper function to parse JSON options
function parseOptions(optionsString: string | null): any[] {
  if (!optionsString) return [];
  try {
    return JSON.parse(optionsString);
  } catch {
    return [];
  }
}

// Helper function to calculate time taken
function calculateTimeTaken(
  startTime: Date | null,
  endTime: Date | null
): string {
  if (!startTime || !endTime) return "N/A";
  const start = new Date(startTime);
  const end = new Date(endTime);
  const diffMs = end.getTime() - start.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMins / 60);
  const minutes = diffMins % 60;
  if (hours > 0) {
    return `${hours} giờ ${minutes} phút`;
  }
  return `${minutes} phút`;
}

export default function ResultDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const router = useRouter();
  const userId = useAppSelector((state) => state.user.id);

  const {
    data: submission,
    isLoading,
    error,
  } = useFindUniqueSubmission(
    {
      where: { id },
      include: {
        exam: {
          select: {
            id: true,
            title: true,
            topic: true,
            practice: true,
          },
        },
        questions: {
          include: {
            question: {
              select: {
                id: true,
                question_text: true,
                question_type: true,
                options: true,
                correct_answer: true,
              },
            },
          },
        },
      },
    },
    {
      enabled: !!id,
    }
  );

  // Security check - ensure user owns this submission
  if (submission && submission.student_id !== userId) {
    return (
      <div className="flex min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <StudentSideBar />
        <div className="flex-1 flex flex-col">
          <StudentMenu />
          <main className="flex-1 p-8">
            <div className="max-w-4xl mx-auto">
              <Card className="p-8 text-center">
                <p className="text-red-600 text-lg">
                  Bạn không có quyền xem bài nộp này.
                </p>
                <Button onClick={() => router.push("/result")} className="mt-4">
                  Quay lại danh sách
                </Button>
              </Card>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <StudentSideBar />
        <div className="flex-1 flex flex-col">
          <StudentMenu />
          <main className="flex-1 p-8">
            <div className="max-w-4xl mx-auto">
              <Card className="p-8 text-center">
                <p className="text-gray-600">Đang tải...</p>
              </Card>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (error || !submission) {
    return (
      <div className="flex min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <StudentSideBar />
        <div className="flex-1 flex flex-col">
          <StudentMenu />
          <main className="flex-1 p-8">
            <div className="max-w-4xl mx-auto">
              <Card className="p-8 text-center">
                <p className="text-red-600 text-lg">
                  Không tìm thấy bài nộp này.
                </p>
                <Button onClick={() => router.push("/result")} className="mt-4">
                  Quay lại danh sách
                </Button>
              </Card>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const isPractice = submission.exam.practice;
  const timeTaken = calculateTimeTaken(
    submission.start_time,
    submission.end_time
  );

  return (
    <div
      className="flex min-h-screen"
      style={{
        background: "linear-gradient(to bottom right, #a8c5e6, #d4e4f7)",
      }}
    >
      <StudentSideBar />
      <div className="flex-1 flex flex-col">
        <StudentMenu />
        <main className="flex-1 p-8">
          <div className="mx-auto space-y-6">
            {/* Back Button */}
            <Button
              onClick={() => router.push("/result")}
              variant="outline"
              className="flex items-center gap-2 bg-white border-gray-300 hover:cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Quay lại danh sách
            </Button>

            {/* Header Card */}
            <Card className="shadow-lg bg-white border border-gray-300">
              <CardHeader className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <FileText className="w-6 h-6 text-blue-600" />
                      <h1 className="text-2xl font-bold text-gray-900">
                        {submission.exam.title}
                      </h1>
                      <Badge variant={isPractice ? "default" : "secondary"}>
                        {isPractice ? "Luyện tập" : "Thi"}
                      </Badge>
                    </div>
                    <p className="text-gray-600 ml-9">
                      Chủ đề: {submission.exam.topic}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2 text-3xl font-bold text-blue-600">
                      <Award className="w-8 h-8" />
                      {submission.total_score !== null
                        ? Number(submission.total_score).toFixed(2)
                        : "0.00"}
                      <span className="text-lg text-gray-600">điểm</span>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl border border-blue-200">
                    <Clock className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="text-sm text-gray-600">Thời gian làm bài</p>
                      <p className="font-semibold text-gray-900">{timeTaken}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl border border-green-200">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="text-sm text-gray-600">Trạng thái</p>
                      <p className="font-semibold text-gray-900">
                        {(submission as any).status === "COMPLETED"
                          ? "Hoàn thành"
                          : (submission as any).status || "N/A"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-xl border border-purple-200">
                    <FileText className="w-5 h-5 text-purple-600" />
                    <div>
                      <p className="text-sm text-gray-600">Số câu hỏi</p>
                      <p className="font-semibold text-gray-900">
                        {submission.questions?.length || 0}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Questions List */}
            {isPractice &&
              submission.questions &&
              submission.questions.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-gray-900">
                    Chi tiết câu trả lời
                  </h2>

                  {submission.questions.map((sq: any, index: number) => {
                    const questionOptions = parseOptions(sq.question.options);
                    const studentOptions = parseOptions(sq.options);

                    return (
                      <Card
                        key={sq.id}
                        className={`border-2 ${
                          sq.is_correct
                            ? "border-green-200 bg-green-100/70"
                            : "border-red-200 bg-red-100/70"
                        }`}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-bold text-gray-900">
                                  Câu {index + 1}:
                                </span>
                                {sq.is_correct ? (
                                  <Badge className="bg-green-500 text-white">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Đúng
                                  </Badge>
                                ) : (
                                  <Badge className="bg-red-500 text-white">
                                    <XCircle className="w-3 h-3 mr-1" />
                                    Sai
                                  </Badge>
                                )}
                              </div>
                              <div className="text-gray-800 leading-relaxed">
                                <MathRenderer
                                  content={sq.question.question_text}
                                />
                              </div>
                            </div>
                            <Badge variant="outline" className="font-semibold">
                              {sq.score !== null
                                ? Number(sq.score).toFixed(2)
                                : "0"}{" "}
                              điểm
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          {sq.question.question_type === "ESSAY" ? (
                            <div className="space-y-3">
                              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                                <p className="text-sm font-semibold text-blue-900 mb-1">
                                  Câu trả lời của bạn:
                                </p>
                                <p className="text-gray-700">
                                  {sq.answer || "Không có câu trả lời"}
                                </p>
                              </div>
                              {sq.question.correct_answer && (
                                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                                  <p className="text-sm font-semibold text-green-900 mb-1">
                                    Câu trả lời mẫu:
                                  </p>
                                  <div className="text-gray-700">
                                    <MathRenderer
                                      content={sq.question.correct_answer}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {questionOptions.map(
                                (option: any, optIndex: number) => {
                                  const isStudentChoice = studentOptions.some(
                                    (so: any) =>
                                      so.text === option.text && so.isCorrect
                                  );
                                  const isCorrect = option.isCorrect === true;

                                  let bgClass = "bg-white border-gray-300";
                                  let textClass = "text-gray-700";
                                  let iconElement = null;

                                  if (isStudentChoice && isCorrect) {
                                    bgClass = "bg-green-100 border-green-500";
                                    textClass = "text-green-900 font-semibold";
                                    iconElement = (
                                      <CheckCircle className="w-5 h-5 text-green-600" />
                                    );
                                  } else if (isStudentChoice && !isCorrect) {
                                    bgClass = "bg-red-100 border-red-500";
                                    textClass = "text-red-900 font-semibold";
                                    iconElement = (
                                      <XCircle className="w-5 h-5 text-red-600" />
                                    );
                                  } else if (!isStudentChoice && isCorrect) {
                                    bgClass = "bg-green-50 border-green-300";
                                    textClass = "text-green-800";
                                    iconElement = (
                                      <CheckCircle className="w-5 h-5 text-green-500" />
                                    );
                                  }

                                  return (
                                    <div
                                      key={optIndex}
                                      className={`flex items-center gap-3 p-3 rounded-lg border ${bgClass}`}
                                    >
                                      {iconElement && (
                                        <div className="flex-shrink-0">
                                          {iconElement}
                                        </div>
                                      )}
                                      <div className={`flex-1 ${textClass}`}>
                                        <MathRenderer content={option.text} />
                                      </div>
                                      {isStudentChoice && (
                                        <Badge
                                          variant="outline"
                                          className="text-xs"
                                        >
                                          Bạn chọn
                                        </Badge>
                                      )}
                                    </div>
                                  );
                                }
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}

            {/* No questions message */}
            {(!submission.questions || submission.questions.length === 0) && (
              <Card className="p-8 text-center">
                <p className="text-gray-600">
                  Không có câu hỏi nào trong bài nộp này.
                </p>
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
