"use client";

import { useTranslations } from "next-intl";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const STATUS_CARD_CLASS =
  "w-full max-w-lg gap-0 overflow-hidden border border-gray-300 bg-white py-0 text-center shadow-sm";

/** Shown when the exam is no longer open for the student. */
export function ExamClosedCard() {
  const t = useTranslations("student.exam");

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-100 p-4">
      <Card className={STATUS_CARD_CLASS}>
        <CardHeader className="flex flex-col items-center gap-3 border-b border-gray-200 bg-red-50 p-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-red-200 bg-red-100">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            {t("theExamIsClosed")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 p-8">
          <div className="space-y-2 text-gray-600">
            <p className="text-lg">{t("thisTestIsNoLongerOpen")}</p>
            <p>{t("pleaseReturnToTheHomePage")}</p>
          </div>
          <Button
            size="lg"
            asChild
            className="w-full bg-[#0066cc] text-white hover:bg-[#0052a3]"
          >
            <Link href="/home">{t("returnToHomepage")}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

/** Shown when no exam data could be found. */
export function ExamNotFound() {
  const t = useTranslations("student.exam");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-100 p-4">
      <h2 className="text-2xl font-bold text-gray-900">{t("noTestFound")}</h2>
      <Button asChild className="mt-4 bg-[#0066cc] text-white hover:bg-[#0052a3]">
        <Link href="/home">{t("returnToHomepage")}</Link>
      </Button>
    </div>
  );
}

type ExamCompletionCardProps = {
  examTitle: string;
  submissionId?: string;
};

/** Confirmation screen displayed after the exam has been submitted. */
export function ExamCompletionCard({
  examTitle,
  submissionId,
}: ExamCompletionCardProps) {
  const t = useTranslations("student.exam");

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-100 p-4">
      <Card className={STATUS_CARD_CLASS}>
        <CardHeader className="flex flex-col items-center gap-3 border-b border-gray-200 bg-emerald-50 p-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-emerald-200 bg-emerald-100">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            {t("submittedSuccessfully")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 p-8">
          <div className="space-y-2 text-gray-600">
            <p className="text-lg">
              {t("youHaveCompletedTheExam")}
              <strong className="text-gray-900">{examTitle}</strong>.
            </p>
            <p>
              {t("theSystemHasRecordedYourResults")}{" "}
              <Link
                href={submissionId ? `/result/${submissionId}` : "/result"}
                className="font-semibold text-[#0066cc] hover:underline"
              >
                {t("examResults")}
              </Link>{" "}
              {t("toSeeDetailedScores")}
            </p>
          </div>
          <Button
            size="lg"
            asChild
            className="w-full bg-[#0066cc] text-white hover:bg-[#0052a3]"
          >
            <Link href="/home">{t("returnToHomepage")}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
