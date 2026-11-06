"use client";

import { ArrowRight, FileQuestion, Plus, Sparkles, Upload } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

type QuestionEmptyStateProps = {
  topicId: string;
  chapterId?: string;
  onCreate: () => void;
};

/** Offers the existing question creation flows when the selected chapter is empty. */
export function QuestionEmptyState({
  topicId,
  chapterId,
  onCreate,
}: QuestionEmptyStateProps) {
  const t = useTranslations("lecturer.questions");
  const generationText = useTranslations("shared.questionGeneration");
  const query = { topic: topicId, ...(chapterId ? { chapter: chapterId } : {}) };

  const alternatives = [
    {
      pathname: "/lecturer/questions/import",
      icon: Upload,
      title: t("importWordExcel"),
      description: t("emptyQuestionsImportDescription"),
    },
    {
      pathname: "/lecturer/questions/generate",
      icon: Sparkles,
      title: generationText("title"),
      description: t("emptyQuestionsGenerateDescription"),
    },
  ];

  return (
    <section
      aria-labelledby="empty-questions-title"
      className="rounded-xl border border-blue-100 bg-gradient-to-b from-blue-50/60 via-white to-white px-4 py-8 sm:px-8 sm:py-10"
    >
      <div className="mx-auto flex max-w-xl flex-col items-center text-center">
        <div aria-hidden="true" className="relative mb-5 flex h-24 w-28 items-center justify-center">
          <div className="absolute h-24 w-24 rounded-full bg-blue-100/60" />
          <div className="absolute left-3 top-2 h-20 w-16 -rotate-12 rounded-xl border border-blue-200 bg-blue-50" />
          <div className="relative flex h-20 w-16 rotate-6 flex-col items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white shadow-sm">
            <FileQuestion className="h-8 w-8 text-[#0066cc]" strokeWidth={1.5} />
            <span className="h-1 w-8 rounded-full bg-blue-100" />
            <span className="h-1 w-5 rounded-full bg-blue-100" />
          </div>
          <span className="absolute bottom-0 right-1 flex h-8 w-8 items-center justify-center rounded-full border-4 border-white bg-[#0066cc] text-white">
            <Plus className="h-4 w-4" />
          </span>
        </div>
        <h3 id="empty-questions-title" className="text-lg font-semibold text-neutral-900">
          {t("noQuestionsYet")}
        </h3>
        <p className="mt-2 max-w-md text-sm leading-6 text-neutral-500">
          {t("emptyQuestionsDescription")}
        </p>
        <Button
          type="button"
          onClick={onCreate}
          className="mt-5 w-full cursor-pointer gap-2 bg-[#0066cc] text-white hover:bg-[#0052a3] sm:w-auto"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          {t("createFirstQuestion")}
        </Button>
      </div>

      <div className="@container mx-auto mt-7 max-w-2xl">
        <div className="mb-4 flex items-center gap-3 text-xs text-neutral-500">
          <span className="h-px flex-1 bg-gray-200" aria-hidden="true" />
          <span>{t("emptyQuestionsAlternatives")}</span>
          <span className="h-px flex-1 bg-gray-200" aria-hidden="true" />
        </div>
        <div className="grid gap-3 @min-[540px]:grid-cols-2">
          {alternatives.map(({ pathname, icon: Icon, title, description }) => (
            <Link
              key={pathname}
              href={{ pathname, query }}
              className="group flex min-w-0 items-center gap-3 rounded-lg border border-gray-200 bg-white p-4 text-left transition-colors hover:border-blue-200 hover:bg-blue-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066cc] focus-visible:ring-offset-2"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#0066cc]">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block break-words text-sm font-medium text-neutral-900">{title}</span>
                <span className="mt-1 block text-xs leading-5 text-neutral-500">{description}</span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-gray-400 group-hover:text-[#0066cc]" aria-hidden="true" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
