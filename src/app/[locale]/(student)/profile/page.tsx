"use client";

import { useTranslations } from "next-intl";
import type React from "react";

import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Camera, EyeOff, Eye, Loader2 } from "lucide-react";
import StudentSideBar from "@/components/common/student/sidebar";
import StudentMenu from "@/components/common/student/menu";
import apiClient from "@/lib/api-client";
import { toast } from "sonner";
import { useAppSelector, useAppDispatch } from "@/store/hook";
import { setUser } from "@/store/slices/authSlice";

import { useS3 } from "@/hooks/useS3";
import { useFiles } from "@/hooks/useFiles";
import { ENDPOINTS } from "@/constants/endpoints";

type PageResult<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
};

export default function StudentProfile() {
  const t = useTranslations("student.profile");
  const student = useAppSelector((state) => state.user);
  const dispatch = useAppDispatch();
  const { getViewUrl: getLegacyAvatarViewUrl } = useS3("avatars");
  const { uploadAvatar, markFileDeletedByUrl } = useFiles();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [submissionCount, setSubmissionCount] = useState(0);
  const [userRegistrations, setUserRegistrations] = useState<any[]>([]);
  const [completedSubmissions, setCompletedSubmissions] = useState<any[]>([]);

  useEffect(() => {
    const loadProfileSummary = async () => {
      if (!student.id) return;

      try {
        const [registrationsResponse, submissionsResponse] = await Promise.all([
          apiClient.get<PageResult<any>>(ENDPOINTS.EXAM_REGISTRATIONS.BASE, {
            params: {
              page: 1,
              limit: 100,
              student_id: student.id,
            },
          }),
          apiClient.get<PageResult<any>>(ENDPOINTS.SUBMISSIONS.BASE, {
            params: {
              page: 1,
              limit: 100,
              student_id: student.id,
              status: "COMPLETED",
            },
          }),
        ]);

        setUserRegistrations(registrationsResponse.data.data ?? []);
        setCompletedSubmissions(submissionsResponse.data.data ?? []);
        setSubmissionCount(submissionsResponse.data.total ?? 0);
      } catch (error) {
        console.error("Fetch profile summary error:", error);
        toast.error(t("unableToLoadProfileDataPlease"));
        setUserRegistrations([]);
        setCompletedSubmissions([]);
        setSubmissionCount(0);
      }
    };

    void loadProfileSummary();
  }, [student.id, t]);

  useEffect(() => {
    const fetchAvatar = async () => {
      const avatar = student.avatar_url;
      if (avatar?.startsWith("http")) {
        setAvatarUrl(avatar);
      } else if (avatar) {
        const legacyUrl = await getLegacyAvatarViewUrl(avatar);
        setAvatarUrl(legacyUrl ?? avatar);
      }
    };
    fetchAvatar();
  }, [getLegacyAvatarViewUrl, student.avatar_url]);

  //Filter for official (non-practice) exams
  const officialExamIds =
    userRegistrations
      ?.filter((reg: any) => reg.exam?.practice === false)
      .map((reg: any) => reg.exam_id) || [];

  // Calculate pending exams (registered but not completed)
  const pendingExamsCount =
    officialExamIds.length -
    completedSubmissions.filter((submission: any) =>
      officialExamIds.includes(submission.exam_id),
    ).length;

  const [formData, setFormData] = useState({
    email: student.email || "",
    full_name: student.full_name || "",
    school: student.school || "",
    phone: student.phone || "",
    address: student.address || "",
  });

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      email: student.email || "",
      full_name: student.full_name || "",
      school: student.school || "",
      phone: student.phone || "",
      address: student.address || "",
    }));
  }, [
    student.address,
    student.email,
    student.full_name,
    student.phone,
    student.school,
  ]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student.id) return;

    const trimmedSchool = formData.school.trim();
    const trimmedPhone = formData.phone.trim();
    const trimmedAddress = formData.address.trim();

    const updatePayload = {
      full_name: formData.full_name,
      school: trimmedSchool,
      phone: trimmedPhone,
      address: trimmedAddress,
    };

    try {
      await apiClient.patch(ENDPOINTS.USERS.DETAIL(student.id), {
        ...updatePayload,
      });
      toast.success(t("updatedInformationSuccessfully"));
      dispatch(
        setUser({
          id: student.id,
          full_name: formData.full_name,
          email: student.email,
          school: trimmedSchool,
          phone: trimmedPhone,
          address: trimmedAddress,
          avatar_url: student.avatar_url,
          role: student.role ?? "STUDENT",
        }),
      );
    } catch (error) {
      console.error("Update failed:", error);
      toast.error(t("updateFailedPleaseTryAgain"));
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error(t("newPasswordDoesNotMatch"));
      return;
    }

    try {
      const response = await apiClient.post("/auth/change-password", {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      if (response.status === 200) {
        toast.success(t("passwordChangeSuccessful"));
      }
    } catch (error) {
      toast.error(t("errorWhenChangingPasswordPleaseTry"));
      console.log(error);
    } finally {
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !student.id) return;

    try {
      setIsUploading(true);
      const oldAvatarUrl = student.avatar_url;

      const reader = new FileReader();
      reader.onload = (event) => {
        setAvatarUrl(event.target?.result as string);
      };
      reader.readAsDataURL(file);

      const uploadedFile = await uploadAvatar(file, student.id);
      await markFileDeletedByUrl(oldAvatarUrl, student.id);
      setAvatarUrl(uploadedFile.url);

      dispatch(
        setUser({
          id: student.id,
          full_name: student.full_name,
          email: student.email,
          school: student.school,
          phone: student.phone,
          address: student.address,
          avatar_url: uploadedFile.url,
          role: student.role ?? "STUDENT",
        }),
      );
      toast.success(t("updatedProfilePictureSuccessfully"));
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error(t("errorUploadingPhotoPleaseTryAgain"));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="flex min-h-screen bg-neutral-100">
      {/* Sidebar */}
      <StudentSideBar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <StudentMenu />
        <main className="flex-1 px-6 pb-10 pt-7 md:px-8">
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Profile Picture Card */}
              <Card className="shadow-lg bg-white border-gray-300">
                <CardContent className="p-6 flex flex-col items-center space-y-4">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center border-4 border-gray-300 overflow-hidden">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt={t("avatarAlt")}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="h-12 w-12 text-gray-500" />
                      )}
                    </div>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="absolute bottom-0 right-0 bg-[#0066cc] text-white rounded-full p-2 shadow-lg hover:bg-[#0052a3] transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:cursor-pointer"
                    >
                      {isUploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Camera className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <p className="font-semibold text-gray-900">
                    {student.full_name}
                  </p>
                </CardContent>
              </Card>

              {/* Tests Completed Card */}
              <Card className="shadow-lg bg-white border-gray-300">
                <CardContent className="p-6 flex flex-col items-center justify-center space-y-6">
                  <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center">
                    <span className="text-2xl font-bold text-teal-600">
                      {submissionCount || 0}
                    </span>
                  </div>
                  <p className="font-medium text-gray-700">{t("lessonDone")}</p>
                </CardContent>
              </Card>

              {/* Tests To Do Card */}
              <Card className="shadow-lg bg-white border-gray-300">
                <CardContent className="p-6 flex flex-col items-center justify-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center">
                    <span className="text-2xl font-bold text-orange-500">
                      {pendingExamsCount}
                    </span>
                  </div>
                  <p className="font-medium text-gray-700">{t("lessonsToBeDone")}</p>
                </CardContent>
              </Card>
            </div>

            {/* Profile Information Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Personal Information Form */}
              <Card className="shadow-lg bg-white border-gray-300">
                <CardContent className="p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-6">
                    {t("personalInformation")}</h3>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">{t("emailLabel")}</Label>
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
                        {t("fullName")}<span className="text-red-500">*</span> :
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
                      <Label htmlFor="school">{t("school")}</Label>
                      <Input
                        id="school"
                        name="school"
                        value={formData.school}
                        onChange={handleInputChange}
                        className="bg-white border-gray-300"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">{t("phoneNumber")}</Label>
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
                      <Label htmlFor="address">{t("address")}</Label>
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
                      {t("updateInformation")}</Button>
                  </form>
                </CardContent>
              </Card>

              {/* Change Password Form */}
              <Card className="shadow-lg bg-white border-gray-300">
                <CardContent className="p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-6">
                    {t("changePassword")}</h3>
                  <form onSubmit={handlePasswordSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword">
                        {t("currentPassword")}</Label>
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
                      <Label htmlFor="newPassword">{t("newPassword")}</Label>
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
                        {t("confirmPassword")}</Label>
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
                      {t("changePassword")}</Button>
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
