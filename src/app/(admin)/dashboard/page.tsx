"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileText, HelpCircle, BarChart3 } from "lucide-react";
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
import { SubmissionStatus } from "@prisma/client";
import { useSocket } from "@/components/providers/SocketProvider";
import apiClient from "@/lib/api-client";
import { ENDPOINTS } from "@/constants/endpoints";

type PageResult<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
};

type DashboardSubmission = {
  total_score?: number | string | null;
  exam?: {
    practice?: boolean | null;
  } | null;
};

export default function AdminDashboard() {
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

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
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
    void fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    if (hasError) {
      toast.error(
        "Có lỗi xảy ra khi tải dữ liệu thống kê. Vui lòng thử lại sau.",
      );
    }
  }, [hasError]);

  // Listen for real-time dashboard updates
  useEffect(() => {
    if (!socket) return;

    const handleDashboardUpdate = (metrics?: any) => {
      console.log("Real-time dashboard update received:", metrics);

      void fetchDashboardData();

      toast.info("Dữ liệu dashboard đã được cập nhật tự động.");
    };

    socket.on("dashboard:update", handleDashboardUpdate);

    return () => {
      socket.off("dashboard:update", handleDashboardUpdate);
    };
  }, [socket, fetchDashboardData]);

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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-[#0066cc]">TESTHUB Admin</h1>
          <p className="text-gray-700 mt-1">Bảng điều khiển quản trị viên</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white border-gray-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Tổng người dùng
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usersCount}</div>
          </CardContent>
        </Card>
        <Card className="bg-white border-gray-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Bài kiểm tra</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{examsCount}</div>
          </CardContent>
        </Card>
        <Card className="bg-white border-gray-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Ngân hàng câu hỏi
            </CardTitle>
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{questionsCount}</div>
          </CardContent>
        </Card>
        <Card className="bg-white border-gray-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Lượt thi</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{submissionCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content - Analytics */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-800">Phân tích điểm</h2>
        <Card className="bg-white border-gray-300">
          <CardHeader>
            <CardTitle>Phổ điểm trung bình</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={scoreData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="range" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar
                    dataKey="count"
                    fill="#0066cc"
                    name="Số lượng bài thi chính thức"
                  />
                  <Bar
                    dataKey="countPractice"
                    fill="#8f00ff"
                    name="Số lượng bài thi luyện tập"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
