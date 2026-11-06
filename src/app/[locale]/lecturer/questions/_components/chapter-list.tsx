"use client";

import type { Dispatch, SetStateAction } from "react";
import { ListChecks, ListTree, Pencil } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { IconTooltip } from "@/components/ui/icon-tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { intlLocales } from "@/i18n/config";
import { ICON_TONE, iconAriaProps, useIconLabels } from "@/lib/icon-button";

import type { Chapter } from "../types";
import { formatDate } from "../utils";
import { DeleteButton } from "./delete-button";
import { EmptyRow } from "./empty-row";
import { PaginationControls } from "./pagination-controls";

type ChapterListProps = {
  rows: Chapter[];
  hasAnyChapter: boolean;
  isLoading: boolean;
  isSearching: boolean;
  page: number;
  totalPages: number;
  setPage: Dispatch<SetStateAction<number>>;
  getChildCount: (chapterId: string) => number;
  onOpenChildren: (chapter: Chapter) => void;
  onOpenQuestions: (chapter: Chapter) => Promise<void>;
  onEdit: (chapter: Chapter) => void;
  onDelete: (chapterId: string) => Promise<void>;
};

/** Table of the chapters at the current level with open/edit/delete actions. */
export function ChapterList({
  rows,
  hasAnyChapter,
  isLoading,
  isSearching,
  page,
  totalPages,
  setPage,
  getChildCount,
  onOpenChildren,
  onOpenQuestions,
  onEdit,
  onDelete,
}: ChapterListProps) {
  const t = useTranslations("lecturer.questions");
  const iconLabels = useIconLabels();
  const locale = useLocale();

  const openQuestions = (chapter: Chapter) =>
    onOpenQuestions(chapter).catch(() =>
      toast.error(t("unableToLoadQuestion")),
    );

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow className="border-gray-300">
            <TableHead>{t("chapter")}</TableHead>
            <TableHead>{t("order")}</TableHead>
            <TableHead>{t("updatedColumn")}</TableHead>
            <TableHead className="text-center">{t("operation")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {hasAnyChapter ? (
            rows.map((chapter) => {
              const childCount = getChildCount(chapter.id);
              return (
                <TableRow
                  key={chapter.id}
                  className="cursor-pointer border-gray-300"
                  onClick={() =>
                    childCount > 0
                      ? onOpenChildren(chapter)
                      : openQuestions(chapter)
                  }
                >
                  <TableCell className="font-medium">{chapter.name}</TableCell>
                  <TableCell>{chapter.order}</TableCell>
                  <TableCell>
                    {formatDate(chapter.updated_at, intlLocales[locale])}
                  </TableCell>
                  <TableCell
                    className="text-center"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="flex flex-wrap justify-center gap-1">
                      <IconTooltip
                        label={
                          childCount > 0
                            ? t("manageSubChaptersCount", { count: childCount })
                            : t("noSubChapters")
                        }
                        wrapDisabled={childCount === 0}
                      >
                        <Button
                          size="icon"
                          variant="ghost"
                          className={`relative h-8 w-8 hover:cursor-pointer ${ICON_TONE.primary} disabled:cursor-not-allowed disabled:opacity-40`}
                          disabled={childCount === 0}
                          onClick={() => onOpenChildren(chapter)}
                          {...iconAriaProps(
                            childCount > 0
                              ? iconLabels.manageSubChapters
                              : t("noSubChapters"),
                          )}
                        >
                          <ListTree className="h-4 w-4" aria-hidden="true" />
                          {childCount > 0 && (
                            <span
                              aria-hidden="true"
                              className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#0066cc] px-1 text-[10px] font-semibold leading-none text-white"
                            >
                              {childCount}
                            </span>
                          )}
                        </Button>
                      </IconTooltip>
                      <IconTooltip label={iconLabels.manageQuestions}>
                        <Button
                          size="icon"
                          variant="ghost"
                          className={`h-8 w-8 hover:cursor-pointer ${ICON_TONE.success}`}
                          onClick={() => openQuestions(chapter)}
                          {...iconAriaProps(iconLabels.manageQuestions)}
                        >
                          <ListChecks className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </IconTooltip>
                      <IconTooltip label={iconLabels.edit}>
                        <Button
                          size="icon"
                          variant="ghost"
                          className={`h-8 w-8 hover:cursor-pointer ${ICON_TONE.primary}`}
                          onClick={() => onEdit(chapter)}
                          {...iconAriaProps(iconLabels.edit)}
                        >
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </IconTooltip>
                      <DeleteButton
                        title={t("deleteChapters")}
                        description={t("thisChapterAndAllSubChapters")}
                        onConfirm={() => onDelete(chapter.id)}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          ) : (
            <EmptyRow
              colSpan={4}
              text={
                isLoading
                  ? t("loadingData")
                  : isSearching
                    ? t("noResultsFound")
                    : t("thereAreNoChaptersAtThis")
              }
            />
          )}
        </TableBody>
      </Table>

      <PaginationControls
        currentPage={page}
        totalPages={totalPages}
        setCurrentPage={setPage}
      />
    </>
  );
}
