"use client";

import { useTranslations } from "next-intl";
import { ChevronLeft, Clock, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Formats a number of seconds as mm:ss. */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

type ExamHeaderProps = {
  title: string;
  timeLeft: number;
  hideBackButton: boolean;
  onBack: () => void;
  onToggleSidebar: () => void;
  onSubmit: () => void;
};

/** Sticky exam header: back button, title, countdown timer and submit. */
export function ExamHeader({
  title,
  timeLeft,
  hideBackButton,
  onBack,
  onToggleSidebar,
  onSubmit,
}: ExamHeaderProps) {
  const t = useTranslations("student.exam");

  return (
    <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-gray-300 bg-white px-4 shadow-sm">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={onBack}
          className="gap-2 text-gray-500 hover:text-gray-700"
          title={t("returnToHomePage")}
          hidden={hideBackButton}
        >
          <ChevronLeft className="h-5 w-5" />
          {t("returnToHomepage")}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          className="lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <h1 className="max-w-[200px] truncate text-lg font-bold text-gray-900 md:max-w-md">
          {title}
        </h1>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-4 py-2">
          <Clock className="h-5 w-5 text-[#0066cc]" />
          <span className="font-mono text-lg font-bold text-sky-800">
            {formatTime(timeLeft)}
          </span>
        </div>
        <Button
          onClick={onSubmit}
          className="bg-[#0066cc] text-white shadow-sm transition-all hover:bg-[#0052a3]"
        >
          {t("submitYourAssignment")}
        </Button>
      </div>
    </header>
  );
}
