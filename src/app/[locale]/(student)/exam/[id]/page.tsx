"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import type { RootState } from "@/store";
import { startTest, endTest } from "@/store/slices/examSlice";
import { useAppSelector } from "@/store/hook";
import apiClient from "@/lib/api-client";
import { parseOptions } from "@/lib/exam-utils";
import { ENDPOINTS } from "@/constants/endpoints";
import type { ExamData } from "@/types/exam";
import type { QuestionType } from "@/types/backend-enums";
import { ExamLoadingSpinner } from "./_components/ExamLoadingSpinner";
import {
  ExamClosedCard,
  ExamCompletionCard,
  ExamNotFound,
} from "./_components/ExamStatusScreens";
import { ExamLanding } from "./_components/ExamLanding";
import { ExamHeader, formatTime } from "./_components/ExamHeader";
import { QuestionNavigator } from "./_components/QuestionNavigator";
import { QuestionCard } from "./_components/QuestionCard";
import { FullscreenBlockedDialog } from "./_components/FullscreenBlockedDialog";
import type {
  AnswerMap,
  AnswerValue,
  ExamQuestionItem,
} from "./_components/types";
import { useFullscreen } from "./_hooks/useFullscreen";
import { useExamPresence } from "./_hooks/useExamPresence";
import { useExamProctoring } from "./_hooks/useExamProctoring";
import { useQuestionFiles } from "./_hooks/useQuestionFiles";
import { getErrorReason } from "./_hooks/errors";

type SubmitQuestionPayload = {
  submission_id: string;
  question_id: string;
  options?: string;
  answer?: string;
};

/**
 * Student exam-taking page: loads the session, runs the timer and proctoring
 * hooks, and wires the presentational components together.
 */
export default function ExamPage() {
  const t = useTranslations("student.exam");
  const router = useRouter();
  const dispatch = useDispatch();
  const params = useParams();
  const userId = useAppSelector((s) => s.user.id);
  const examId = params.id as string;
  const testStarted = useSelector((state: RootState) => state.exam.testStarted);

  const [exam, setExam] = useState<ExamData | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [submittedQuestionIds, setSubmittedQuestionIds] = useState<Set<string>>(
    new Set(),
  );
  const [timeLeft, setTimeLeft] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [questions, setQuestions] = useState<ExamQuestionItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [examClosed, setExamClosed] = useState(false);
  const [showFullscreenPrompt, setShowFullscreenPrompt] = useState(false);
  const [hasExitedFullscreen, setHasExitedFullscreen] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  const timerInitialized = useRef(false);
  const dataFetched = useRef(false);
  const questionsInitialized = useRef(false);
  const startingRef = useRef(false);

  const {
    isFullscreen,
    fullscreenSupported,
    intentionalFullscreenExit,
    enterFullscreen,
    leaveFullscreen,
  } = useFullscreen();

  const handleFullscreenExited = useCallback(
    () => setHasExitedFullscreen(true),
    [],
  );

  const currentQuestion: ExamQuestionItem | undefined =
    questions[currentQuestionIndex];

  const handlePrint = async () => {
    if (!examId) return;
    setIsPrinting(true);
    try {
      const response = await apiClient.get(`/submission/exam/${examId}/pdf`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `Dethi_${exam?.title?.replace(/\s+/g, "_") || examId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success(t("downloadedTheExamSuccessfully"));
    } catch (err) {
      console.error("Print error:", err);
      toast.error(t("anErrorOccurredWhileCreatingA"));
    } finally {
      setIsPrinting(false);
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get(
        ENDPOINTS.SUBMISSIONS.EXAM_SESSION(examId),
      );
      const sessionData = response.data.data;

      if (sessionData?.hasActiveSubmission) {
        setExam(sessionData);
        setStartTime(
          sessionData.entered_at ? new Date(sessionData.entered_at) : new Date(),
        );
        dispatch(startTest());
        return;
      }

      if (sessionData?.reason === "EXAM_CLOSED") {
        setExamClosed(true);
        return;
      }

      if (!sessionData?.canStart) {
        toast.error(t("theExamHasNotBeenOpened"));
        router.push("/home");
        return;
      }

      const detail = await apiClient.get<ExamData>(
        ENDPOINTS.EXAMS.DETAIL(examId),
      );
      setExam(detail.data);
    } catch (error) {
      if (getErrorReason(error) === "EXAM_CLOSED") {
        setExamClosed(true);
        return;
      }
      toast.error(t("errorLoadingTestData"));
      console.log(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (userId && !dataFetched.current) {
      dataFetched.current = true;
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId, userId]);

  useEffect(() => {
    if (exam && testStarted && !questionsInitialized.current) {
      questionsInitialized.current = true;

      // Restore answers already submitted via submit-by-question (e.g. after a
      // page reload). `submitted_options[].isCorrect` here means "the student
      // picked this option" — not the real answer key — so it's safe to use for
      // prefill without leaking correctness.
      const prefilledAnswers: AnswerMap = {};
      const prefilledSubmittedIds = new Set<string>();

      const parsedQuestions = exam.questions.map((question) => {
        const q = { ...question } as unknown as ExamQuestionItem;

        if (question.options && typeof question.options === "string") {
          try {
            const parsed: unknown = JSON.parse(question.options);
            if (Array.isArray(parsed)) {
              q.options = parsed.map((option, index) => ({
                ...option,
                id: String(index + 1),
              }));
            }
          } catch (error) {
            console.error("Failed to parse options:", error);
          }
        }

        if (q.answered) {
          if (q.question_type === "ESSAY") {
            prefilledAnswers[q.id] = q.submitted_answer ?? "";
            prefilledSubmittedIds.add(q.id);
          } else if (Array.isArray(q.options)) {
            // The question was submitted server-side regardless of whether we
            // can reconstruct which option(s) were picked.
            prefilledSubmittedIds.add(q.id);
            const submittedOptions = parseOptions(q.submitted_options ?? null) as {
              text: string;
              isCorrect?: boolean;
            }[];
            const chosenTexts = new Set(
              submittedOptions.filter((o) => o.isCorrect).map((o) => o.text),
            );
            const matchedIds = q.options
              .filter((o) => chosenTexts.has(o.text))
              .map((o) => String(o.id));
            if (matchedIds.length > 0) {
              prefilledAnswers[q.id] =
                q.question_type === "MULTIPLE_CHOICE"
                  ? matchedIds
                  : matchedIds[0];
            }
          }
        }

        return q;
      });

      // Question order is now decided and persisted once by the backend, so the
      // list is used as received.
      setQuestions(parsedQuestions);
      setAnswers(prefilledAnswers);
      setSubmittedQuestionIds(prefilledSubmittedIds);

      // Prefer the server's per-attempt deadline (auto_submit_at) so a reload
      // or a second device cannot extend the time.
      const endsAt = exam.auto_submit_at
        ? new Date(exam.auto_submit_at).getTime()
        : (exam.entered_at ? new Date(exam.entered_at).getTime() : Date.now()) +
          exam.duration * 60 * 1000;
      setTimeLeft(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)));
    }
  }, [exam, testStarted]);

  useEffect(() => {
    if (timeLeft > 0 && testStarted) {
      if (!timerInitialized.current) timerInitialized.current = true;
      const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [timeLeft, testStarted]);

  useExamPresence(exam?.submissionId, testStarted, setTimeLeft);
  useExamProctoring(
    exam?.submissionId,
    testStarted,
    intentionalFullscreenExit,
    handleFullscreenExited,
  );

  // Auto submit when timer runs out
  useEffect(() => {
    if (timeLeft === 0 && testStarted && timerInitialized.current) {
      handleSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, testStarted]);

  const currentFiles = useQuestionFiles(
    currentQuestion,
    testStarted && questions.length > 0,
  );

  const handleAnswer = (
    questionId: string,
    value: AnswerValue,
    type: QuestionType = "SINGLE_CHOICE",
  ) => {
    setAnswers((prev) => {
      if (type === "MULTIPLE_CHOICE") {
        const current = (prev[questionId] as string[]) || [];
        const next = current.includes(value as string)
          ? current.filter((v) => v !== value)
          : [...current, value as string];
        return { ...prev, [questionId]: next };
      }
      return { ...prev, [questionId]: value };
    });
    // The displayed answer no longer matches what's on the server until
    // re-submitted.
    setSubmittedQuestionIds((prev) => {
      if (!prev.has(questionId)) return prev;
      const next = new Set(prev);
      next.delete(questionId);
      return next;
    });
  };

  const handleSubmitQuestion = async (index = currentQuestionIndex) => {
    const question = questions[index];
    if (!exam?.submissionId || !question) return;

    const answer = answers[question.id];
    const payload: SubmitQuestionPayload = {
      submission_id: exam.submissionId,
      question_id: question.id,
    };

    if (
      (question.question_type === "SINGLE_CHOICE" ||
        question.question_type === "MULTIPLE_CHOICE") &&
      Array.isArray(question.options)
    ) {
      payload.options = JSON.stringify(
        question.options.map((opt) => ({
          text: opt.text,
          isCorrect: Array.isArray(answer)
            ? answer.includes(String(opt.id))
            : answer === String(opt.id),
        })),
      );
    } else if (question.question_type === "ESSAY") {
      payload.answer = (answer as string) || "";
    }

    try {
      await apiClient.post(ENDPOINTS.SUBMISSIONS.SUBMIT_QUESTION, payload);
      toast.success(t("questionSubmitted", { number: index + 1 }));
      setSubmittedQuestionIds((prev) => new Set(prev).add(question.id));
    } catch (error) {
      toast.error(t("sendingReplyFailed"));
      console.error(error);
    }
  };

  const handleSubmit = async () => {
    if (!exam?.submissionId) return;
    try {
      await apiClient.post(ENDPOINTS.SUBMISSIONS.SUBMIT_EXAM, {
        start_time: startTime || new Date(),
        end_time: new Date(),
        submission_id: exam.submissionId,
        question_length: questions.length,
      });
      toast.success(t("submittedSuccessfully"));
      leaveFullscreen();
      dispatch(endTest());
      setIsSubmitted(true);
    } catch (error) {
      toast.error(t("submissionFailed"));
      console.error(error);
    }
  };

  // Only official exams are proctored server-side (practice violations are
  // dropped), so only they require fullscreen.
  const requiresFullscreen = !!exam && !exam.practice && fullscreenSupported;

  const beginTest = async () => {
    if (startingRef.current) return;
    startingRef.current = true;
    try {
      const response = await apiClient.post<{ data: ExamData }>(
        ENDPOINTS.SUBMISSIONS.START_EXAM(examId),
      );
      const session = response.data.data;
      setExam(session);
      setStartTime(
        session.entered_at ? new Date(session.entered_at) : new Date(),
      );
      dispatch(startTest());
    } catch (error: unknown) {
      if (getErrorReason(error) === "EXAM_CLOSED") {
        setExam(null);
        setExamClosed(true);
        return;
      }
      toast.error(t("errorLoadingTestData"));
    } finally {
      startingRef.current = false;
    }
  };

  const handleStartTest = () => {
    if (requiresFullscreen && !document.fullscreenElement) {
      setShowFullscreenPrompt(true);
      return;
    }
    void beginTest();
  };

  const handleConfirmFullscreenStart = async () => {
    if (!(await enterFullscreen())) return;
    setShowFullscreenPrompt(false);
    void beginTest();
  };

  const handleBack = () => {
    dispatch(endTest());
    router.push("/home");
  };

  if (isLoading) return <ExamLoadingSpinner />;

  if (!exam) return examClosed ? <ExamClosedCard /> : <ExamNotFound />;

  if (isSubmitted) {
    return (
      <ExamCompletionCard
        examTitle={exam.title}
        submissionId={exam.submissionId}
      />
    );
  }

  if (!testStarted) {
    return (
      <ExamLanding
        exam={exam}
        requiresFullscreen={requiresFullscreen}
        isPrinting={isPrinting}
        showFullscreenPrompt={showFullscreenPrompt}
        onShowFullscreenPromptChange={setShowFullscreenPrompt}
        onPrint={handlePrint}
        onStart={handleStartTest}
        onConfirmFullscreenStart={handleConfirmFullscreenStart}
      />
    );
  }

  if (!currentQuestion) return <ExamLoadingSpinner />;

  // Official exam outside fullscreen: hide the questions behind a dialog the
  // student can only leave by going back to fullscreen. The timer keeps running.
  const fullscreenBlocked = requiresFullscreen && !isFullscreen;

  return (
    <>
      <div
        className={`flex min-h-screen flex-col bg-neutral-100 ${
          fullscreenBlocked ? "invisible" : ""
        }`}
        aria-hidden={fullscreenBlocked}
      >
        <ExamHeader
          title={exam.title}
          timeLeft={timeLeft}
          hideBackButton={exam.practice === false}
          onBack={handleBack}
          onToggleSidebar={() => setIsSidebarOpen((v) => !v)}
          onSubmit={handleSubmit}
        />

        <div className="flex flex-1 overflow-hidden">
          <QuestionNavigator
            questions={questions}
            answers={answers}
            submittedQuestionIds={submittedQuestionIds}
            currentQuestionIndex={currentQuestionIndex}
            isOpen={isSidebarOpen}
            onSelect={setCurrentQuestionIndex}
          />

          <main className="flex-1 overflow-y-auto p-4 md:p-8">
            <div className="mx-auto max-w-3xl">
              <QuestionCard
                question={currentQuestion}
                index={currentQuestionIndex}
                total={questions.length}
                answer={answers[currentQuestion.id]}
                files={currentFiles}
                onAnswer={(value, type) =>
                  handleAnswer(currentQuestion.id, value, type)
                }
                onPrevious={() =>
                  setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))
                }
                onNext={() =>
                  setCurrentQuestionIndex((prev) =>
                    prev < questions.length - 1 ? prev + 1 : prev,
                  )
                }
                onSubmitQuestion={() => handleSubmitQuestion()}
              />
            </div>
          </main>
        </div>
      </div>

      <FullscreenBlockedDialog
        open={fullscreenBlocked}
        hasExitedFullscreen={hasExitedFullscreen}
        timeLabel={formatTime(Math.max(0, timeLeft))}
        onResume={() => void enterFullscreen()}
      />
    </>
  );
}
