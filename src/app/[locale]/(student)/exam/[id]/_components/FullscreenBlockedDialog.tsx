"use client";

import { useTranslations } from "next-intl";
import { AlertCircle, Clock, Maximize } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type FullscreenBlockedDialogProps = {
  open: boolean;
  hasExitedFullscreen: boolean;
  timeLabel: string;
  onResume: () => void;
};

/** Modal that hides the exam until the student returns to fullscreen. */
export function FullscreenBlockedDialog({
  open,
  hasExitedFullscreen,
  timeLabel,
  onResume,
}: FullscreenBlockedDialogProps) {
  const t = useTranslations("student.exam");

  return (
    <Dialog open={open}>
      <DialogContent
        showCloseButton={false}
        onEscapeKeyDown={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle
              className={`h-5 w-5 ${hasExitedFullscreen ? "text-red-600" : "text-[#0066cc]"}`}
            />
            {hasExitedFullscreen
              ? t("fullscreenExitedTitle")
              : t("fullscreenRequiredTitle")}
          </DialogTitle>
          <DialogDescription>
            {hasExitedFullscreen
              ? t("fullscreenExitedDescription")
              : t("fullscreenRequiredDescription")}
          </DialogDescription>
        </DialogHeader>
        <p className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <Clock className="h-4 w-4" />
          {t("fullscreenTimeLeft", { time: timeLabel })}
        </p>
        <DialogFooter>
          <Button
            className="bg-[#0066cc] text-white hover:bg-[#0052a3]"
            onClick={onResume}
          >
            <Maximize className="mr-2 h-4 w-4" />
            {t("fullscreenResume")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
