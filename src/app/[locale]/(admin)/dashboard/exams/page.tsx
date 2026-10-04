"use client";

import { useLocale, useTranslations } from "next-intl";
import { intlLocales } from "@/i18n/config";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  Search,
  Users,
  ChevronLeft,
  ChevronRight,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import apiClient from "@/lib/api-client";
import { ENDPOINTS } from "@/constants/endpoints";

type PageResult<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
};

export default function ExamsPage() {
  const t = useTranslations("admin.exams");
  const locale = useLocale();
  const router = useRouter();
  const [exams, setExams] = useState([] as any);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [totalCount, setTotalCount] = useState(0);
  // const [students] = useState(mockStudents);
  const [searchTerm, setSearchTerm] = useState("");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const fetchExams = useCallback(
    async (page = currentPage, limit = itemsPerPage, search = searchTerm) => {
      setIsLoading(true);
      try {
        const response = await apiClient.get<PageResult<any>>(
          ENDPOINTS.EXAMS.BASE,
          {
            params: {
              page,
              limit,
              search: search || undefined,
            },
          },
        );
        setExams(response.data.data ?? []);
        setTotalCount(response.data.total ?? 0);
        setError(null);
      } catch (err) {
        setError(err);
      } finally {
        setIsLoading(false);
      }
    },
    [currentPage, itemsPerPage, searchTerm],
  );

  useEffect(() => {
    void fetchExams();
  }, [fetchExams]);

  useEffect(() => {
    if (error) {
      toast.error(t("anErrorOccurredWhileLoadingData"));
    }
  }, [error, t]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner />
      </div>
    );
  }

  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const paginatedExams = exams || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-900">{t("examManagement")}</h2>
      </div>

      <Card className="bg-white border-gray-300 space-y-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t("listOfAllExams")}</CardTitle>
              <CardDescription>
                {t("seeAListOfAllTests")}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                placeholder={t("searchForExam")}
                className="w-full flex h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm pl-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="border-gray-300">
                <TableHead>{t("testName")}</TableHead>
                <TableHead>{t("creator")}</TableHead>
                <TableHead>{t("topic")}</TableHead>
                <TableHead>{t("begin")}</TableHead>
                <TableHead>{t("end")}</TableHead>
                <TableHead>{t("duration")}</TableHead>
                <TableHead>{t("examType")}</TableHead>
                <TableHead>{t("status")}</TableHead>
                {/* <TableHead>Sinh viên</TableHead> */}
                <TableHead className="text-right">{t("operation")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedExams.map((exam: any) => (
                <TableRow key={exam.id} className="border-gray-300">
                  <TableCell className="font-medium">{exam.title}</TableCell>
                  <TableCell>{exam.lecturer?.full_name ?? "—"}</TableCell>
                  <TableCell>
                    {typeof exam.topic === "string"
                      ? exam.topic
                      : exam.topic?.name ?? "N/A"}
                  </TableCell>
                  <TableCell>
                    {new Date(exam.exam_start_time).toLocaleString(intlLocales[locale])}
                  </TableCell>
                  <TableCell>
                    {new Date(exam.exam_end_time).toLocaleString(intlLocales[locale])}
                  </TableCell>
                  <TableCell>{exam.duration} {t("minute")}</TableCell>
                  <TableCell>
                    {exam.practice ? t("practice") : t("official")}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={`px-2 py-1 text-white rounded-lg ${
                        exam.status === "INACTIVE"
                          ? "text-red-500 bg-red-100"
                          : exam.status === "ACTIVE"
                            ? "text-green-500 bg-green-100"
                            : "text-blue-500 bg-blue-100"
                      }`}
                    >
                      {exam.status}
                    </Badge>
                  </TableCell>
                  {/* <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-[#0066cc] hover:text-[#0066cc]"
                        >
                          <Users className="h-4 w-4 mr-2" />
                          {exam.students || 0}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-white border-gray-300">
                        <DialogHeader>
                          <DialogTitle>Danh sách sinh viên</DialogTitle>
                          <DialogDescription>
                            Danh sách sinh viên cho bài thi: {exam.title}
                          </DialogDescription>
                        </DialogHeader>
                        <Table>
                          <TableHeader>
                            <TableRow className="border-gray-300">
                              <TableHead>Tên sinh viên</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead>Trạng thái</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {students.map((student) => (
                              <TableRow
                                key={student.id}
                                className="border-gray-300"
                              >
                                <TableCell>{student.name}</TableCell>
                                <TableCell>{student.email}</TableCell>
                                <TableCell>
                                  <Badge
                                    variant={
                                      student.status === "Đã đăng ký"
                                        ? "default"
                                        : "secondary"
                                    }
                                  >
                                    {student.status}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </DialogContent>
                    </Dialog>
                  </TableCell> */}
                  <TableCell className="text-center">
                    <div className="flex justify-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          router.push(`/dashboard/exams/${exam.id}/report`)
                        }
                        className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:cursor-pointer"
                        title={t("viewReport")}
                      >
                        <BarChart3 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {totalPages > 0 && (
            <div className="flex items-center justify-end space-x-2 py-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                className="bg-[#0066cc] hover:bg-[#0052a3] border-none text-white hover:cursor-pointer"
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                {t("before")}</Button>
              <div className="text-sm font-medium">
                {t("pageOf", { page: currentPage, total: totalPages })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                }
                className="bg-[#0066cc] hover:bg-[#0052a3] border-none text-white hover:cursor-pointer"
                disabled={currentPage === totalPages}
              >
                {t("next")}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
