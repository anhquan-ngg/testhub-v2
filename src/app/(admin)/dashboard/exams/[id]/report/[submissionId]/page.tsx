"use client";

import axiosClient from "@/lib/axios";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { use } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Award,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  Printer,
  User,
  Mail,
  GraduationCap,
} from "lucide-react";
import { useFindUniqueSubmission } from "../../../../../../../../generated/hooks";
import { MathRenderer } from "@/components/MathRenderer";
import {
  calculateScorePerQuestion,
  calculateTotalQuesions,
  parseOptions,
} from "@/lib/exam-utils";
import { toast } from "sonner";

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

export default function AdminResultDetailPage() {
  const params = useParams();
  const id = params.submissionId as string;
  const examId = params.id as string;
  const router = useRouter();

  const [isPrinting, setIsPrinting] = useState(false);

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
            mode: true,
            sample_size: true,
            distribution: true,
            _count: {
              select: {
                questions: true,
              },
            },
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
        student: {
          select: {
            full_name: true,
            email: true,
          },
        },
      },
    },
    {
      enabled: !!id,
    }
  );

  // ... existing code ...

  const handlePrint = async () => {
    try {
      setIsPrinting(true);
      const response = await axiosClient.get(`/submission/${id}/pdf`, {
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `Ketqua_${submission?.student?.full_name?.replace(
        /\s+/g,
        "_"
      )}_${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("Print error:", err);
      toast.error("Có lỗi xảy ra khi tạo bản in. Vui lòng thử lại sau.");
    } finally {
      setIsPrinting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center bg-white rounded-lg border border-gray-300">
        <p className="text-gray-600">Đang tải...</p>
      </div>
    );
  }

  if (error || !submission) {
    return (
      <div className="p-8 text-center bg-white rounded-lg border border-gray-300">
        <p className="text-red-600 text-lg">Không tìm thấy bài nộp này.</p>
        <Button onClick={() => router.back()} className="mt-4">
          Quay lại
        </Button>
      </div>
    );
  }

  const isPractice = submission.exam.practice;
  const timeTaken = calculateTimeTaken(
    submission.start_time,
    submission.end_time
  );

  const getRatingColor = (rating: string | null) => {
    switch (rating) {
      case "EXCELLENT":
        return "bg-green-500";
      case "GOOD":
        return "bg-blue-500";
      case "AVERAGE":
        return "bg-yellow-500";
      case "POOR":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto print:p-0">
      {/* Action Buttons */}
      <div className="flex items-center justify-between no-print">
        <Button
          onClick={() => router.back()}
          variant="outline"
          className="flex items-center gap-2 bg-white border-gray-300 hover:cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại báo cáo
        </Button>
        <Button
          onClick={handlePrint}
          disabled={isPrinting}
          className=" flex items-center gap-2 bg-[#0066cc] hover:bg-[#0052a3] text-white border-none hover:cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          {isPrinting ? "Đang chuẩn bị bản in..." : "In chi tiết kết quả"}
        </Button>
      </div>

      {/* Student & Exam Info Header */}
      <Card className="shadow-lg bg-white border border-gray-300 overflow-hidden">
        <div className="bg-[#0066cc] p-6 text-white">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <User className="w-7 h-7" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">
                    {submission.student?.full_name}
                  </h1>
                  <div className="flex items-center gap-2 text-blue-100 text-sm">
                    <Mail className="w-3.5 h-3.5" />
                    {submission.student?.email}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 pt-2">
                <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg border border-white/20">
                  <FileText className="w-4 h-4 text-blue-200" />
                  <span className="text-sm">
                    Bài thi:{" "}
                    <span className="font-semibold text-white">
                      {submission.exam.title}
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg border border-white/20">
                  <GraduationCap className="w-4 h-4 text-blue-200" />
                  <span className="text-sm">
                    Xếp loại:{" "}
                    <Badge
                      className={`${getRatingColor(
                        submission.rating
                      )} border-none text-white ml-1`}
                    >
                      {submission.rating || "N/A"}
                    </Badge>
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white/10 p-6 rounded-2xl border border-white/20 text-center min-w-[140px]">
              <div className="text-blue-200 text-sm font-medium mb-1 uppercase tracking-wider">
                Tổng điểm
              </div>
              <div className="text-5xl font-black">
                {submission.total_score !== null
                  ? Number(submission.total_score).toFixed(2)
                  : "0.00"}
              </div>
            </div>
          </div>
        </div>

        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
              <Clock className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-xs text-gray-500 uppercase font-bold tracking-tight">
                  Thời gian làm bài
                </p>
                <p className="font-semibold text-gray-900">{timeTaken}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-xs text-gray-500 uppercase font-bold tracking-tight">
                  Trạng thái
                </p>
                <p className="font-semibold text-gray-900">
                  {(submission as any).status === "COMPLETED"
                    ? "Hoàn thành"
                    : (submission as any).status || "N/A"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
              <FileText className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-xs text-gray-500 uppercase font-bold tracking-tight">
                  Số câu hỏi
                </p>
                <p className="font-semibold text-gray-900">
                  {calculateTotalQuesions(submission)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Questions Detail */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-blue-600" />
            Chi tiết câu trả lời
          </h2>
        </div>

        {submission.questions?.map((sq: any, index: number) => {
          const questionOptions = parseOptions(sq.question.options);
          const studentOptions = parseOptions(sq.options);

          return (
            <Card
              key={sq.id}
              className={`border-2 shadow-sm ${
                sq.is_correct
                  ? "border-green-200 bg-green-100/70"
                  : "border-red-200 bg-red-100/70"
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900 text-lg">
                      Câu {index + 1}:
                    </span>
                    {sq.is_correct ? (
                      <Badge className="bg-green-500 text-white hover:bg-green-500">
                        <CheckCircle className="w-3.5 h-3.5 mr-1" />
                        Đúng
                      </Badge>
                    ) : (
                      <Badge className="bg-red-500 text-white hover:bg-red-500">
                        <XCircle className="w-3.5 h-3.5 mr-1" />
                        Sai
                      </Badge>
                    )}
                  </div>
                  <div className="bg-white px-3 py-1 rounded-full border border-gray-300 shadow-sm">
                    <span className="text-sm font-bold text-gray-700">
                      {(
                        calculateScorePerQuestion(submission) * sq.score
                      ).toFixed(2)}{" "}
                      điểm
                    </span>
                  </div>
                </div>
                <div className="text-gray-800 leading-relaxed font-medium mb-4 text-lg">
                  <MathRenderer content={sq.question.question_text} />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {sq.question.question_type === "ESSAY" ? (
                  <div className="space-y-3">
                    <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
                      <p className="text-xs font-bold text-gray-400 uppercase mb-2">
                        Câu trả lời của sinh viên:
                      </p>
                      <p className="text-gray-700 whitespace-pre-wrap">
                        {sq.answer || "Không có câu trả lời"}
                      </p>
                    </div>
                    {sq.question.correct_answer && (
                      <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                        <p className="text-xs font-bold text-green-700 uppercase mb-2">
                          Đáp án mẫu:
                        </p>
                        <div className="text-gray-700">
                          <MathRenderer content={sq.question.correct_answer} />
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2">
                    {questionOptions.map((option: any, optIndex: number) => {
                      const isStudentChoice = studentOptions.some(
                        (so: any) =>
                          so.text === option.text && so.isCorrect === true
                      );
                      const isCorrect = option.isCorrect === true;

                      let borderClass = "border-gray-100";
                      let bgClass = "bg-white";
                      let textColor = "text-gray-700";
                      let checkIcon = null;

                      if (isCorrect) {
                        borderClass = "border-green-400";
                        bgClass = "bg-green-50";
                        textColor = "text-green-900";
                        checkIcon = (
                          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                        );
                      }

                      return (
                        <div
                          key={optIndex}
                          className={`flex items-center justify-between gap-3 p-3 rounded-xl border-2 shadow-sm transition-all ${borderClass} ${bgClass}`}
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            {checkIcon}
                            <div
                              className={`flex-1 ${textColor} min-w-0 overflow-hidden`}
                            >
                              <MathRenderer content={option.text} />
                            </div>
                          </div>
                          {isStudentChoice && (
                            <div className="flex-shrink-0">
                              <Badge
                                variant="outline"
                                className="text-xs font-bold border-gray-300 text-gray-900 bg-white px-3 py-1 rounded-full whitespace-nowrap"
                              >
                                Thí sinh chọn
                              </Badge>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background: white !important;
            overflow: visible !important;
          }
          aside,
          header {
            display: none !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
            height: auto !important;
          }
          .flex-1 {
            width: 100% !important;
            overflow: visible !important;
          }
          * {
            overflow: visible !important;
          }
        }
      `}</style>
    </div>
  );
}
