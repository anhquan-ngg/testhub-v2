"use client";

import { useTranslations } from "next-intl";
import { ExternalLink, FileText, Video, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ResolvedQuestionFile } from "./types";

const MEDIA_TYPES = ["IMAGE", "VIDEO", "AUDIO"];

/** Renders the images, videos, audio clips and documents attached to a question. */
export function QuestionMedia({ files }: { files: ResolvedQuestionFile[] }) {
  const t = useTranslations("student.exam");

  if (files.length === 0) return null;

  const images = files.filter((f) => f.type === "IMAGE");
  const videos = files.filter((f) => f.type === "VIDEO");
  const audios = files.filter((f) => f.type === "AUDIO");
  const documents = files.filter((f) => !MEDIA_TYPES.includes(f.type));

  return (
    <div className="not-prose mb-4 space-y-4">
      {images.length > 0 && (
        <div className="flex flex-wrap justify-center gap-4">
          {images.map((file) => (
            <div key={file.id} className="relative max-w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={file.url}
                alt={file.name || "Question Image"}
                className="max-h-96 w-auto rounded-lg border border-gray-200 object-contain shadow-sm"
              />
            </div>
          ))}
        </div>
      )}

      {videos.length > 0 && (
        <div className="space-y-3">
          {videos.map((file) => (
            <div
              key={file.id}
              className="overflow-hidden rounded-lg border border-gray-200 bg-black shadow-sm"
            >
              <div className="flex items-center gap-2 bg-gray-900 px-3 py-1.5 text-xs font-medium text-gray-200">
                <Video className="h-4 w-4 text-sky-400" />
                <span className="truncate">{file.name}</span>
              </div>
              <video controls className="max-h-96 w-full" preload="metadata">
                <source src={file.url} />
                {t("yourBrowserDoesNotSupportVideo")}
              </video>
            </div>
          ))}
        </div>
      )}

      {audios.length > 0 && (
        <div className="space-y-3">
          {audios.map((file) => (
            <div
              key={file.id}
              className="flex flex-col gap-2 rounded-lg border border-violet-200 bg-violet-50 p-3"
            >
              <div className="flex items-center gap-2 text-sm font-medium text-violet-800">
                <Volume2 className="h-4 w-4 text-violet-600" />
                <span className="truncate">{file.name || t("audioFiles")}</span>
              </div>
              <audio controls className="w-full">
                <source src={file.url} />
                {t("yourBrowserDoesNotSupportAudio")}
              </audio>
            </div>
          ))}
        </div>
      )}

      {documents.length > 0 && (
        <div className="space-y-2">
          {documents.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm"
            >
              <div className="flex min-w-0 items-center gap-2">
                <FileText className="h-5 w-5 shrink-0 text-gray-500" />
                <span className="truncate text-gray-700">{file.name}</span>
              </div>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="shrink-0 gap-1"
              >
                <a href={file.url} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" /> {t("viewDownload")}
                </a>
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
