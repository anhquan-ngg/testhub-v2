"use client";

import { useTranslations } from "next-intl";
import { ExternalLink, FileQuestion } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fileIcon, formatFileSize, getFileType } from "../utils";
import type { QuestionFile } from "../types";

export function QuestionFilesList({ files }: { files?: QuestionFile[] }) {
  const t = useTranslations("lecturer.questions");
  if (!files?.length) {
    return (
      <div className="rounded-md border border-dashed border-gray-300 bg-white px-3 py-4 text-sm text-gray-500">
        {t("thereAreNoAttachedFiles")}</div>
    );
  }

  return (
    <div className="grid min-w-0 max-w-full gap-2">
      {files.map((item) => {
        const fileSize = formatFileSize(item.file.size);

        return (
          <div
            key={item.file.id}
            className="flex min-w-0 max-w-full flex-col gap-3 overflow-hidden rounded-md border border-gray-300 bg-white px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-gray-50 text-gray-600">
                {fileIcon(item.file.type)}
              </div>
              <div className="min-w-0 flex-1 overflow-hidden">
                <div
                  className="block max-w-full truncate font-medium text-gray-900"
                  title={item.file.name}
                >
                  {item.file.name}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                  <Badge variant="outline" className="h-5 px-2">
                    {item.file.type}
                  </Badge>
                  {fileSize && <span>{fileSize}</span>}
                </div>
              </div>
            </div>

            {item.file.url && (
              <Button
                asChild
                variant="outline"
                size="sm"
                className="shrink-0 self-start border-gray-300 hover:cursor-pointer sm:self-center"
              >
                <a href={item.file.url} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  {t("openTheFile")}</a>
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function SelectedFilesList({ files }: { files: File[] }) {
  return (
    <div className="grid gap-2 md:grid-cols-2">
      {files.map((file, index) => {
        const type = getFileType(file);
        return (
          <div
            key={`${file.name}-${index}`}
            className="flex min-w-0 items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
          >
            {type ? fileIcon(type) : <FileQuestion className="h-4 w-4" />}
            <span className="min-w-0 flex-1 truncate" title={file.name}>
              {file.name}
            </span>
            {type && <Badge variant="outline">{type}</Badge>}
          </div>
        );
      })}
    </div>
  );
}
