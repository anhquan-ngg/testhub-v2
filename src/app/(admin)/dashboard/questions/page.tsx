"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useFindManyQuestion } from "../../../../../generated/hooks";
import { MathRenderer } from "@/components/MathRenderer";
import { QuestionFormatMap, QuestionTypeMap } from "@/lib/constansts";

export default function QuestionsPage() {
  const [questions, setQuestions] = useState([] as any[]);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: questionData } = useFindManyQuestion();

  useEffect(() => {
    if (questionData) {
      setQuestions(questionData);
    }
  }, [questionData]);

  return (
    <Card className="bg-white border-gray-300">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Ngân hàng câu hỏi</CardTitle>
            <CardDescription>
              Quản lý tất cả câu hỏi cho các bài kiểm tra
            </CardDescription>
          </div>
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
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="w-full">
          <Table className="w-full table-fixed">
            <TableHeader>
              <TableRow className="border-gray-300">
                <TableHead className="w-[30%]">Câu hỏi</TableHead>
                <TableHead className="w-[15%]">Chủ đề</TableHead>
                <TableHead className="w-[15%]">Loại</TableHead>
                <TableHead className="w-[10%]">Định dạng</TableHead>
                <TableHead className="w-[20%]">Đáp án</TableHead>
                <TableHead className="text-right w-[10%]">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {questions
                .filter((q: any) =>
                  q.question_text
                    .toLowerCase()
                    .includes(searchTerm.toLowerCase())
                )
                .map((question: any) => (
                  <TableRow key={question.id} className="border-gray-300">
                    <TableCell>
                      <div className="line-clamp-2 break-words overflow-hidden">
                        <MathRenderer content={question.question_text} />
                      </div>
                    </TableCell>
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
                        {QuestionTypeMap[
                          question.question_type as keyof typeof QuestionTypeMap
                        ] || question.question_type}
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
                        {QuestionFormatMap[
                          question.question_format as keyof typeof QuestionFormatMap
                        ] || question.question_format}
                      </Badge>
                    </TableCell>
                    <TableCell>
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
                              .filter((option: any) => option.isCorrect)
                              .map((option: any) => option.text)
                              .join(", ")}
                          />
                        ) : (
                          ""
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
