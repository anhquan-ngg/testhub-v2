"use client";

import { useTranslations } from "next-intl";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ICON_TONE, iconAriaProps, useIconLabels } from "@/lib/icon-button";
import { IconTooltip } from "@/components/ui/icon-tooltip";

export function DeleteButton({
  title,
  description,
  onConfirm,
}: {
  title: string;
  description: string;
  onConfirm: () => Promise<void>;
}) {
  const t = useTranslations("lecturer.questions");
  const iconLabels = useIconLabels();
  return (
    <AlertDialog>
      <IconTooltip label={iconLabels.delete}>
        <AlertDialogTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            className={`h-8 w-8 hover:cursor-pointer ${ICON_TONE.danger}`}
            {...iconAriaProps(iconLabels.delete)}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </Button>
        </AlertDialogTrigger>
      </IconTooltip>
      <AlertDialogContent className="bg-white border-gray-300">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="hover:cursor-pointer">
            {t("cancel")}</AlertDialogCancel>
          <AlertDialogAction
            className="bg-red-600 hover:bg-red-700 text-white hover:cursor-pointer"
            onClick={() =>
              onConfirm().catch(() => toast.error(t("dataCannotBeDeleted")))
            }
          >
            {t("delete")}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
