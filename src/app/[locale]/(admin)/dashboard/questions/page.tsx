"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { IQuestion, QuestionOption } from "@/types/question";
import { useEnumLabels } from "@/i18n/useEnumLabels";
import { MathRenderer } from "@/components/MathRenderer";
import { toast } from "sonner";
import apiClient from "@/lib/api-client";
import { ENDPOINTS } from "@/constants/endpoints";

type PageResult<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
};

export default function QuestionsPage() {
  const t = useTranslations("admin.questions");
  const enumLabel = useEnumLabels();
  const [questions, setQuestions] = useState([] as any);
  const [searchTerm, setSearchTerm] = useState("");
  const [totalCount, setTotalCount] = useState(0);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const fetchQuestions = useCallback(
    async (page = currentPage, limit = itemsPerPage, search = searchTerm) => {
      try {
        const response = await apiClient.get<PageResult<any>>(
          ENDPOINTS.QUESTIONS.BASE,
          {
            params: {
              page,
              limit,
              search: search || undefined,
            },
          },
        );
        setQuestions(response.data.data ?? []);
        setTotalCount(response.data.total ?? 0);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        toast.error(t("loadQuestionsError", { message }));
        setQuestions([]);
        setTotalCount(0);
      }
    },
    [currentPage, itemsPerPage, searchTerm, t],
  );

  useEffect(() => {
    void fetchQuestions();
  }, [fetchQuestions]);

  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const paginatedQuestions = questions || [];

  return (
    <div className="space-y-6 w-full max-w-full overflow-hidden">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-900">{t("questionBank")}</h2>
      </div>

      <Card className="bg-white border-gray-300">
        <CardHeader>
          <div>
            <CardTitle>{t("questionBank")}</CardTitle>
            <CardDescription>
              {t("seeListOfQuestionsInThe")}</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("searchQuestions")}
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
                  <TableHead className="w-[30%]">{t("question")}</TableHead>
                  <TableHead className="w-[10%]">{t("creator")}</TableHead>
                  <TableHead className="w-[10%]">{t("topic")}</TableHead>
                  <TableHead className="w-[15%]">{t("type")}</TableHead>
                  <TableHead className="w-[15%]">{t("format")}</TableHead>
                  <TableHead className="w-[20%]">{t("answer")}</TableHead>
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
                    <TableCell>{question.lecturer?.full_name}</TableCell>
                    <TableCell>
                      {typeof question.topic === "string"
                        ? question.topic
                        : (question.topic as any)?.name ?? "N/A"}
                    </TableCell>
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
                        {enumLabel.questionType(question.question_type)}
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
                        {enumLabel.questionFormat(question.question_format)}
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
                              question.options as unknown as string,
                            )
                              .filter(
                                (option: QuestionOption) => option.isCorrect,
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
                {t("before")}</Button>
              <div className="text-sm font-medium">
                {t("pageOf", { page: currentPage, total: totalPages })}
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
                {t("next")}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
