"use client";

import { useLocale, useTranslations } from "next-intl";
import { AlertCircle, Calendar, CheckCircle2, Clock, FileText, Maximize, Printer } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { intlLocales } from "@/i18n/config";
import { examTypeClass } from "@/lib/exam-style";
import type { ExamData } from "@/types/exam";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type InfoTileProps = {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "sky" | "emerald" | "violet";
};

const TILE_TONES: Record<InfoTileProps["tone"], string> = {
  sky: "border-sky-100 bg-sky-50 [&_.tile-icon]:bg-sky-100 [&_.tile-icon]:text-sky-700",
  emerald:
    "border-emerald-100 bg-emerald-50 [&_.tile-icon]:bg-emerald-100 [&_.tile-icon]:text-emerald-700",
  violet:
    "border-violet-100 bg-violet-50 [&_.tile-icon]:bg-violet-100 [&_.tile-icon]:text-violet-700",
};

function InfoTile({ icon, label, value, tone }: InfoTileProps) {
  return (
    <div className={`flex items-center gap-4 rounded-lg border p-4 ${TILE_TONES[tone]}`}>
      <div className="tile-icon rounded-full p-3">{icon}</div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="font-semibold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

type FullscreenPromptDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

/** Asks the student to enter fullscreen before an official exam starts. */
function FullscreenPromptDialog({
  open,
  onOpenChange,
  onConfirm,
}: FullscreenPromptDialogProps) {
  const t = useTranslations("student.exam");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Maximize className="h-5 w-5 text-[#0066cc]" />
            {t("fullscreenPromptTitle")}
          </DialogTitle>
          <DialogDescription>{t("fullscreenPromptDescription")}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("fullscreenPromptCancel")}
          </Button>
          <Button
            className="bg-[#0066cc] text-white hover:bg-[#0052a3]"
            onClick={onConfirm}
          >
            {t("fullscreenPromptConfirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type ExamLandingProps = {
  exam: ExamData;
  requiresFullscreen: boolean;
  isPrinting: boolean;
  showFullscreenPrompt: boolean;
  onShowFullscreenPromptChange: (open: boolean) => void;
  onPrint: () => void;
  onStart: () => void;
  onConfirmFullscreenStart: () => void;
};

/** Exam overview, rules and the start button shown before the test begins. */
export function ExamLanding({
  exam,
  requiresFullscreen,
  isPrinting,
  showFullscreenPrompt,
  onShowFullscreenPromptChange,
  onPrint,
  onStart,
  onConfirmFullscreenStart,
}: ExamLandingProps) {
  const t = useTranslations("student.exam");
  const locale = useLocale();

  const topicName =
    typeof exam.topic === "string"
      ? exam.topic
      : ((exam.topic as { name?: string } | null)?.name ?? "N/A");

  const rules = [
    <>
      <span className="font-semibold">{t("note")}</span>{" "}
      {t("examOfficiallyOnlyAllowedOnceArticle")}
    </>,
    t("unauthorizedUseOfMaterialsIsNot"),
    t("theSystemWillAutomaticallySubmitThe"),
    t("ensureAStableInternetConnectionThroughout"),
  ];

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-100 p-4 md:p-8">
      <Card className="w-full max-w-4xl gap-0 overflow-hidden border border-gray-300 bg-white py-0 shadow-sm">
        <CardHeader className="border-b border-gray-200 bg-gray-50 p-6 md:p-8">
          <Badge
            variant="outline"
            className={`mb-3 w-fit ${examTypeClass(exam.practice)}`}
          >
            {exam.practice ? t("practice") : t("officialTest")}
          </Badge>
          <CardTitle className="text-2xl font-bold text-gray-900 md:text-3xl">
            {exam.title}
          </CardTitle>
          <p className="text-gray-600">
            <span className="font-semibold text-gray-700">{t("topic")}</span>{" "}
            {topicName}
          </p>
        </CardHeader>

        <CardContent className="space-y-8 p-6 md:p-8">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <InfoTile
              tone="sky"
              icon={<Clock className="h-6 w-6" />}
              label={t("timeToDoHomework")}
              value={`${exam.duration} ${t("minute")}`}
            />
            <InfoTile
              tone="emerald"
              icon={<Calendar className="h-6 w-6" />}
              label={t("startTime")}
              value={new Date(exam.exam_start_time).toLocaleDateString(
                intlLocales[locale],
              )}
            />
            <InfoTile
              tone="violet"
              icon={<FileText className="h-6 w-6" />}
              label={t("numberOfQuestions")}
              value={`${exam.questions?.length || 0} ${t("sentence")}`}
            />
          </div>

          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-xl font-bold text-gray-900">
              <AlertCircle className="h-5 w-5 text-[#0066cc]" />
              {t("examRoomRules")}
            </h3>
            <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-5">
              {rules.map((rule, index) => (
                <div key={index} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-500" />
                  <p className="text-gray-700">{rule}</p>
                </div>
              ))}
              {requiresFullscreen && (
                <div className="flex items-start gap-3">
                  <Maximize className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#0066cc]" />
                  <p className="text-gray-700">{t("fullscreenRule")}</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-3 pt-2">
            {exam.practice && (
              <Button
                variant="outline"
                size="lg"
                onClick={onPrint}
                disabled={isPrinting}
                className="gap-2 border-sky-200 text-sky-700 hover:bg-sky-50"
              >
                {isPrinting ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-sky-700" />
                ) : (
                  <Printer className="h-5 w-5" />
                )}
                {isPrinting ? t("creatingPrints") : t("printExamQuestions")}
              </Button>
            )}
            <Button variant="outline" size="lg" className="px-8" asChild>
              <Link href="/home">{t("comeBack")}</Link>
            </Button>
            <Button
              size="lg"
              className="bg-[#0066cc] px-12 text-white hover:bg-[#0052a3]"
              onClick={onStart}
            >
              {t("doYourHomeworkNow")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <FullscreenPromptDialog
        open={showFullscreenPrompt}
        onOpenChange={onShowFullscreenPromptChange}
        onConfirm={onConfirmFullscreenStart}
      />
    </div>
  );
}
