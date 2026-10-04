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
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "@/components/common/LanguageSwitcher";
import authServices from "@/services/authServices";
import { toast } from "sonner";

export default function SignupPage() {
  const t = useTranslations("auth");
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSignup = async () => {
    try {
      const res = await authServices.signup(form as any);
      if (res.status === 201) {
        toast.success(t("signup.success"));
      }
    } catch (error) {
      toast.error(t("signup.failed"));
      console.error("Error when sign up:", error);
    } finally {
      setForm({
        full_name: "",
        email: "",
        password: "",
        confirmPassword: "",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#a8c5e6] to-[#d4e4f7]">
      <div className="w-full max-w-md space-y-8">
        <div className="flex justify-end">
          <LanguageSwitcher />
        </div>
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
              {t("signup.title")}
            </CardTitle>
            <CardDescription className="text-base">
              {t("signup.haveAccount")}{" "}
              <Link
                href="/login"
                className="text-[#0066cc] hover:underline font-medium"
              >
                {t("signup.loginNow")}
              </Link>
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form
              className="space-y-5"
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                handleSignup();
              }}
            >
              {/* Full Name Field */}
              <div className="space-y-2">
                <Label
                  htmlFor="fullname"
                  className="text-sm font-medium text-black"
                >
                  {t("fullName")} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="fullname"
                  type="text"
                  placeholder=""
                  className="h-12 rounded-full border-gray-300"
                  value={form.full_name}
                  onChange={(e) =>
                    setForm({ ...form, full_name: e.target.value })
                  }
                />
              </div>

              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-black">
                  {t("email")} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder=""
                  className="h-12 rounded-full border-gray-300"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label
                  htmlFor="password"
                  className="text-sm font-medium text-black"
                >
                  {t("password")} <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder=""
                    className="pr-10 h-12 rounded-full border-gray-300"
                    value={form.password}
                    onChange={(e) =>
                      setForm({ ...form, password: e.target.value })
                    }
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
                  {t("confirmPassword")} <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder=""
                    className="pr-10 h-12 rounded-full border-gray-300"
                    value={form.confirmPassword}
                    onChange={(e) =>
                      setForm({ ...form, confirmPassword: e.target.value })
                    }
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
              <Button
                type="submit"
                className="w-full h-12 rounded-full bg-[#0066cc] hover:bg-[#0052a3] hover:cursor-pointer text-white font-medium text-base mt-6"
              >
                {t("signup.title")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
