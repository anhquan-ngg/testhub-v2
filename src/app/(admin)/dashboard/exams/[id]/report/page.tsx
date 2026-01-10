"use client";

import axiosClient from "@/lib/axios";
import React from "react";
import { useParams, useRouter } from "next/navigation";
import {
  useFindManySubmission,
  useFindUniqueExam,
} from "../../../../../../../generated/hooks";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Printer,
  FileText,
  CheckCircle2,
  XCircle,
  CircleDashed,
  Clock,
  User,
  History,
} from "lucide-react";
import { calculateTotalQuesions } from "@/lib/exam-utils";
import { toast } from "sonner";

export default function AdminExamReportPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.id as string;
  const [isPrinting, setIsPrinting] = React.useState(false);

  const { data: exam, isLoading: isLoadingExam } = useFindUniqueExam({
    where: { id: examId },
  });

  const { data: submissions, isLoading: isLoadingSubmissions } =
    useFindManySubmission({
      where: { exam_id: examId, status: "COMPLETED" },
      include: {
        student: true,
        exam: {
          select: {
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
          select: {
            is_correct: true,
          },
        },
      },
      orderBy: { created_at: "desc" },
    });

  const handlePrintReport = async () => {
    try {
      setIsPrinting(true);
      const response = await axiosClient.get(
        `/submission/exam/${examId}/report-pdf`,
        {
          responseType: "blob",
        }
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

  const calculateStats = (submission: any) => {
    let correct = 0;
    let incorrect = 0;
    let skipped = 0;

    submission.questions?.forEach((sq: any) => {
      if (sq.is_correct) {
        correct++;
      } else {
        incorrect++;
      }
    });

    skipped = calculateTotalQuesions(submission) - correct - incorrect;

    return { correct, incorrect, skipped };
  };

  const calculateTimeTaken = (start: Date | null, end: Date | null) => {
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
        <Button
          onClick={() => router.back()}
          className="mt-4 bg-white border-gray-300"
        >
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
              Báo cáo kết quả (Admin)
            </h1>
            <p className="text-gray-500">
              Bài thi: {exam.title} - Tổng số lượt thi:{" "}
              {submissions?.length || 0}
            </p>
          </div>
        </div>
        <Button
          onClick={handlePrintReport}
          disabled={isPrinting}
          className="flex items-center gap-2 bg-[#0066cc] hover:bg-[#0052a3] hover:cursor-pointer text-white"
        >
          <Printer className="h-4 w-4" />
          {isPrinting ? "Đang chuẩn bị..." : "In báo cáo"}
        </Button>
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
                submissions.map((sub: any) => {
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
                          className={`${getRatingColor(sub.rating)} text-white`}
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
                            onClick={() =>
                              router.push(
                                `/dashboard/exams/${examId}/report/${sub.id}`
                              )
                            }
                            title="In chi tiết bài thi"
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
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
