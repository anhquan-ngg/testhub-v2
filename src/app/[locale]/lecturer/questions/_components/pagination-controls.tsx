"use client";

import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PaginationControls({
  currentPage,
  totalPages,
  setCurrentPage,
}: {
  currentPage: number;
  totalPages: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
}) {
  const t = useTranslations("lecturer.questions");
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-end space-x-2 py-4">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
        className="bg-[#0066cc] hover:bg-[#0052a3] border-none text-white hover:cursor-pointer"
        disabled={currentPage === 1}
      >
        <ChevronLeft className="h-4 w-4" />
        {t("before")}</Button>
      <div className="text-sm font-medium">
                {t("pageOf", { page: currentPage, total: totalPages })}
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
        className="bg-[#0066cc] hover:bg-[#0052a3] border-none text-white hover:cursor-pointer"
        disabled={currentPage === totalPages}
      >
        {t("next")}
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
