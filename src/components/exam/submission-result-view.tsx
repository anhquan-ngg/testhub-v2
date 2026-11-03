"use client";

import { useFormatter, useTranslations } from "next-intl";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Clock,
  CheckCircle,
  ExternalLink,
  XCircle,
  FileText,
  Video,
  Volume2,
} from "lucide-react";
import { MathRenderer } from "@/components/MathRenderer";
import { examTypeClass } from "@/lib/exam-style";
import { questionTypeClass } from "@/lib/regrading";
import { useEnumLabels } from "@/i18n/useEnumLabels";
import {
  calculateScorePerQuestion,
  calculateTotalQuesions,
  parseOptions,
} from "@/lib/exam-utils";

export type SubmissionQuestionOption = {
  text: string;
  isCorrect?: boolean;
};

type ResultQuestionFile = {
  id: string;
  url: string;
  name: string;
  type: string;
};

type ResultSubmissionQuestionFile = {
  order: number;
  file: ResultQuestionFile;
};

type ResultSubmissionQuestion = {
  id: string;
  score: number | string | null;
  is_correct: boolean;
  options: string | null;
  answer: string | null;
  question: {
    id: string;
    question_text: string;
    question_type: string;
    options: string | null;
    correct_answer: string | null;
    files?: ResultSubmissionQuestionFile[];
  };
};

export type ResultSubmission = {
  id: string;
  student_id: string;
  total_score: number | string | null;
  rating: string | null;
  start_time: string | Date | null;
  end_time: string | Date | null;
  status: string;
  exam: {
    id: string;
    title: string;
    lecturer_id?: string;
    topic?: {
      id: string;
      name: string;
    } | null;
    practice: boolean;
    mode: string;
    sample_size: number | null;
    distribution: string | null;
    _count: {
      questions: number;
    };
  };
  student?: {
    full_name?: string | null;
    email?: string | null;
  } | null;
  questions?: ResultSubmissionQuestion[];
};

function calculateTimeTaken(
  startTime: string | Date | null,
  endTime: string | Date | null,
): { hours: number; minutes: number } | null {
  if (!startTime || !endTime) return null;
  const start = new Date(startTime);
  const end = new Date(endTime);
  const diffMs = end.getTime() - start.getTime();
  if (!Number.isFinite(diffMs) || diffMs < 0) return null;
  const diffMins = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMins / 60);
  const minutes = diffMins % 60;
  return { hours, minutes };
}

function QuestionFiles({ files }: { files?: ResultSubmissionQuestionFile[] }) {
  const t = useTranslations("student.resultDetail");
  if (!files?.length) return null;

  const resolvedFiles = [...files]
    .sort((left, right) => left.order - right.order)
    .map((item) => item.file);

  return (
    <div className="mt-4 flex flex-col items-center gap-4 not-prose">
      {resolvedFiles.some((file) => file.type === "IMAGE") && (
        <div className="flex flex-wrap justify-center gap-4">
          {resolvedFiles
            .filter((file) => file.type === "IMAGE")
            .map((file) => (
              <div key={file.id} className="relative max-w-full">
                <img
                  src={file.url}
                  alt={file.name || "Question file"}
                  className="max-h-80 w-auto object-contain rounded-lg shadow-sm border border-gray-200"
                />
              </div>
            ))}
        </div>
      )}

      <div className="hidden print:block w-full space-y-1 text-sm">
        {resolvedFiles
          .filter((file) => file.type === "VIDEO" || file.type === "AUDIO")
          .map((file) => (
            <p key={file.id}>
              {t("mediaAttachment", { name: file.name || t("audioFile") })}
            </p>
          ))}
      </div>

      {resolvedFiles.some((file) => file.type === "VIDEO") && (
        <div className="w-full max-w-2xl space-y-3 print:hidden">
          {resolvedFiles
            .filter((file) => file.type === "VIDEO")
            .map((file) => (
              <div
                key={file.id}
                className="rounded-lg overflow-hidden border border-gray-200 bg-black shadow-sm"
              >
                <div className="px-3 py-1.5 bg-gray-900 text-gray-200 text-xs font-medium flex items-center gap-2">
                  <Video className="w-4 h-4 text-blue-400" />
                  <span className="truncate">{file.name}</span>
                </div>
                <video controls className="w-full max-h-96" preload="metadata">
                  <source src={file.url} />
                  {t("videoUnsupported")}
                </video>
              </div>
            ))}
        </div>
      )}

      {resolvedFiles.some((file) => file.type === "AUDIO") && (
        <div className="w-full max-w-2xl space-y-3 print:hidden">
          {resolvedFiles
            .filter((file) => file.type === "AUDIO")
            .map((file) => (
              <div
                key={file.id}
                className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex flex-col gap-2"
              >
                <div className="flex items-center gap-2 text-sm font-medium text-blue-900">
                  <Volume2 className="w-4 h-4 text-blue-600" />
                  <span className="truncate">
                    {file.name || t("audioFile")}
                  </span>
                </div>
                <audio controls className="w-full">
                  <source src={file.url} />
                  {t("audioUnsupported")}
                </audio>
              </div>
            ))}
        </div>
      )}

      {resolvedFiles.some(
        (file) =>
          file.type !== "IMAGE" &&
          file.type !== "VIDEO" &&
          file.type !== "AUDIO",
      ) && (
        <div className="w-full max-w-2xl space-y-2">
          {resolvedFiles
            .filter(
              (file) =>
                file.type !== "IMAGE" &&
                file.type !== "VIDEO" &&
                file.type !== "AUDIO",
            )
            .map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between gap-4 p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <FileText className="w-5 h-5 text-gray-500 shrink-0" />
                  <span className="font-medium text-gray-800 truncate">
                    {file.name}
                  </span>
                </div>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-1"
                >
                  <a href={file.url} target="_blank" rel="noreferrer">
                    <ExternalLink className="w-4 h-4" /> {t("viewOrDownload")}
                  </a>
                </Button>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

type SubmissionResultViewProps = {
  submission: ResultSubmission;
  /** Whether the per-question breakdown is visible (practice exam or staff). */
  showQuestions: boolean;
  staffView?: boolean;
};

/**
 * Renders the detailed result of a submission (summary card + per-question
 * breakdown). Shared by the student and lecturer result pages so the
 * on-screen and printed layouts stay identical.
 */
export function SubmissionResultView({
  submission,
  showQuestions,
  staffView = false,
}: SubmissionResultViewProps) {
  const t = useTranslations("student.resultDetail");
  const format = useFormatter();
  const labels = useEnumLabels();
  const isPractice = submission.exam.practice;
  const duration = calculateTimeTaken(
    submission.start_time,
    submission.end_time,
  );
  const timeTaken = duration
    ? duration.hours > 0
      ? t("hoursMinutes", duration)
      : t("minutes", duration)
    : "N/A";

  return (
    <div className="result-print-area space-y-6 [overflow-wrap:anywhere]">
      {/* Header Card */}
      <Card className="gap-0 overflow-hidden border border-gray-300 bg-white py-0 shadow-sm">
        <CardHeader className="p-6 border-b border-gray-200 bg-gray-50">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <FileText className="w-6 h-6 text-[#0066cc]" />
                <h1 className="text-2xl font-bold text-gray-900">
                  {submission.exam.title}
                </h1>
                <Badge variant="default" className={examTypeClass(isPractice)}>
                  {isPractice ? t("practice") : t("official")}
                </Badge>
              </div>
              <p className="text-gray-600 ml-9">
                {t("topicName", { name: submission.exam.topic?.name ?? "N/A" })}
              </p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 text-3xl font-bold text-[#0066cc]">
                {submission.total_score !== null
                  ? Number(submission.total_score).toFixed(2)
                  : "0.00"}
                <span className="text-lg text-gray-600">{t("point")}</span>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {staffView && (
            <dl className="mb-5 grid gap-3 border-b border-gray-200 pb-5 text-sm sm:grid-cols-2 result-identity">
              <div>
                <dt className="text-gray-500">{t("studentName")}</dt>
                <dd className="font-semibold">
                  {submission.student?.full_name || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">{t("studentEmail")}</dt>
                <dd>{submission.student?.email || "—"}</dd>
              </div>
              <div>
                <dt className="text-gray-500">{t("submissionId")}</dt>
                <dd className="break-all">{submission.id}</dd>
              </div>
              <div>
                <dt className="text-gray-500">{t("submittedAt")}</dt>
                <dd>
                  {submission.end_time
                    ? format.dateTime(new Date(submission.end_time), {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })
                    : "—"}
                </dd>
              </div>
            </dl>
          )}
          <div className="result-statistics grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-4 bg-sky-50 rounded-lg border border-sky-200">
              <Clock className="w-5 h-5 text-sky-700" />
              <div>
                <p className="text-sm text-gray-600">{t("timeToDoHomework")}</p>
                <p className="font-semibold text-gray-900">{timeTaken}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
              <CheckCircle className="w-5 h-5 text-emerald-700" />
              <div>
                <p className="text-sm text-gray-600">{t("status")}</p>
                <p className="font-semibold text-gray-900">
                  {submission.status === "COMPLETED"
                    ? t("complete")
                    : submission.status || "N/A"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-violet-50 rounded-lg border border-violet-200">
              <FileText className="w-5 h-5 text-violet-700" />
              <div>
                <p className="text-sm text-gray-600">
                  {t("numberOfQuestions")}
                </p>
                <p className="font-semibold text-gray-900">
                  {calculateTotalQuesions(submission)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Questions List - Always show for lecturer/admin or if it's a practice exam */}
      {showQuestions &&
        submission.questions &&
        submission.questions.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-neutral-900">
              {t("detailedAnswer")}
            </h2>

            {submission.questions.map((sq, index) => {
              const questionOptions = parseOptions(
                sq.question.options,
              ) as SubmissionQuestionOption[];
              const studentOptions = parseOptions(
                sq.options,
              ) as SubmissionQuestionOption[];

              return (
                <Card
                  key={sq.id}
                  className={`result-question border ${
                    sq.is_correct
                      ? "border-emerald-200 bg-emerald-50/60"
                      : "border-red-200 bg-red-50/60"
                  }`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex flex-col items-start justify-between gap-4 sm:flex-row">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="font-bold text-gray-900">
                            {t("questionNumber", { number: index + 1 })}
                          </span>
                          {sq.is_correct ? (
                            <Badge
                              variant="outline"
                              className="border-emerald-200 bg-emerald-50 text-emerald-700"
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              {t("correct")}
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="border-red-200 bg-red-50 text-red-700"
                            >
                              <XCircle className="w-3 h-3 mr-1" />
                              {t("incorrect")}
                            </Badge>
                          )}
                          <Badge
                            variant="outline"
                            className={questionTypeClass(
                              sq.question.question_type,
                            )}
                          >
                            {labels.questionType(sq.question.question_type)}
                          </Badge>
                        </div>
                        <div className="text-gray-800 leading-relaxed">
                          <MathRenderer content={sq.question.question_text} />
                        </div>
                        <QuestionFiles files={sq.question.files} />
                      </div>
                      <Badge
                        variant="outline"
                        className="font-semibold border-gray-300 text-gray-900 bg-white"
                      >
                        {(
                          calculateScorePerQuestion(submission) *
                          Number(sq.score ?? 0)
                        ).toFixed(2)}{" "}
                        {t("point")}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {sq.question.question_type === "ESSAY" ? (
                      <div className="space-y-3">
                        <div className="p-3 bg-sky-50 rounded-lg border border-sky-200">
                          <p className="text-sm font-semibold text-sky-800 mb-1">
                            {t(staffView ? "studentAnswer" : "yourAnswer")}
                          </p>
                          <div className="whitespace-pre-wrap break-words text-gray-700">
                            <MathRenderer
                              content={sq.answer || t("noAnswer")}
                            />
                          </div>
                        </div>
                        {sq.question.correct_answer && (
                          <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                            <p className="text-sm font-semibold text-emerald-800 mb-1">
                              {t("sampleAnswer")}
                            </p>
                            <div className="text-gray-700">
                              <MathRenderer
                                content={sq.question.correct_answer}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {questionOptions.map(
                          (
                            option: SubmissionQuestionOption,
                            optIndex: number,
                          ) => {
                            const isStudentChoice = studentOptions.some(
                              (so: SubmissionQuestionOption) =>
                                so.text === option.text && so.isCorrect,
                            );
                            const isCorrect = option.isCorrect === true;

                            let bgClass = "bg-white border-gray-300";
                            let textClass = "text-gray-700";
                            let iconElement = null;

                            if (isStudentChoice && isCorrect) {
                              bgClass = "bg-emerald-50 border-emerald-400";
                              textClass = "text-emerald-900 font-semibold";
                              iconElement = (
                                <CheckCircle className="w-5 h-5 text-emerald-600" />
                              );
                            } else if (isStudentChoice && !isCorrect) {
                              bgClass = "bg-red-50 border-red-300";
                              textClass = "text-red-900 font-semibold";
                              iconElement = (
                                <XCircle className="w-5 h-5 text-red-600" />
                              );
                            } else if (!isStudentChoice && isCorrect) {
                              bgClass = "bg-emerald-50/50 border-emerald-200";
                              textClass = "text-emerald-800";
                              iconElement = (
                                <CheckCircle className="w-5 h-5 text-emerald-500" />
                              );
                            }

                            return (
                              <div
                                key={optIndex}
                                className={`flex items-center gap-3 p-3 rounded-lg border ${bgClass}`}
                              >
                                {iconElement && (
                                  <div className="flex-shrink-0">
                                    {iconElement}
                                  </div>
                                )}
                                <div className={`min-w-0 flex-1 ${textClass}`}>
                                  <MathRenderer content={option.text} />
                                </div>
                                {isStudentChoice && (
                                  <Badge
                                    variant="outline"
                                    className="whitespace-nowrap rounded-full border-sky-200 bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700"
                                  >
                                    {t(
                                      staffView ? "studentChoice" : "youChoose",
                                    )}
                                  </Badge>
                                )}
                              </div>
                            );
                          },
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

      {/* No questions message */}
      {(!submission.questions || submission.questions.length === 0) && (
        <Card className="p-8 text-center">
          <p className="text-gray-600">{t("thereAreNoQuestionsInThis")}</p>
        </Card>
      )}
    </div>
  );
}
