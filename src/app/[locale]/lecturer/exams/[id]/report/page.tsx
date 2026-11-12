"use client";

import { useTranslations } from "next-intl";
import { isAxiosError } from "axios";
import apiClient from "@/lib/api-client";
import { ENDPOINTS } from "@/constants/endpoints";
import { ICON_TONE, iconLabelProps, useIconLabels } from "@/lib/icon-button";

import { useParams } from "next/navigation";
import { Link, useRouter } from "@/i18n/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
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
  RotateCcw,
  ClipboardCheck,
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
  practice?: boolean;
};

type ReportStudent = {
  id?: string;
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

const getReportScore = (submission: ReportSubmission) => {
  if (submission.total_score == null || String(submission.total_score).trim() === "") return null;
  const score = Number(submission.total_score);
  return Number.isFinite(score) ? score : null;
};

export default function ExamReportPage() {
  const t = useTranslations("lecturer.examReport");
  const iconLabels = useIconLabels();
  const regrading = useTranslations("shared.regrading");
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
  const [grantingRetryId, setGrantingRetryId] = useState<string | null>(null);
  const [retryStudent, setRetryStudent] = useState<{ id: string; name: string } | null>(null);
  const [retryError, setRetryError] = useState(false);
  const grantingRetry = useRef(false);
  const [reportError, setReportError] = useState(false);
  const [examNotFound, setExamNotFound] = useState(false);
  const [totalSubmissions, setTotalSubmissions] = useState<number | null>(null);
  const [listComplete, setListComplete] = useState(false);
  const [failedDetailIds, setFailedDetailIds] = useState<string[]>([]);
  const [isRetryingDetails, setIsRetryingDetails] = useState(false);
  const retryDetailsRequest = useRef<number | null>(null);
  const reportRequest = useRef(0);

  const loadDetails = useCallback(async (ids: string[], requestId: number) => {
    for (let offset = 0; offset < ids.length; offset += 5) {
      if (reportRequest.current !== requestId) return;
      const batch = ids.slice(offset, offset + 5);
      const results = await Promise.allSettled(batch.map(async (id) => {
        const detail = await apiClient.get<ReportSubmission>(ENDPOINTS.SUBMISSIONS.DETAIL(id));
        return detail.data;
      }));
      if (reportRequest.current !== requestId) return;
      setSubmissions((previous) => {
        const rows = new Map(previous.map((row) => [row.id, row]));
        results.forEach((result) => {
          if (result.status === "fulfilled") rows.set(result.value.id, result.value);
        });
        return [...rows.values()];
      });
      setFailedDetailIds((previous) => {
        const failed = new Set(previous);
        results.forEach((result, index) => {
          if (result.status === "rejected") failed.add(batch[index]);
          else failed.delete(batch[index]);
        });
        return [...failed];
      });
    }
  }, []);

  const fetchReportData = useCallback(async () => {
    if (!examId) return;

    const requestId = ++reportRequest.current;
    const current = () => reportRequest.current === requestId;
    let loadedExam = false;
    setIsLoadingExam(true);
    setIsLoadingSubmissions(true);
    setIsRetryingDetails(false);
    setReportError(false);
    setExamNotFound(false);
    setTotalSubmissions(null);
    setListComplete(false);
    setFailedDetailIds([]);
    setSubmissions([]);
    try {
      const examResponse = await apiClient.get<ReportExam>(ENDPOINTS.EXAMS.DETAIL(examId));
      if (!current()) return;
      setExam(examResponse.data);
      loadedExam = true;
      setIsLoadingExam(false);
      const limit = 100;
      const listedIds = new Set<string>();
      for (let page = 1; ; page += 1) {
        const response = await apiClient.get<{ data: { id: string }[]; total: number }>(
          ENDPOINTS.SUBMISSIONS.BASE, { params: { exam_id: examId, status: "COMPLETED", page, limit } },
        );
        if (!current()) return;
        setTotalSubmissions(response.data.total);
        const ids = [...new Set(response.data.data.map((row) => row.id))]
          .filter((id) => !listedIds.has(id));
        ids.forEach((id) => listedIds.add(id));
        await loadDetails(ids, requestId);
        if (!current()) return;
        if (listedIds.size >= response.data.total) {
          setListComplete(true);
          break;
        }
        // A shrinking or repeated page must not be treated as a complete report.
        if (ids.length === 0) {
          setReportError(true);
          break;
        }
      }
    } catch (error) {
      if (!current()) return;
      setReportError(true);
      if (!loadedExam) {
        setExam(null);
        setExamNotFound(isAxiosError(error) && error.response?.status === 404);
      }
    } finally {
      if (current()) {
        setIsLoadingExam(false);
        setIsLoadingSubmissions(false);
      }
    }
  }, [examId, loadDetails]);

  const handleRetryDetails = async () => {
    const requestId = reportRequest.current;
    if (isLoadingSubmissions || retryDetailsRequest.current === requestId) return;
    retryDetailsRequest.current = requestId;
    setIsRetryingDetails(true);
    try {
      await loadDetails(failedDetailIds, requestId);
    } finally {
      if (retryDetailsRequest.current === requestId) retryDetailsRequest.current = null;
      if (reportRequest.current === requestId) setIsRetryingDetails(false);
    }
  };

  useEffect(() => {
    void fetchReportData();
    return () => { reportRequest.current += 1; };
  }, [fetchReportData]);

  const handlePrintReport = async () => {
    if (isPrinting || isLoadingSubmissions || reportError || reportIncomplete || hasUnscoredSubmissions || totalSubmissions === 0) return;
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
      a.download = `${t("reportFilenamePrefix")}_${exam?.title?.replace(/\s+/g, "_")}_${examId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("Print error:", err);
      toast.error(t("anErrorOccurredWhileCreatingA"));
    } finally {
      setIsPrinting(false);
    }
  };

  const handleDeleteSubmission = async (submissionId: string) => {
    setDeletingSubmissionId(submissionId);
    try {
      await apiClient.delete(ENDPOINTS.SUBMISSIONS.DETAIL(submissionId));
      toast.success(t("deletedExamHistory"));
      await fetchReportData();
    } catch (error) {
      console.error("Delete submission error:", error);
      toast.error(t("errorWhileDeletingExamHistory"));
    } finally {
      setDeletingSubmissionId(null);
    }
  };

  const handleGrantRetry = async () => {
    if (!retryStudent || grantingRetry.current) return;
    grantingRetry.current = true;
    setGrantingRetryId(retryStudent.id);
    setRetryError(false);
    try {
      await apiClient.post(ENDPOINTS.EXAM_RUNTIME.GRANT_RETRY(examId, retryStudent.id));
      toast.success(t("studentsAreAllowedToRetakeThe"));
      setRetryStudent(null);
    } catch {
      setRetryError(true);
    } finally {
      grantingRetry.current = false;
      setGrantingRetryId(null);
    }
  };

  const calculateStats = (submission: ReportSubmission) => {
    if (!submission.questions || submission.questions.some((question) =>
      question.answer?.trim() && question.is_correct == null,
    )) return null;
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
    return t("elapsedTime", { minutes, seconds });
  };

  const getRatingText = (rating?: string | null) => {
    switch (rating) {
      case "EXCELLENT": return t("excellent");
      case "GOOD": return t("good");
      case "AVERAGE": return t("average");
      case "POOR": return t("poor");
      default: return t("unrated");
    }
  };
  const getRatingColor = (rating: string | null) => {
    switch (rating) {
      case "EXCELLENT":
        return "border-emerald-200 bg-emerald-50 text-emerald-700";
      case "GOOD":
        return "border-sky-200 bg-sky-50 text-sky-700";
      case "AVERAGE":
        return "border-amber-200 bg-amber-50 text-amber-700";
      case "POOR":
        return "border-red-200 bg-red-50 text-red-700";
      default:
        return "border-gray-200 bg-gray-50 text-gray-700";
    }
  };

  const reportIncomplete = !listComplete || failedDetailIds.length > 0 || submissions.length !== totalSubmissions;
  const hasUnscoredSubmissions = submissions.some((submission) => getReportScore(submission) === null);

  if (isLoadingExam) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-3" role="status">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" aria-hidden="true" />
        <p>{t("loadingReport")}</p>
      </div>
    );
  }

  if (!exam) {
    return (
      <Card className="gap-4 border-gray-300 p-8 text-center" role="alert">
        <h2 className="text-xl font-bold">
          {examNotFound ? t("noTestFound") : t("errorDownloadingTestReport")}
        </h2>
        <div className="flex justify-center gap-3">
          <Button variant="outline" onClick={() => router.back()}>{t("comeBack")}</Button>
          <Button onClick={() => void fetchReportData()}>{t("retry")}</Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6 print:p-0">
      {isLoadingSubmissions && (
        <Loader2
          className="h-6 w-6 animate-spin"
          role="status"
          aria-label={t("loadingSubmissions")}
        />
      )}
      <div className="flex items-center justify-between no-print">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.back()}
            className="bg-white border-gray-300 hover:cursor-pointer"
            {...iconLabelProps(iconLabels.back)}
          >
            <ChevronLeft className="h-4 w-4 text-gray-700" aria-hidden="true" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">
              {t("reportingResultsLecturer")}</h1>
            <p className="mt-1 text-sm text-neutral-500">
              {totalSubmissions === null
                ? t("examSummaryUnknown", { title: exam.title })
                : t("examSummary", { title: exam.title, total: totalSubmissions, loaded: submissions.length })}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handlePrintReport}
            disabled={isPrinting || isLoadingSubmissions || reportError || reportIncomplete || hasUnscoredSubmissions || totalSubmissions === 0}
            className="flex cursor-pointer items-center gap-1.5 bg-[#0066cc] text-white hover:bg-[#0052a3]"
          >
            <Printer className="h-4 w-4" />
            {isPrinting ? t("preparing") : t("printReport")}
          </Button>
        </div>
      </div>

      {(reportError || failedDetailIds.length > 0 || (!isLoadingSubmissions && reportIncomplete)) && (
        <Card className="gap-3 border-amber-300 bg-amber-50 p-4 text-amber-900" role="alert">
          <p className="font-semibold">{t("incompleteReport")}</p>
          <p className="text-sm">{t("partialReportDescription")}</p>
          {reportError && <p className="text-sm">{t("reportListError")}</p>}
          {failedDetailIds.length > 0 && <p className="text-sm">{t("failedDetails", { count: failedDetailIds.length })}</p>}
          <div className="flex flex-wrap gap-2 no-print">
            {failedDetailIds.length > 0 && (
              <Button variant="outline" onClick={() => void handleRetryDetails()} disabled={isLoadingSubmissions || isRetryingDetails}>
                {isRetryingDetails && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {isRetryingDetails ? t("retryingDetails") : t("retryFailedDetails")}
              </Button>
            )}
            <Button variant="outline" onClick={() => void fetchReportData()} disabled={isLoadingSubmissions || isRetryingDetails}>
              {t("reloadReport")}
            </Button>
          </div>
        </Card>
      )}

      {hasUnscoredSubmissions && (
        <p className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900" role="status">
          {t("unscoredReportPrint")}
        </p>
      )}

      <AlertDialog open={retryStudent !== null} onOpenChange={(open) => {
        if (!open && !grantingRetry.current) setRetryStudent(null);
      }}>
        <AlertDialogContent className="bg-white" aria-busy={grantingRetryId !== null}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("confirmRetake")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("confirmRetakeDescription", { name: retryStudent?.name ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {retryError && <p role="alert" className="text-sm text-red-700">{t("errorAllowingRedo")}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={grantingRetryId !== null}>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={grantingRetryId !== null}
              onClick={(event) => {
                event.preventDefault();
                void handleGrantRetry();
              }}
            >
              {grantingRetryId !== null && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {grantingRetryId !== null ? t("grantingRetake") : t("confirmRetakeAction")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card className="bg-white border-gray-300 shadow-sm overflow-hidden">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
                <History className="h-4 w-4" />
              </span>
              {t("listOfExamResults")}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 border-gray-300">
                <TableHead>{t("fullName")}</TableHead>
                <TableHead>{t("point")}</TableHead>
                <TableHead>{t("time")}</TableHead>
                <TableHead>{t("rating")}</TableHead>
                <TableHead className="text-green-600">
                  <div className="flex items-center justify-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> {t("correct")}</div>
                </TableHead>
                <TableHead className="text-red-600">
                  <div className="flex items-center justify-center gap-1">
                    <XCircle className="h-3 w-3" /> {t("incorrect")}
                  </div>
                </TableHead>
                <TableHead className="text-gray-600">
                  <div className="flex items-center justify-center gap-1">
                    <CircleDashed className="h-3 w-3" /> {t("skip")}</div>
                </TableHead>
                <TableHead className="text-center no-print">{t("operation")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {submissions && submissions.length > 0 ? (
                submissions.map((sub) => {
                  const score = getReportScore(sub);
                  const hasScore = score !== null;
                  const stats = hasScore ? calculateStats(sub) : null;
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
                        {hasScore ? score.toFixed(2) : t("noScore")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Clock className="h-3 w-3 text-gray-400" />
                          {calculateTimeTaken(sub.start_time, sub.end_time)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={getRatingColor(hasScore ? sub.rating ?? null : null)}
                        >
                          {getRatingText(hasScore ? sub.rating : null)}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold text-green-600 text-center">
                        {stats?.correct ?? t("notAvailable")}
                      </TableCell>
                      <TableCell className="font-semibold text-red-600 text-center">
                        {stats?.incorrect ?? t("notAvailable")}
                      </TableCell>
                      <TableCell className="font-semibold text-gray-500 text-center">
                        {stats?.skipped ?? t("notAvailable")}
                      </TableCell>
                      <TableCell className="text-right no-print">
                        <div className="flex justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`h-8 w-8 hover:cursor-pointer ${ICON_TONE.primary}`}
                            onClick={() => router.push(`/lecturer/exams/${examId}/report/${sub.id}`)}
                            {...iconLabelProps(iconLabels.viewDetails)}
                          >
                            <Printer className="h-4 w-4" aria-hidden="true" />
                          </Button>
                          {userRole === "LECTURER" && (
                            <Button
                              asChild
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-emerald-600 hover:cursor-pointer"
                            >
                              <Link
                                href={`/lecturer/exams/${examId}/report/${sub.id}/grade`}
                                title={regrading("open")}
                                aria-label={regrading("open")}
                              >
                                <ClipboardCheck className="h-4 w-4" />
                              </Link>
                            </Button>
                          )}
                          {!isAdmin && exam.practice === false && sub.student?.id && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className={`h-8 w-8 hover:cursor-pointer ${ICON_TONE.primary}`}
                              {...iconLabelProps(iconLabels.allowRetake)}
                              disabled={grantingRetryId !== null}
                              onClick={() => {
                                if (!sub.student?.id) return;
                                setRetryError(false);
                                setRetryStudent({ id: sub.student.id, name: sub.student.full_name || sub.student.email || t("unnamedStudent") });
                              }}
                            >
                              {grantingRetryId === sub.student.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                              ) : (
                                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                              )}
                            </Button>
                          )}
                          {!isAdmin && (
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
                              <AlertDialogContent className="bg-white">
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    {t("confirmDeletion")}</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {t("areYouSureYouWantTo")}</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="hover:cursor-pointer">
                                    {t("cancel")}</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-red-600 text-white hover:bg-red-700 hover:cursor-pointer"
                                    onClick={() =>
                                      void handleDeleteSubmission(sub.id)
                                    }
                                    disabled={deletingSubmissionId === sub.id}
                                  >
                                    {deletingSubmissionId === sub.id
                                      ? t("deleting")
                                      : t("erase")}
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
                    {isLoadingSubmissions
                      ? t("loadingSubmissions")
                      : reportError || reportIncomplete
                        ? t("noLoadedResults")
                        : t("thereAreNoCompletedAssignmentsYet")}</TableCell>
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
