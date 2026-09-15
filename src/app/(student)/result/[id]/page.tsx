"use client";

import apiClient from "@/lib/api-client";
import { ENDPOINTS } from "@/constants/endpoints";
import { useRouter } from "next/navigation";
import { use, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Clock,
  CheckCircle,
  ExternalLink,
  XCircle,
  FileText,
  Printer,
  Video,
  Volume2,
} from "lucide-react";
import StudentSideBar from "@/components/common/student/sidebar";
import StudentMenu from "@/components/common/student/menu";
import { MathRenderer } from "@/components/MathRenderer";
import { useAppSelector } from "@/store/hook";
import {
  calculateScorePerQuestion,
  calculateTotalQuesions,
  parseOptions,
} from "@/lib/exam-utils";
import { toast } from "sonner";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

type SubmissionQuestionOption = {
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

type ResultSubmission = {
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
  } | null;
  questions?: ResultSubmissionQuestion[];
};

// Helper function to calculate time taken
function calculateTimeTaken(
  startTime: string | Date | null,
  endTime: string | Date | null,
): string {
  if (!startTime || !endTime) return "N/A";
  const start = new Date(startTime);
  const end = new Date(endTime);
  const diffMs = end.getTime() - start.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMins / 60);
  const minutes = diffMins % 60;
  if (hours > 0) {
    return `${hours} giờ ${minutes} phút`;
  }
  return `${minutes} phút`;
}

function renderQuestionFiles(files?: ResultSubmissionQuestionFile[]) {
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

      {resolvedFiles.some((file) => file.type === "VIDEO") && (
        <div className="w-full max-w-2xl space-y-3">
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
                  Trình duyệt của bạn không hỗ trợ thẻ video.
                </video>
              </div>
            ))}
        </div>
      )}

      {resolvedFiles.some((file) => file.type === "AUDIO") && (
        <div className="w-full max-w-2xl space-y-3">
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
                    <ExternalLink className="w-4 h-4" /> Xem / Tải về
                  </a>
                </Button>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

export default function ResultDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const router = useRouter();
  const [isPrinting, setIsPrinting] = useState(false);

  const user = useAppSelector((state) => state.user);
  const userId = user.id;
  const userRole = user.role;
  const [submission, setSubmission] = useState<ResultSubmission | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    const fetchSubmission = async () => {
      if (!id) return;

      setIsLoading(true);
      setError(null);
      try {
        const response = await apiClient.get<ResultSubmission>(
          ENDPOINTS.SUBMISSIONS.DETAIL(id),
        );
        setSubmission(response.data);
      } catch (err) {
        console.error("Fetch submission error:", err);
        setError(err);
        setSubmission(null);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchSubmission();
  }, [id]);

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
      toast.error("Có lỗi xảy ra khi tạo bản in. Vui lòng thử lại sau.");
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
          <main className="flex-1 p-8">
            <div className="max-w-4xl mx-auto">
              <Card className="p-8 text-center">
                <p className="text-red-600 text-lg">
                  Bạn không có quyền xem bài nộp này.
                </p>
                <Button onClick={() => router.push("/result")} className="mt-4">
                  Quay lại danh sách
                </Button>
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
          <main className="flex-1 p-8">
            <div className="max-w-4xl mx-auto">
              <Card className="p-8 text-center">
                <p className="text-gray-600">Đang tải...</p>
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
          <main className="flex-1 p-8">
            <div className="max-w-4xl mx-auto">
              <Card className="p-8 text-center">
                <p className="text-red-600 text-lg">
                  Không tìm thấy bài nộp này.
                </p>
                <Button onClick={() => router.push("/result")} className="mt-4">
                  Quay lại danh sách
                </Button>
              </Card>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const isPractice = submission.exam.practice;
  const timeTaken = calculateTimeTaken(
    submission.start_time,
    submission.end_time,
  );

  return (
    <div className="flex min-h-screen bg-neutral-100">
      <StudentSideBar />
      <div className="flex-1 flex flex-col">
        <StudentMenu />
        <main className="flex-1 p-8">
          <div className="mx-auto space-y-6">
            {/* Back Button */}
            <div className="flex items-center justify-between no-print">
              <Button
                onClick={() => router.back()}
                variant="outline"
                className="flex items-center gap-2 bg-white border-gray-300 hover:cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                Quay lại
              </Button>
              <Button
                onClick={handlePrint}
                disabled={isPrinting}
                variant="outline"
                className="flex items-center gap-2 bg-white border-gray-300 hover:cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                {isPrinting ? "Đang chuẩn bị bản in..." : "In bài thi"}
              </Button>
            </div>

            {/* Header Card */}
            <Card className="shadow-lg bg-white border border-gray-300">
              <CardHeader className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <FileText className="w-6 h-6 text-blue-600" />
                      <h1 className="text-2xl font-bold text-gray-900">
                        {submission.exam.title}
                      </h1>
                      <Badge
                        variant="default"
                        className="bg-purple-50 text-purple-600 border-purple-200"
                      >
                        {isPractice ? "Luyện tập" : "Chính thức"}
                      </Badge>
                    </div>
                    <p className="text-gray-600 ml-9">
                      Chủ đề: {submission.exam.topic?.name ?? "N/A"}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2 text-3xl font-bold text-blue-600">
                      {submission.total_score !== null
                        ? Number(submission.total_score).toFixed(2)
                        : "0.00"}
                      <span className="text-lg text-gray-600">điểm</span>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl border border-blue-200">
                    <Clock className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="text-sm text-gray-600">Thời gian làm bài</p>
                      <p className="font-semibold text-gray-900">{timeTaken}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl border border-green-200">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="text-sm text-gray-600">Trạng thái</p>
                      <p className="font-semibold text-gray-900">
                        {submission.status === "COMPLETED"
                          ? "Hoàn thành"
                          : submission.status || "N/A"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-xl border border-purple-200">
                    <FileText className="w-5 h-5 text-purple-600" />
                    <div>
                      <p className="text-sm text-gray-600">Số câu hỏi</p>
                      <p className="font-semibold text-gray-900">
                        {calculateTotalQuesions(submission)}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Questions List - Always show for lecturer/admin or if it's a practice exam */}
            {(isPractice || isLecturer || isAdmin) &&
              submission.questions &&
              submission.questions.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-gray-900">
                    Chi tiết câu trả lời
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
                        className={`border-2 ${
                          sq.is_correct
                            ? "border-green-200 bg-green-100/70"
                            : "border-red-200 bg-red-100/70"
                        }`}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-bold text-gray-900">
                                  Câu {index + 1}:
                                </span>
                                {sq.is_correct ? (
                                  <Badge className="bg-green-500 text-white">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Đúng
                                  </Badge>
                                ) : (
                                  <Badge className="bg-red-500 text-white">
                                    <XCircle className="w-3 h-3 mr-1" />
                                    Sai
                                  </Badge>
                                )}
                              </div>
                              <div className="text-gray-800 leading-relaxed">
                                <MathRenderer
                                  content={sq.question.question_text}
                                />
                              </div>
                              {renderQuestionFiles(sq.question.files)}
                            </div>
                            <Badge
                              variant="outline"
                              className="font-semibold border-gray-300 text-gray-900 bg-white"
                            >
                              {(
                                calculateScorePerQuestion(submission) *
                                Number(sq.score ?? 0)
                              ).toFixed(2)}{" "}
                              điểm
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          {sq.question.question_type === "ESSAY" ? (
                            <div className="space-y-3">
                              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                                <p className="text-sm font-semibold text-blue-900 mb-1">
                                  Câu trả lời của bạn:
                                </p>
                                <p className="text-gray-700">
                                  {sq.answer || "Không có câu trả lời"}
                                </p>
                              </div>
                              {sq.question.correct_answer && (
                                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                                  <p className="text-sm font-semibold text-green-900 mb-1">
                                    Câu trả lời mẫu:
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
                                    bgClass = "bg-green-100 border-green-500";
                                    textClass = "text-green-900 font-semibold";
                                    iconElement = (
                                      <CheckCircle className="w-5 h-5 text-green-600" />
                                    );
                                  } else if (isStudentChoice && !isCorrect) {
                                    bgClass = "bg-red-100 border-red-500";
                                    textClass = "text-red-900 font-semibold";
                                    iconElement = (
                                      <XCircle className="w-5 h-5 text-red-600" />
                                    );
                                  } else if (!isStudentChoice && isCorrect) {
                                    bgClass = "bg-green-50 border-green-300";
                                    textClass = "text-green-800";
                                    iconElement = (
                                      <CheckCircle className="w-5 h-5 text-green-500" />
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
                                      <div className={`flex-1 ${textClass}`}>
                                        <MathRenderer content={option.text} />
                                      </div>
                                      {isStudentChoice && (
                                        <Badge
                                          variant="outline"
                                          className="text-xs font-bold border-gray-300 text-gray-900 bg-white px-3 py-1 rounded-full whitespace-nowrap"
                                        >
                                          Bạn chọn
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
                <p className="text-gray-600">
                  Không có câu hỏi nào trong bài nộp này.
                </p>
              </Card>
            )}
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
