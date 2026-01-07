"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { useFindManyQuestion } from "../../../../../generated/hooks";
import { Badge } from "@/components/ui/badge";
import { IQuestion, QuestionOption } from "@/types/question";
import { QuestionTypeMap, QuestionFormatMap } from "@/lib/constansts";
import { MathRenderer } from "@/components/MathRenderer";

export default function QuestionsPage() {
  const [questions, setQuestions] = useState([] as any);
  const [searchTerm, setSearchTerm] = useState("");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const { data: questionsData } = useFindManyQuestion({
    include: {
      lecturer: {
        select: {
          full_name: true,
        },
      },
    },
    orderBy: { created_at: "desc" },
  });

  useEffect(() => {
    if (questionsData) {
      setQuestions(questionsData);
    }
  }, [questionsData]);

  const filteredQuestions =
    questions?.filter((q: any) =>
      q.question_text.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

  const totalPages = Math.ceil(filteredQuestions.length / ITEMS_PER_PAGE);
  const paginatedQuestions = filteredQuestions.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="space-y-6 w-full max-w-full overflow-hidden">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-900">Ngân hàng câu hỏi</h2>
      </div>

      <Card className="bg-white border-gray-300">
        <CardHeader>
          <div>
            <CardTitle>Ngân hàng câu hỏi</CardTitle>
            <CardDescription>
              Xem danh sách câu hỏi trong hệ thống
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm câu hỏi..."
                className="pl-10 bg-white border-gray-300"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>

          <div className="w-full">
            <Table className="w-full table-fixed">
              <TableHeader>
                <TableRow className="border-gray-300">
                  <TableHead className="w-[30%]">Câu hỏi</TableHead>
                  <TableHead className="w-[10%]">Người tạo</TableHead>
                  <TableHead className="w-[10%]">Chủ đề</TableHead>
                  <TableHead className="w-[15%]">Loại</TableHead>
                  <TableHead className="w-[15%]">Định dạng</TableHead>
                  <TableHead className="w-[20%]">Đáp án</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedQuestions.map((question: IQuestion) => (
                  <TableRow key={question.id} className="border-gray-300">
                    <TableCell className="whitespace-normal">
                      <div className="line-clamp-2 break-words overflow-hidden">
                        <MathRenderer content={question.question_text} />
                      </div>
                    </TableCell>
                    <TableCell>{question.lecturer.full_name}</TableCell>
                    <TableCell>{question.topic}</TableCell>
                    <TableCell>
                      <Badge
                        className={`px-2 py-1 text-white rounded-lg ${
                          question.question_type === "SINGLE_CHOICE"
                            ? "text-red-500 bg-red-100"
                            : question.question_type === "MULTIPLE_CHOICE"
                            ? "text-green-500 bg-green-100"
                            : "text-blue-500 bg-blue-100"
                        }`}
                      >
                        {QuestionTypeMap[question.question_type]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`px-2 py-1 text-white rounded-lg ${
                          question.question_format === "ADVANCED"
                            ? "text-red-500 bg-red-100"
                            : question.question_format === "APPLYING"
                            ? "text-orange-500 bg-orange-100"
                            : question.question_format === "UNDERSTANDING"
                            ? "text-green-500 bg-green-100"
                            : "text-blue-500 bg-blue-100"
                        }`}
                      >
                        {QuestionFormatMap[question.question_format]}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-normal">
                      <div className="line-clamp-2 break-words overflow-hidden">
                        {question.question_type === "ESSAY" ? (
                          <MathRenderer
                            content={question.correct_answer || ""}
                          />
                        ) : question.options ? (
                          <MathRenderer
                            content={JSON.parse(
                              question.options as unknown as string
                            )
                              .filter(
                                (option: QuestionOption) => option.isCorrect
                              )
                              .map((option: QuestionOption) => option.text)
                              .join(", ")}
                          />
                        ) : (
                          ""
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {totalPages > 0 && (
            <div className="flex items-center justify-end space-x-2 py-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                className="bg-[#0066cc] hover:bg-[#0052a3] border-none text-white hover:cursor-pointer"
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Trước
              </Button>
              <div className="text-sm font-medium">
                Trang {currentPage} / {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                }
                className="bg-[#0066cc] hover:bg-[#0052a3] border-none text-white hover:cursor-pointer"
                disabled={currentPage === totalPages}
              >
                Sau
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
