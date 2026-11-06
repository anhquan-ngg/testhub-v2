"use client";

import type { Dispatch, ReactNode, SetStateAction } from "react";
import { Eye, Loader2, Pencil } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { IconTooltip } from "@/components/ui/icon-tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MathRenderer } from "@/components/MathRenderer";
import { intlLocales } from "@/i18n/config";
import { ICON_TONE, iconAriaProps, useIconLabels } from "@/lib/icon-button";

import type { Question } from "../types";
import {
  formatDate,
  getQuestionAnswerText,
  getQuestionPreviewText,
} from "../utils";
import { BulkActionBar } from "./bulk-action-bar";
import { DeleteButton } from "./delete-button";
import { EmptyRow } from "./empty-row";
import { PaginationControls } from "./pagination-controls";
import { QuestionFormatBadge, QuestionTypeBadge } from "./question-badges";

type QuestionListProps = {
  rows: Question[];
  hasAnyQuestion: boolean;
  isLoading: boolean;
  isFiltering: boolean;
  emptyState: ReactNode;
  page: number;
  totalPages: number;
  setPage: Dispatch<SetStateAction<number>>;
  selectedIds: Set<string>;
  onSelectAll: (checked: boolean) => void;
  onToggleSelect: (questionId: string, checked: boolean) => void;
  onClearSelection: () => void;
  onBulkDelete: () => Promise<void>;
  loadingDetailId: string | null;
  loadingEditId: string | null;
  onView: (questionId: string) => void;
  onEdit: (questionId: string) => void;
  onDelete: (questionId: string) => Promise<void>;
};

/** Selectable table of questions with bulk actions, row actions and pagination. */
export function QuestionList({
  rows,
  hasAnyQuestion,
  isLoading,
  isFiltering,
  emptyState,
  page,
  totalPages,
  setPage,
  selectedIds,
  onSelectAll,
  onToggleSelect,
  onClearSelection,
  onBulkDelete,
  loadingDetailId,
  loadingEditId,
  onView,
  onEdit,
  onDelete,
}: QuestionListProps) {
  const t = useTranslations("lecturer.questions");
  const iconLabels = useIconLabels();
  const locale = useLocale();

  const allSelected = rows.length > 0 && rows.every((q) => selectedIds.has(q.id));
  const someSelected = rows.some((q) => selectedIds.has(q.id));

  if (!isLoading && !hasAnyQuestion && !isFiltering) {
    return <>{emptyState}</>;
  }

  return (
    <>
      <BulkActionBar
        count={selectedIds.size}
        onClear={onClearSelection}
        onDelete={onBulkDelete}
      />
      <Table>
        <TableHeader>
          <TableRow className="border-gray-300">
            <TableHead className="w-10">
              <Checkbox
                aria-label={t("selectAll")}
                disabled={rows.length === 0}
                checked={allSelected ? true : someSelected ? "indeterminate" : false}
                onCheckedChange={(checked) => onSelectAll(checked === true)}
              />
            </TableHead>
            <TableHead className="w-[40%]">{t("question")}</TableHead>
            <TableHead>
              {t("questionTypeLabel")} / {t("questionFormatLabel")}
            </TableHead>
            <TableHead>{t("answer")}</TableHead>
            <TableHead>{t("updatedColumn")}</TableHead>
            <TableHead className="text-center">{t("operation")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {hasAnyQuestion ? (
            rows.map((question) => (
              <TableRow
                key={question.id}
                className="cursor-pointer border-gray-300"
                data-state={selectedIds.has(question.id) ? "selected" : undefined}
                onClick={() => onView(question.id)}
              >
                <TableCell onClick={(event) => event.stopPropagation()}>
                  <Checkbox
                    aria-label={t("selectRow")}
                    checked={selectedIds.has(question.id)}
                    onCheckedChange={(checked) =>
                      onToggleSelect(question.id, checked === true)
                    }
                  />
                </TableCell>
                <TableCell className="w-[40%] max-w-[420px]">
                  <div
                    className="line-clamp-2 max-w-[420px] overflow-hidden whitespace-normal text-sm leading-5"
                    title={question.question_text}
                  >
                    <MathRenderer
                      content={getQuestionPreviewText(question.question_text)}
                    />
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col items-start gap-1">
                    <QuestionTypeBadge type={question.question_type} />
                    <QuestionFormatBadge format={question.question_format} />
                  </div>
                </TableCell>
                <TableCell
                  className="max-w-[160px] truncate"
                  title={getQuestionAnswerText(question)}
                >
                  {getQuestionAnswerText(question)}
                </TableCell>
                <TableCell>
                  {formatDate(question.updated_at, intlLocales[locale])}
                </TableCell>
                <TableCell
                  className="text-center"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="flex justify-center gap-1">
                    <IconTooltip label={iconLabels.viewDetails}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-8 w-8 hover:cursor-pointer ${ICON_TONE.primary}`}
                        disabled={loadingDetailId === question.id}
                        onClick={() => onView(question.id)}
                        {...iconAriaProps(iconLabels.viewDetails)}
                      >
                        {loadingDetailId === question.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        ) : (
                          <Eye className="h-4 w-4" aria-hidden="true" />
                        )}
                      </Button>
                    </IconTooltip>
                    <IconTooltip label={iconLabels.edit}>
                      <Button
                        size="icon"
                        variant="ghost"
                        className={`h-8 w-8 hover:cursor-pointer ${ICON_TONE.primary}`}
                        disabled={loadingEditId === question.id}
                        {...iconAriaProps(iconLabels.edit)}
                        onClick={() => onEdit(question.id)}
                      >
                        {loadingEditId === question.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        ) : (
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                        )}
                      </Button>
                    </IconTooltip>
                    <DeleteButton
                      title={t("deleteQuestion")}
                      description={t("theQuestionWillBeRemovedFrom")}
                      onConfirm={() => onDelete(question.id)}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <EmptyRow
              colSpan={6}
              text={
                isLoading
                  ? t("loadingData")
                  : isFiltering
                    ? t("noResultsFound")
                    : t("noQuestionsYet")
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
