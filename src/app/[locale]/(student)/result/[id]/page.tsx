"use client";

import { useTranslations } from "next-intl";
import apiClient from "@/lib/api-client";
import { ENDPOINTS } from "@/constants/endpoints";
import { useRouter } from "@/i18n/navigation";
import { use, useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Printer } from "lucide-react";
import {
  SubmissionResultView,
  type ResultSubmission,
} from "@/components/exam/submission-result-view";
import StudentSideBar from "@/components/common/student/sidebar";
import StudentMenu from "@/components/common/student/menu";
import { useAppSelector } from "@/store/hook";
import { toast } from "sonner";
import { useSocket } from "@/components/providers/SocketProvider";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}


export default function ResultDetailPage({ params }: PageProps) {
  const t = useTranslations("student.resultDetail");
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const router = useRouter();
  const { socket } = useSocket();
  const [isPrinting, setIsPrinting] = useState(false);

  const user = useAppSelector((state) => state.user);
  const userId = user.id;
  const userRole = user.role;
  const [submission, setSubmission] = useState<ResultSubmission | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const fetchSubmissionRef = useRef<
    ((background?: boolean) => Promise<void>) | null
  >(null);

  useEffect(() => {
    let active = true;
    let generation = 0;
    let hasSubmission = false;
    let controller: AbortController | null = null;
    const fetchSubmission = async (background = false) => {
      if (!id) return;
      const silent = background && hasSubmission;
      const version = ++generation;
      controller?.abort();
      const abort = new AbortController();
      controller = abort;
      if (!silent) {
        setIsLoading(true);
        setError(null);
        setSubmission(null);
      }
      try {
        const response = await apiClient.get<ResultSubmission>(
          ENDPOINTS.SUBMISSIONS.DETAIL(id), { signal: abort.signal },
        );
        if (!active || version !== generation) return;
        hasSubmission = true;
        setSubmission(response.data);
        setError(null);
      } catch (err) {
        if (!active || version !== generation || abort.signal.aborted) return;
        if (!silent) {
          setError(err);
          setSubmission(null);
        }
      } finally {
        if (!silent && active && version === generation) setIsLoading(false);
      }
    };
    fetchSubmissionRef.current = fetchSubmission;
    void fetchSubmission();
    return () => {
      active = false;
      generation += 1;
      controller?.abort();
      fetchSubmissionRef.current = null;
    };
  }, [id]);

  useEffect(() => {
    const onNotification = (notification: { target_id?: string; target_type?: string } | null) => {
      if (notification?.target_type === "SUBMISSION" && notification.target_id === id) {
        void fetchSubmissionRef.current?.(true);
      }
    };
    socket?.on("notification:new", onNotification);
    return () => {
      socket?.off("notification:new", onNotification);
    };
  }, [id, socket]);

  const handlePrint = async () => {
    try {
      setIsPrinting(true);
      const response = await apiClient.get(ENDPOINTS.SUBMISSIONS.PDF(id), {
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement("a");
      a.href = url;
      const safeName =
        (submission?.student?.full_name ?? "Unknown").trim() || "Unknown";
      const sanitizedName = safeName.replace(/\s+/g, "_");
      a.download = `Ketqua_${sanitizedName}_${id}.pdf`;
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

  // Security check - allow owner, lecturer of the exam, or ADMIN
  const isLecturer = userRole === "LECTURER";
  const isAdmin = userRole === "ADMIN";
  const isOwner = submission?.student_id === userId;

  if (submission && !isOwner && !isAdmin && !isLecturer) {
    return (
      <div className="flex min-h-screen bg-neutral-100">
        <StudentSideBar />
        <div className="flex-1 flex flex-col">
          <StudentMenu />
          <main className="flex-1 px-6 pb-10 pt-7 md:px-8">
            <div className="max-w-4xl mx-auto">
              <Card className="p-8 text-center">
                <p className="text-red-600 text-lg">
                  {t("youDoNotHavePermissionTo")}</p>
                <Button onClick={() => router.push("/result")} className="mt-4">
                  {t("backToTheList")}</Button>
              </Card>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-neutral-100">
        <StudentSideBar />
        <div className="flex-1 flex flex-col">
          <StudentMenu />
          <main className="flex-1 px-6 pb-10 pt-7 md:px-8">
            <div className="max-w-4xl mx-auto">
              <Card className="p-8 text-center">
                <p className="text-gray-600">{t("loading")}</p>
              </Card>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (error || !submission) {
    return (
      <div className="flex min-h-screen bg-neutral-100">
        <StudentSideBar />
        <div className="flex-1 flex flex-col">
          <StudentMenu />
          <main className="flex-1 px-6 pb-10 pt-7 md:px-8">
            <div className="max-w-4xl mx-auto">
              <Card className="p-8 text-center">
                <p className="text-red-600 text-lg">
                  {t("thisSubmissionWasNotFound")}</p>
                <Button onClick={() => router.push("/result")} className="mt-4">
                  {t("backToTheList")}</Button>
              </Card>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const isPractice = submission.exam.practice;

  return (
    <div className="flex min-h-screen bg-neutral-100">
      <StudentSideBar />
      <div className="flex-1 flex flex-col">
        <StudentMenu />
        <main className="flex-1 px-6 pb-10 pt-7 md:px-8">
          <div className="mx-auto space-y-6">
            {/* Back Button */}
            <div className="flex items-center justify-between no-print">
              <Button
                onClick={() => router.back()}
                variant="outline"
                className="flex items-center gap-2 bg-white border-gray-300 hover:cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                {t("comeBack")}</Button>
              <Button
                onClick={handlePrint}
                disabled={isPrinting}
                variant="outline"
                className="flex items-center gap-2 bg-white border-gray-300 hover:cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                {isPrinting ? t("preparingPrint") : t("printTheExam")}
              </Button>
            </div>

            <SubmissionResultView
              submission={submission}
              showQuestions={isPractice || isLecturer || isAdmin}
            />
          </div>
        </main>
      </div>
      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          .flex-1 {
            width: 100% !important;
          }
          nav,
          aside,
          .StudentSideBar,
          .StudentMenu {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
