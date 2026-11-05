"use client";

import { useTranslations } from "next-intl";
import type React from "react";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Camera,
  Eye,
  EyeOff,
  GraduationCap,
  KeyRound,
  Loader2,
  LockKeyhole,
  Mail,
  Save,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hook";
import { useS3 } from "@/hooks/useS3";
import { useFiles } from "@/hooks/useFiles";
import { toast } from "sonner";
import { setUser } from "@/store/slices/authSlice";
import apiClient from "@/lib/api-client";
import { ENDPOINTS } from "@/constants/endpoints";
import { iconLabelProps, useIconLabels } from "@/lib/icon-button";

/** Renders the lecturer's profile, avatar and account security forms. */
export default function LecturerProfile() {
  const t = useTranslations("lecturer.profile");
  const iconLabels = useIconLabels();
  const user = useAppSelector((state) => state.user);
  const dispatch = useAppDispatch();
  const { getViewUrl: getLegacyAvatarViewUrl } = useS3("avatars");
  const { uploadAvatar, markFileDeletedByUrl } = useFiles();

  const [formData, setFormData] = useState({
    email: "",
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!user.id) return;

    try {
      setIsUploading(true);
      const oldAvatarUrl = user.avatar_url;

      // 1. Hiển thị preview ảnh
      const reader = new FileReader();
      reader.onload = (event) => {
        setProfileImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);

      // 2. Upload file lên S3
      const uploadedFile = await uploadAvatar(file, user.id);
      setProfileImage(uploadedFile.url);

      // 3. Cập nhật avatar_url trong Redux store (chỉ lưu file.name)
      dispatch(
        setUser({
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          school: user.school,
          phone: user.phone,
          address: user.address,
          avatar_url: uploadedFile.url,
          role: user.role ?? "LECTURER",
        }),
      );
      toast.success(t("updatedProfilePictureSuccessfully"));
      if (oldAvatarUrl && oldAvatarUrl !== uploadedFile.url) {
        try { await markFileDeletedByUrl(oldAvatarUrl, user.id); } catch {
          console.warn("Unable to clean up previous avatar");
        }
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error(t("errorUploadingPhotoPleaseTryAgain"));
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
      toast.error(t("instructorNameCannotBeLeftBlank"));
      return;
    }

    try {
      await apiClient.patch(ENDPOINTS.USERS.DETAIL(user.id), {
        full_name: formData.username,
      });
      toast.success(t("updatedInstructorInformationSuccessfully"));
      dispatch(
        setUser({
          id: user.id,
          email: user.email,
          school: user.school,
          phone: user.phone,
          address: user.address,
          avatar_url: user.avatar_url,
          role: user.role ?? "LECTURER",
          full_name: formData.username,
        }),
      );
    } catch (error) {
      toast.error(t("errorUpdatingInstructorInformationPleaseTry"));
      console.log(error);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error(t("newPasswordDoesNotMatch"));
      return;
    }

    try {
      await apiClient.post("/auth/change-password", {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      toast.success(t("passwordChangeSuccessful"));
    } catch {
      toast.error(t("errorWhenChangingPasswordPleaseTry"));
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

      if (user.avatar_url?.startsWith("http")) {
        setProfileImage(user.avatar_url);
      } else if (user.avatar_url) {
        const legacyAvatarUrl = await getLegacyAvatarViewUrl(user.avatar_url);
        setProfileImage(legacyAvatarUrl ?? user.avatar_url);
      } else {
        console.log("User has no avatar_url (null/empty)");
      }
    };

    loadAvatarUrl();
  }, [getLegacyAvatarViewUrl, user.avatar_url, user.id, user.isLoggedIn]);

  useEffect(() => {
    setFormData({ email: user.email, username: user.full_name });
  }, [user.email, user.full_name]);

  return (
    <div className="w-full min-w-0 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          {t("pageTitle")}
        </h1>
        <p className="mt-1.5 text-sm leading-6 text-gray-500">
          {t("pageDescription")}
        </p>
      </div>

      <Card className="relative overflow-hidden border-blue-100 bg-white py-0 shadow-sm">
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-[#0066cc]" />
        <CardContent className="relative isolate flex flex-col gap-6 overflow-hidden bg-gradient-to-br from-blue-50/80 via-white to-white p-5 sm:flex-row sm:items-center sm:p-7">
          <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-24 -z-10 size-72 rounded-full border border-blue-100/80 bg-blue-50/40" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-28 right-24 -z-10 size-52 rounded-full border border-blue-100/60" />
          <div className="flex min-w-0 flex-1 items-center gap-4 sm:gap-5">
            <div className="relative shrink-0">
              <div className="flex size-20 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-blue-100 shadow-sm sm:size-28">
                {profileImage ? (
                  <img
                    src={profileImage}
                    alt={t("avatarAlt")}
                    className="size-full object-cover"
                  />
                ) : (
                  <UserRound className="size-11 text-[#0066cc]" aria-hidden="true" />
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="absolute bottom-0 right-0 flex size-9 items-center justify-center rounded-full border-2 border-white bg-[#0066cc] text-white shadow-sm transition-colors hover:bg-[#0052a3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066cc] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                {...iconLabelProps(iconLabels.uploadPhoto)}
              >
                {isUploading ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Camera className="size-4" aria-hidden="true" />
                )}
              </button>
            </div>
            <div className="min-w-0 space-y-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100/80 px-2.5 py-1 text-xs font-medium text-[#0066cc]">
                <GraduationCap className="size-3.5" aria-hidden="true" />
                {t("lecturerRole")}
              </span>
              <h2 className="break-words text-xl font-semibold text-gray-900 sm:text-2xl">
                {user.full_name || t("pageTitle")}
              </h2>
              <p className="flex items-start gap-2 text-sm text-gray-500">
                <Mail className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span className="break-all">{user.email}</span>
              </p>
            </div>
          </div>
          <div className="space-y-2 border-t border-blue-100 pt-4 sm:max-w-48 sm:shrink-0 sm:border-0 sm:pt-0">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              aria-label={t("changePhoto")}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="w-full border-blue-200 bg-white text-[#0066cc] hover:bg-blue-50 hover:text-[#0052a3]"
            >
              {isUploading ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Camera className="size-4" aria-hidden="true" />
              )}
              {isUploading ? t("uploading") : t("changePhoto")}
            </Button>
            <p className="text-xs leading-5 text-gray-500">{t("photoDescription")}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid min-w-0 grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <Card className="gap-0 border-gray-200 bg-white py-0 shadow-sm">
          <div className="flex items-start gap-3 border-b border-gray-100 p-5 sm:p-6">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#0066cc]">
              <UserRound className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-gray-900">{t("personalInformation")}</h2>
              <p className="mt-1 text-sm leading-5 text-gray-500">{t("personalDescription")}</p>
            </div>
          </div>
          <CardContent className="p-0">
            <form onSubmit={handleProfileSubmit}>
              <div className="space-y-5 p-5 sm:p-6">
                <div className="space-y-2">
                  <Label htmlFor="email">{t("emailLabel")}</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={formData.email}
                    disabled
                    aria-describedby="email-help"
                    className="h-10 cursor-not-allowed border-gray-200 bg-gray-50 disabled:opacity-100"
                  />
                  <p id="email-help" className="flex items-start gap-1.5 text-xs leading-5 text-gray-500">
                    <LockKeyhole className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                    {t("emailHelp")}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username">
                    {t("userName")} <span className="text-red-500" aria-hidden="true">*</span>
                  </Label>
                  <Input
                    id="username"
                    name="username"
                    autoComplete="name"
                    value={formData.username}
                    onChange={handleInputChange}
                    aria-describedby="name-help"
                    className="h-10 border-gray-200 bg-white"
                    required
                  />
                  <p id="name-help" className="text-xs leading-5 text-gray-500">{t("nameHelp")}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-b-xl border-t border-gray-100 bg-gray-50/70 p-5 sm:px-6 sm:py-4">
                <p className="text-xs text-gray-500">{t("requiredFields")}</p>
                <Button type="submit" className="w-full bg-[#0066cc] text-white hover:bg-[#0052a3] sm:w-auto">
                  <Save className="size-4" aria-hidden="true" />
                  {t("updateInformation")}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="gap-0 border-gray-200 bg-white py-0 shadow-sm">
          <div className="flex items-start gap-3 border-b border-gray-100 p-5 sm:p-6">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#0066cc]">
              <ShieldCheck className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-gray-900">{t("changePassword")}</h2>
              <p className="mt-1 text-sm leading-5 text-gray-500">{t("passwordDescription")}</p>
            </div>
          </div>
          <CardContent className="p-0">
            <form onSubmit={handlePasswordSubmit}>
              <div className="space-y-4 p-5 sm:p-6">
                {([
                  { name: "currentPassword", visibility: "current", autoComplete: "current-password" },
                  { name: "newPassword", visibility: "new", autoComplete: "new-password" },
                  { name: "confirmPassword", visibility: "confirm", autoComplete: "new-password" },
                ] as const).map(({ name, visibility, autoComplete }) => (
                  <div key={name} className="space-y-2">
                    <Label htmlFor={name}>{t(name)}</Label>
                    <div className="relative">
                      <Input
                        id={name}
                        name={name}
                        type={showPasswords[visibility] ? "text" : "password"}
                        autoComplete={autoComplete}
                        value={passwordData[name]}
                        onChange={handlePasswordChange}
                        className="h-10 border-gray-200 bg-white pr-12"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords((previous) => ({
                          ...previous,
                          [visibility]: !previous[visibility],
                        }))}
                        aria-pressed={showPasswords[visibility]}
                        aria-controls={name}
                        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-md text-gray-400 transition-colors hover:text-[#0066cc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        {...iconLabelProps(showPasswords[visibility] ? iconLabels.hidePassword : iconLabels.showPassword)}
                      >
                        {showPasswords[visibility] ? (
                          <EyeOff className="size-4" aria-hidden="true" />
                        ) : (
                          <Eye className="size-4" aria-hidden="true" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-b-xl border-t border-gray-100 bg-gray-50/70 p-5 sm:px-6 sm:py-4">
                <p className="flex items-center gap-1.5 text-xs text-gray-500">
                  <KeyRound className="size-3.5 shrink-0" aria-hidden="true" />
                  {t("passwordHelp")}
                </p>
                <Button type="submit" className="w-full bg-[#0066cc] text-white hover:bg-[#0052a3] sm:w-auto">
                  <LockKeyhole className="size-4" aria-hidden="true" />
                  {t("changePassword")}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      <aside aria-labelledby="profile-security-note" className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/60 p-4 sm:p-5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-[#0066cc]">
          <ShieldCheck className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 id="profile-security-note" className="text-sm font-medium text-gray-900">{t("securityNoteTitle")}</h2>
          <p className="mt-1 text-sm leading-6 text-gray-500">{t("securityNoteDescription")}</p>
        </div>
      </aside>
    </div>
  );
}
