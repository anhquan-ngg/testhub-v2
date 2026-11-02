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
import { examTypeClass, ratingClass } from "@/lib/exam-style";

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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0066cc]"></div>
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
              <h2 className="text-2xl font-bold text-neutral-900">
                {t("examResults")}</h2>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-neutral-500">
                  {t("totalExams", { count: submissions?.length || 0 })}
                </span>
              </div>
            </div>

            {!submissions || submissions.length === 0 ? (
              <Card className="border-gray-300 bg-white shadow-sm">
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
                      className="gap-0 overflow-hidden border border-gray-300 bg-white py-0 shadow-sm transition-shadow hover:shadow-md"
                    >
                      <CardHeader
                        className="border-b border-gray-200 bg-gray-50 p-6"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <CardTitle className="text-lg font-semibold text-neutral-900">
                                {submission.exam.title}
                              </CardTitle>
                              <Badge variant="outline" className={examTypeClass(isPractice)}>
                                {isPractice ? t("practice") : t("official")}
                              </Badge>
                            </div>
                            <p className="text-gray-600 flex items-center gap-2">
                              <span className="font-medium">{t("topic")}</span>
                              {submission.exam.topic?.name ?? "N/A"}
                            </p>
                          </div>

                          <div className="flex flex-col items-end gap-2">
                            <Badge variant="outline" className={`px-3 py-1 text-sm ${ratingClass(submission.rating)}`}>
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
                          <div className="flex items-center gap-3 p-3 rounded-lg bg-sky-50 border border-sky-200">
                            <Clock className="w-5 h-5 text-sky-700" />
                            <div>
                              <p className="text-sm text-gray-500">
                                {t("timeToDoHomework")}</p>
                              <p className="font-semibold text-gray-900">
                                {timeTaken}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                            <CheckCircle className="w-5 h-5 text-emerald-700" />
                            <div>
                              <p className="text-sm text-gray-500">
                                {t("status")}</p>
                              <p className="font-semibold text-gray-900">
                                {t("complete")}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 p-3 rounded-lg bg-violet-50 border border-violet-200">
                            <FileText className="w-5 h-5 text-violet-700" />
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
                              className="flex w-full cursor-pointer items-center justify-center gap-2 bg-[#0066cc] text-white hover:bg-[#0052a3]"
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
