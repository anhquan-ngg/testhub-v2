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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Users,
  FileText,
  HelpCircle,
  BarChart3,
  Plus,
  Pencil,
  Trash2,
  UserCog,
  Search,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Rectangle,
} from "recharts";
import toast from "react-hot-toast";
import { useAuth } from "@/hook/useAuth";
import { useFindManyExam, useFindManyUser } from "../../../../generated/hooks";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";

const mockQuestions = [
  {
    id: 1,
    content: "2 + 2 = ?",
    category: "Toán học",
    difficulty: "Dễ",
    type: "Trắc nghiệm",
  },
  {
    id: 2,
    content: "What is the capital of Vietnam?",
    category: "Tiếng Anh",
    difficulty: "Dễ",
    type: "Trắc nghiệm",
  },
  {
    id: 3,
    content: "Giải phương trình x² - 5x + 6 = 0",
    category: "Toán học",
    difficulty: "Trung bình",
    type: "Tự luận",
  },
];

const mockScoreData = [
  { range: "0-20", count: 5 },
  { range: "21-40", count: 12 },
  { range: "41-60", count: 28 },
  { range: "61-80", count: 35 },
  { range: "81-100", count: 20 },
];

export default function AdminDashboard() {
  const { handleLogout } = useAuth();
  const [users, setUsers] = useState([] as any);
  const [exams, setExams] = useState([] as any);
  const [questions, setQuestions] = useState(mockQuestions);
  const [searchTerm, setSearchTerm] = useState("");
  const [questionForm, setQuestionForm] = useState({
    question_text: "",
    topic: "",
    options: ["", "", "", ""],
    correct_answer: "",
    image_url: "",
    question_type: "single-choice",
    question_format: "Một lựa chọn",
  });

  const {
    data: usersData,
    isLoading,
    error,
  } = useFindManyUser({
    orderBy: { created_at: "desc" },
  });

  const {
    data: examsData,
    // isLoading,
    // error,
  } = useFindManyExam({
    include: {
      _count: {
        select: { questions: true },
      },
    },
    orderBy: { created_at: "desc" },
  });

  // const {
  //   data: examsData,
  //   fetchNextPage,
  //   hasNextPage,
  //   isFetchingNextPage,
  // } = useInfiniteFindManyExam(
  //   {
  //     take: 5,
  //     orderBy: { created_at: "desc" },
  //   },
  //   {
  //     getNextPageParam: (lastPage, pages) => {
  //       // If last page has under 5 items => end page
  //       if (lastPage.length < 5) {
  //         return undefined;
  //       }
  //       return pages.length + 1;
  //     },
  //   }
  // );

  useEffect(() => {
    setUsers(usersData);
  }, [usersData]);

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
    <div className="min-h-screen bg-gradient-to-br from-[#a8c5e6] to-[#d4e4f7] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-[#0066cc]">TESTHUB Admin</h1>
            <p className="text-gray-700 mt-1">Bảng điều khiển quản trị viên</p>
          </div>
          <Button
            variant="outline"
            className="bg-white border-gray-300"
            onClick={(e) => {
              e.preventDefault();
              handleLogout();
            }}
          >
            Đăng xuất
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-white border-gray-300">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Tổng người dùng
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{usersData?.length}</div>
            </CardContent>
          </Card>
          <Card className="bg-white border-gray-300">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Bài kiểm tra
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{examsData?.length}</div>
            </CardContent>
          </Card>
          <Card className="bg-white border-gray-300">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Ngân hàng câu hỏi
              </CardTitle>
              <HelpCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{questions.length}</div>
            </CardContent>
          </Card>
          <Card className="bg-white border-gray-300">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Lượt thi</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">100</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="users" className="space-y-4">
          <TabsList className="bg-white">
            <TabsTrigger value="users">Quản lý người dùng</TabsTrigger>
            <TabsTrigger value="exams">Quản lý bài thi</TabsTrigger>
            <TabsTrigger value="questions">Ngân hàng câu hỏi</TabsTrigger>
            <TabsTrigger value="analytics">Phân tích điểm</TabsTrigger>
          </TabsList>

          {/* Users Management */}
          <TabsContent value="users" className="space-y-4">
            <Card className="bg-white border-gray-300">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Quản lý tài khoản</CardTitle>
                    <CardDescription>
                      Thêm, sửa, xóa và thay đổi phân quyền người dùng
                    </CardDescription>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button className="bg-[#0066cc] hover:bg-[#0052a3] border-none text-white">
                        <Plus className="h-4 w-4 mr-2" />
                        Thêm người dùng
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-white border-gray-300">
                      <DialogHeader>
                        <DialogTitle>Thêm người dùng mới</DialogTitle>
                        <DialogDescription>
                          Nhập thông tin người dùng mới
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Họ và tên</Label>
                          <Input
                            id="name"
                            placeholder="Nhập họ và tên"
                            className="bg-white border-gray-300"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            placeholder="Nhập email"
                            className="bg-white border-gray-300"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="phone">Số điện thoại</Label>
                          <Input
                            id="phone"
                            placeholder="Nhập số điện thoại"
                            className="bg-white border-gray-300"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="role">Phân quyền</Label>
                          <Select>
                            <SelectTrigger className="bg-white border-gray-300">
                              <SelectValue placeholder="Chọn vai trò" />
                            </SelectTrigger>
                            <SelectContent className="bg-white border-gray-300">
                              <SelectItem value="student">Thí sinh</SelectItem>
                              <SelectItem value="instructor">
                                Giảng viên
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button className="bg-[#0066cc] hover:bg-[#0052a3] border-none text-white">
                          Thêm
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground text-gray-500" />
                    <Input
                      placeholder="Tìm kiếm người dùng..."
                      className="pl-10 border-gray-300"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-300">
                      <TableHead>Họ và tên</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Số điện thoại</TableHead>
                      <TableHead>Vai trò</TableHead>
                      <TableHead className="text-right">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users?.map((user: any) => (
                      <TableRow key={user.id} className="border-gray-300">
                        <TableCell className="font-medium">
                          {user.full_name}
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{/* {user?.phone} */}</TableCell>
                        <TableCell>
                          <Badge
                            className={`px-2 py-1 text-white rounded-lg ${
                              user.role === "ADMIN"
                                ? "text-red-500 bg-red-100"
                                : user.role === "LECTURER"
                                ? "text-green-500 bg-green-100"
                                : "text-blue-500 bg-blue-100"
                            }`}
                          >
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <UserCog className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="bg-white border-gray-300">
                                <DialogHeader>
                                  <DialogTitle>Thay đổi phân quyền</DialogTitle>
                                  <DialogDescription>
                                    Thay đổi vai trò của {user.full_name}
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                  <div className="space-y-2">
                                    <Label>Vai trò hiện tại: {user.role}</Label>
                                    <Select
                                      defaultValue={
                                        user.role === "ADMIN"
                                          ? "destructive"
                                          : user.role === "STUDENT"
                                          ? "default"
                                          : "secondary"
                                      }
                                    >
                                      <SelectTrigger className="bg-white border-gray-300">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent className="bg-white border-gray-300">
                                        <SelectItem value="student">
                                          Thí sinh
                                        </SelectItem>
                                        <SelectItem value="instructor">
                                          Giảng viên
                                        </SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                                <DialogFooter>
                                  <Button className="bg-[#0066cc] hover:bg-[#0052a3] border-none text-white">
                                    Cập nhật
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
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
          </TabsContent>

          {/* Exams Management */}
          <TabsContent value="exams" className="space-y-4">
            <Card className="bg-white border-gray-300">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Quản lý bài thi</CardTitle>
                    <CardDescription>
                      Tạo, chỉnh sửa và quản lý các bài kiểm tra
                    </CardDescription>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button className="bg-[#0066cc] hover:bg-[#0052a3] border-none text-white">
                        <Plus className="h-4 w-4 mr-2" />
                        Tạo bài thi mới
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-white border-gray-300">
                      <DialogHeader>
                        <DialogTitle>Tạo bài thi mới</DialogTitle>
                        <DialogDescription>
                          Nhập thông tin bài thi
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="exam-title">Tên bài thi</Label>
                          <Input
                            id="exam-title"
                            placeholder="Nhập tên bài thi"
                            className="bg-white border-gray-300"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="exam-duration">
                            Thời gian (phút)
                          </Label>
                          <Input
                            id="exam-duration"
                            type="number"
                            placeholder="60"
                            className="bg-white border-gray-300"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="exam-questions">Số câu hỏi</Label>
                          <Input
                            id="exam-questions"
                            type="number"
                            placeholder="20"
                            className="bg-white border-gray-300"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button className="bg-[#0066cc] hover:bg-[#0052a3] text-white">
                          Tạo bài thi
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
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
                        <TableCell className="font-medium">
                          {exam.title}
                        </TableCell>
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
          </TabsContent>

          {/* Questions Bank */}
          <TabsContent value="questions" className="space-y-4">
            <Card className="bg-white border-gray-300">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Ngân hàng câu hỏi</CardTitle>
                    <CardDescription>
                      Quản lý tất cả câu hỏi cho các bài kiểm tra
                    </CardDescription>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button className="bg-[#0066cc] hover:bg-[#0052a3] hover:cursor-pointer text-white">
                        <Plus className="h-4 w-4 mr-2" />
                        Thêm câu hỏi
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white border-gray-300">
                      <DialogHeader>
                        <DialogTitle>Thêm câu hỏi mới</DialogTitle>
                        <DialogDescription>
                          Nhập thông tin chi tiết câu hỏi
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="question-text">
                            Nội dung câu hỏi{" "}
                            <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="question-text"
                            placeholder="Nhập câu hỏi"
                            value={questionForm.question_text}
                            onChange={(e) =>
                              setQuestionForm({
                                ...questionForm,
                                question_text: e.target.value,
                              })
                            }
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="question-topic">
                              Chủ đề <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              id="question-topic"
                              placeholder="Nhập chủ đề"
                              value={questionForm.topic}
                              onChange={(e) =>
                                setQuestionForm({
                                  ...questionForm,
                                  topic: e.target.value,
                                })
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="question-type">
                              Loại câu hỏi{" "}
                              <span className="text-red-500">*</span>
                            </Label>
                            <Select
                              value={questionForm.question_type}
                              onValueChange={(value) =>
                                setQuestionForm({
                                  ...questionForm,
                                  question_type: value,
                                })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="single-choice">
                                  Trắc nghiệm một đáp án
                                </SelectItem>
                                <SelectItem value="multi-choice">
                                  Trắc nghiệm nhiều đáp án
                                </SelectItem>
                                <SelectItem value="essay">Tự luận</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="question-format">
                            Định dạng câu hỏi{" "}
                            <span className="text-red-500">*</span>
                          </Label>
                          <Select
                            value={questionForm.question_format}
                            onValueChange={(value) =>
                              setQuestionForm({
                                ...questionForm,
                                question_format: value,
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Một lựa chọn">
                                Một lựa chọn
                              </SelectItem>
                              <SelectItem value="Nhiều lựa chọn">
                                Nhiều lựa chọn
                              </SelectItem>
                              <SelectItem value="Tự do">Tự do</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="image-url">URL hình ảnh</Label>
                          <Input
                            id="image-url"
                            placeholder="Nhập URL hình ảnh (tùy chọn)"
                            value={questionForm.image_url}
                            onChange={(e) =>
                              setQuestionForm({
                                ...questionForm,
                                image_url: e.target.value,
                              })
                            }
                          />
                        </div>

                        {(questionForm.question_type === "single-choice" ||
                          questionForm.question_type === "multi-choice") && (
                          <>
                            <div className="space-y-3">
                              <Label>
                                Các lựa chọn{" "}
                                <span className="text-red-500">*</span>
                              </Label>
                              {questionForm.options.map((option, index) => (
                                <Input
                                  key={index}
                                  placeholder={`Lựa chọn ${index + 1}`}
                                  value={option}
                                  onChange={(e) => {
                                    const newOptions = [
                                      ...questionForm.options,
                                    ];
                                    newOptions[index] = e.target.value;
                                    setQuestionForm({
                                      ...questionForm,
                                      options: newOptions,
                                    });
                                  }}
                                />
                              ))}
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="correct-answer">
                                Đáp án đúng{" "}
                                <span className="text-red-500">*</span>
                              </Label>
                              <Select
                                value={questionForm.correct_answer}
                                onValueChange={(value) =>
                                  setQuestionForm({
                                    ...questionForm,
                                    correct_answer: value,
                                  })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Chọn đáp án đúng" />
                                </SelectTrigger>
                                <SelectContent>
                                  {questionForm.options
                                    .filter((option) => option.trim() !== "")
                                    .map((option, index) => (
                                      <SelectItem key={index} value={option}>
                                        {option}
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </>
                        )}

                        {questionForm.question_type === "Tự luận" && (
                          <div className="space-y-2">
                            <Label htmlFor="correct-answer">
                              Đáp án tham khảo{" "}
                              <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              id="correct-answer"
                              placeholder="Nhập đáp án tham khảo"
                              value={questionForm.correct_answer}
                              onChange={(e) =>
                                setQuestionForm({
                                  ...questionForm,
                                  correct_answer: e.target.value,
                                })
                              }
                            />
                          </div>
                        )}
                      </div>
                      <DialogFooter>
                        <Button className="bg-[#0066cc] hover:bg-[#0052a3]">
                          Thêm câu hỏi
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-300">
                      <TableHead>Nội dung</TableHead>
                      <TableHead>Danh mục</TableHead>
                      <TableHead>Độ khó</TableHead>
                      <TableHead>Loại</TableHead>
                      <TableHead className="text-right">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {questions.map((question) => (
                      <TableRow key={question.id} className="border-gray-300">
                        <TableCell className="font-medium max-w-md truncate">
                          {question.content}
                        </TableCell>
                        <TableCell>{question.category}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              question.difficulty === "Dễ"
                                ? "default"
                                : question.difficulty === "Trung bình"
                                ? "secondary"
                                : "destructive"
                            }
                          >
                            {question.difficulty}
                          </Badge>
                        </TableCell>
                        <TableCell>{question.type}</TableCell>
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
          </TabsContent>

          {/* Analytics */}
          <TabsContent value="analytics" className="space-y-4">
            <Card className="bg-white border-gray-300">
              <CardHeader>
                <CardTitle>Phân tích phổ điểm</CardTitle>
                <CardDescription>
                  Biểu đồ xếp loại điểm số theo bài thi
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Label>Chọn bài thi:</Label>
                    <Select defaultValue="1">
                      <SelectTrigger className="w-64 border-gray-300">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-300">
                        {exams?.map((exam: any) => (
                          <SelectItem key={exam.id} value={exam.id.toString()}>
                            {exam.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={mockScoreData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="range" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar
                          dataKey="count"
                          fill="#0066cc"
                          name="Số lượng thí sinh"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
                    <Card className="border-gray-300">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">
                          0-20 điểm
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">5</div>
                        <p className="text-xs text-muted-foreground">Yếu</p>
                      </CardContent>
                    </Card>
                    <Card className="border-gray-300">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">
                          21-40 điểm
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">12</div>
                        <p className="text-xs text-muted-foreground">
                          Trung bình yếu
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="border-gray-300">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">
                          41-60 điểm
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">28</div>
                        <p className="text-xs text-muted-foreground">
                          Trung bình
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="border-gray-300">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">
                          61-80 điểm
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">35</div>
                        <p className="text-xs text-muted-foreground">Khá</p>
                      </CardContent>
                    </Card>
                    <Card className="border-gray-300">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">
                          81-100 điểm
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">20</div>
                        <p className="text-xs text-muted-foreground">Giỏi</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
