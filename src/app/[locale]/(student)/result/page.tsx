"use client";

import { useTranslations } from "next-intl";
import { useState, useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle, FileText } from "lucide-react";
import StudentSideBar from "@/components/common/student/sidebar";
import StudentMenu from "@/components/common/student/menu";
import { useAppSelector } from "@/store/hook";
import apiClient from "@/lib/api-client";
import { ENDPOINTS } from "@/constants/endpoints";
import { getDistributionQuestions } from "@/lib/exam-utils";

interface SubmissionWithDetails {
  id: string;
  total_score: number | string | null;
  rating: string | null;
  start_time: string | Date | null;
  end_time: string | Date | null;
  status: string;
  exam: {
    id: string;
    title: string;
    topic?: {
      id: string;
      name: string;
    } | null;
    practice: boolean;
    mode: string;
    sample_size: number | null;
    distribution: string | null;
    _count: {
      questions: number;
    };
  };
  questions?: Array<{
    id: string;
    score: number | string | null;
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

type PageResult<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
};

export default function ResultPage() {
  const t = useTranslations("student.results");
  const router = useRouter();
  const userId = useAppSelector((state) => state.user.id);
  const [submissions, setSubmissions] = useState<SubmissionWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSubmissions = async () => {
      if (!userId) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const response = await apiClient.get<PageResult<SubmissionWithDetails>>(
          ENDPOINTS.SUBMISSIONS.BASE,
          {
            params: {
              student_id: userId,
              status: "COMPLETED",
              limit: 100,
            },
          },
        );

        setSubmissions(response.data.data ?? []);
      } catch (error) {
        console.error("Fetch submissions error:", error);
        setSubmissions([]);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchSubmissions();
  }, [userId]);

  const calculateTimeTaken = (
    startTime: string | Date | null,
    endTime: string | Date | null,
  ): string => {
    if (!startTime || !endTime) return "N/A";

    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMs = end.getTime() - start.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffSecs = Math.floor((diffMs % 60000) / 1000);

    return t("minutesSeconds", { minutes: diffMins, seconds: diffSecs });
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
        return t("excellent");
      case "GOOD":
        return t("good");
      case "AVERAGE":
        return t("medium");
      case "POOR":
        return t("weak");
      default:
        return t("notRatedYet");
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-neutral-100">
        <StudentSideBar />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-neutral-100">
      <StudentSideBar />

      <div className="flex-1 flex flex-col">
        <StudentMenu />

        <main className="flex-1 px-6 pb-10 pt-7 md:px-8">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-bold text-gray-900">
                {t("examResults")}</h2>
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-gray-700">
                  {t("totalExams", { count: submissions?.length || 0 })}
                </span>
              </div>
            </div>

            {!submissions || submissions.length === 0 ? (
              <Card className="shadow-lg bg-white border-gray-300">
                <CardContent className="p-12 text-center">
                  <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">
                    {t("thereAreNoTestResultsYet")}</h3>
                  <p className="text-gray-500">
                    {t("youHaveNotCompletedAnyExams")}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {submissions.map((submission) => {
                  const isPractice = submission.exam.practice;
                  const timeTaken = calculateTimeTaken(
                    submission.start_time,
                    submission.end_time,
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
                                {isPractice ? t("practice") : t("official")}
                              </Badge>
                            </div>
                            <p className="text-gray-600 flex items-center gap-2">
                              <span className="font-medium">{t("topic")}</span>
                              {submission.exam.topic?.name ?? "N/A"}
                            </p>
                          </div>

                          <div className="flex flex-col items-end gap-2">
                            <Badge
                              className={`${getRatingColor(
                                submission.rating,
                              )} text-white text-base px-4 py-1`}
                            >
                              {getRatingText(submission.rating)}
                            </Badge>
                            <div className="flex items-center gap-2 text-lg font-bold text-gray-900">
                              <span>
                                {t("point")}{" "}
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
                                {t("timeToDoHomework")}</p>
                              <p className="font-semibold text-gray-900">
                                {timeTaken}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 border border-green-100">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                            <div>
                              <p className="text-sm text-gray-500">
                                {t("status")}</p>
                              <p className="font-semibold text-gray-900">
                                {t("complete")}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 p-3 rounded-lg bg-purple-50 border border-purple-100">
                            <FileText className="w-5 h-5 text-purple-600" />
                            <div>
                              <p className="text-sm text-gray-500">
                                {t("numberOfQuestions")}</p>
                              <p className="font-semibold text-gray-900">
                                {submission.exam.mode === "RANDOM_N"
                                  ? submission.exam.sample_size
                                  : submission.exam.mode === "BY_TYPE" ||
                                      submission.exam.mode === "BY_CHAPTER"
                                    ? getDistributionQuestions(
                                        submission.exam.distribution,
                                      )
                                    : submission.exam._count.questions || 0}
                              </p>
                            </div>
                          </div>
                        </div>

                        {isPractice && (
                          <div className="mt-4">
                            <Button
                              onClick={() =>
                                router.push(`/result/${submission.id}`)
                              }
                              variant="outline"
                              className="w-full flex items-center justify-center bg-[#7ba7d6] hover:bg-[#6b97c6] text-white hover:cursor-pointer gap-2"
                            >
                              <FileText className="w-4 h-4" />
                              {t("seeDetailedAnswer")}</Button>
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
