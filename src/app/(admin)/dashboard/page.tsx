"use client";

import { useState } from "react";
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
import { Badge } from "@/components/ui/badge";
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
import { useRouter } from "next/navigation";
import authServices from "@/services/authServices";
import { useAuth } from "@/hook/useAuth";

// Mock data
const mockUsers = [
  {
    id: 1,
    name: "Nguyễn Văn A",
    email: "nguyenvana@example.com",
    role: "Thí sinh",
    phone: "0901234567",
  },
  {
    id: 2,
    name: "Trần Thị B",
    email: "tranthib@example.com",
    role: "Giảng viên",
    phone: "0912345678",
  },
  {
    id: 3,
    name: "Lê Văn C",
    email: "levanc@example.com",
    role: "Thí sinh",
    phone: "0923456789",
  },
  {
    id: 4,
    name: "Phạm Thị D",
    email: "phamthid@example.com",
    role: "Thí sinh",
    phone: "0934567890",
  },
];

const mockExams = [
  {
    id: 1,
    title: "Kiểm tra Toán học",
    questions: 20,
    duration: 60,
    status: "Đang hoạt động",
  },
  {
    id: 2,
    title: "Kiểm tra Tiếng Anh",
    questions: 30,
    duration: 90,
    status: "Đang hoạt động",
  },
  {
    id: 3,
    title: "Kiểm tra Lý thuyết",
    questions: 25,
    duration: 45,
    status: "Tạm dừng",
  },
];

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
  const [users, setUsers] = useState(mockUsers);
  const [exams, setExams] = useState(mockExams);
  const [questions, setQuestions] = useState(mockQuestions);
  const [searchTerm, setSearchTerm] = useState("");

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
              <div className="text-2xl font-bold">{users.length}</div>
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
              <div className="text-2xl font-bold">{exams.length}</div>
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
                    {users.map((user) => (
                      <TableRow key={user.id} className="border-gray-300">
                        <TableCell className="font-medium">
                          {user.name}
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.phone}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              user.role === "Giảng viên"
                                ? "default"
                                : "secondary"
                            }
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
                                    Thay đổi vai trò của {user.name}
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                  <div className="space-y-2">
                                    <Label>Vai trò hiện tại: {user.role}</Label>
                                    <Select
                                      defaultValue={
                                        user.role === "Thí sinh"
                                          ? "student"
                                          : "instructor"
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
                    {exams.map((exam) => (
                      <TableRow key={exam.id} className="border-gray-300">
                        <TableCell className="font-medium">
                          {exam.title}
                        </TableCell>
                        <TableCell>{exam.questions} câu</TableCell>
                        <TableCell>{exam.duration} phút</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              exam.status === "Đang hoạt động"
                                ? "default"
                                : "secondary"
                            }
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
                      <Button className="bg-[#0066cc] hover:bg-[#0052a3] border-none text-white">
                        <Plus className="h-4 w-4 mr-2" />
                        Thêm câu hỏi
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl bg-white border-gray-300">
                      <DialogHeader>
                        <DialogTitle>Thêm câu hỏi mới</DialogTitle>
                        <DialogDescription>
                          Nhập thông tin câu hỏi
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="question-content">
                            Nội dung câu hỏi
                          </Label>
                          <Input
                            id="question-content"
                            placeholder="Nhập câu hỏi"
                            className="bg-white border-gray-300"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="question-category">Danh mục</Label>
                            <Select>
                              <SelectTrigger className="bg-white border-gray-300">
                                <SelectValue placeholder="Chọn danh mục" />
                              </SelectTrigger>
                              <SelectContent className="bg-white border-gray-300">
                                <SelectItem value="math">Toán học</SelectItem>
                                <SelectItem value="english">
                                  Tiếng Anh
                                </SelectItem>
                                <SelectItem value="science">
                                  Khoa học
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="question-difficulty">Độ khó</Label>
                            <Select>
                              <SelectTrigger className="bg-white border-gray-300">
                                <SelectValue placeholder="Chọn độ khó" />
                              </SelectTrigger>
                              <SelectContent className="bg-white border-gray-300">
                                <SelectItem value="easy">Dễ</SelectItem>
                                <SelectItem value="medium">
                                  Trung bình
                                </SelectItem>
                                <SelectItem value="hard">Khó</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="question-type">Loại câu hỏi</Label>
                          <Select>
                            <SelectTrigger className="bg-white border-gray-300">
                              <SelectValue placeholder="Chọn loại" />
                            </SelectTrigger>
                            <SelectContent className="bg-white border-gray-300">
                              <SelectItem value="multiple">
                                Trắc nghiệm
                              </SelectItem>
                              <SelectItem value="essay">Tự luận</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button className="bg-[#0066cc] hover:bg-[#0052a3] border-none text-white">
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
                        {exams.map((exam) => (
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
