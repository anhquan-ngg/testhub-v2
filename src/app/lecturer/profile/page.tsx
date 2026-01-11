"use client";

import type React from "react";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, Eye, EyeOff, Loader2 } from "lucide-react";
import { useAppDispatch, useAppSelector, useUser } from "@/store/hook";
import { useMinIO } from "@/hook/useMinIO";
import { toast } from "sonner";
import { login as loginAction } from "@/store/slices/userSlice";
import { useUpdateUser } from "../../../../generated/hooks";
import axiosClient from "@/lib/axios";

export default function LecturerProfile() {
  const user = useAppSelector((state) => state.user);
  const dispatch = useAppDispatch();
  const { uploadFile, getViewUrl } = useMinIO("avatars");

  const [formData, setFormData] = useState({
    email: "lecturer@email.com",
    username: "",
  });

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

  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData({
      ...passwordData,
      [name]: value,
    });
  };

  const updateUserMutation = useUpdateUser();

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);

      // 1. Hiển thị preview ảnh
      const reader = new FileReader();
      reader.onload = (event) => {
        setProfileImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);

      // 2. Upload file lên MinIO
      await uploadFile(file);

      // 3. Cập nhật avatar_url trong Redux store (chỉ lưu file.name)
      dispatch(
        loginAction({
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          avatar_url: file.name,
          role: user.role!,
        })
      );

      // 4. Cập nhật avatar_url trên backend (chỉ lưu file.name)
      await updateUserMutation.mutateAsync({
        where: { id: user.id },
        data: {
          avatar_url: file.name,
        },
      });

      toast.success("Cập nhật ảnh đại diện thành công!");
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Lỗi khi tải ảnh lên. Vui lòng thử lại.");
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.username) {
      toast.error("Tên giảng viên không được để trống");
    }

    try {
      await updateUserMutation.mutateAsync({
        where: { id: user.id },
        data: {
          full_name: formData.username,
        },
      });
      toast.success("Cập nhật thông tin giảng viên thành công!");
    } catch (error) {
      toast.error("Lỗi khi cập nhật thông tin giảng viên. Vui lòng thử lại.");
      console.log(error);
    }
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

  useEffect(() => {
    const loadAvatarUrl = async () => {
      // Chỉ load avatar nếu user đã login VÀ có avatar_url
      if (!user.id || !user.isLoggedIn) {
        return;
      }

      if (user.avatar_url) {
        try {
          const avatarUrl = await getViewUrl(user.avatar_url);
          setProfileImage(avatarUrl);
        } catch (error) {
          console.warn("Could not load avatar URL:", error);
          setProfileImage(user.avatar_url);
        }
      } else {
        console.log("User has no avatar_url (null/empty)");
      }
    };

    loadAvatarUrl();
  }, [user.avatar_url]);

  useEffect(() => {
    if (user) {
      setFormData({
        email: user.email,
        username: user.full_name,
      });
    }
  }, [user]);

  return (
    <div className="space-y-6">
      {/* Profile Picture Card */}
      <Card className="shadow-lg bg-white border-gray-300">
        <CardContent className="p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">
            Ảnh cá nhân
          </h3>
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center border-4 border-gray-300 overflow-hidden">
                {profileImage ? (
                  <img
                    src={profileImage}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Camera className="h-12 w-12 text-gray-400" />
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 bg-[#0066cc] text-white rounded-full p-3 shadow-lg hover:bg-[#0052a3] transition-colors"
              >
                <Camera className="h-5 w-5" />
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="bg-[#7ba7d6] hover:bg-[#6b97c6] text-white hover:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Đang tải lên...
                </>
              ) : (
                "Thay đổi ảnh"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Information Form */}
        <Card className="shadow-lg bg-white border-gray-300">
          <CardContent className="p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">
              Thông tin cá nhân
            </h3>
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email :</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  disabled
                  className="bg-gray-200 border-gray-300 cursor-not-allowed "
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">
                  Tên người dùng <span className="text-red-500">*</span> :
                </Label>
                <Input
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  className="bg-white border-gray-300"
                  required
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
                <Label htmlFor="currentPassword">Mật khẩu hiện tại :</Label>
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
                <Label htmlFor="confirmPassword">Xác nhận mật khẩu :</Label>
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
  );
}
