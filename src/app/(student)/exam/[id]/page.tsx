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
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useFindUniqueExam } from "../../../../../generated/hooks";
import { QuestionType } from "@prisma/client";
import { MathRenderer } from "@/components/MathRenderer";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/store";
import { startTest, endTest } from "@/store/slices/examSlice";
import { useAppSelector } from "@/store/hook";
import { toast } from "sonner";
import axiosClient from "@/lib/axios";
import { ExamData } from "@/types/exam";

interface Question {
  id: string;
  question_text: string;
  image_url: string;
  options: any[];
  question_type: QuestionType;
}

export default function ExamPage() {
  const params = useParams();
  const router = useRouter();
  const dispatch = useDispatch();
  const userId = useAppSelector((state) => state.user.id);
  const examId = params.id as string;

  const testStarted = useSelector((state: RootState) => state.exam.testStarted);
  const [exam, setExam] = useState<ExamData | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const timerInitialized = useRef(false);

  // const { data: exam, isLoading } = useFindUniqueExam({
  //   where: {
  //     id: examId,
  //   },
  //   include: {
  //     questions: {
  //       select: {
  //         question: {
  //           select: {
  //             id: true,
  //             question_text: true,
  //             image_url: true,
  //             options: true,
  //             question_type: true,
  //           },
  //         },
  //       },
  //     },
  //   },
  // });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const response = await axiosClient.post("/submission/start-exam", {
        examId: examId,
        studentId: userId,
      });

      if (response.status === 200) {
        console.log(response.data);
        setExam(response.data.data);
      }
    } catch (error) {
      toast.error("Lỗi khi tải dữ liệu bài thi");
      console.log(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchData();
    }
  }, [examId, userId]);

  useEffect(() => {
    if (exam && testStarted) {
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
                  id: index + 1,
                })
              );
            }
          } catch (error) {
            console.error("Failed to parse options:", error);
          }
        }
        return clonedQuestion;
      });

      const randomizedQuestions = questionsWithParsedOptions.sort(
        () => Math.random() - 0.5
      );
      setQuestions(randomizedQuestions as any[]);
      setTimeLeft(exam.duration * 60);
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

  // Auto submit when timer runs out
  useEffect(() => {
    if (timeLeft === 0 && testStarted && timerInitialized.current) {
      handleSubmit();
    }
  }, [timeLeft, testStarted]);

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
    type: QuestionType = "SINGLE_CHOICE"
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
  };

  const handleSubmit = () => {
    alert("Nộp bài thành công! (Chức năng đang phát triển)");
    dispatch(endTest());
    router.push("/home");
  };

  const handleStartTest = () => {
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
                      {exam.topic}
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
                          "vi-VN"
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
                  <Button variant="outline" size="lg" className="px-8" asChild>
                    <Link href="/home">Quay lại</Link>
                  </Button>
                  <Button
                    size="lg"
                    className="px-12 bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all"
                    onClick={handleStartTest}
                  >
                    Làm bài ngay
                  </Button>
                </div>
              </CardContent>
            </Card>
          </main>
        </div>
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
            <div className="flex gap-4 mt-2 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-white border border-gray-300 rounded-sm"></div>
                <span>Chưa làm</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-600 rounded-sm"></div>
                <span>Đã làm</span>
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
                const isAnswered = !!answers[q.id];
                const isCurrent = index === currentQuestionIndex;

                let bgClass =
                  "bg-white hover:bg-gray-50 border-gray-300 text-gray-700";
                if (isCurrent) {
                  bgClass =
                    "bg-blue-100 border-blue-500 text-blue-700 font-bold ring-1 ring-blue-500";
                } else if (isAnswered) {
                  bgClass =
                    "bg-green-600 border-green-600 text-white hover:bg-green-700";
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
                <div className="mb-6 flex justify-between items-start">
                  <h2 className="text-xl font-bold text-gray-800">
                    Câu hỏi {currentQuestionIndex + 1}
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-500 hover:text-yellow-600"
                  >
                    <Flag className="w-4 h-4 mr-1" />
                    Báo lỗi
                  </Button>
                </div>

                <div className="prose max-w-none mb-8">
                  <div className="text-lg text-gray-800 leading-relaxed">
                    <MathRenderer
                      content={currentQuestion?.question_text || ""}
                    />
                  </div>
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
                          answers[currentQuestion.id] === option.id
                            ? "bg-blue-50 border-blue-500 ring-1 ring-blue-500"
                            : "bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                        }`}
                        onClick={() =>
                          handleAnswer(currentQuestion.id, option.id)
                        }
                      >
                        <RadioGroupItem
                          value={option.id}
                          id={option.id}
                          className="text-blue-600"
                        />
                        <Label
                          htmlFor={option.id}
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
                            option.id
                          )
                            ? "bg-blue-50 border-blue-500 ring-1 ring-blue-500"
                            : "bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                        }`}
                        onClick={() =>
                          handleAnswer(
                            currentQuestion.id,
                            option.id,
                            "MULTIPLE_CHOICE"
                          )
                        }
                      >
                        <Checkbox
                          checked={(
                            (answers[currentQuestion.id] as string[]) || []
                          ).includes(option.id)}
                          onCheckedChange={() =>
                            handleAnswer(
                              currentQuestion.id,
                              option.id,
                              "MULTIPLE_CHOICE"
                            )
                          }
                          id={option.id}
                          className="text-blue-600"
                        />
                        <Label
                          htmlFor={option.id}
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
                          "ESSAY"
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
                className="w-32"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Câu trước
              </Button>

              <Button
                onClick={() => {
                  if (currentQuestionIndex < questions.length - 1) {
                    setCurrentQuestionIndex((prev) => prev + 1);
                  } else {
                    handleSubmit();
                  }
                }}
                className="w-32 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {currentQuestionIndex === questions.length - 1 ? (
                  "Nộp bài"
                ) : (
                  <>
                    Câu sau
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
