import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useS3 } from "@/hooks/useS3";
import type {
  ExamQuestionItem,
  ResolvedQuestionFile,
} from "../_components/types";

/**
 * Resolves the attachments (and the legacy single image) of the current
 * question into viewable URLs.
 */
export function useQuestionFiles(
  question: ExamQuestionItem | undefined,
  enabled: boolean,
): ResolvedQuestionFile[] {
  const t = useTranslations("student.exam");
  const { getViewUrl } = useS3("questions-images");
  const [files, setFiles] = useState<ResolvedQuestionFile[]>([]);

  useEffect(() => {
    let cancelled = false;

    const fetchFiles = async () => {
      if (!question) {
        if (!cancelled) setFiles([]);
        return;
      }

      const resolved: ResolvedQuestionFile[] = [];

      if (Array.isArray(question.files) && question.files.length > 0) {
        const sortedFiles = [...question.files].sort(
          (a, b) => (a.order ?? 0) - (b.order ?? 0),
        );
        for (const file of sortedFiles) {
          let resolvedUrl = file.url;
          if (file.url && !file.url.startsWith("http")) {
            try {
              const url = await getViewUrl(file.url);
              if (url) resolvedUrl = url;
            } catch (e) {
              console.error("Error resolving file URL:", e);
            }
          }
          resolved.push({
            id: file.id || file.url,
            url: resolvedUrl,
            name: file.name || t("attachedFiles"),
            type: file.type || "IMAGE",
          });
        }
      }

      if (question.image_url) {
        let imageUrl = question.image_url;
        if (!imageUrl.startsWith("http")) {
          try {
            const url = await getViewUrl(imageUrl);
            if (url) imageUrl = url;
          } catch (e) {
            console.error("Error resolving legacy image URL:", e);
          }
        }
        if (cancelled) return;
        if (!resolved.some((file) => file.url === imageUrl)) {
          resolved.unshift({
            id: "legacy-image",
            url: imageUrl,
            name: t("questionImage"),
            type: "IMAGE",
          });
        }
      }

      if (!cancelled) setFiles(resolved);
    };

    if (enabled && question) fetchFiles();
    return () => {
      cancelled = true;
    };
  }, [question, enabled, getViewUrl, t]);

  return files;
}
