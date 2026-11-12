"use client";

import { useLocale, useTranslations } from "next-intl";
import { intlLocales } from "@/i18n/config";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
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
import { useAppSelector } from "@/store/hook";
import { useSocket } from "@/components/providers/SocketProvider";
import apiClient from "@/lib/api-client";
import { examTypeClass, registrationStatusClass } from "@/lib/exam-style";
import { ENDPOINTS } from "@/constants/endpoints";
import { ICON_TONE, iconLabelProps, useIconLabels } from "@/lib/icon-button";
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
  const [loadState, setLoadState] = useState<"loading" | "error" | "success">("loading");
  const requestRef = useRef<AbortController | null>(null);
  const [registrationToDelete, setRegistrationToDelete] = useState<ExamRegistrationWithStudent | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const deletingRef = useRef(false);

  const refetchRegistrations = useCallback(async () => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setLoadState("loading");
    try {
      const response = await apiClient.get<
        PageResult<ExamRegistrationWithStudent>
      >(ENDPOINTS.EXAM_REGISTRATIONS.BASE, {
        signal: controller.signal,
        params: {
          page: 1,
          limit: 100,
          exam_id: exam.id,
        },
      });
      if (controller.signal.aborted) return;
      setRegistrations(response.data.data);
      setLoadState("success");
    } catch {
      if (!controller.signal.aborted) setLoadState("error");
    }
  }, [exam.id]);

  useEffect(() => {
    void refetchRegistrations();
    return () => requestRef.current?.abort();
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

  const handleDelete = async () => {
    if (!registrationToDelete || deletingRef.current) return;
    deletingRef.current = true;
    setIsDeleting(true);
    try {
      await apiClient.delete(ENDPOINTS.EXAM_REGISTRATIONS.DETAIL(registrationToDelete.id));
      toast.success(t("studentRemovedFromList"));
      setRegistrations((current) => current.filter((reg) => reg.id !== registrationToDelete.id));
      setRegistrationToDelete(null);
      void refetchRegistrations();
      onRegistrationsChanged();
    } catch {
      toast.error(t("errorWhenDeletingStudents"));
    } finally {
      deletingRef.current = false;
      setIsDeleting(false);
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
    <DialogContent className="bg-white border-gray-300 sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>{t("studentManagement")}</DialogTitle>
        <DialogDescription className="min-w-0 break-words">
          {t("manageExamStudents", { title: exam.title })}
        </DialogDescription>
      </DialogHeader>

      <div className="min-w-0 space-y-4 py-4">
        <div className="flex gap-2">
          <div className="min-w-0 flex-1">
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
            className="shrink-0 bg-[#0066cc] hover:bg-[#0052a3] text-white hover:cursor-pointer"
          >
            {isAdding ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="h-4 w-4 mr-2" />
            )}
            {t("more")}</Button>
        </div>

        <div className="border rounded-md border-gray-300 overflow-x-auto">
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
              {loadState !== "success" && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    {loadState === "loading" ? (
                      <div role="status" className="flex items-center justify-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                        {t("loadingStudents")}
                      </div>
                    ) : (
                      <div role="alert" className="space-y-2">
                        <p>{t("errorLoadingStudentList")}</p>
                        <Button variant="outline" onClick={() => void refetchRegistrations()}>{t("retry")}</Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              )}
              {registrations.length > 0 ? (
                registrations.map((reg: ExamRegistrationWithStudent) => (
                  <TableRow key={reg.id} className="border-gray-300">
                    <TableCell>{reg.student?.full_name}</TableCell>
                    <TableCell>{reg.student?.email}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={registrationStatusClass(reg.status)}
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
                          disabled={isDeleting}
                          onClick={() => setRegistrationToDelete(reg)}
                        >
                          {t("erase")}</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : loadState === "success" ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center py-8 text-gray-500"
                  >
                    {t("noStudentsHaveRegisteredYet")}</TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      </div>
      <AlertDialog
        open={registrationToDelete !== null}
        onOpenChange={(open) => {
          if (!open && !deletingRef.current) setRegistrationToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("confirmStudentRemoval")}</AlertDialogTitle>
            <AlertDialogDescription className="break-words">
              {t("confirmStudentRemovalDescription", {
                student: registrationToDelete?.student?.full_name || registrationToDelete?.student?.email || t("student"),
                title: exam.title,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t("cancel")}</AlertDialogCancel>
            <Button variant="destructive" disabled={isDeleting} onClick={() => void handleDelete()}>
              {isDeleting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {isDeleting ? t("removingStudent") : t("erase")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DialogContent>
  );
}

/** Lists the lecturer's exams with URL-backed filtering and recoverable loading. */
export default function LecturerExams() {
  const t = useTranslations("lecturer.exams");
  const iconLabels = useIconLabels();
  const locale = useLocale();
  const router = useRouter();
  const [exams, setExams] = useState<LecturerExamItem[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "error" | "success">("loading");
  const requestRef = useRef<AbortController | null>(null);
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);
  const user = useAppSelector((state) => state.user);
  const searchParams = useSearchParams();
  const searchTerm = searchParams.get("q") ?? "";
  const requestedPage = Number(searchParams.get("page") ?? "1");
  const validPage = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const ITEMS_PER_PAGE = 5;

  const updateListUrl = (query: string, page: number, replace: boolean) => {
    const url = new URL(window.location.href);
    if (query) url.searchParams.set("q", query);
    else url.searchParams.delete("q");
    url.searchParams.set("page", String(page));
    // Next's native history integration keeps client-only filters synchronous and back-aware.
    if (replace) window.history.replaceState(null, "", url);
    else window.history.pushState(null, "", url);
  };

  const refetchExams = useCallback(async () => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setLoadState("loading");
    if (!user.id) return;

    try {
      const response = await apiClient.get<PageResult<LecturerExamItem>>(
        ENDPOINTS.EXAMS.BASE,
        {
          signal: controller.signal,
          params: {
            page: 1,
            limit: 100,
            lecturer_id: user.id,
          },
        },
      );
      if (controller.signal.aborted) return;
      setExams(response.data.data);
      setLoadedUserId(user.id);
      setLoadState("success");
    } catch {
      if (!controller.signal.aborted) setLoadState("error");
    }
  }, [user.id]);

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
    return () => requestRef.current?.abort();
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

  const [registrationDialogId, setRegistrationDialogId] = useState<string | null>(null);

  const filteredExams = loadedUserId === user.id
    ? exams.filter((exam) => exam.title.toLowerCase().includes(searchTerm.toLowerCase()))
    : [];
  const listState = !user.id || (loadedUserId !== user.id && loadState === "success") ? "loading" : loadState;
  const totalPages = Math.ceil(filteredExams.length / ITEMS_PER_PAGE);
  const currentPage = Math.min(validPage, Math.max(totalPages, 1));
  useEffect(() => {
    if (listState !== "success" || validPage === currentPage) return;
    const url = new URL(window.location.href);
    url.searchParams.set("page", String(currentPage));
    window.history.replaceState(null, "", url);
  }, [currentPage, validPage, listState]);
  const returnParams = new URLSearchParams(searchParams.toString());
  returnParams.set("page", String(listState === "success" ? currentPage : validPage));
  const returnTo = `/lecturer/exams?${returnParams.toString()}`;
  const createHref = `/lecturer/exams/create?${new URLSearchParams({ returnTo })}`;
  const paginatedExams = filteredExams.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900">{t("examManagement")}</h2>
          <p className="mt-1 text-sm text-neutral-500">{t("manageAndEditExams")}</p>
        </div>
        <Button
          onClick={() => router.push(createHref)}
          className="bg-[#0066cc] hover:bg-[#0052a3] text-white hover:cursor-pointer"
        >
          <Plus className="h-4 w-4 mr-2" />
          {t("addTest")}</Button>
      </div>

      <Card className="bg-white border-gray-300 shadow-sm space-y-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t("yourExams")}</CardTitle>
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
                aria-label={t("searchForExam")}
                onChange={(e) => updateListUrl(e.target.value, 1, true)}
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-gray-300 bg-white">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-300 bg-gray-50">
                <TableHead>{t("testName")}</TableHead>
                <TableHead>{t("topic")}</TableHead>
                <TableHead>{t("begin")}</TableHead>
                <TableHead>{t("end")}</TableHead>
                <TableHead>{t("duration")}</TableHead>
                <TableHead>{t("type")}</TableHead>
                <TableHead>{t("student")}</TableHead>
                <TableHead className="text-center">{t("operation")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {listState !== "success" && (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center">
                    {listState === "loading" ? (
                      <div role="status" className="flex items-center justify-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                        {t("loadingExams")}
                      </div>
                    ) : (
                      <div role="alert" className="space-y-3">
                        <p>{t("errorLoadingTestList")}</p>
                        <Button variant="outline" onClick={() => void refetchExams()}>{t("retry")}</Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              )}
              {filteredExams.length > 0 ? (
                paginatedExams.map((exam) => (
                  <TableRow key={exam.id} className="border-gray-300">
                    <TableCell className="font-medium">
                      <span className="block w-44 truncate focus:whitespace-normal focus:break-words sm:w-60" title={exam.title} tabIndex={0}>
                        {exam.title}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className="block w-32 truncate focus:whitespace-normal focus:break-words sm:w-40"
                        title={getTopicName(exam.topic)}
                        tabIndex={0}
                      >
                        {getTopicName(exam.topic)}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs">
                      {new Date(exam.exam_start_time).toLocaleString(intlLocales[locale])}
                    </TableCell>
                    <TableCell className="text-xs">
                      {new Date(exam.exam_end_time).toLocaleString(intlLocales[locale])}
                    </TableCell>
                    <TableCell>{t("durationMinutes", { minutes: exam.duration })}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={examTypeClass(exam.practice)}>
                        {exam.practice ? t("practice") : t("official")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Dialog open={registrationDialogId === exam.id} onOpenChange={(open) => setRegistrationDialogId(open ? exam.id : null)}>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-[#0066cc] hover:text-[#0066cc] font-medium hover:cursor-pointer"
                            {...iconLabelProps(
                              `${iconLabels.manageParticipants} (${exam._count?.registrations ?? exam.registrations?.length ?? 0})`,
                            )}
                          >
                            <Users className="h-4 w-4 mr-1" aria-hidden="true" />
                            {exam._count?.registrations ??
                              exam.registrations?.length ??
                              0}
                          </Button>
                        </DialogTrigger>
                        {registrationDialogId === exam.id && <StudentManagementDialog
                          exam={exam}
                          onRegistrationsChanged={() => {
                            void refetchExams();
                          }}
                        />}
                      </Dialog>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            router.push(`/lecturer/exams/edit/${exam.id}?${new URLSearchParams({ returnTo })}`)
                          }
                          className={`h-8 w-8 hover:cursor-pointer ${ICON_TONE.primary}`}
                          {...iconLabelProps(iconLabels.edit)}
                        >
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            router.push(`/lecturer/exams/${exam.id}/monitor`)
                          }
                          className={`h-8 w-8 hover:cursor-pointer ${ICON_TONE.primary}`}
                          {...iconLabelProps(iconLabels.monitor)}
                        >
                          <Eye className="h-4 w-4" aria-hidden="true" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            router.push(`/lecturer/exams/${exam.id}/report`)
                          }
                          className={`h-8 w-8 hover:cursor-pointer ${ICON_TONE.primary}`}
                          {...iconLabelProps(iconLabels.viewReport)}
                        >
                          <BarChart3 className="h-4 w-4" aria-hidden="true" />
                        </Button>
                        <PrintExamDialog exam={exam} />

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className={`h-8 w-8 hover:cursor-pointer ${ICON_TONE.danger}`}
                              {...iconLabelProps(iconLabels.delete)}
                            >
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
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
              ) : listState === "success" ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-72 text-center">
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
                          onClick={() => router.push(createHref)}
                          className="bg-[#0066cc] hover:bg-[#0052a3] text-white mt-2"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          {t("createATestNow")}</Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
          </div>

          {totalPages > 0 && (
            <div className="flex items-center justify-end space-x-2 py-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateListUrl(searchTerm, Math.max(currentPage - 1, 1), false)}
                className="text-foreground hover:cursor-pointer"
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
                onClick={() => updateListUrl(searchTerm, Math.min(currentPage + 1, totalPages), false)}
                className="text-foreground hover:cursor-pointer"
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