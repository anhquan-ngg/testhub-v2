"use client";

import type React from "react";

import { useEffect, useState } from "react";
import {
  useCountSubmission,
  useFindUniqueUser,
  useUpdateUser,
} from "../../../../generated/hooks";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FileText,
  User,
  ChevronDown,
  Camera,
  Award,
  Clipboard,
  Edit,
  EyeOff,
  Eye,
} from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import StudentSideBar from "@/components/common/student/sidebar";
import StudentMenu from "@/components/common/student/menu";
import axiosClient from "@/lib/axios";
import { toast } from "sonner";
import { useAppSelector } from "@/store/hook";

import { useMinIO } from "@/hook/useMinIO";

export default function StudentProfile() {
  const student = useAppSelector((state) => state.user);
  const { getViewUrl } = useMinIO("avatars");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const { data: userProfile } = useFindUniqueUser({
    where: { id: student.id },
    include: { exams: false, questions: false, submissions: false },
  });

  useEffect(() => {
    const fetchAvatar = async () => {
      // Ưu tiên lấy từ userProfile mới fetch, hoặc fallback về redux student
      const fname = userProfile?.avatar_url || student.avatar_url;
      if (fname) {
        const url = await getViewUrl(fname);
        if (url) setAvatarUrl(url);
      }
    };
    fetchAvatar();
  }, [userProfile, student.avatar_url]);

  const { data: submissionCount } = useCountSubmission({
    where: { student_id: student.id, status: "COMPLETED" },
  });

  const { mutate: updateUser } = useUpdateUser();

  const [formData, setFormData] = useState({
    email: "",
    full_name: "",
    school: "",
    phone: "",
    address: "",
  });

  useEffect(() => {
    if (userProfile) {
      setFormData({
        email: userProfile.email || "",
        full_name: userProfile.full_name || "",
        school: userProfile.school || "",
        phone: userProfile.phone || "",
        address: userProfile.address || "",
      });
    }
  }, [userProfile]);

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData({
      ...passwordData,
      [name]: value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!student.id) return;

    updateUser(
      {
        where: { id: student.id },
        data: {
          full_name: formData.full_name,
          school: formData.school,
          phone: formData.phone,
          address: formData.address,
        },
      },
      {
        onSuccess: () => {
          toast.success("Cập nhật thông tin thành công!");
        },
        onError: (error) => {
          console.error("Update failed:", error);
          toast.error("Cập nhật thất bại. Vui lòng thử lại.");
        },
      }
    );
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("Mật khẩu mới không khớp!");
      return;
    }

    try {
      const response = await axiosClient.post("/auth/change-password", {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      if (response.status === 200) {
        toast.success("Thay đổi mật khẩu thành công!");
      }
    } catch (error) {
      toast.error("Lỗi khi thay đổi mật khẩu. Vui lòng thử lại.");
      console.log(error);
    } finally {
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    }
  };

  return (
    <div
      className="min-h-screen flex"
      style={{
        background: "linear-gradient(to bottom right, #a8c5e6, #d4e4f7)",
      }}
    >
      {/* Sidebar */}
      <StudentSideBar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <StudentMenu />

        <main className="flex-1 px-8 pb-8">
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Profile Picture Card */}
              <Card className="shadow-lg bg-white border-gray-300">
                <CardContent className="p-6 flex flex-col items-center space-y-4">
                  <div className="relative">
                    <Camera className="absolute -top-2 -right-2 h-6 w-6 text-gray-700 bg-white rounded-full p-1 shadow-md cursor-pointer" />
                    <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center border-4 border-gray-300 overflow-hidden">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt="Avatar"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="h-12 w-12 text-gray-500" />
                      )}
                    </div>
                  </div>
                  <p className="font-semibold text-gray-900">
                    {student.full_name}
                  </p>
                </CardContent>
              </Card>

              {/* Tests Completed Card */}
              <Card className="shadow-lg bg-white border-gray-300">
                <CardContent className="p-6 flex flex-col items-center space-y-4">
                  <Award className="h-8 w-8 text-gray-700" />
                  <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center">
                    <span className="text-2xl font-bold text-teal-600">
                      {submissionCount || 0}
                    </span>
                  </div>
                  <p className="font-medium text-gray-700">Bài đã làm</p>
                </CardContent>
              </Card>

              {/* Tests To Do Card */}
              <Card className="shadow-lg bg-white border-gray-300">
                <CardContent className="p-6 flex flex-col items-center space-y-4">
                  <Clipboard className="h-8 w-8 text-gray-700" />
                  <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center">
                    <span className="text-2xl font-bold text-orange-500">
                      0
                    </span>
                  </div>
                  <p className="font-medium text-gray-700">Bài cần làm</p>
                </CardContent>
              </Card>
            </div>

            {/* Profile Information Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Personal Information Form */}
              <Card className="shadow-lg bg-white border-gray-300">
                <CardContent className="p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-6">
                    Thông tin cá nhân
                  </h3>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email :</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        disabled
                        className="cursor-not-allowed bg-white border-gray-300"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="full_name">
                        Họ tên <span className="text-red-500">*</span> :
                      </Label>
                      <Input
                        id="full_name"
                        name="full_name"
                        value={formData.full_name}
                        onChange={handleInputChange}
                        required
                        className="bg-white border-gray-300"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="school">Trường học :</Label>
                      <Input
                        id="school"
                        name="school"
                        value={formData.school}
                        onChange={handleInputChange}
                        className="bg-white border-gray-300"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Số điện thoại :</Label>
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="bg-white border-gray-300"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="address">Địa chỉ :</Label>
                      <Input
                        id="address"
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        className="bg-white border-gray-300"
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-[#7ba7d6] hover:bg-[#6b97c6] text-white hover:cursor-pointer"
                    >
                      Cập nhật thông tin
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Change Password Form */}
              <Card className="shadow-lg bg-white border-gray-300">
                <CardContent className="p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-6">
                    Thay đổi mật khẩu
                  </h3>
                  <form onSubmit={handlePasswordSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword">
                        Mật khẩu hiện tại :
                      </Label>
                      <div className="relative">
                        <Input
                          id="currentPassword"
                          name="currentPassword"
                          type={showPasswords.current ? "text" : "password"}
                          value={passwordData.currentPassword}
                          onChange={handlePasswordChange}
                          className="bg-white border-gray-300"
                          required
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowPasswords({
                              ...showPasswords,
                              current: !showPasswords.current,
                            })
                          }
                          className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700"
                        >
                          {showPasswords.current ? (
                            <EyeOff className="h-5 w-5" />
                          ) : (
                            <Eye className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="newPassword">Mật khẩu mới :</Label>
                      <div className="relative">
                        <Input
                          id="newPassword"
                          name="newPassword"
                          type={showPasswords.new ? "text" : "password"}
                          value={passwordData.newPassword}
                          onChange={handlePasswordChange}
                          className="bg-white border-gray-300"
                          required
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowPasswords({
                              ...showPasswords,
                              new: !showPasswords.new,
                            })
                          }
                          className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700"
                        >
                          {showPasswords.new ? (
                            <EyeOff className="h-5 w-5" />
                          ) : (
                            <Eye className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">
                        Xác nhận mật khẩu :
                      </Label>
                      <div className="relative">
                        <Input
                          id="confirmPassword"
                          name="confirmPassword"
                          type={showPasswords.confirm ? "text" : "password"}
                          value={passwordData.confirmPassword}
                          onChange={handlePasswordChange}
                          className="bg-white border-gray-300"
                          required
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowPasswords({
                              ...showPasswords,
                              confirm: !showPasswords.confirm,
                            })
                          }
                          className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700"
                        >
                          {showPasswords.confirm ? (
                            <EyeOff className="h-5 w-5" />
                          ) : (
                            <Eye className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-[#7ba7d6] hover:bg-[#6b97c6] text-white hover:cursor-pointer"
                    >
                      Thay đổi mật khẩu
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
