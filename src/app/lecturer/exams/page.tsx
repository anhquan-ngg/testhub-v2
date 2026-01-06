"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Pencil,
  Trash2,
  Search,
  Users,
  Plus,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useDeleteExam, useFindManyExam } from "../../../../generated/hooks";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const mockStudents = [
  {
    id: 1,
    name: "Nguyễn Văn A",
    email: "nguyenvana@example.com",
    status: "Đã đăng ký",
  },
  {
    id: 2,
    name: "Trần Thị B",
    email: "tranthib@example.com",
    status: "Chưa đăng ký",
  },
  {
    id: 3,
    name: "Lê Văn C",
    email: "levanc@example.com",
    status: "Đã đăng ký",
  },
];

export default function LecturerExams() {
  const router = useRouter();
  const [exams, setExams] = useState([] as any);
  const [students, setStudents] = useState(mockStudents);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedExam, setSelectedExam] = useState<number | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  const { data: examsData } = useFindManyExam({
    orderBy: { created_at: "desc" },
  });

  const deleteExamMutation = useDeleteExam({
    onSuccess: () => {
      toast.success("Xóa bài thi thành công");
    },
  });

  const handleDeleteExam = async (examId: string) => {
    const previous = exams;

    try {
      await deleteExamMutation.mutateAsync({
        where: { id: examId },
      });

      setExams(exams.filter((exam: any) => exam.id !== examId));
    } catch (error) {
      setExams(previous);
      toast.error("Xóa bài thi không thành công");
      console.log(error);
    }
  };

  useEffect(() => {
    setExams(examsData);
    console.log("Exams data:", examsData);
  }, [examsData]);

  const filteredExams =
    exams?.filter((exam: any) =>
      exam.title.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

  const totalPages = Math.ceil(filteredExams.length / ITEMS_PER_PAGE);
  const paginatedExams = filteredExams.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-900">Quản lý bài thi</h2>
        <Button
          onClick={() => router.push("/lecturer/exams/create")}
          className="bg-[#0066cc] hover:bg-[#0052a3] text-white hover:cursor-pointer"
        >
          <Plus className="h-4 w-4 mr-2" />
          Thêm bài thi
        </Button>
      </div>

      {/* Exams List */}
      <Card className="bg-white border-gray-300 space-y-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Các bài thi của bạn</CardTitle>
              <CardDescription>Quản lý và chỉnh sửa bài thi</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm bài thi..."
                className="pl-10 bg-white border-gray-300"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="border-gray-300">
                <TableHead>Tên bài thi</TableHead>
                <TableHead>Chủ đề</TableHead>
                <TableHead>Thời gian bắt đầu</TableHead>
                <TableHead>Thời gian kết thúc</TableHead>
                <TableHead>Thời lượng</TableHead>
                <TableHead>Loại bài thi</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Loại cấu hình</TableHead>
                <TableHead>Sinh viên</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedExams.map((exam: any) => (
                <TableRow key={exam.id} className="border-gray-300">
                  <TableCell className="font-medium">{exam.title}</TableCell>
                  <TableCell>{exam.topic}</TableCell>
                  <TableCell>
                    {exam.exam_start_time.toLocaleString("vi-VN")}
                  </TableCell>
                  <TableCell>
                    {exam.exam_end_time.toLocaleString("vi-VN")}
                  </TableCell>
                  <TableCell>{exam.duration} phút</TableCell>
                  <TableCell>
                    {exam.practice ? "Luyện tập" : "Chính thức"}
                  </TableCell>
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
                  <TableCell>{exam.mode}</TableCell>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedExam(exam.id)}
                          className="text-[#0066cc] hover:text-[#0066cc]"
                        >
                          <Users className="h-4 w-4 mr-2" />
                          {exam.students}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-white border-gray-300">
                        <DialogHeader>
                          <DialogTitle>Danh sách sinh viên</DialogTitle>
                          <DialogDescription>
                            Quản lý sinh viên cho bài thi: {exam.title}
                          </DialogDescription>
                        </DialogHeader>
                        <Table>
                          <TableHeader>
                            <TableRow className="border-gray-300">
                              <TableHead>Tên sinh viên</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead>Trạng thái</TableHead>
                              <TableHead>Thao tác</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {students.map((student) => (
                              <TableRow
                                key={student.id}
                                className="border-gray-300"
                              >
                                <TableCell>{student.name}</TableCell>
                                <TableCell>{student.email}</TableCell>
                                <TableCell>
                                  <Badge
                                    variant={
                                      student.status === "Đã đăng ký"
                                        ? "default"
                                        : "secondary"
                                    }
                                  >
                                    {student.status}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {student.status === "Chưa đăng ký" ? (
                                    <Button variant="outline" size="sm">
                                      Chấp nhận
                                    </Button>
                                  ) : (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-red-600 hover:text-red-700"
                                    >
                                      Xóa
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          router.push(`/lecturer/exams/edit/${exam.id}`)
                        }
                        className="hover:cursor-pointer"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-600 hover:text-red-700 hover:cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="top-28 bg-black/80 text-white border-none">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Xác nhận xoá</AlertDialogTitle>
                            <AlertDialogDescription>
                              Bạn có chắc muốn xoá bài thi này? Hành động không
                              thể hoàn tác.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="bg-gray-800 border-none hover:cursor-pointer">
                              Huỷ
                            </AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-red-600 hover:bg-red-700 text-white hover:cursor-pointer"
                              onClick={() => handleDeleteExam(exam.id)}
                            >
                              Xoá
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {totalPages > 0 && (
            <div className="flex items-center justify-end space-x-2 py-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
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
