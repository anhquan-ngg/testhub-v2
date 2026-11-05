"use client";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
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
  id,
}: {
  chapters: ChapterNode[];
  value?: string;
  onChange: (id: string) => void;
  disabled?: boolean;
  id?: string;
}) {
  const t = useTranslations("lecturer.editExam");
  const [search, setSearch] = useState(""),
    [page, setPage] = useState(0);
  const paths = useMemo(() => buildChapterPaths(chapters), [chapters]);
  const { byId } = paths;
  const matches = useMemo(() => {
    if (!search.trim()) return chapters;
    const ids = paths.search(search);
    return chapters.filter((node) => ids.has(node.id));
  }, [chapters, paths, search]);
  const selected = value ? byId.get(value) : undefined;
  const pages = Math.ceil(matches.length / 50),
    safePage = Math.min(page, Math.max(0, pages - 1));
  const selectedPath = selected ? chapterPath(selected.id, byId, 8) : "";
  return (
    <div className="min-w-0 space-y-1.5">
      <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="relative min-w-0">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400"
            aria-hidden="true"
          />
          <Input
            disabled={disabled}
            aria-label={t("searchChapterPath")}
            placeholder={t("searchChapterPath")}
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(0);
            }}
            className="border-gray-300 bg-white pl-9"
          />
        </div>
        <select
          id={id}
          disabled={disabled}
          aria-label={t("chapter")}
          title={selected ? paths.get(selected.id) : undefined}
          className="h-9 w-full min-w-0 truncate rounded-md border border-gray-300 bg-white px-3 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
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
      </div>
      {selectedPath.length > 40 && (
        <p
          className="break-words text-xs text-neutral-500"
          title={selected ? paths.get(selected.id) : undefined}
        >
          {selectedPath}
        </p>
      )}
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
