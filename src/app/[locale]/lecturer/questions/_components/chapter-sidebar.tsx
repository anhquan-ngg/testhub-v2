"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronRight, FileQuestion, FolderTree } from "lucide-react";
import type { Chapter } from "../types";

type ChapterSidebarProps = {
  topicName: string;
  chapters: Chapter[];
  activeChapterId: string | null;
  onSelect: (chapter: Chapter) => void;
};

/**
 * Compact chapter navigator shown next to the question list so lecturers can
 * switch chapters without going back through the breadcrumb.
 */
export function ChapterSidebar({
  topicName,
  chapters,
  activeChapterId,
  onSelect,
}: ChapterSidebarProps) {
  const t = useTranslations("lecturer.questions");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const childrenByParent = useMemo(() => {
    const map = new Map<string | null, Chapter[]>();
    for (const chapter of chapters) {
      const key = chapter.parent_id ?? null;
      map.set(key, [...(map.get(key) ?? []), chapter]);
    }
    for (const list of map.values()) list.sort((a, b) => a.order - b.order);
    return map;
  }, [chapters]);

  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  const renderLevel = (parentId: string | null, depth: number) => {
    const items = childrenByParent.get(parentId) ?? [];
    if (items.length === 0) return null;
    return (
      <ul role={depth === 0 ? "tree" : "group"} className="space-y-0.5">
        {items.map((chapter) => {
          const hasChildren = childrenByParent.has(chapter.id);
          const isOpen = hasChildren && !collapsed.has(chapter.id);
          const isActive = chapter.id === activeChapterId;
          return (
            <li
              key={chapter.id}
              role="treeitem"
              aria-selected={isActive}
              aria-expanded={hasChildren ? isOpen : undefined}
            >
              <div
                className={`flex items-center rounded-md ${
                  isActive
                    ? "bg-blue-50 text-[#0066cc]"
                    : "text-neutral-700 hover:bg-gray-100"
                }`}
                style={{ paddingLeft: depth * 12 }}
              >
                {hasChildren ? (
                  <button
                    type="button"
                    aria-label={chapter.name}
                    className="flex h-7 w-6 shrink-0 items-center justify-center text-gray-500 hover:cursor-pointer"
                    onClick={() => toggle(chapter.id)}
                  >
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                ) : (
                  <span className="w-6 shrink-0" aria-hidden="true" />
                )}
                <button
                  type="button"
                  title={chapter.name}
                  aria-current={isActive ? "page" : undefined}
                  className={`min-w-0 flex-1 truncate py-1.5 pr-2 text-left text-sm hover:cursor-pointer ${
                    isActive ? "font-semibold" : ""
                  }`}
                  onClick={() => onSelect(chapter)}
                >
                  {chapter.name}
                </button>
              </div>
              {isOpen && renderLevel(chapter.id, depth + 1)}
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <aside
      aria-label={t("chapterSidebarLabel")}
      className="rounded-lg border border-gray-300 bg-white p-3 shadow-sm lg:sticky lg:top-4 lg:max-h-[calc(100vh-6rem)] lg:self-start lg:overflow-y-auto"
    >
      <div className="mb-2 flex items-center gap-2 border-b border-gray-200 pb-2 text-sm font-semibold text-neutral-900">
        <FolderTree className="h-4 w-4 shrink-0 text-[#0066cc]" aria-hidden="true" />
        <span className="truncate" title={topicName}>
          {topicName}
        </span>
      </div>
      {chapters.length === 0 ? (
        <p className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
          <FileQuestion className="h-4 w-4" aria-hidden="true" />
          {t("thereAreNoChaptersAtThis")}
        </p>
      ) : (
        renderLevel(null, 0)
      )}
    </aside>
  );
}
