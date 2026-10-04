"use client";

import type React from "react";

import {
  Users,
  FileText,
  HelpCircle,
  BarChart3,
  ChevronDown,
  User,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import NotificationBell from "@/components/NotificationBell";
import { LanguageSwitcher } from "@/components/common/LanguageSwitcher";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations("adminLayout");
  const tCommon = useTranslations("common");
  const pathname = usePathname();
  const { handleLogout } = useAuth();

  return (
    <div
      className="min-h-screen flex"
      style={{
        background: "linear-gradient(to bottom right, #a8c5e6, #d4e4f7)",
      }}
    >
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-lg flex flex-col">
        <div className="p-6 border-b border-gray-300 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-[#0066cc]">TESTHUB</h1>
            <h2 className="text-sm font-medium text-gray-600">
              {t("subtitle")}
            </h2>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <Link href="/dashboard">
            <button
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors hover:cursor-pointer ${
                pathname === "/dashboard"
                  ? "bg-blue-50 text-[#0066cc]"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <BarChart3 className="h-5 w-5" />
              <span className="font-medium">{t("scoreAnalytics")}</span>
            </button>
          </Link>

          <Link href="/dashboard/users">
            <button
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors hover:cursor-pointer ${
                pathname.startsWith("/dashboard/users")
                  ? "bg-blue-50 text-[#0066cc]"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Users className="h-5 w-5" />
              <span className="font-medium">{t("userManagement")}</span>
            </button>
          </Link>

          <Link href="/dashboard/exams">
            <button
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors hover:cursor-pointer ${
                pathname.startsWith("/dashboard/exams")
                  ? "bg-blue-50 text-[#0066cc]"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <FileText className="h-5 w-5" />
              <span className="font-medium">{t("examManagement")}</span>
            </button>
          </Link>

          <Link href="/dashboard/questions">
            <button
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors hover:cursor-pointer ${
                pathname.startsWith("/dashboard/questions")
                  ? "bg-blue-50 text-[#0066cc]"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <HelpCircle className="h-5 w-5" />
              <span className="font-medium">{t("questionBank")}</span>
            </button>
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-transparent p-6 flex justify-end items-center gap-3">
          <LanguageSwitcher />
          <NotificationBell />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-2 bg-white/50 hover:bg-white/80 hover:cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                  <User className="h-5 w-5 text-gray-600" />
                </div>
                <span className="font-medium">{t("administrator")}</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-48 bg-white border-gray-300"
            >
              <DropdownMenuItem
                className="text-red-600 hover:cursor-pointer"
                onClick={() => handleLogout()}
              >
                {tCommon("logout")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="flex-1 px-8 pb-8 overflow-y-auto overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
