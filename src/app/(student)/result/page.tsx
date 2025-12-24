"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  Award,
  Clock,
  TrendingUp,
  CheckCircle,
  FileText,
} from "lucide-react";
import StudentSideBar from "@/components/common/student/sidebar";
import StudentMenu from "@/components/common/student/menu";
import { useFindManySubmission } from "../../../../generated/hooks";
import { useAppSelector } from "@/store/hook";

interface SubmissionWithDetails {
  id: string;
  total_score: number | null;
  rating: string | null;
  start_time: Date | null;
  end_time: Date | null;
  status: string;
  exam: {
    id: string;
    title: string;
    topic: string;
    practice: boolean;
  };
  questions?: Array<{
    id: string;
    score: number | null;
    is_correct: boolean;
    options: string | null;
    answer: string | null;
    question: {
      id: string;
      question_text: string;
      question_type: string;
      options: string | null;
      correct_answer: string | null;
    };
  }>;
}

export default function ResultPage() {
  const router = useRouter();
  const userId = useAppSelector((state) => state.user.id);

  const { data: submissionsData, isLoading } = useFindManySubmission(
    {
      where: {
        student_id: userId,
      },
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
      orderBy: {
        created_at: "desc",
      },
    },
    {
      enabled: !!userId,
    }
  );

  // Filter only completed submissions
  const submissions = submissionsData?.filter(
    (sub: any) => sub.status === "COMPLETED"
  );

  const calculateTimeTaken = (
    startTime: Date | null,
    endTime: Date | null
  ): string => {
    if (!startTime || !endTime) return "N/A";

    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMs = end.getTime() - start.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffSecs = Math.floor((diffMs % 60000) / 1000);

    return `${diffMins} phút ${diffSecs} giây`;
  };

  const getRatingColor = (rating: string | null): string => {
    switch (rating) {
      case "EXCELLENT":
        return "bg-green-500 hover:bg-green-600";
      case "GOOD":
        return "bg-blue-500 hover:bg-blue-600";
      case "AVERAGE":
        return "bg-yellow-500 hover:bg-yellow-600";
      case "POOR":
        return "bg-red-500 hover:bg-red-600";
      default:
        return "bg-gray-500 hover:bg-gray-600";
    }
  };

  const getRatingText = (rating: string | null): string => {
    switch (rating) {
      case "EXCELLENT":
        return "Xuất sắc";
      case "GOOD":
        return "Tốt";
      case "AVERAGE":
        return "Trung bình";
      case "POOR":
        return "Yếu";
      default:
        return "Chưa đánh giá";
    }
  };

  const parseOptions = (optionsStr: string | null): any[] => {
    if (!optionsStr) return [];
    try {
      return JSON.parse(optionsStr);
    } catch {
      return [];
    }
  };

  if (isLoading) {
    return (
      <div
        className="min-h-screen flex"
        style={{
          background: "linear-gradient(to bottom right, #a8c5e6, #d4e4f7)",
        }}
      >
        <StudentSideBar />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
      <StudentSideBar />

      <div className="flex-1 flex flex-col">
        <StudentMenu />

        <main className="flex-1 px-8 pb-8">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-bold text-gray-900">
                Kết quả bài thi
              </h2>
              <div className="flex items-center gap-2">
                <Award className="w-6 h-6 text-yellow-500" />
                <span className="text-lg font-semibold text-gray-700">
                  Tổng số bài: {submissions?.length || 0}
                </span>
              </div>
            </div>

            {!submissions || submissions.length === 0 ? (
              <Card className="shadow-lg bg-white border-gray-300">
                <CardContent className="p-12 text-center">
                  <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">
                    Chưa có kết quả bài thi
                  </h3>
                  <p className="text-gray-500">
                    Bạn chưa hoàn thành bài thi nào. Hãy bắt đầu làm bài thi
                    nhé!
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {submissions.map((submission: any) => {
                  const isPractice = submission.exam.practice;
                  const timeTaken = calculateTimeTaken(
                    submission.start_time,
                    submission.end_time
                  );

                  return (
                    <Card
                      key={submission.id}
                      className="shadow-lg hover:shadow-xl transition-all duration-300 bg-white border border-gray-300 overflow-hidden"
                    >
                      <CardHeader
                        className={`p-6 border-b border-gray-200 ${"bg-gradient-to-r from-blue-50 to-white"}`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <CardTitle className="text-2xl font-bold text-gray-900">
                                {submission.exam.title}
                              </CardTitle>
                              <Badge
                                className={`${
                                  isPractice
                                    ? "bg-purple-500 hover:bg-purple-600"
                                    : "bg-blue-600 hover:bg-blue-700"
                                } text-white`}
                              >
                                {isPractice ? "Luyện tập" : "Chính thức"}
                              </Badge>
                            </div>
                            <p className="text-gray-600 flex items-center gap-2">
                              <BookOpen className="w-4 h-4" />
                              <span className="font-medium">Chủ đề:</span>
                              {submission.exam.topic}
                            </p>
                          </div>

                          <div className="flex flex-col items-end gap-2">
                            <Badge
                              className={`${getRatingColor(
                                submission.rating
                              )} text-white text-base px-4 py-1`}
                            >
                              {getRatingText(submission.rating)}
                            </Badge>
                            <div className="flex items-center gap-2 text-lg font-bold text-gray-900">
                              <TrendingUp className="w-5 h-5 text-green-600" />
                              <span>
                                Điểm:{" "}
                                {submission.total_score !== null
                                  ? Number(submission.total_score).toFixed(2)
                                  : "N/A"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 border border-blue-100">
                            <Clock className="w-5 h-5 text-blue-600" />
                            <div>
                              <p className="text-sm text-gray-500">
                                Thời gian làm bài
                              </p>
                              <p className="font-semibold text-gray-900">
                                {timeTaken}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 border border-green-100">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                            <div>
                              <p className="text-sm text-gray-500">
                                Trạng thái
                              </p>
                              <p className="font-semibold text-gray-900">
                                Hoàn thành
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 p-3 rounded-lg bg-purple-50 border border-purple-100">
                            <FileText className="w-5 h-5 text-purple-600" />
                            <div>
                              <p className="text-sm text-gray-500">
                                Số câu hỏi
                              </p>
                              <p className="font-semibold text-gray-900">
                                {submission.questions?.length || 0}
                              </p>
                            </div>
                          </div>
                        </div>

                        {isPractice && submission.questions && (
                          <div className="mt-4">
                            <Button
                              onClick={() =>
                                router.push(`/result/${submission.id}`)
                              }
                              variant="outline"
                              className="w-full flex items-center justify-center gap-2 hover:bg-gray-50"
                            >
                              <FileText className="w-4 h-4" />
                              Xem chi tiết câu trả lời
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
