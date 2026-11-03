"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  FileText,
  HelpCircle,
  BarChart3,
  type LucideIcon,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { SubmissionStatus } from "@/types/backend-enums";
import { useSocket } from "@/components/providers/SocketProvider";
import apiClient from "@/lib/api-client";
import { ENDPOINTS } from "@/constants/endpoints";

type PageResult<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
};

type StatCardProps = {
  title: string;
  value: number;
  icon: LucideIcon;
  iconClass: string;
};

/** Thẻ thống kê với icon có màu nền riêng theo từng loại số liệu. */
function StatCard({ title, value, icon: Icon, iconClass }: StatCardProps) {
  return (
    <Card className="border-gray-300 bg-white shadow-sm">
      <CardContent className="flex items-center gap-4 p-5">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${iconClass}`}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm text-neutral-500">{title}</p>
          <p className="text-2xl font-bold text-neutral-900">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

type DashboardSubmission = {
  total_score?: number | string | null;
  exam?: {
    practice?: boolean | null;
  } | null;
};

export default function AdminDashboard() {
  const t = useTranslations("admin.dashboard");
  const { socket } = useSocket();
  const [usersCount, setUsersCount] = useState(0);
  const [examsCount, setExamsCount] = useState(0);
  const [questionsCount, setQuestionsCount] = useState(0);
  const [submissionCount, setSubmissionCount] = useState(0);
  const [allSubmissions, setAllSubmissions] = useState<DashboardSubmission[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const fetchAllCompletedSubmissions = useCallback(async () => {
    const limit = 100;
    let page = 1;
    const submissions: DashboardSubmission[] = [];

    while (true) {
      const response = await apiClient.get<PageResult<DashboardSubmission>>(
        ENDPOINTS.SUBMISSIONS.BASE,
        {
          params: {
            page,
            limit,
            status: SubmissionStatus.COMPLETED,
          },
        },
      );

      const pageData = response.data.data ?? [];
      submissions.push(...pageData);

      if (pageData.length < limit) {
        break;
      }

      page += 1;
    }

    return submissions;
  }, []);

  const fetchDashboardData = useCallback(async (showSpinner = false) => {
    if (showSpinner) setIsLoading(true);
    setHasError(false);
    try {
      const [
        usersResponse,
        examsResponse,
        questionsResponse,
        submissionsResponse,
        completedSubmissions,
      ] = await Promise.all([
        apiClient.get<PageResult<unknown>>(ENDPOINTS.USERS.BASE, {
          params: { page: 1, limit: 1 },
        }),
        apiClient.get<PageResult<unknown>>(ENDPOINTS.EXAMS.BASE, {
          params: { page: 1, limit: 1 },
        }),
        apiClient.get<PageResult<unknown>>(ENDPOINTS.QUESTIONS.BASE, {
          params: { page: 1, limit: 1 },
        }),
        apiClient.get<PageResult<unknown>>(ENDPOINTS.SUBMISSIONS.BASE, {
          params: { page: 1, limit: 1, status: SubmissionStatus.COMPLETED },
        }),
        fetchAllCompletedSubmissions(),
      ]);

      setUsersCount(usersResponse.data.total);
      setExamsCount(examsResponse.data.total);
      setQuestionsCount(questionsResponse.data.total);
      setSubmissionCount(submissionsResponse.data.total);
      setAllSubmissions(completedSubmissions);
    } catch (error) {
      setHasError(true);
      console.log(error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchDashboardData(true);
  }, [fetchDashboardData]);

  useEffect(() => {
    if (hasError) {
      toast.error(
        t("anErrorOccurredWhileLoadingStatistical"),
      );
    }
  }, [hasError, t]);

  // Listen for real-time dashboard updates
  useEffect(() => {
    if (!socket) return;

    const handleDashboardUpdate = () => {
      void fetchDashboardData();

      toast.info(t("dashboardDataHasBeenUpdatedAutomatically"));
    };

    socket.on("dashboard:update", handleDashboardUpdate);

    return () => {
      socket.off("dashboard:update", handleDashboardUpdate);
    };
  }, [socket, fetchDashboardData, t]);

  const scoreData = useMemo(() => {
    const ranges = [
      { range: "0-2.0", count: 0, countPractice: 0 },
      { range: "2.1-4.0", count: 0, countPractice: 0 },
      { range: "4.1-6.0", count: 0, countPractice: 0 },
      { range: "6.1-8.0", count: 0, countPractice: 0 },
      { range: "8.1-10.0", count: 0, countPractice: 0 },
    ];

    if (!allSubmissions) return ranges;

    allSubmissions.forEach((sub) => {
      const score = sub.total_score ? Number(sub.total_score) : 0;
      const isPractice = sub.exam?.practice ?? false;

      let rangeIndex = -1;
      if (score >= 0 && score <= 2.0) rangeIndex = 0;
      else if (score > 2.0 && score <= 4.0) rangeIndex = 1;
      else if (score > 4.0 && score <= 6.0) rangeIndex = 2;
      else if (score > 6.0 && score <= 8.0) rangeIndex = 3;
      else if (score > 8.0 && score <= 10.0) rangeIndex = 4;

      if (rangeIndex !== -1) {
        if (isPractice) {
          ranges[rangeIndex].countPractice++;
        } else {
          ranges[rangeIndex].count++;
        }
      }
    });

    return ranges;
  }, [allSubmissions]);

  if (isLoading) {
    return <Spinner />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-neutral-900">{t("brandTitle")}</h2>
        <p className="mt-1 text-sm text-neutral-500">{t("adminConsole")}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title={t("totalUsers")}
          value={usersCount}
          icon={Users}
          iconClass="bg-sky-100 text-sky-700"
        />
        <StatCard
          title={t("test")}
          value={examsCount}
          icon={FileText}
          iconClass="bg-violet-100 text-violet-700"
        />
        <StatCard
          title={t("questionBank")}
          value={questionsCount}
          icon={HelpCircle}
          iconClass="bg-amber-100 text-amber-700"
        />
        <StatCard
          title={t("examTurn")}
          value={submissionCount}
          icon={BarChart3}
          iconClass="bg-emerald-100 text-emerald-700"
        />
      </div>

      <Card className="border-gray-300 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-neutral-900">
            {t("scoreAnalysis")}
          </CardTitle>
          <p className="text-sm text-neutral-500">
            {t("averageScoreSpectrum")}
          </p>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scoreData} barGap={4} barCategoryGap="24%">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis
                  dataKey="range"
                  tick={{ fill: "#6b7280", fontSize: 12 }}
                  axisLine={{ stroke: "#d1d5db" }}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: "#6b7280", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: "#f3f4f6" }}
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid #d1d5db",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                    fontSize: 13,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 13, color: "#4b5563", paddingTop: 8 }} />
                <Bar
                  dataKey="count"
                  fill="#8b5cf6"
                  radius={[4, 4, 0, 0]}
                  name={t("numberOfOfficialExams")}
                />
                <Bar
                  dataKey="countPractice"
                  fill="#0ea5e9"
                  radius={[4, 4, 0, 0]}
                  name={t("numberOfPracticeTests")}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}