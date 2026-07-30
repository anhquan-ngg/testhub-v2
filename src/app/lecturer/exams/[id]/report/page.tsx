"use client";

import apiClient from "@/lib/api-client";
import { ENDPOINTS } from "@/constants/endpoints";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAppSelector } from "@/store/hook";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  ChevronLeft,
  Trash2,
  Printer,
  CheckCircle2,
  XCircle,
  CircleDashed,
  Clock,
  User,
  History,
} from "lucide-react";
import { toast } from "sonner";
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

type ReportExam = {
  id: string;
  title: string;
};

type ReportStudent = {
  full_name?: string | null;
  email?: string | null;
};

type ReportSubmissionQuestion = {
  answer?: string | null;
  is_correct?: boolean | null;
};

type ReportSubmission = {
  id: string;
  total_score?: number | string | null;
  rating?: string | null;
  start_time?: string | Date | null;
  end_time?: string | Date | null;
  student?: ReportStudent | null;
  questions?: ReportSubmissionQuestion[];
};

type SubmissionListResponse = {
  data?: Array<{ id: string }>;
};

export default function ExamReportPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.id as string;
  const user = useAppSelector((state) => state.user);
  const userRole = user.role;
  const isAdmin = userRole === "ADMIN";
  const [isPrinting, setIsPrinting] = useState(false);
  const [exam, setExam] = useState<ReportExam | null>(null);
  const [submissions, setSubmissions] = useState<ReportSubmission[]>([]);
  const [isLoadingExam, setIsLoadingExam] = useState(true);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(true);
  const [deletingSubmissionId, setDeletingSubmissionId] = useState<
    string | null
  >(null);

  const fetchReportData = useCallback(async () => {
    if (!examId) return;

    setIsLoadingExam(true);
    setIsLoadingSubmissions(true);

    try {
      const [examResponse, submissionsResponse] = await Promise.all([
        apiClient.get<ReportExam>(ENDPOINTS.EXAMS.DETAIL(examId)),
        apiClient.get<SubmissionListResponse>(ENDPOINTS.SUBMISSIONS.BASE, {
          params: {
            exam_id: examId,
            status: "COMPLETED",
            limit: 100,
          },
        }),
      ]);

      setExam(examResponse.data);

      const submissionList = submissionsResponse.data?.data ?? [];
      const detailedSubmissions = await Promise.all(
        submissionList.map(async (submission) => {
          const response = await apiClient.get<ReportSubmission>(
            ENDPOINTS.SUBMISSIONS.DETAIL(submission.id),
          );
          return response.data;
        }),
      );

      setSubmissions(detailedSubmissions);
    } catch (error) {
      console.error("Fetch report data error:", error);
      toast.error("Lỗi khi tải báo cáo bài thi.");
      setExam(null);
      setSubmissions([]);
    } finally {
      setIsLoadingExam(false);
      setIsLoadingSubmissions(false);
    }
  }, [examId]);

  useEffect(() => {
    void fetchReportData();
  }, [fetchReportData]);

  const handlePrintReport = async () => {
    try {
      setIsPrinting(true);
      const response = await apiClient.get(
        ENDPOINTS.SUBMISSIONS.EXAM_REPORT_PDF(examId),
        {
          responseType: "blob",
        },
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `Baocao_${exam?.title?.replace(/\s+/g, "_")}_${examId}.pdf`;
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

  const handleDeleteSubmission = async (submissionId: string) => {
    setDeletingSubmissionId(submissionId);
    try {
      await apiClient.delete(ENDPOINTS.SUBMISSIONS.DETAIL(submissionId));
      toast.success("Đã xóa lịch sử thi.");
      await fetchReportData();
    } catch (error) {
      console.error("Delete submission error:", error);
      toast.error("Lỗi khi xóa lịch sử thi.");
    } finally {
      setDeletingSubmissionId(null);
    }
  };

  const calculateStats = (submission: ReportSubmission) => {
    let correct = 0;
    let incorrect = 0;
    let skipped = 0;

    submission.questions?.forEach((sq) => {
      if (sq.is_correct) {
        correct++;
      } else if (!sq.answer || sq.answer.trim() === "") {
        skipped++;
      } else {
        incorrect++;
      }
    });

    return { correct, incorrect, skipped };
  };

  const calculateTimeTaken = (
    start: string | Date | null | undefined,
    end: string | Date | null | undefined,
  ) => {
    if (!start || !end) return "N/A";
    const diff = new Date(end).getTime() - new Date(start).getTime();
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${minutes}p ${seconds}s`;
  };

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

  if (isLoadingExam || isLoadingSubmissions) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold">Không tìm thấy bài thi</h2>
        <Button onClick={() => router.back()} className="mt-4">
          Quay lại
        </Button>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto print:p-0">
      <div className="flex items-center justify-between no-print">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.back()}
            className="bg-white border-gray-300 hover:cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4 text-gray-700" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Báo cáo kết quả (Lecturer)
            </h1>
            <p className="text-gray-500">
              Bài thi: {exam.title} - Tổng số lượt thi: {""}
              {submissions?.length || 0}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handlePrintReport}
            disabled={isPrinting}
            className="flex items-center gap-2 bg-[#0066cc] hover:bg-[#0052a3] hover:cursor-pointer text-white"
          >
            <Printer className="h-4 w-4 mr-2" />
            {isPrinting ? "Đang chuẩn bị..." : "In báo cáo"}
          </Button>
        </div>
      </div>

      <Card className="bg-white border-gray-300 shadow-sm overflow-hidden">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl flex items-center gap-2">
              <History className="h-5 w-5" />
              Danh sách kết quả làm bài
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/50 border-gray-300">
                <TableHead>Họ tên</TableHead>
                <TableHead>Điểm</TableHead>
                <TableHead>Thời gian</TableHead>
                <TableHead>Xếp loại</TableHead>
                <TableHead className="text-green-600">
                  <div className="flex items-center justify-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Đúng
                  </div>
                </TableHead>
                <TableHead className="text-red-600">
                  <div className="flex items-center justify-center gap-1">
                    <XCircle className="h-3 w-3" /> Sai
                  </div>
                </TableHead>
                <TableHead className="text-gray-600">
                  <div className="flex items-center justify-center gap-1">
                    <CircleDashed className="h-3 w-3" /> Bỏ qua
                  </div>
                </TableHead>
                <TableHead className="text-center no-print">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {submissions && submissions.length > 0 ? (
                submissions.map((sub) => {
                  const stats = calculateStats(sub);
                  return (
                    <TableRow
                      key={sub.id}
                      className="border-gray-300 hover:bg-gray-50 transition-colors"
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <div className="flex flex-col items-start justify-center">
                            <div>{sub.student?.full_name}</div>
                            <div className="text-xs text-gray-400">
                              {sub.student?.email}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-bold text-blue-700">
                        {Number(sub.total_score || 0).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Clock className="h-3 w-3 text-gray-400" />
                          {calculateTimeTaken(sub.start_time, sub.end_time)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`${getRatingColor(sub.rating ?? null)} text-white`}
                        >
                          {sub.rating || "N/A"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold text-green-600 text-center">
                        {stats.correct}
                      </TableCell>
                      <TableCell className="font-semibold text-red-600 text-center">
                        {stats.incorrect}
                      </TableCell>
                      <TableCell className="font-semibold text-gray-500 text-center">
                        {stats.skipped}
                      </TableCell>
                      <TableCell className="text-right no-print">
                        <div className="flex justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-blue-600 hover:cursor-pointer"
                            onClick={() => router.push(`/result/${sub.id}`)}
                            title="In chi tiết bài thi"
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                          {!isAdmin && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-red-600 hover:cursor-pointer"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="bg-white">
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Xác nhận xóa
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Bạn có chắc muốn xóa lịch sử làm bài của
                                    sinh viên này?
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="hover:cursor-pointer">
                                    Hủy
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-red-600 text-white hover:bg-red-700 hover:cursor-pointer"
                                    onClick={() =>
                                      void handleDeleteSubmission(sub.id)
                                    }
                                    disabled={deletingSubmissionId === sub.id}
                                  >
                                    {deletingSubmissionId === sub.id
                                      ? "Đang xóa..."
                                      : "Xóa"}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="h-32 text-center text-gray-500"
                  >
                    Chưa có lượt làm bài nào hoàn thành.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background: white !important;
          }
          .print-m-0 {
            margin: 0 !important;
            padding: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}
