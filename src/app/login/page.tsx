"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";

import { Eye, EyeOff, Lock, Mail, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const GoogleLogo = () => (
  <svg
    className="h-5 w-5"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

const OutlookLogo = () => (
  <svg
    className="h-5 w-5"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M13 4.5h7.5v6.25H13V4.5z" fill="#0078D4" />
    <path d="M13 11.25h7.5v6.25H13v-6.25z" fill="#28A8EA" />
    <path
      d="M20.5 6.75H22v10.5l-8.9 2.9v-3.05l5.9-3.35-5.9-3.35V7.25l7.4-.5z"
      fill="#50D9FF"
    />
    <path d="M2 6.5l10.5-2v15L2 17.5v-11z" fill="#0078D4" />
    <path
      d="M6.98 9.22c-1.48 0-2.43 1.18-2.43 2.8 0 1.6.93 2.76 2.36 2.76 1.48 0 2.43-1.15 2.43-2.82 0-1.56-.9-2.74-2.36-2.74zm-.03 1.11c.72 0 1.14.69 1.14 1.67 0 1.03-.42 1.67-1.13 1.67-.7 0-1.15-.66-1.15-1.66 0-1.01.44-1.68 1.14-1.68z"
      fill="#FFFFFF"
    />
  </svg>
);

export default function LoginPage() {
  const { handleLogin, handleGoogleLogin, handleOutlookLogin } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 !bg-gradient-to-br !from-[#a8c5e6] !to-[#d4e4f7]">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          {/* Logo */}
          <h1 className="text-5xl font-bold text-[#0066cc] tracking-tight">
            TESTHUB
          </h1>
        </div>

        {/* Login Card */}
        <Card className="shadow-xl border-0 bg-white text-gray-500">
          <CardHeader className="space-y-2 text-center pb-4">
            <CardTitle className="text-2xl font-semibold text-black">
              Đăng nhập
            </CardTitle>
            <CardDescription className="text-base">
              Bạn chưa có tài khoản?{" "}
              <Link
                href="/signup"
                className="text-[#0066cc] hover:underline font-medium"
              >
                Đăng ký ngay
              </Link>
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Email Field */}
            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="block text-left text-black text-sm font-medium"
              >
                Email <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder=""
                  className="pl-10 h-12 rounded-full border-gray-300"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label
                htmlFor="password"
                className="block text-left text-black text-sm font-medium"
              >
                Mật khẩu <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder=""
                  className="pl-10 pr-10 h-12 rounded-full border-gray-300"
                  onChange={(e) => setPassword(e.target.value)}
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

            {/* Login Button */}
            <Button
              className="w-full h-12 rounded-full bg-[#0066cc] hover:bg-[#0052a3] hover:cursor-pointer text-white font-medium text-base"
              onClick={(e) => {
                e.preventDefault();
                handleLogin({ email, password });
              }}
            >
              Đăng nhập
            </Button>

            <div className="relative flex items-center gap-2">
              <Separator className="flex-1 bg-gray-200" />
              <span className="text-xs text-muted-foreground uppercase px-2">
                Hoặc
              </span>
              <Separator className="flex-1 bg-gray-200" />
            </div>

            <div className="w-full flex flex-col gap-3 justify-center">
              {/* Gmail Login Button */}
              <Button
                variant="outline"
                className="w-full h-12 rounded-full border-gray-300 border-1 hover:bg-accent hover:cursor-pointer font-medium text-base text-black bg-transparent"
                onClick={() => handleGoogleLogin()}
              >
                <GoogleLogo />
                Đăng nhập bằng Gmail
              </Button>

              {/* Outlook Login Button */}
              <Button
                variant="outline"
                className="w-full h-12 rounded-full border-gray-300 border-1 hover:bg-accent hover:cursor-pointer font-medium text-base text-black bg-transparent"
                onClick={() => handleOutlookLogin()}
              >
                <OutlookLogo />
                Đăng nhập bằng Outlook
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
