"use client";

import { useLocale, useTranslations } from "next-intl";
import { intlLocales } from "@/i18n/config";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
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
  Pencil,
  Trash2,
  Search,
  Users,
  Plus,
  AlertCircle,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  Loader2,
  BarChart3,
  Eye,
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppSelector } from "@/store/hook";
import { useSocket } from "@/components/providers/SocketProvider";
import apiClient from "@/lib/api-client";
import { ENDPOINTS } from "@/constants/endpoints";
import { PrintExamDialog } from "@/components/exam-print/PrintExamDialog";

type ExamRegistrationWithStudent = {
  id: string;
  status: string;
  student?: {
    full_name?: string | null;
    email?: string | null;
  } | null;
};

type LecturerExamItem = {
  id: string;
  title: string;
  topic?: string | { name?: string | null } | null;
  exam_start_time: string | Date;
  exam_end_time: string | Date;
  duration: number;
  practice: boolean;
  status?: string;
  _count?: {
    registrations?: number;
  };
  registrations?: ExamRegistrationWithStudent[];
};

type PageResult<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
};

const getTopicName = (topic: LecturerExamItem["topic"]) => {
  if (!topic) return "";
  if (typeof topic === "string") return topic;
  return topic.name ?? "";
};

const getExamStatus = (exam: LecturerExamItem) => exam.status ?? "ACTIVE";

function StudentManagementDialog({
  exam,
  onRegistrationsChanged,
}: {
  exam: LecturerExamItem;
  onRegistrationsChanged: () => void;
}) {
  const t = useTranslations("lecturer.exams");
  const [studentEmail, setStudentEmail] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [registrations, setRegistrations] = useState<
    ExamRegistrationWithStudent[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);

  const refetchRegistrations = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get<
        PageResult<ExamRegistrationWithStudent>
      >(ENDPOINTS.EXAM_REGISTRATIONS.BASE, {
        params: {
          page: 1,
          limit: 100,
          exam_id: exam.id,
        },
      });
      setRegistrations(response.data.data);
    } catch (error) {
      toast.error(t("errorLoadingStudentList"));
      console.log(error);
    } finally {
      setIsLoading(false);
    }
  }, [exam.id, t]);

  useEffect(() => {
    void refetchRegistrations();
  }, [refetchRegistrations]);

  const handleApprove = async (regId: string) => {
    try {
      await apiClient.post(ENDPOINTS.EXAMS.REGISTRATIONS.APPROVE, {
        registrationId: regId,
      });
      toast.success(t("studentsAccepted"));
      void refetchRegistrations();
      onRegistrationsChanged();
    } catch {
      toast.error(t("errorWhenAcceptingStudents"));
    }
  };

  const handleDelete = async (regId: string) => {
    try {
      await apiClient.delete(ENDPOINTS.EXAM_REGISTRATIONS.DETAIL(regId));
      toast.success(t("studentRemovedFromList"));
      void refetchRegistrations();
      onRegistrationsChanged();
    } catch {
      toast.error(t("errorWhenDeletingStudents"));
    }
  };

  const handleManualAdd = async () => {
    if (!studentEmail) return;
    setIsAdding(true);
    try {
      const res = await apiClient.post(ENDPOINTS.EXAM_REGISTRATIONS.BASE, {
        exam_id: exam.id,
        student_email: studentEmail,
        status: "APPROVED",
      });
      const data = res.data;
      if (data.error) {
        toast.error(data.error);
        return;
      }
      toast.success(t("addedStudentsToTheTest"));
      setStudentEmail("");
      void refetchRegistrations();
      onRegistrationsChanged();
    } catch {
      toast.error(t("errorWhenAddingStudents"));
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <DialogContent className="bg-white border-gray-300 max-w-2xl">
      <DialogHeader>
        <DialogTitle>{t("studentManagement")}</DialogTitle>
        <DialogDescription>
          {t("manageExamStudents", { title: exam.title })}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        <div className="flex gap-2">
          <div className="flex-1">
            <Label htmlFor="email" className="sr-only">
              {t("studentEmail")}</Label>
            <Input
              id="email"
              placeholder={t("enterStudentEmailToAddDirectly")}
              className="bg-white border-gray-300"
              value={studentEmail}
              onChange={(e) => setStudentEmail(e.target.value)}
            />
          </div>
          <Button
            onClick={handleManualAdd}
            disabled={isAdding}
            className="bg-[#0066cc] hover:bg-[#0052a3] text-white hover:cursor-pointer"
          >
            {isAdding ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="h-4 w-4 mr-2" />
            )}
            {t("more")}</Button>
        </div>

        <div className="border rounded-md border-gray-300 overflow-hidden">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow className="border-gray-300">
                <TableHead>{t("studentName")}</TableHead>
                <TableHead>{t("email")}</TableHead>
                <TableHead>{t("status")}</TableHead>
                <TableHead className="text-right">{t("operation")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
                  </TableCell>
                </TableRow>
              ) : registrations && registrations.length > 0 ? (
                registrations.map((reg: ExamRegistrationWithStudent) => (
                  <TableRow key={reg.id} className="border-gray-300">
                    <TableCell>{reg.student?.full_name}</TableCell>
                    <TableCell>{reg.student?.email}</TableCell>
                    <TableCell>
                      <Badge
                        className={`px-2 py-1 text-white rounded-lg ${
                          reg.status === "PENDING"
                            ? "bg-yellow-500 hover:bg-yellow-600"
                            : reg.status === "APPROVED"
                              ? "bg-green-500 hover:bg-green-600"
                              : "bg-red-500 hover:bg-red-600"
                        }`}
                      >
                        {reg.status === "PENDING"
                          ? t("waiting")
                          : reg.status === "APPROVED"
                            ? t("approved")
                            : t("refuse")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {reg.status === "PENDING" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-green-600 border-green-200 hover:bg-green-50 hover:cursor-pointer"
                            onClick={() => handleApprove(reg.id)}
                          >
                            {t("browse")}</Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:cursor-pointer"
                          onClick={() => handleDelete(reg.id)}
                        >
                          {t("erase")}</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center py-8 text-gray-500"
                  >
                    {t("noStudentsHaveRegisteredYet")}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </DialogContent>
  );
}

export default function LecturerExams() {
  const t = useTranslations("lecturer.exams");
  const locale = useLocale();
  const router = useRouter();
  const [exams, setExams] = useState<LecturerExamItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const user = useAppSelector((state) => state.user);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  const refetchExams = useCallback(async () => {
    if (!user.id) {
      setExams([]);
      return;
    }

    try {
      const response = await apiClient.get<PageResult<LecturerExamItem>>(
        ENDPOINTS.EXAMS.BASE,
        {
          params: {
            page: 1,
            limit: 100,
            lecturer_id: user.id,
          },
        },
      );
      setExams(response.data.data);
    } catch (error) {
      toast.error(t("errorLoadingTestList"));
      console.log(error);
    }
  }, [user.id, t]);

  const handleDeleteExam = async (examId: string) => {
    try {
      await apiClient.delete(ENDPOINTS.EXAMS.DETAIL(examId));
      toast.success(t("examDeleted"));
      void refetchExams();
    } catch (error) {
      toast.error(t("deletingFailedTest"));
      console.log(error);
    }
  };

  useEffect(() => {
    void refetchExams();
  }, [refetchExams]);

  // Listen for real-time registration requests
  const { socket } = useSocket();
  useEffect(() => {
    if (!socket) return;

    const handleRegistrationRequested = () => {
      void refetchExams();
    };

    socket.on("exam:registration_requested", handleRegistrationRequested);

    return () => {
      socket.off("exam:registration_requested", handleRegistrationRequested);
    };
  }, [socket, refetchExams]);

  const filteredExams =
    exams?.filter((exam) =>
      exam.title.toLowerCase().includes(searchTerm.toLowerCase()),
    ) || [];

  const totalPages = Math.ceil(filteredExams.length / ITEMS_PER_PAGE);
  const paginatedExams = filteredExams.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-900">{t("examManagement")}</h2>
        <Button
          onClick={() => router.push("/lecturer/exams/create")}
          className="bg-[#0066cc] hover:bg-[#0052a3] text-white hover:cursor-pointer"
        >
          <Plus className="h-4 w-4 mr-2" />
          {t("addTest")}</Button>
      </div>

      <Card className="bg-white border-gray-300 space-y-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t("yourExams")}</CardTitle>
              <CardDescription>{t("manageAndEditExams")}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("searchForExam")}
                className="pl-10 bg-white border-gray-300"
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
                <TableHead>{t("topic")}</TableHead>
                <TableHead>{t("begin")}</TableHead>
                <TableHead>{t("end")}</TableHead>
                <TableHead>{t("duration")}</TableHead>
                <TableHead>{t("type")}</TableHead>
                <TableHead>{t("status")}</TableHead>
                <TableHead>{t("student")}</TableHead>
                <TableHead className="text-center">{t("operation")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExams.length > 0 ? (
                paginatedExams.map((exam) => (
                  <TableRow key={exam.id} className="border-gray-300">
                    <TableCell className="font-medium whitespace-nowrap">
                      {exam.title}
                    </TableCell>
                    <TableCell>{getTopicName(exam.topic)}</TableCell>
                    <TableCell className="text-xs">
                      {new Date(exam.exam_start_time).toLocaleString(intlLocales[locale])}
                    </TableCell>
                    <TableCell className="text-xs">
                      {new Date(exam.exam_end_time).toLocaleString(intlLocales[locale])}
                    </TableCell>
                    <TableCell>{t("durationMinutes", { minutes: exam.duration })}</TableCell>
                    <TableCell className="text-xs">
                      {exam.practice ? t("practice") : t("official")}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={getExamStatus(exam)}
                        disabled={!exam.status}
                        onValueChange={async (value) => {
                          try {
                            await apiClient.patch(
                              ENDPOINTS.EXAMS.DETAIL(exam.id),
                              {
                                status: value,
                              },
                            );
                            setExams((prev) =>
                              prev.map((item) =>
                                item.id === exam.id
                                  ? { ...item, status: value }
                                  : item,
                              ),
                            );
                            toast.success(t("statusUpdateSuccessful"));
                          } catch {
                            toast.error(t("errorUpdatingStatus"));
                          }
                        }}
                      >
                        <SelectTrigger
                          className={`h-7 w-[100px] text-xs font-medium border-0 hover:cursor-pointer ${
                            getExamStatus(exam) === "ACTIVE"
                              ? "bg-green-100 text-green-700 hover:bg-green-200"
                              : "bg-red-100 text-red-700 hover:bg-red-200"
                          }`}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-gray-300">
                          <SelectItem
                            value="ACTIVE"
                            className="text-green-700 hover:cursor-pointer"
                          >
                            {t("active")}
                          </SelectItem>
                          <SelectItem
                            value="INACTIVE"
                            className="text-red-700 hover:cursor-pointer"
                          >
                            {t("inactive")}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-[#0066cc] hover:text-[#0066cc] font-medium hover:cursor-pointer"
                          >
                            <Users className="h-4 w-4 mr-1" />
                            {exam._count?.registrations ??
                              exam.registrations?.length ??
                              0}
                          </Button>
                        </DialogTrigger>
                        <StudentManagementDialog
                          exam={exam}
                          onRegistrationsChanged={() => {
                            void refetchExams();
                          }}
                        />
                      </Dialog>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            router.push(`/lecturer/exams/edit/${exam.id}`)
                          }
                          className="h-8 w-8 hover:cursor-pointer"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            router.push(`/lecturer/exams/${exam.id}/monitor`)
                          }
                          className="h-8 w-8 text-accent-700 hover:text-accent-800 hover:cursor-pointer"
                          title={t("superviseTheExam")}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            router.push(`/lecturer/exams/${exam.id}/report`)
                          }
                          className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:cursor-pointer"
                          title={t("viewReport")}
                        >
                          <BarChart3 className="h-4 w-4" />
                        </Button>
                        <PrintExamDialog exam={exam} />

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600 hover:text-red-700 hover:cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-white border-gray-300">
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t("confirmDeletion")}</AlertDialogTitle>
                              <AlertDialogDescription>
                                {t("areYouSureYouWantTo")}</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="hover:cursor-pointer">
                                {t("cancel")}</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-red-600 hover:bg-red-700 text-white hover:cursor-pointer"
                                onClick={() => handleDeleteExam(exam.id)}
                              >
                                {t("delete")}</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="h-72 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="p-4 bg-gray-50 rounded-full">
                        {searchTerm ? (
                          <AlertCircle className="h-10 w-10 text-gray-400" />
                        ) : (
                          <ClipboardList className="h-10 w-10 text-gray-400" />
                        )}
                      </div>
                      <div className="space-y-1">
                        <p className="text-lg font-medium text-gray-900">
                          {searchTerm
                            ? t("noTestsFound")
                            : t("thereAreNoTestsYet")}
                        </p>
                        <p className="text-sm text-gray-500 max-w-xs mx-auto">
                          {searchTerm
                            ? t("noExamsMatchSearch", { term: searchTerm })
                            : t("startByCreatingYourFirstQuiz")}
                        </p>
                      </div>
                      {!searchTerm && (
                        <Button
                          onClick={() => router.push("/lecturer/exams/create")}
                          className="bg-[#0066cc] hover:bg-[#0052a3] text-white mt-2"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          {t("createATestNow")}</Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
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
