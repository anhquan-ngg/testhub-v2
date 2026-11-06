"use client";

import type { Dispatch, SetStateAction } from "react";
import { FolderTree } from "lucide-react";
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

import type { Topic } from "../types";
import { formatDate } from "../utils";
import { DeleteButton } from "./delete-button";
import { EmptyRow } from "./empty-row";
import { PaginationControls } from "./pagination-controls";

type TopicListProps = {
  rows: Topic[];
  hasAnyTopic: boolean;
  isLoading: boolean;
  page: number;
  totalPages: number;
  setPage: Dispatch<SetStateAction<number>>;
  onOpen: (topic: Topic) => Promise<void>;
  onDelete: (topicId: string) => Promise<void>;
};

/** Table of topics with open/delete actions and pagination. */
export function TopicList({
  rows,
  hasAnyTopic,
  isLoading,
  page,
  totalPages,
  setPage,
  onOpen,
  onDelete,
}: TopicListProps) {
  const t = useTranslations("lecturer.questions");
  const iconLabels = useIconLabels();
  const locale = useLocale();

  const open = (topic: Topic) =>
    onOpen(topic).catch(() => toast.error(t("cannotOpenChapter")));

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow className="border-gray-300">
            <TableHead>{t("topicName")}</TableHead>
            <TableHead>{t("creationDate")}</TableHead>
            <TableHead className="text-center">{t("operation")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {hasAnyTopic ? (
            rows.map((topic) => (
              <TableRow
                key={topic.id}
                className="cursor-pointer border-gray-300"
                onClick={() => open(topic)}
              >
                <TableCell className="font-medium">{topic.name}</TableCell>
                <TableCell>
                  {formatDate(topic.created_at, intlLocales[locale])}
                </TableCell>
                <TableCell
                  className="text-center"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="flex justify-center gap-1">
                    <IconTooltip label={iconLabels.manageChapters}>
                      <Button
                        size="icon"
                        variant="ghost"
                        className={`h-8 w-8 hover:cursor-pointer ${ICON_TONE.primary}`}
                        onClick={() => open(topic)}
                        {...iconAriaProps(iconLabels.manageChapters)}
                      >
                        <FolderTree className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </IconTooltip>
                    <DeleteButton
                      title={t("deleteTopic")}
                      description={t("thisTopicAlongWithAllChapters")}
                      onConfirm={() => onDelete(topic.id)}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <EmptyRow
              colSpan={3}
              text={isLoading ? t("loadingData") : t("thereAreNoTopicsYet")}
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
