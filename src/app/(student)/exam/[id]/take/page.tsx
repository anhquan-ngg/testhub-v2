"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, ChevronLeft, ChevronRight, Flag, Menu } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useFindUniqueExam } from "../../../../../../generated/hooks";

// Mock questions data (since we might not have a hook for questions yet)
const MOCK_QUESTIONS = Array.from({ length: 20 }, (_, i) => ({
  id: `q${i + 1}`,
  text: `Câu hỏi số ${
    i + 1
  }: Đây là nội dung câu hỏi mẫu để kiểm tra giao diện. Bạn hãy chọn đáp án đúng nhất trong các phương án dưới đây?`,
  options: [
    { id: "A", text: "Phương án A: Đây là một câu trả lời mẫu." },
    { id: "B", text: "Phương án B: Đây là một câu trả lời mẫu khác." },
    { id: "C", text: "Phương án C: Đây cũng là một câu trả lời mẫu." },
    { id: "D", text: "Phương án D: Tất cả các phương án trên đều đúng." },
  ],
}));

export default function ExamTakePage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.id as string;
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(0); // in seconds
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const { data: exam, isLoading } = useFindUniqueExam({
    where: {
      id: examId,
    },
  });

  useEffect(() => {
    if (exam) {
      setTimeLeft(exam.duration * 60);
    }
  }, [exam]);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0 && exam) {
      // Auto submit when time is up
      // handleSubmit();
    }
  }, [timeLeft, exam]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const handleAnswer = (questionId: string, optionId: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: optionId,
    }));
  };

  const handleSubmit = () => {
    // Implement submit logic here
    alert("Nộp bài thành công! (Chức năng đang phát triển)");
    router.push("/home");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!exam) {
    return <div>Exam not found</div>;
  }

  const currentQuestion = MOCK_QUESTIONS[currentQuestionIndex];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 h-16 px-4 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-4">
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
              {MOCK_QUESTIONS.map((q, index) => {
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
                  <p className="text-lg text-gray-800 leading-relaxed">
                    {currentQuestion.text}
                  </p>
                </div>

                <RadioGroup
                  value={answers[currentQuestion.id] || ""}
                  onValueChange={(value) =>
                    handleAnswer(currentQuestion.id, value)
                  }
                  className="space-y-4"
                >
                  {currentQuestion.options.map((option) => (
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
                        {option.text}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
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
                  if (currentQuestionIndex < MOCK_QUESTIONS.length - 1) {
                    setCurrentQuestionIndex((prev) => prev + 1);
                  } else {
                    handleSubmit();
                  }
                }}
                className="w-32 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {currentQuestionIndex === MOCK_QUESTIONS.length - 1 ? (
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
