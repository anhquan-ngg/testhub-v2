"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Trash2, X } from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

/**
 * Toolbar shown above the question table while rows are selected.
 * Offers clearing the selection and a confirmed bulk delete.
 */
export function BulkActionBar({
  count,
  onClear,
  onDelete,
}: {
  count: number;
  onClear: () => void;
  onDelete: () => Promise<void>;
}) {
  const t = useTranslations("lecturer.questions");
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (count === 0) return null;

  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete();
      setOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      role="region"
      aria-live="polite"
      className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2"
    >
      <span className="text-sm font-medium text-blue-800">
        {t("selectedCount", { count })}
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="cursor-pointer gap-1 text-blue-800 hover:bg-blue-100 hover:text-blue-900"
          onClick={onClear}
        >
          <X className="h-4 w-4" aria-hidden="true" />
          {t("clearSelection")}
        </Button>
        <Button
          size="sm"
          className="cursor-pointer gap-1 bg-red-600 text-white hover:bg-red-700"
          onClick={() => setOpen(true)}
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          {t("deleteSelected")}
        </Button>
      </div>

      <AlertDialog open={open} onOpenChange={(next) => !isDeleting && setOpen(next)}>
        <AlertDialogContent className="bg-white border-gray-300">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteSelectedTitle", { count })}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteSelectedDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting} className="hover:cursor-pointer">
              {t("cancel")}
            </AlertDialogCancel>
            <Button
              disabled={isDeleting}
              onClick={() => void confirmDelete()}
              className="bg-red-600 text-white hover:cursor-pointer hover:bg-red-700"
            >
              {isDeleting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              )}
              {t("delete")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
