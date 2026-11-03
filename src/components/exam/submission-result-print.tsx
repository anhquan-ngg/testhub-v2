"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import apiClient from "@/lib/api-client";
import { ENDPOINTS } from "@/constants/endpoints";
import { useAppSelector } from "@/store/hook";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  SubmissionResultView,
  type ResultSubmission,
} from "./submission-result-view";

// Puppeteer renders KaTeX and S3 images server-side, so allow more than the default timeout.
const PDF_TIMEOUT_MS = 120_000;

/** Removes diacritics so the downloaded file name is safe everywhere. */
const toFileSlug = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

/** Displays a lecturer-owned preview and downloads the server-rendered (Puppeteer) result PDF. */
export function SubmissionResultPrint({
  examId,
  submissionId,
}: {
  examId: string;
  submissionId: string;
}) {
  const t = useTranslations("student.resultDetail");
  const user = useAppSelector((state) => state.user);
  const [submission, setSubmission] = useState<ResultSubmission | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [isPrinting, setIsPrinting] = useState(false);
  const printingRef = useRef(false);
  const isStaff = user.role === "LECTURER" || user.role === "ADMIN";
  const reportHref = `/lecturer/exams/${examId}/report`;

  useEffect(() => {
    if (!isStaff || !user.id) return;
    const controller = new AbortController();
    setSubmission(null);
    setError(false);
    void apiClient
      .get<ResultSubmission>(ENDPOINTS.SUBMISSIONS.DETAIL(submissionId), {
        signal: controller.signal,
      })
      .then(({ data }) => {
        if (controller.signal.aborted) return;
        if (
          data.exam.id !== examId ||
          (user.role !== "ADMIN" && data.exam.lecturer_id !== user.id)
        ) {
          setError(true);
          return;
        }
        setSubmission(data);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      });
    return () => controller.abort();
  }, [attempt, examId, isStaff, submissionId, user.id, user.role]);

  const handleDownload = async () => {
    if (!submission || printingRef.current) return;
    printingRef.current = true;
    setIsPrinting(true);
    try {
      const response = await apiClient.get<Blob>(
        ENDPOINTS.SUBMISSIONS.PDF(submissionId),
        { responseType: "blob", timeout: PDF_TIMEOUT_MS },
      );
      const url = window.URL.createObjectURL(
        new Blob([response.data], { type: "application/pdf" }),
      );
      const studentSlug = toFileSlug(submission.student?.full_name ?? "");
      const a = document.createElement("a");
      a.href = url;
      a.download = `Ketqua_${studentSlug ? `${studentSlug}_` : ""}${submissionId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (downloadError) {
      console.error("Submission PDF error:", downloadError);
      toast.error(t("printFailed"));
    } finally {
      printingRef.current = false;
      setIsPrinting(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          asChild
          variant="outline"
          className="cursor-pointer border-gray-300 bg-white"
        >
          <Link href={reportHref}>
            <ArrowLeft className="h-4 w-4" />
            {t("returnToReport")}
          </Link>
        </Button>
        <Button
          onClick={() => void handleDownload()}
          disabled={!submission || isPrinting || !isStaff}
          className="cursor-pointer bg-[#0066cc] hover:bg-[#0052a3]"
        >
          {isPrinting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileDown className="h-4 w-4" />
          )}
          {isPrinting ? t("generatingPdf") : t("printDetailedResult")}
        </Button>
      </div>
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">
          {t("printPreviewTitle")}
        </h1>
        <p className="mt-2 text-sm text-neutral-600">
          {t("printPreviewDescription")}
        </p>
      </div>
      {error || (user.role && !isStaff) ? (
        <Card className="gap-4 border-gray-300 p-8 text-center" role="alert">
          <p className="text-red-700">{t("resultUnavailable")}</p>
          <Button
            variant="outline"
            className="mx-auto cursor-pointer"
            onClick={() => setAttempt((value) => value + 1)}
          >
            {t("retry")}
          </Button>
        </Card>
      ) : submission ? (
        <SubmissionResultView submission={submission} showQuestions staffView />
      ) : (
        <Card className="border-gray-300 p-8 text-center" role="status">
          <p className="text-gray-600">{t("loading")}</p>
        </Card>
      )}
    </div>
  );
}
