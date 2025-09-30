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
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";

export default function SignupPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#a8c5e6] to-[#d4e4f7]">
      <div className="w-full max-w-md space-y-8">
        {/* Logo/Brand */}
        <div className="text-center">
          <h1 className="text-5xl font-bold text-[#0066cc] tracking-tight">
            TESTHUB
          </h1>
        </div>

        {/* Signup Card */}
        <Card className="shadow-xl border-0 bg-white text-gray-500">
          <CardHeader className="space-y-2 text-center pb-4">
            <CardTitle className="text-2xl font-semibold text-black">
              Đăng ký
            </CardTitle>
            <CardDescription className="text-base">
              Bạn đã có tài khoản?{" "}
              <Link
                href="/login"
                className="text-[#0066cc] hover:underline font-medium"
              >
                Đăng nhập ngay
              </Link>
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            {/* Full Name Field */}
            <div className="space-y-2">
              <Label
                htmlFor="fullname"
                className="text-sm font-medium text-black"
              >
                Họ và tên <span className="text-red-500">*</span>
              </Label>
              <Input
                id="fullname"
                type="text"
                placeholder=""
                className="h-12 rounded-full border-gray-300"
              />
            </div>

            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-black">
                Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder=""
                className="h-12 rounded-full border-gray-300"
              />
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label
                htmlFor="password"
                className="text-sm font-medium text-black"
              >
                Mật khẩu <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder=""
                  className="pr-10 h-12 rounded-full border-gray-300"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 hover:cursor-pointer" />
                  ) : (
                    <Eye className="h-5 w-5 hover:cursor-pointer" />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-2">
              <Label
                htmlFor="confirmPassword"
                className="text-sm font-medium text-black"
              >
                Nhập lại mật khẩu <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder=""
                  className="pr-10 h-12 rounded-full border-gray-300"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors border-gray-300"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5 hover:cursor-pointer" />
                  ) : (
                    <Eye className="h-5 w-5 hover:cursor-pointer" />
                  )}
                </button>
              </div>
            </div>

            {/* Signup Button */}
            <Button className="w-full h-12 rounded-full bg-[#0066cc] hover:bg-[#0052a3] hover:cursor-pointer text-white font-medium text-base mt-6">
              Đăng ký
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
