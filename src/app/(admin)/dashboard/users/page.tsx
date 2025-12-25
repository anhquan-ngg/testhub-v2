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
import {
  Plus,
  Pencil,
  Trash2,
  UserCog,
  Search,
  EyeOff,
  Eye,
} from "lucide-react";
import {
  useCreateUser,
  useDeleteUser,
  useFindManyUser,
  useUpdateUser,
} from "../../../../../generated/hooks";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { UserRole } from "@prisma/client";
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

export default function UsersPage() {
  const [users, setUsers] = useState([] as any);
  const [searchTerm, setSearchTerm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [userForm, setUserForm] = useState<{
    full_name: string;
    email: string;
    password: string;
    phone: string;
    role: UserRole;
  }>({
    full_name: "",
    email: "",
    password: "",
    phone: "",
    role: UserRole.STUDENT,
  });
  const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.STUDENT);

  const {
    data: usersData,
    isLoading,
    error,
  } = useFindManyUser({
    orderBy: { created_at: "desc" },
  });

  const createUserMutation = useCreateUser({
    onSuccess: () => {
      toast.success("Thêm người dùng thành công");
    },
    onError: () => {
      toast.error("Có lỗi xảy ra khi thêm người dùng");
    },
  });

  const updateUserMutation = useUpdateUser({
    onSuccess: () => {
      toast.success("Cập nhật thành công");
    },
    onError: () => {
      toast.error("Có lỗi xảy ra khi cập nhật");
    },
  });

  const deleteUserMutation = useDeleteUser({
    onSuccess: () => {
      toast.success("Xóa người dùng thành công");
    },
    onError: () => {
      toast.error("Có lỗi xảy ra khi xóa người dùng");
    },
  });

  const handleAddUser = async () => {
    const newUser = {
      ...userForm,
    };
    await createUserMutation.mutateAsync({ data: newUser });
    setUserForm({
      full_name: "",
      email: "",
      password: "",
      phone: "",
      role: UserRole.STUDENT,
    });
  };

  const handleUpdateRole = async (userId: string) => {
    await updateUserMutation.mutateAsync({
      where: { id: userId },
      data: { role: selectedRole },
    });
  };

  const handleDeleteUser = async (userId: string) => {
    await deleteUserMutation.mutateAsync({
      where: { id: userId },
    });
  };

  useEffect(() => {
    setUsers(usersData);
  }, [usersData]);

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
            <CardTitle>Quản lý tài khoản</CardTitle>
            <CardDescription>
              Thêm, sửa, xóa và thay đổi phân quyền người dùng
            </CardDescription>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-[#0066cc] hover:bg-[#0052a3] border-none text-white hover:cursor-pointer">
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
                  <Label htmlFor="name">
                    Họ và tên <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    placeholder="Nhập họ và tên"
                    className="bg-white border-gray-300"
                    value={userForm.full_name}
                    onChange={(e) =>
                      setUserForm({ ...userForm, full_name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">
                    Email <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Nhập email"
                    className="bg-white border-gray-300"
                    value={userForm.email}
                    onChange={(e) =>
                      setUserForm({ ...userForm, email: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">
                    Mật khẩu <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Nhập mật khẩu"
                      className="bg-white border-gray-300"
                      value={userForm.password}
                      onChange={(e) =>
                        setUserForm({ ...userForm, password: e.target.value })
                      }
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Số điện thoại</Label>
                  <Input
                    id="phone"
                    placeholder="Nhập số điện thoại"
                    className="bg-white border-gray-300"
                    value={userForm.phone}
                    onChange={(e) =>
                      setUserForm({ ...userForm, phone: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">
                    Phân quyền <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={userForm.role}
                    onValueChange={(value: UserRole) =>
                      setUserForm({ ...userForm, role: value })
                    }
                  >
                    <SelectTrigger className="bg-white border-gray-300">
                      <SelectValue placeholder="Chọn vai trò" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-300">
                      <SelectItem value={UserRole.STUDENT}>Thí sinh</SelectItem>
                      <SelectItem value={UserRole.LECTURER}>
                        Giảng viên
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  className="bg-[#0066cc] hover:bg-[#0052a3] border-none text-white hover:cursor-pointer"
                  onClick={() => {
                    handleAddUser();
                  }}
                >
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
                <TableCell className="font-medium">{user.full_name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  {user?.phone || "Người dùng chưa cập nhật số điện thoại"}
                </TableCell>
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
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedRole(user.role as UserRole)}
                          className="hover:cursor-pointer"
                        >
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
                              value={selectedRole}
                              onValueChange={(value: UserRole) =>
                                setSelectedRole(value)
                              }
                            >
                              <SelectTrigger className="bg-white border-gray-300">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-white border-gray-300">
                                <SelectItem value={UserRole.STUDENT}>
                                  Thí sinh
                                </SelectItem>
                                <SelectItem value={UserRole.LECTURER}>
                                  Giảng viên
                                </SelectItem>
                                <SelectItem value={UserRole.ADMIN}>
                                  Admin
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button
                            className="bg-[#0066cc] hover:bg-[#0052a3] border-none text-white hover:cursor-pointer"
                            onClick={() => handleUpdateRole(user.id)}
                          >
                            Cập nhật
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
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
                      <AlertDialogContent className="bg-white">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
                          <AlertDialogDescription>
                            Bạn có chắc chắn muốn xóa người dùng{" "}
                            {user.full_name}? Hành động này không thể hoàn tác.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="hover:cursor-pointer">
                            Hủy
                          </AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700 text-white hover:cursor-pointer border-none"
                            onClick={() => handleDeleteUser(user.id)}
                          >
                            Xác nhận xóa
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
      </CardContent>
    </Card>
  );
}
