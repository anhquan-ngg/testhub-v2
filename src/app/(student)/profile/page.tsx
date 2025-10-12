"use client";

import type React from "react";

import { useState } from "react";
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

export default function StudentProfile() {
  const [formData, setFormData] = useState({
    email: "user@email.com",
    fullName: "Username",
    school: "",
    phone: "",
    address: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Updated profile:", formData);
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
                    <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center border-4 border-gray-300">
                      <User className="h-12 w-12 text-gray-500" />
                    </div>
                  </div>
                  <p className="font-semibold text-gray-900">Username</p>
                </CardContent>
              </Card>

              {/* Tests Completed Card */}
              <Card className="shadow-lg bg-white border-gray-300">
                <CardContent className="p-6 flex flex-col items-center space-y-4">
                  <Award className="h-8 w-8 text-gray-700" />
                  <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center">
                    <span className="text-2xl font-bold text-teal-600">0</span>
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
                      <Label htmlFor="fullName">
                        Họ tên <span className="text-red-500">*</span> :
                      </Label>
                      <Input
                        id="fullName"
                        name="fullName"
                        value={formData.fullName}
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
                      className="w-full bg-[#7ba7d6] hover:bg-[#6b97c6] text-white"
                    >
                      Cập nhật thông tin
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
