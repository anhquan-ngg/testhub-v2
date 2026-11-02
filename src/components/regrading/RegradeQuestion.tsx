"use client";

import { useTranslations } from "next-intl";
import { MathRenderer } from "@/components/MathRenderer";
import { Badge } from "@/components/ui/badge";
import { regradeOptions } from "@/lib/regrading";
import type { RegradeQuestion as Question } from "@/types/regrading";

/** Show the candidate's answers alongside the answer key for every question type. */
export function RegradeQuestion({ item }: { item: Question }) {
  const t = useTranslations("shared.regrading");
  const options = regradeOptions(item.question.options);
  const selected = regradeOptions(item.options).filter((option) => option.isCorrect);
  const displayed = [...options, ...selected.filter((option) => !options.some((key) => key.text === option.text))];

  return (
    <div className="min-w-0 space-y-4 break-words">
      <MathRenderer content={item.question.question_text} className="whitespace-pre-wrap" />
      {displayed.length > 0 && (
        <div className="space-y-2">
          {displayed.map((option, index) => (
            <div key={index} className="flex flex-wrap items-center gap-2 rounded-md border p-3">
              <MathRenderer content={option.text} className="min-w-0 flex-1" />
              {selected.some((value) => value.text === option.text) && <Badge variant="secondary">{t("selected")}</Badge>}
              {options.some((value) => value.text === option.text && value.isCorrect) && <Badge variant="outline">{t("correctAnswer")}</Badge>}
            </div>
          ))}
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-md border bg-muted/40 p-3">
          <p className="mb-2 text-sm font-semibold">{t("candidateAnswer")}</p>
          <MathRenderer content={item.answer || selected.map((option) => option.text).join("; ") || t("noAnswer")} className="whitespace-pre-wrap" />
        </div>
        <div className="rounded-md border p-3">
          <p className="mb-2 text-sm font-semibold">{t("correctAnswer")}</p>
          <MathRenderer content={item.question.correct_answer || options.filter((option) => option.isCorrect).map((option) => option.text).join("; ") || t("noAnswerKey")} className="whitespace-pre-wrap" />
        </div>
      </div>
      {item.question.files?.length ? (
        <div className="space-y-3">
          <p className="text-sm font-semibold">{t("attachments")}</p>
          {[...item.question.files].sort((a, b) => a.order - b.order).map(({ file }) => (
            <div key={file.id} className="min-w-0 space-y-2">
              {file.type === "IMAGE" && (
                // Signed URLs may use arbitrary storage hosts and must not go through the image optimizer.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={file.url} alt={file.name || t("attachment")} className="max-h-80 max-w-full rounded-md object-contain" />
              )}
              {file.type === "AUDIO" && <audio src={file.url} controls preload="metadata" className="w-full" />}
              {file.type === "VIDEO" && <video src={file.url} controls preload="metadata" className="max-h-96 w-full" />}
              <a href={file.url} target="_blank" rel="noopener noreferrer" className="break-all text-sm text-blue-700 underline">
                {file.name || t("attachment")}
              </a>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
