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
  DialogFooter,
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
  AlertCircle,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  Loader2,
} from "lucide-react";
import {
  useDeleteExam,
  useFindManyExam,
  useFindManyExamRegistration,
  useUpdateExamRegistration,
  useDeleteExamRegistration,
  useFindManyUser,
  useCreateExamRegistration,
} from "../../../../generated/hooks";
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
import { Label } from "@/components/ui/label";
import { useAppSelector } from "@/store/hook";

function StudentManagementDialog({ exam }: { exam: any }) {
  const [studentEmail, setStudentEmail] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const {
    data: registrations,
    refetch,
    isLoading,
  } = useFindManyExamRegistration({
    where: { exam_id: exam.id },
    include: { student: true },
  });

  const updateRegistrationMutation = useUpdateExamRegistration();
  const deleteRegistrationMutation = useDeleteExamRegistration();
  const createRegistrationMutation = useCreateExamRegistration();
  const { data: userDataByEmail, refetch: findUser } = useFindManyUser({
    where: { email: studentEmail, role: "STUDENT" },
  });

  const handleApprove = async (regId: string) => {
    try {
      await updateRegistrationMutation.mutateAsync({
        where: { id: regId },
        data: { status: "APPROVED" },
      });
      toast.success("Đã chấp nhận sinh viên.");
      refetch();
    } catch (e) {
      toast.error("Lỗi khi chấp nhận sinh viên.");
    }
  };

  const handleDelete = async (regId: string) => {
    try {
      await deleteRegistrationMutation.mutateAsync({
        where: { id: regId },
      });
      toast.success("Đã xóa sinh viên khỏi danh sách.");
      refetch();
    } catch (e) {
      toast.error("Lỗi khi xóa sinh viên.");
    }
  };

  const handleManualAdd = async () => {
    if (!studentEmail) return;
    setIsAdding(true);
    try {
      const { data: users } = await findUser();
      if (!users || users.length === 0) {
        toast.error("Không tìm thấy sinh viên với email này.");
        return;
      }
      const student = users[0];

      // Check if already registered
      const existing = registrations?.find((r) => r.student_id === student.id);
      if (existing) {
        toast.error("Sinh viên này đã có trong danh sách.");
        return;
      }

      await createRegistrationMutation.mutateAsync({
        data: {
          exam: { connect: { id: exam.id } },
          student: { connect: { id: student.id } },
          status: "APPROVED",
        },
      });
      toast.success(`Đã thêm sinh viên ${student.full_name} vào bài thi.`);
      setStudentEmail("");
      refetch();
    } catch (e) {
      toast.error("Lỗi khi thêm sinh viên.");
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <DialogContent className="bg-white border-gray-300 max-w-2xl">
      <DialogHeader>
        <DialogTitle>Quản lý sinh viên</DialogTitle>
        <DialogDescription>
          Quản lý danh sách sinh viên tham gia bài thi: {exam.title}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        <div className="flex gap-2">
          <div className="flex-1">
            <Label htmlFor="email" className="sr-only">
              Email sinh viên
            </Label>
            <Input
              id="email"
              placeholder="Nhập email sinh viên để thêm trực tiếp..."
              className="bg-white border-gray-300"
              value={studentEmail}
              onChange={(e) => setStudentEmail(e.target.value)}
            />
          </div>
          <Button
            onClick={handleManualAdd}
            disabled={isAdding}
            className="bg-[#0066cc] hover:bg-[#0052a3] text-white"
          >
            {isAdding ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="h-4 w-4 mr-2" />
            )}
            Thêm
          </Button>
        </div>

        <div className="border rounded-md border-gray-300 overflow-hidden">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow className="border-gray-300">
                <TableHead>Tên sinh viên</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
                  </TableCell>
                </TableRow>
              ) : registrations && registrations.length > 0 ? (
                registrations.map((reg: any) => (
                  <TableRow key={reg.id} className="border-gray-300">
                    <TableCell>{reg.student?.full_name}</TableCell>
                    <TableCell>{reg.student?.email}</TableCell>
                    <TableCell>
                      <Badge
                        className={`px-2 py-1 text-white rounded-lg ${
                          reg.status === "PENDING"
                            ? "bg-yellow-500 hover:bg-yellow-600"
                            : reg.status === "APPROVED"
                            ? "bg-green-500 hover:bg-green-600"
                            : "bg-red-500 hover:bg-red-600"
                        }`}
                      >
                        {reg.status === "PENDING"
                          ? "Đang chờ"
                          : reg.status === "APPROVED"
                          ? "Đã duyệt"
                          : "Từ chối"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {reg.status === "PENDING" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-green-600 border-green-200 hover:bg-green-50"
                            onClick={() => handleApprove(reg.id)}
                          >
                            Duyệt
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDelete(reg.id)}
                        >
                          Xóa
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center py-8 text-gray-500"
                  >
                    Chưa có sinh viên nào đăng ký.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </DialogContent>
  );
}

export default function LecturerExams() {
  const router = useRouter();
  const [exams, setExams] = useState([] as any);
  const [searchTerm, setSearchTerm] = useState("");
  const user = useAppSelector((state) => state.user);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  const { data: examsData } = useFindManyExam({
    orderBy: { created_at: "desc" },
    include: {
      registrations: true,
    },
    where: {
      lecturer_id: user.id,
    },
  });

  const deleteExamMutation = useDeleteExam({
    onSuccess: () => {
      toast.success("Xóa bài thi thành công");
    },
  });

  const handleDeleteExam = async (examId: string) => {
    try {
      await deleteExamMutation.mutateAsync({
        where: { id: examId },
      });
      toast.success("Đã xóa bài thi.");
    } catch (error) {
      toast.error("Xóa bài thi không thành công");
      console.log(error);
    }
  };

  useEffect(() => {
    if (examsData) {
      setExams(examsData);
    }
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
                <TableHead>Bắt đầu</TableHead>
                <TableHead>Kết thúc</TableHead>
                <TableHead>Thời lượng</TableHead>
                <TableHead>Loại</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Sinh viên</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExams.length > 0 ? (
                paginatedExams.map((exam: any) => (
                  <TableRow key={exam.id} className="border-gray-300">
                    <TableCell className="font-medium whitespace-nowrap">
                      {exam.title}
                    </TableCell>
                    <TableCell>{exam.topic}</TableCell>
                    <TableCell className="text-xs">
                      {new Date(exam.exam_start_time).toLocaleString("vi-VN")}
                    </TableCell>
                    <TableCell className="text-xs">
                      {new Date(exam.exam_end_time).toLocaleString("vi-VN")}
                    </TableCell>
                    <TableCell>{exam.duration}m</TableCell>
                    <TableCell className="text-xs">
                      {exam.practice ? "Luyện tập" : "Chính thức"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`px-2 py-0.5 text-[10px] text-white rounded-md ${
                          exam.status === "INACTIVE"
                            ? "bg-red-500"
                            : exam.status === "ACTIVE"
                            ? "bg-green-500"
                            : "bg-blue-500"
                        }`}
                      >
                        {exam.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-[#0066cc] hover:text-[#0066cc] font-medium"
                          >
                            <Users className="h-4 w-4 mr-1" />
                            {exam.registrations?.length || 0}
                          </Button>
                        </DialogTrigger>
                        <StudentManagementDialog exam={exam} />
                      </Dialog>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            router.push(`/lecturer/exams/edit/${exam.id}`)
                          }
                          className="h-8 w-8"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-white border-gray-300">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Xác nhận xoá</AlertDialogTitle>
                              <AlertDialogDescription>
                                Bạn có chắc muốn xoá bài thi này? Hành động này
                                không thể hoàn tác.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="hover:cursor-pointer">
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
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="h-72 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="p-4 bg-gray-50 rounded-full">
                        {searchTerm ? (
                          <AlertCircle className="h-10 w-10 text-gray-400" />
                        ) : (
                          <ClipboardList className="h-10 w-10 text-gray-400" />
                        )}
                      </div>
                      <div className="space-y-1">
                        <p className="text-lg font-medium text-gray-900">
                          {searchTerm
                            ? "Không tìm thấy bài thi nào"
                            : "Chưa có bài thi nào"}
                        </p>
                        <p className="text-sm text-gray-500 max-w-xs mx-auto">
                          {searchTerm
                            ? `Không có bài thi nào khớp với từ khóa "${searchTerm}". Vui lòng thử lại với từ khóa khác.`
                            : "Bắt đầu bằng cách tạo bài thi đầu tiên của bạn để chia sẻ với sinh viên."}
                        </p>
                      </div>
                      {!searchTerm && (
                        <Button
                          onClick={() => router.push("/lecturer/exams/create")}
                          className="bg-[#0066cc] hover:bg-[#0052a3] text-white mt-2"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Tạo bài thi ngay
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
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
