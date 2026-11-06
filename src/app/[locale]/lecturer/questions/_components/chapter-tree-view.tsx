"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  GripVertical,
  ListChecks,
  Pencil,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { IconTooltip } from "@/components/ui/icon-tooltip";
import { ICON_TONE, iconAriaProps, useIconLabels } from "@/lib/icon-button";
import type { Chapter } from "../types";
import { DeleteButton } from "./delete-button";

type ChapterTreeViewProps = {
  chapters: Chapter[];
  rootParentId: string | null;
  keyword: string;
  isLoading: boolean;
  onOpenQuestions: (chapter: Chapter) => void;
  onEdit: (chapter: Chapter) => void;
  onAddChild: (chapter: Chapter) => void;
  onDelete: (chapterId: string) => Promise<void>;
  onReorder: (orderedSiblings: Chapter[]) => Promise<void>;
};

type DropTarget = { id: string; position: "before" | "after" };

/**
 * Expandable tree of chapters and sub-chapters with the same row actions
 * as the list view. While searching, matching branches are expanded.
 */
export function ChapterTreeView({
  chapters,
  rootParentId,
  keyword,
  isLoading,
  onOpenQuestions,
  onEdit,
  onAddChild,
  onDelete,
  onReorder,
}: ChapterTreeViewProps) {
  const t = useTranslations("lecturer.questions");
  const iconLabels = useIconLabels();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const normalizedKeyword = keyword.trim().toLowerCase();
  const canReorder = !normalizedKeyword;

  const childrenByParent = useMemo(() => {
    const map = new Map<string | null, Chapter[]>();
    for (const chapter of chapters) {
      const key = chapter.parent_id ?? null;
      map.set(key, [...(map.get(key) ?? []), chapter]);
    }
    for (const list of map.values()) list.sort((a, b) => a.order - b.order);
    return map;
  }, [chapters]);

  const visibleIds = useMemo(() => {
    if (!normalizedKeyword) return null;
    const visible = new Set<string>();
    const walk = (parentId: string | null): boolean => {
      let any = false;
      for (const chapter of childrenByParent.get(parentId) ?? []) {
        const childMatch = walk(chapter.id);
        const selfMatch = chapter.name.toLowerCase().includes(normalizedKeyword);
        if (selfMatch || childMatch) {
          visible.add(chapter.id);
          any = true;
        }
      }
      return any;
    };
    walk(rootParentId);
    return visible;
  }, [childrenByParent, normalizedKeyword, rootParentId]);

  const roots = (childrenByParent.get(rootParentId) ?? []).filter(
    (chapter) => !visibleIds || visibleIds.has(chapter.id),
  );

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  const expandAll = () =>
    setExpanded(
      new Set(
        chapters
          .filter((chapter) => childrenByParent.has(chapter.id))
          .map((chapter) => chapter.id),
      ),
    );

  const chaptersById = useMemo(
    () => new Map(chapters.map((chapter) => [chapter.id, chapter])),
    [chapters],
  );

  const isSibling = (a: Chapter, b: Chapter) =>
    (a.parent_id ?? null) === (b.parent_id ?? null);

  const endDrag = () => {
    setDraggingId(null);
    setDropTarget(null);
  };

  const handleDrop = (target: Chapter) => {
    const dragged = draggingId ? chaptersById.get(draggingId) : undefined;
    const position = dropTarget?.id === target.id ? dropTarget.position : "before";
    endDrag();
    if (!dragged || dragged.id === target.id || !isSibling(dragged, target)) return;

    const siblings = (childrenByParent.get(target.parent_id ?? null) ?? []).filter(
      (chapter) => chapter.id !== dragged.id,
    );
    const targetIndex = siblings.findIndex((chapter) => chapter.id === target.id);
    siblings.splice(targetIndex + (position === "after" ? 1 : 0), 0, dragged);
    void onReorder(siblings);
  };

  const renderNode = (chapter: Chapter, depth: number) => {
    const dragged = draggingId ? chaptersById.get(draggingId) : undefined;
    const isDropCandidate = !!dragged && dragged.id !== chapter.id && isSibling(dragged, chapter);
    const dropIndicator =
      isDropCandidate && dropTarget?.id === chapter.id
        ? dropTarget.position === "before"
          ? "border-t-2 border-t-[#0066cc]"
          : "border-b-2 border-b-[#0066cc]"
        : "";
    const children = (childrenByParent.get(chapter.id) ?? []).filter(
      (child) => !visibleIds || visibleIds.has(child.id),
    );
    const hasChildren = (childrenByParent.get(chapter.id) ?? []).length > 0;
    const isOpen = hasChildren && (!!visibleIds || expanded.has(chapter.id));
    const NodeIcon = isOpen ? FolderOpen : Folder;

    return (
      <li key={chapter.id} role="treeitem" aria-selected={false} aria-expanded={hasChildren ? isOpen : undefined}>
        <div
          className={`group flex cursor-pointer items-center gap-2 border-b border-gray-200 py-1.5 pr-2 hover:bg-gray-50 ${
            draggingId === chapter.id ? "opacity-40" : ""
          } ${dropIndicator}`}
          style={{ paddingLeft: depth * 24 + 8 }}
          onClick={() => (hasChildren ? toggle(chapter.id) : onOpenQuestions(chapter))}
          onDragOver={(event) => {
            if (!isDropCandidate) return;
            event.preventDefault();
            const rect = event.currentTarget.getBoundingClientRect();
            const position = event.clientY < rect.top + rect.height / 2 ? "before" : "after";
            if (dropTarget?.id !== chapter.id || dropTarget.position !== position) {
              setDropTarget({ id: chapter.id, position });
            }
          }}
          onDrop={(event) => {
            event.preventDefault();
            handleDrop(chapter);
          }}
        >
          {canReorder && (
            <span
              draggable
              role="button"
              tabIndex={-1}
              aria-label={iconLabels.reorder}
              title={iconLabels.reorder}
              className="flex h-6 w-4 shrink-0 cursor-grab items-center justify-center text-gray-400 hover:text-[#0066cc] active:cursor-grabbing"
              onClick={(event) => event.stopPropagation()}
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", chapter.id);
                setDraggingId(chapter.id);
              }}
              onDragEnd={endDrag}
            >
              <GripVertical className="h-4 w-4" aria-hidden="true" />
            </span>
          )}
          <span className="flex h-6 w-6 shrink-0 items-center justify-center">
            {hasChildren && (
              <button
                type="button"
                className="rounded-sm text-gray-500 hover:cursor-pointer hover:text-[#0066cc]"
                aria-label={isOpen ? iconLabels.collapse : iconLabels.expand}
                onClick={(event) => {
                  event.stopPropagation();
                  toggle(chapter.id);
                }}
              >
                {isOpen ? (
                  <ChevronDown className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            )}
          </span>
          <NodeIcon className="h-4 w-4 shrink-0 text-[#0066cc]" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate text-sm font-medium" title={chapter.name}>
            {chapter.name}
          </span>
          {hasChildren && (
            <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
              {t("subChapterBadge", { count: childrenByParent.get(chapter.id)?.length ?? 0 })}
            </span>
          )}
          <div
            className="flex shrink-0 gap-1"
            onClick={(event) => event.stopPropagation()}
          >
            <IconTooltip label={iconLabels.manageQuestions}>
              <Button
                size="icon"
                variant="ghost"
                className={`h-8 w-8 hover:cursor-pointer ${ICON_TONE.success}`}
                onClick={() => onOpenQuestions(chapter)}
                {...iconAriaProps(iconLabels.manageQuestions)}
              >
                <ListChecks className="h-4 w-4" aria-hidden="true" />
              </Button>
            </IconTooltip>
            <IconTooltip label={t("addSubChapter")}>
              <Button
                size="icon"
                variant="ghost"
                className={`h-8 w-8 hover:cursor-pointer ${ICON_TONE.primary}`}
                onClick={() => onAddChild(chapter)}
                {...iconAriaProps(t("addSubChapter"))}
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
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
        </div>
        {isOpen && children.length > 0 && (
          <ul role="group">{children.map((child) => renderNode(child, depth + 1))}</ul>
        )}
      </li>
    );
  };

  if (roots.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        {isLoading
          ? t("loadingData")
          : normalizedKeyword
            ? t("noResultsFound")
            : t("thereAreNoChaptersAtThis")}
      </p>
    );
  }

  return (
    <div>
      <div className="mb-2 flex justify-end gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="cursor-pointer text-[#0066cc] hover:bg-primary/10 hover:text-[#0066cc]"
          onClick={expandAll}
        >
          {t("expandAll")}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="cursor-pointer text-muted-foreground"
          onClick={() => setExpanded(new Set())}
        >
          {t("collapseAll")}
        </Button>
      </div>
      <ul role="tree" className="border-t border-gray-200">
        {roots.map((chapter) => renderNode(chapter, 0))}
      </ul>
    </div>
  );
}
