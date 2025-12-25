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
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useFindManyExam } from "../../../../../generated/hooks";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function ExamsPage() {
  const [exams, setExams] = useState([] as any);

  const {
    data: examsData,
    isLoading,
    error,
  } = useFindManyExam({
    include: {
      _count: {
        select: { questions: true },
      },
    },
    orderBy: { created_at: "desc" },
  });

  useEffect(() => {
    setExams(examsData);
  }, [examsData]);

  if (isLoading) {
    return <Spinner />;
  }

  if (error) {
    toast.error("Có lỗi xảy ra khi tải dữ liệu. Vui lòng thử lại sau.");
  }

  return (
    <Card className="bg-white border-gray-300">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Quản lý bài thi</CardTitle>
            <CardDescription>
              Tạo, chỉnh sửa và quản lý các bài kiểm tra
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="border-gray-300">
              <TableHead>Tên bài thi</TableHead>
              <TableHead>Số câu hỏi</TableHead>
              <TableHead>Thời gian</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {exams?.map((exam: any) => (
              <TableRow key={exam.id} className="border-gray-300">
                <TableCell className="font-medium">{exam.title}</TableCell>
                <TableCell>{exam._count.questions} câu</TableCell>
                <TableCell>{exam.duration} phút</TableCell>
                <TableCell>
                  <Badge
                    className={`px-2 py-1 text-white rounded-lg ${
                      exam.status === "INACTIVE"
                        ? "text-red-500 bg-red-100"
                        : exam.status === "ACTIVE"
                        ? "text-green-500 bg-green-100"
                        : "text-blue-500 bg-blue-100"
                    }`}
                  >
                    {exam.status}
                  </Badge>
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
      </CardContent>
    </Card>
  );
}
