"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Clock,
  Calendar,
  AlertCircle,
  CheckCircle2,
  FileText,
  ChevronLeft,
  ChevronRight,
  Flag,
  Menu,
  Printer,
  FileDown,
  Video,
  Volume2,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { QuestionType } from "@prisma/client";
import { MathRenderer } from "@/components/MathRenderer";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/store";
import { startTest, endTest } from "@/store/slices/examSlice";
import { useAppSelector } from "@/store/hook";
import { toast } from "sonner";
import apiClient from "@/lib/api-client";
import { ExamData } from "@/types/exam";
import { parseOptions } from "@/lib/exam-utils";
import { ENDPOINTS } from "@/constants/endpoints";

interface QuestionFile {
  id: string;
  url: string;
  name: string;
  type: "IMAGE" | "VIDEO" | "AUDIO" | "DOCUMENT" | string;
  order?: number;
}

interface Question {
  id: string;
  question_text: string;
  image_url: string;
  files?: QuestionFile[];
  options: any[];
  question_type: QuestionType;
  submitted_answer?: string | null;
  submitted_options?: string | null;
  answered?: boolean;
}

interface ResolvedQuestionFile {
  id: string;
  url: string;
  name: string;
  type: "IMAGE" | "VIDEO" | "AUDIO" | "DOCUMENT" | string;
}

import { useS3 } from "@/hooks/useS3";

export default function ExamPage() {
  const params = useParams();
  const router = useRouter();
  const dispatch = useDispatch();
  const userId = useAppSelector((state) => state.user.id);
  const examId = params.id as string;
  const { getViewUrl } = useS3("questions-images");

  const testStarted = useSelector((state: RootState) => state.exam.testStarted);
  const [exam, setExam] = useState<ExamData | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [submittedQuestionIds, setSubmittedQuestionIds] = useState<
    Set<string>
  >(new Set());
  const [timeLeft, setTimeLeft] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [currentResolvedFiles, setCurrentResolvedFiles] = useState<
    ResolvedQuestionFile[]
  >([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [examClosed, setExamClosed] = useState(false);
  const timerInitialized = useRef(false);
  const dataFetched = useRef(false);
  const questionsInitialized = useRef(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const handlePrint = async () => {
    if (!examId) return;
    try {
      setIsPrinting(true);
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
      toast.success("Tải đề thi thành công");
    } catch (err) {
      console.error("Print error:", err);
      toast.error("Có lỗi xảy ra khi tạo bản in. Vui lòng thử lại sau.");
    } finally {
      setIsPrinting(false);
    }
  };

  const [printableQuestions, setPrintableQuestions] = useState<any[]>([]);

  useEffect(() => {
    const fetchPrintData = async () => {
      if (!exam?.questions) return;

      const processed = await Promise.all(
        exam.questions.map(async (q) => {
          let opts = q.options;
          if (typeof opts === "string") {
            try {
              opts = JSON.parse(opts);
            } catch {}
          }

          let imageUrl = q.image_url;
          if (imageUrl && !imageUrl.startsWith("http")) {
            try {
              const resolved = await getViewUrl(imageUrl);
              if (resolved) imageUrl = resolved;
            } catch (e) {
              console.error("Error resolving print image:", e);
            }
          }

          return {
            ...q,
            options: Array.isArray(opts) ? opts : [],
            image_url: imageUrl,
          };
        }),
      );
      setPrintableQuestions(processed);
    };

    fetchPrintData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exam]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const sessionResponse = await apiClient.get(
        ENDPOINTS.SUBMISSIONS.EXAM_SESSION(examId),
      );
      const sessionData = sessionResponse.data.data;

      if (sessionData?.hasActiveSubmission) {
        setExam(sessionData);
        setStartTime(
          sessionData.entered_at
            ? new Date(sessionData.entered_at)
            : new Date(),
        );
        dispatch(startTest());
        return;
      }

      if (sessionData?.reason === "EXAM_CLOSED") {
        setExamClosed(true);
        return;
      }

      if (!sessionData?.canStart) {
        toast.error("Bài thi chưa mở hoặc đã hết thời gian vào thi.");
        router.push("/home");
        return;
      }

      const response = await apiClient.post(
        ENDPOINTS.SUBMISSIONS.START_EXAM(examId),
      );

      if (response.status === 200) {
        setExam(response.data.data);
        setStartTime(
          response.data.data.entered_at
            ? new Date(response.data.data.entered_at)
            : new Date(),
        );
      }
    } catch (error) {
      const errorReason =
        (error as any)?.response?.data?.reason ??
        (error as any)?.response?.data?.data?.reason;

      if (errorReason === "EXAM_CLOSED") {
        setExamClosed(true);
        return;
      }

      toast.error("Lỗi khi tải dữ liệu bài thi");
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
  }, [examId, userId]);

  useEffect(() => {
    if (exam && testStarted && !questionsInitialized.current) {
      questionsInitialized.current = true;

      const prefilledAnswers: Record<string, string | string[]> = {};
      const prefilledSubmittedIds = new Set<string>();

      const questionsWithParsedOptions = exam.questions.map((question) => {
        const clonedQuestion: any = { ...question };

        if (
          clonedQuestion.options &&
          clonedQuestion.options !== null &&
          typeof clonedQuestion.options === "string"
        ) {
          try {
            clonedQuestion.options = JSON.parse(clonedQuestion.options);
            if (
              clonedQuestion.options &&
              Array.isArray(clonedQuestion.options)
            ) {
              clonedQuestion.options = clonedQuestion.options.map(
                (option: any, index: number) => ({
                  ...option,
                  id: String(index + 1),
                }),
              );
            }
          } catch (error) {
            console.error("Failed to parse options:", error);
          }
        }

        // Restore answers already submitted via submit-by-question (e.g. after a page reload).
        // `submitted_options[].isCorrect` here means "the student picked this option" — not the
        // real answer key — so it's safe to use for prefill without leaking correctness.
        if (clonedQuestion.answered) {
          if (clonedQuestion.question_type === "ESSAY") {
            prefilledAnswers[clonedQuestion.id] =
              clonedQuestion.submitted_answer ?? "";
            prefilledSubmittedIds.add(clonedQuestion.id);
          } else if (Array.isArray(clonedQuestion.options)) {
            // The question was submitted server-side regardless of whether we can
            // reconstruct which option(s) were picked (e.g. all options unselected,
            // or option text changed since submission) — reflect that in the sidebar.
            prefilledSubmittedIds.add(clonedQuestion.id);

            const submittedOptions = parseOptions(
              clonedQuestion.submitted_options,
            ) as { text: string; isCorrect?: boolean }[];
            const chosenTexts = new Set(
              submittedOptions
                .filter((opt) => opt.isCorrect)
                .map((opt) => opt.text),
            );
            const matchedIds = clonedQuestion.options
              .filter((opt: any) => chosenTexts.has(opt.text))
              .map((opt: any) => String(opt.id));

            if (matchedIds.length > 0) {
              prefilledAnswers[clonedQuestion.id] =
                clonedQuestion.question_type === "MULTIPLE_CHOICE"
                  ? matchedIds
                  : matchedIds[0];
            }
          }
        }

        return clonedQuestion;
      });

      // Question order is now decided and persisted once by the backend (randomized per
      // student, stable across reloads) — no client-side shuffling here anymore.
      setQuestions(questionsWithParsedOptions as any[]);
      setAnswers(prefilledAnswers);
      setSubmittedQuestionIds(prefilledSubmittedIds);

      // Prefer the server's per-attempt deadline (auto_submit_at) — it
      // reflects any "extend time" grant from the lecturer. Fall back to
      // entered_at + duration for older sessions that predate the field.
      const endsAt = exam.auto_submit_at
        ? new Date(exam.auto_submit_at).getTime()
        : (exam.entered_at ? new Date(exam.entered_at).getTime() : Date.now()) +
          exam.duration * 60 * 1000;
      setTimeLeft(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)));
    }
  }, [exam, testStarted]);

  useEffect(() => {
    if (timeLeft > 0 && testStarted) {
      // Mark timer as initialized only when it actually starts running
      if (!timerInitialized.current) {
        timerInitialized.current = true;
      }
      const timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [timeLeft, testStarted]);

  // Presence: a plain REST ping on the same cookie-authenticated axios
  // client every request on this page already uses. The previous socket.io
  // heartbeat connected to a namespace that only ever accepted a token via
  // `handshake.auth`/an Authorization header — this app never sends either
  // (the access token is httpOnly), so the server disconnected the socket
  // immediately on every connection and no heartbeat was ever actually
  // recorded. REST also means a token refresh mid-exam (the access-token
  // cookie lasts 15 minutes) is handled for free by the existing axios
  // 401-retry interceptor, unlike a raw WebSocket.
  useEffect(() => {
    if (!exam?.submissionId || !testStarted) return;

    const submissionId = exam.submissionId;
    const PING_INTERVAL_MS = 20_000;
    const PING_JITTER_MS = 3_000;
    let stopped = false;
    let timeoutId: number | undefined;

    const ping = () => {
      if (stopped) return;
      apiClient
        .post(ENDPOINTS.EXAM_RUNTIME.PING(submissionId))
        .then((response) => {
          // Resyncs the countdown from the server's deadline on every ping —
          // the only way an already-open tab picks up a lecturer's "extend
          // time" grant without a dedicated push channel.
          const autoSubmitAt = response?.data?.autoSubmitAt;
          if (!stopped && autoSubmitAt) {
            const secondsLeft = Math.max(
              0,
              Math.ceil((new Date(autoSubmitAt).getTime() - Date.now()) / 1000),
            );
            setTimeLeft(secondsLeft);
          }
        })
        .catch((error) => {
          // A single failed ping isn't alarming by itself — the lecturer's
          // monitor judges presence from the *age* of the last successful
          // ping server-side, not from client retry logic.
          console.error("Exam ping failed:", error);
        });
    };

    const scheduleNext = () => {
      if (stopped) return;
      // Jitter keeps 200 students who all pressed "start" in the same
      // second from pinging in lockstep forever.
      const jitter = (Math.random() * 2 - 1) * PING_JITTER_MS;
      timeoutId = window.setTimeout(() => {
        ping();
        scheduleNext();
      }, PING_INTERVAL_MS + jitter);
    };

    ping();
    scheduleNext();

    const handleVisibility = () => {
      if (!document.hidden) ping();
    };
    const handleOnline = () => ping();

    // A suspended laptop's timers just stop dead. Detect the wall-clock
    // jump on resume and ping immediately, instead of leaving the student
    // marked OFFLINE for up to a full interval after they wake it back up.
    let lastTick = Date.now();
    const clockCheck = window.setInterval(() => {
      const now = Date.now();
      if (now - lastTick > 5_000) ping();
      lastTick = now;
    }, 1_000);

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("online", handleOnline);

    return () => {
      stopped = true;
      if (timeoutId) window.clearTimeout(timeoutId);
      window.clearInterval(clockCheck);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("online", handleOnline);
    };
  }, [exam?.submissionId, testStarted]);

  // Proctoring signals. Self-reported, client-debounced (the server
  // debounces and caps independently too — this just avoids firing a
  // request for every one of the 2-4 events a single alt-tab produces).
  // Honesty check: any of these listeners can be trivially removed via
  // devtools, so their absence is not proof of anything — only the
  // *silence* of pings (judged server-side) is tamper-resistant.
  useEffect(() => {
    if (!exam?.submissionId || !testStarted) return;

    const submissionId = exam.submissionId;
    const DEBOUNCE_MS: Record<string, number> = {
      TAB_HIDDEN: 10_000,
      WINDOW_BLUR: 10_000,
      FULLSCREEN_EXIT: 5_000,
      COPY: 30_000,
      PASTE: 30_000,
    };
    const lastSentAt: Record<string, number> = {};

    const report = (type: keyof typeof DEBOUNCE_MS) => {
      const now = Date.now();
      if (now - (lastSentAt[type] ?? 0) < DEBOUNCE_MS[type]) return;
      lastSentAt[type] = now;
      apiClient
        .post(ENDPOINTS.EXAM_RUNTIME.VIOLATIONS(submissionId), { type })
        .catch(() => {
          // Best-effort — the server enforces its own debounce/budget too.
        });
    };

    const handleVisibility = () => {
      if (document.hidden) report("TAB_HIDDEN");
    };
    const handleBlur = () => report("WINDOW_BLUR");
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) report("FULLSCREEN_EXIT");
    };
    const handleCopy = () => report("COPY");
    const handlePaste = () => report("PASTE");

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("copy", handleCopy);
    document.addEventListener("paste", handlePaste);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener(
        "fullscreenchange",
        handleFullscreenChange,
      );
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("paste", handlePaste);
    };
  }, [exam?.submissionId, testStarted]);

  // Auto submit when timer runs out
  useEffect(() => {
    if (timeLeft === 0 && testStarted && timerInitialized.current) {
      handleSubmit();
    }
  }, [timeLeft, testStarted]);

  useEffect(() => {
    let cancelled = false;

    const fetchFiles = async () => {
      const currentQ = questions[currentQuestionIndex];
      if (!currentQ) {
        if (!cancelled) {
          setCurrentResolvedFiles([]);
          setCurrentImageUrl(null);
        }
        return;
      }

      const resolved: ResolvedQuestionFile[] = [];

      if (
        currentQ.files &&
        Array.isArray(currentQ.files) &&
        currentQ.files.length > 0
      ) {
        const sortedFiles = [...currentQ.files].sort(
          (a, b) => (a.order ?? 0) - (b.order ?? 0),
        );
        for (const file of sortedFiles) {
          let resolvedUrl = file.url;
          if (file.url && !file.url.startsWith("http")) {
            try {
              const url = await getViewUrl(file.url);
              if (url) resolvedUrl = url;
            } catch (e) {
              console.error("Error resolving file URL:", e);
            }
          }
          resolved.push({
            id: file.id || file.url,
            url: resolvedUrl,
            name: file.name || "File đính kèm",
            type: file.type || "IMAGE",
          });
        }
      }

      if (currentQ.image_url) {
        let imageUrl = currentQ.image_url;
        if (!imageUrl.startsWith("http")) {
          try {
            const url = await getViewUrl(imageUrl);
            if (url) imageUrl = url;
          } catch (e) {
            console.error("Error resolving legacy image URL:", e);
          }
        }
        if (cancelled) return;
        setCurrentImageUrl(imageUrl);
        if (!resolved.some((f) => f.url === imageUrl)) {
          resolved.unshift({
            id: "legacy-image",
            url: imageUrl,
            name: "Hình ảnh câu hỏi",
            type: "IMAGE",
          });
        }
      } else {
        if (cancelled) return;
        setCurrentImageUrl(null);
      }

      if (!cancelled) {
        setCurrentResolvedFiles(resolved);
      }
    };

    if (testStarted && questions.length > 0) {
      fetchFiles();
    }

    return () => {
      cancelled = true;
    };
  }, [currentQuestionIndex, questions, testStarted, getViewUrl]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const handleAnswer = (
    questionId: string,
    value: string,
    type: QuestionType = "SINGLE_CHOICE",
  ) => {
    setAnswers((prev) => {
      if (type === "MULTIPLE_CHOICE") {
        const currentAnswers = (prev[questionId] as string[]) || [];
        if (currentAnswers.includes(value)) {
          return {
            ...prev,
            [questionId]: currentAnswers.filter((v) => v !== value),
          };
        } else {
          return {
            ...prev,
            [questionId]: [...currentAnswers, value],
          };
        }
      }
      return {
        ...prev,
        [questionId]: value,
      };
    });
    // The displayed answer no longer matches what's on the server until re-submitted.
    setSubmittedQuestionIds((prev) => {
      if (!prev.has(questionId)) return prev;
      const next = new Set(prev);
      next.delete(questionId);
      return next;
    });
  };

  const handleSubmitQuestion = async (index: number = currentQuestionIndex) => {
    if (!exam?.submissionId) return;

    const question = questions[index];
    if (!question) return;

    const answer = answers[question.id];

    const payload: any = {
      submission_id: exam.submissionId,
      question_id: question.id,
    };

    if (
      question.question_type === "SINGLE_CHOICE" ||
      question.question_type === "MULTIPLE_CHOICE"
    ) {
      if (Array.isArray(question.options)) {
        payload.options = question.options.map((opt: any) => ({
          text: opt.text,
          isCorrect: Array.isArray(answer)
            ? answer.includes(String(opt.id))
            : answer === String(opt.id),
        }));
        payload.options = JSON.stringify(payload.options);
      }
    } else if (question.question_type === "ESSAY") {
      payload.answer = answer || "";
    }

    try {
      await apiClient.post(ENDPOINTS.SUBMISSIONS.SUBMIT_QUESTION, payload);
      toast.success(`Đã nộp câu ${index + 1}`);
      setSubmittedQuestionIds((prev) => new Set(prev).add(question.id));
    } catch (error) {
      toast.error("Gửi câu trả lời thất bại");
      console.error(error);
    }
  };

  const handleSubmit = async () => {
    if (!exam?.submissionId) return;

    const payload = {
      start_time: startTime || new Date(),
      end_time: new Date(),
      submission_id: exam.submissionId,
      question_length: questions.length,
    };

    try {
      await apiClient.post(ENDPOINTS.SUBMISSIONS.SUBMIT_EXAM, payload);
      toast.success("Nộp bài thành công!");
      dispatch(endTest());
      setIsSubmitted(true);
      // router.push("/home");
    } catch (error) {
      toast.error("Nộp bài thất bại");
      console.error(error);
    }
  };

  const handleStartTest = () => {
    setStartTime((current) => current ?? new Date());
    dispatch(startTest());
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!exam) {
    if (examClosed) {
      return (
        <div
          className="min-h-screen flex items-center justify-center p-4"
          style={{
            background: "linear-gradient(to bottom right, #f8d7da, #fef2f2)",
          }}
        >
          <Card className="w-full max-w-lg shadow-2xl border-0 bg-white/95 backdrop-blur text-center">
            <CardHeader className="pt-10 pb-4">
              <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-10 h-10 text-red-600" />
              </div>
              <CardTitle className="text-3xl font-bold text-gray-900">
                Bài thi đã đóng
              </CardTitle>
            </CardHeader>
            <CardContent className="px-8 pb-10 space-y-6">
              <div className="space-y-2 text-gray-600">
                <p className="text-lg">
                  Bài thi này hiện không còn mở để làm bài.
                </p>
                <p>
                  Vui lòng quay lại trang chủ để xem các bài thi khác hoặc liên
                  hệ giảng viên nếu bạn cho rằng đây là nhầm lẫn.
                </p>
              </div>

              <div className="pt-4">
                <Button
                  size="lg"
                  className="w-full bg-red-600 hover:bg-red-700 text-white shadow-lg hover:shadow-xl transition-all"
                  asChild
                >
                  <Link href="/home">Quay lại trang chủ</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">
            Không tìm thấy bài thi
          </h2>
          <Button className="mt-4" asChild>
            <Link href="/home">Quay lại trang chủ</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Completion View
  if (isSubmitted) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{
          background: "linear-gradient(to bottom right, #a8c5e6, #d4e4f7)",
        }}
      >
        <Card className="w-full max-w-lg shadow-2xl border-0 bg-white/95 backdrop-blur text-center">
          <CardHeader className="pt-10 pb-4">
            <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <CardTitle className="text-3xl font-bold text-gray-900">
              Nộp bài thành công!
            </CardTitle>
          </CardHeader>
          <CardContent className="px-8 pb-10 space-y-6">
            <div className="space-y-2 text-gray-600">
              <p className="text-lg">
                Bạn đã hoàn thành bài thi <strong>{exam.title}</strong>.
              </p>
              <p>
                Hệ thống đã ghi nhận kết quả của bạn. Vui lòng truy cập trang{" "}
                <Link
                  href={`/result/${examId}`}
                  className="font-semibold text-blue-600 hover:underline"
                >
                  Kết quả thi
                </Link>{" "}
                để xem điểm số chi tiết.
              </p>
            </div>

            <div className="pt-4">
              <Button
                size="lg"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all"
                asChild
              >
                <Link href="/home">Quay lại trang chủ</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Landing page view (when testStarted is false)
  if (!testStarted) {
    return (
      <div
        className="min-h-screen flex"
        style={{
          background: "linear-gradient(to bottom right, #a8c5e6, #d4e4f7)",
        }}
      >
        <div className="flex-1 flex flex-col">
          <main className="flex-1 px-8 pb-8 flex items-center justify-center">
            <Card className="w-full max-w-4xl shadow-2xl border-0 bg-white/95 backdrop-blur">
              <CardHeader className="p-8">
                <div className="flex justify-between items-start">
                  <div>
                    <Badge
                      className={`border-0 mb-4 text-white ${
                        exam.practice ? "bg-purple-500" : "bg-blue-500"
                      }`}
                    >
                      {exam.practice ? "Luyện tập" : "Bài thi chính thức"}
                    </Badge>
                    <CardTitle className="text-3xl font-bold mb-4">
                      {exam.title}
                    </CardTitle>
                    <p className="text-lg opacity-90">
                      <span className="font-semibold">Chủ đề:</span>{" "}
                      {typeof exam.topic === "string"
                        ? exam.topic
                        : ((exam.topic as any)?.name ?? "N/A")}
                    </p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="px-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="flex items-center gap-4 p-4 rounded-lg bg-blue-50 border border-blue-100">
                    <div className="p-3 bg-blue-100 rounded-full text-blue-600">
                      <Clock className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Thời gian làm bài</p>
                      <p className="font-semibold text-gray-900">
                        {exam.duration} phút
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 rounded-lg bg-green-50 border border-green-100">
                    <div className="p-3 bg-green-100 rounded-full text-green-600">
                      <Calendar className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Thời gian bắt đầu</p>
                      <p className="font-semibold text-gray-900">
                        {new Date(exam.exam_start_time).toLocaleDateString(
                          "vi-VN",
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 rounded-lg bg-purple-50 border border-purple-100">
                    <div className="p-3 bg-purple-100 rounded-full text-purple-600">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Số lượng câu hỏi</p>
                      <p className="font-semibold text-gray-900">
                        {exam.questions?.length || 0} câu
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-blue-600" />
                    Nội quy phòng thi
                  </h3>
                  <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 space-y-3">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <p className="text-gray-700">
                        <span className="font-semibold">Lưu ý:</span> Bài thi
                        chính thức chỉ cho phép thực hiện một lần duy nhất. Bài
                        luyện tập có thể thực hiện nhiều lần
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <p className="text-gray-700">
                        Không được phép sử dụng tài liệu trái phép trong quá
                        trình làm bài.
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <p className="text-gray-700">
                        Hệ thống sẽ tự động nộp bài khi hết thời gian làm bài.
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <p className="text-gray-700">
                        Đảm bảo kết nối internet ổn định trong suốt quá trình
                        thi.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-4 pt-4">
                  {exam.practice && (
                    <Button
                      variant="outline"
                      size="lg"
                      className="gap-2 border-blue-200 text-blue-700 hover:bg-blue-50 hover:cursor-pointer"
                      onClick={handlePrint}
                      disabled={isPrinting}
                    >
                      {isPrinting ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700"></div>
                      ) : (
                        <Printer className="w-5 h-5" />
                      )}
                      {isPrinting ? "Đang tạo bản in..." : "In đề thi"}
                    </Button>
                  )}
                  <Button variant="outline" size="lg" className="px-8" asChild>
                    <Link href="/home">Quay lại</Link>
                  </Button>
                  <Button
                    size="lg"
                    className="px-12 bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl hover:cursor-pointer transition-all"
                    onClick={handleStartTest}
                  >
                    Làm bài ngay
                  </Button>
                </div>
              </CardContent>
            </Card>
          </main>
        </div>

        {/* Hidden Printable Content Removed (Now using Backend) */}
      </div>
    );
  }

  // Exam interface view (when testStarted is true)
  const currentQuestion = questions[currentQuestionIndex];

  if (!currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 h-16 px-4 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => {
              dispatch(endTest());
              router.push("/home");
            }}
            className="text-gray-500 hover:text-gray-700 gap-2"
            title="Trở về trang chủ"
            hidden={exam.practice === false}
          >
            <ChevronLeft className="w-5 h-5" />
            Quay lại trang chủ
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="lg:hidden"
          >
            <Menu className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-bold text-gray-800 truncate max-w-[200px] md:max-w-md">
            {exam.title}
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-full border border-blue-100">
            <Clock className="w-5 h-5 text-blue-600" />
            <span className="font-mono font-bold text-blue-700 text-lg">
              {formatTime(timeLeft)}
            </span>
          </div>
          <Button
            onClick={handleSubmit}
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-all"
          >
            Nộp bài
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Question Navigation Sidebar */}
        <aside
          className={`${
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          } lg:translate-x-0 fixed lg:relative z-40 w-72 h-[calc(100vh-64px)] bg-white border-r border-gray-200 transition-transform duration-300 ease-in-out flex flex-col shadow-lg lg:shadow-none`}
        >
          <div className="p-4 border-b border-gray-100 bg-gray-50">
            <h3 className="font-semibold text-gray-700">Danh sách câu hỏi</h3>
            <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-white border border-gray-300 rounded-sm"></div>
                <span>Chưa làm</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-amber-400 rounded-sm"></div>
                <span>Đã chọn, chưa nộp</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-600 rounded-sm"></div>
                <span>Đã nộp</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-blue-100 border border-blue-400 rounded-sm"></div>
                <span>Đang xem</span>
              </div>
            </div>
          </div>

          <ScrollArea className="flex-1 p-4">
            <div className="grid grid-cols-5 gap-2">
              {questions.map((q, index) => {
                const isCurrent = index === currentQuestionIndex;
                const isQuestionSubmitted = submittedQuestionIds.has(q.id);
                const answerValue = answers[q.id];
                const hasLocalAnswer =
                  answerValue !== undefined &&
                  answerValue !== "" &&
                  !(Array.isArray(answerValue) && answerValue.length === 0);
                const isAnsweredLocally = !isQuestionSubmitted && hasLocalAnswer;

                let bgClass =
                  "bg-white hover:bg-gray-50 border-gray-300 text-gray-700";
                if (isCurrent) {
                  bgClass =
                    "bg-blue-100 border-blue-500 text-blue-700 font-bold ring-1 ring-blue-500";
                } else if (isQuestionSubmitted) {
                  bgClass =
                    "bg-green-600 border-green-600 text-white hover:bg-green-700";
                } else if (isAnsweredLocally) {
                  bgClass =
                    "bg-amber-400 border-amber-400 text-white hover:bg-amber-500";
                }

                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentQuestionIndex(index)}
                    className={`h-10 w-10 rounded-md border flex items-center justify-center text-sm transition-all ${bgClass}`}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-gray-50/50">
          <div className="max-w-3xl mx-auto space-y-6">
            <Card className="border-0 shadow-md bg-white">
              <CardContent className="p-6 md:p-8">
                <div className="mb-4 flex justify-between items-start">
                  <h2 className="text-xl font-bold text-gray-800">
                    Câu hỏi {currentQuestionIndex + 1}
                  </h2>
                </div>

                <div className="prose max-w-none mb-4">
                  <div className="text-lg text-gray-800 leading-relaxed mb-4">
                    <MathRenderer
                      content={currentQuestion?.question_text || ""}
                    />
                  </div>
                  {/* Question Files (IMAGE, VIDEO, AUDIO, DOCUMENT) */}
                  {currentResolvedFiles.length > 0 && (
                    <div className="mb-4 space-y-4 not-prose">
                      {/* IMAGE Files */}
                      {currentResolvedFiles.some((f) => f.type === "IMAGE") && (
                        <div className="flex flex-wrap justify-center gap-4">
                          {currentResolvedFiles
                            .filter((f) => f.type === "IMAGE")
                            .map((file) => (
                              <div
                                key={file.id}
                                className="relative max-w-full"
                              >
                                <img
                                  src={file.url}
                                  alt={file.name || "Question Image"}
                                  className="max-h-96 w-auto object-contain rounded-lg shadow-sm border border-gray-200"
                                />
                              </div>
                            ))}
                        </div>
                      )}

                      {/* VIDEO Files */}
                      {currentResolvedFiles.some((f) => f.type === "VIDEO") && (
                        <div className="space-y-3">
                          {currentResolvedFiles
                            .filter((f) => f.type === "VIDEO")
                            .map((file) => (
                              <div
                                key={file.id}
                                className="rounded-lg overflow-hidden border border-gray-200 bg-black shadow-sm"
                              >
                                <div className="px-3 py-1.5 bg-gray-900 text-gray-200 text-xs font-medium flex items-center gap-2">
                                  <Video className="w-4 h-4 text-blue-400" />
                                  <span className="truncate">{file.name}</span>
                                </div>
                                <video
                                  controls
                                  className="w-full max-h-96"
                                  preload="metadata"
                                >
                                  <source src={file.url} />
                                  Trình duyệt của bạn không hỗ trợ thẻ video.
                                </video>
                              </div>
                            ))}
                        </div>
                      )}

                      {/* AUDIO Files */}
                      {currentResolvedFiles.some((f) => f.type === "AUDIO") && (
                        <div className="space-y-3">
                          {currentResolvedFiles
                            .filter((f) => f.type === "AUDIO")
                            .map((file) => (
                              <div
                                key={file.id}
                                className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex flex-col gap-2"
                              >
                                <div className="flex items-center gap-2 text-sm font-medium text-blue-900">
                                  <Volume2 className="w-4 h-4 text-blue-600" />
                                  <span className="truncate">
                                    {file.name || "File âm thanh"}
                                  </span>
                                </div>
                                <audio controls className="w-full">
                                  <source src={file.url} />
                                  Trình duyệt của bạn không hỗ trợ thẻ audio.
                                </audio>
                              </div>
                            ))}
                        </div>
                      )}

                      {/* DOCUMENT / OTHER Files */}
                      {currentResolvedFiles.some(
                        (f) =>
                          f.type !== "IMAGE" &&
                          f.type !== "VIDEO" &&
                          f.type !== "AUDIO",
                      ) && (
                        <div className="space-y-2">
                          {currentResolvedFiles
                            .filter(
                              (f) =>
                                f.type !== "IMAGE" &&
                                f.type !== "VIDEO" &&
                                f.type !== "AUDIO",
                            )
                            .map((file) => (
                              <div
                                key={file.id}
                                className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm"
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
                                  <a
                                    href={file.url}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    <ExternalLink className="w-4 h-4" /> Xem /
                                    Tải về
                                  </a>
                                </Button>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {currentQuestion.question_type === "SINGLE_CHOICE" && (
                  <RadioGroup
                    value={(answers[currentQuestion.id] as string) || ""}
                    onValueChange={(value) =>
                      handleAnswer(currentQuestion.id, value)
                    }
                    className="space-y-4"
                  >
                    {currentQuestion.options.map((option: any) => (
                      <div
                        key={option.id}
                        className={`flex items-center space-x-3 p-4 rounded-lg border transition-all cursor-pointer ${
                          answers[currentQuestion.id] === String(option.id)
                            ? "bg-blue-50 border-blue-500 ring-1 ring-blue-500"
                            : "bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                        }`}
                        onClick={() =>
                          handleAnswer(currentQuestion.id, String(option.id))
                        }
                      >
                        <RadioGroupItem
                          value={String(option.id)}
                          id={String(option.id)}
                          className="text-blue-600"
                        />
                        <Label
                          htmlFor={String(option.id)}
                          className="flex-1 cursor-pointer font-medium text-gray-700"
                        >
                          <MathRenderer content={option.text} />
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}

                {currentQuestion.question_type === "MULTIPLE_CHOICE" && (
                  <div className="space-y-4">
                    {currentQuestion.options.map((option: any) => (
                      <div
                        key={option.id}
                        className={`flex items-center space-x-3 p-4 rounded-lg border transition-all cursor-pointer ${
                          (answers[currentQuestion.id] as string[])?.includes(
                            String(option.id),
                          )
                            ? "bg-blue-50 border-blue-500 ring-1 ring-blue-500"
                            : "bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                        }`}
                        onClick={() =>
                          handleAnswer(
                            currentQuestion.id,
                            String(option.id),
                            "MULTIPLE_CHOICE",
                          )
                        }
                      >
                        <Checkbox
                          checked={(
                            (answers[currentQuestion.id] as string[]) || []
                          ).includes(String(option.id))}
                          onCheckedChange={() =>
                            handleAnswer(
                              currentQuestion.id,
                              String(option.id),
                              "MULTIPLE_CHOICE",
                            )
                          }
                          id={String(option.id)}
                          className="text-blue-600"
                        />
                        <Label
                          htmlFor={String(option.id)}
                          className="flex-1 cursor-pointer font-medium text-gray-700"
                        >
                          <MathRenderer content={option.text} />
                        </Label>
                      </div>
                    ))}
                  </div>
                )}

                {currentQuestion.question_type === "ESSAY" && (
                  <div className="space-y-4">
                    <Textarea
                      placeholder="Nhập câu trả lời của bạn..."
                      value={(answers[currentQuestion.id] as string) || ""}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        handleAnswer(
                          currentQuestion.id,
                          e.target.value,
                          "ESSAY",
                        )
                      }
                      className="min-h-[200px] p-4 bg-white border-gray-300 text-base"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-between items-center pt-4">
              <Button
                variant="outline"
                onClick={() =>
                  setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))
                }
                disabled={currentQuestionIndex === 0}
                className="w-32 hover:cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Câu trước
              </Button>

              <Button
                onClick={() => {
                  handleSubmitQuestion();
                }}
                className="w-36 bg-blue-600 hover:bg-blue-700 text-white hover:cursor-pointer"
              >
                Nộp câu này
              </Button>

              <Button
                onClick={() => {
                  if (currentQuestionIndex < questions.length - 1) {
                    setCurrentQuestionIndex((prev) => prev + 1);
                  }
                }}
                variant="outline"
                className="w-32 hover:cursor-pointer"
                disabled={currentQuestionIndex === questions.length - 1}
              >
                Câu sau
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
