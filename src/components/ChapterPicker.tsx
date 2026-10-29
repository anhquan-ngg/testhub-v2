"use client";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  buildChapterPaths,
  chapterPath,
  type ChapterNode,
} from "@/lib/chapter-tree";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

/** Search and page an arbitrary-depth flat adjacency list, without nested DOM recursion. */
export function ChapterPicker({
  chapters,
  value,
  onChange,
  disabled = false,
}: {
  chapters: ChapterNode[];
  value?: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("lecturer.editExam");
  const [search, setSearch] = useState(""),
    [page, setPage] = useState(0);
  const byId = useMemo(
    () => new Map(chapters.map((node) => [node.id, node])),
    [chapters],
  );
  const paths = useMemo(() => buildChapterPaths(chapters), [chapters]);
  const matches = useMemo(() => {
    if (!search.trim()) return chapters;
    const ids = paths.search(search);
    return chapters.filter((node) => ids.has(node.id));
  }, [chapters, paths, search]);
  const selected = value ? byId.get(value) : undefined;
  const pages = Math.ceil(matches.length / 50),
    safePage = Math.min(page, Math.max(0, pages - 1));
  return (
    <div className="space-y-2 min-w-0">
      <p
        className="break-words text-sm"
        title={selected ? chapterPath(selected.id, byId) : undefined}
      >
        {selected
          ? chapterPath(selected.id, byId, 8)
          : t("chooseChapterAtAnyDepth")}
      </p>
      <Input
        disabled={disabled}
        aria-label={t("searchChapterPath")}
        placeholder={t("searchChapterPath")}
        value={search}
        onChange={(event) => {
          setSearch(event.target.value);
          setPage(0);
        }}
      />
      <select
        disabled={disabled}
        aria-label={t("chapter")}
        className="w-full min-w-0 rounded border bg-background p-2 text-sm"
        value={
          value &&
          matches
            .slice(safePage * 50, (safePage + 1) * 50)
            .some((node) => node.id === value)
            ? value
            : ""
        }
        onChange={(event) => {
          if (event.target.value) onChange(event.target.value);
        }}
      >
        <option value="">{t("chooseChapterAtAnyDepth")}</option>
        {matches.slice(safePage * 50, (safePage + 1) * 50).map((node) => (
          <option key={node.id} value={node.id}>
            {chapterPath(node.id, byId, 8)}
          </option>
        ))}
      </select>
      {pages > 1 && (
        <div className="flex items-center gap-2 text-xs">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={disabled || !safePage}
            onClick={() => setPage(safePage - 1)}
          >
            ‹
          </Button>
          <span>
            {safePage + 1}/{pages}
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={disabled || safePage + 1 >= pages}
            onClick={() => setPage(safePage + 1)}
          >
            ›
          </Button>
        </div>
      )}
    </div>
  );
}
