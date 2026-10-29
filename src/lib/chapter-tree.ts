export type ChapterNode = {
  id: string;
  name: string;
  parent_id?: string | null;
};

/** Resolve a breadcrumb iteratively; cycles cannot overflow the JavaScript call stack. */
export function chapterPath(
  id: string,
  byId: Map<string, ChapterNode>,
  maxParts = Number.POSITIVE_INFINITY,
): string {
  const parts: string[] = [],
    seen = new Set<string>();
  let node = byId.get(id);
  while (node && !seen.has(node.id) && parts.length < maxParts) {
    seen.add(node.id);
    parts.push(node.name);
    node = node.parent_id ? byId.get(node.parent_id) : undefined;
  }
  if (node && !seen.has(node.id)) parts.push("…");
  return parts.reverse().join(" > ");
}

/** Index path searches with bounded suffixes and resolve full labels only on demand. */
export function buildChapterPaths(chapters: ChapterNode[]) {
  const byId = new Map(chapters.map((chapter) => [chapter.id, chapter]));
  const names = new Map(
    chapters.map((chapter) => [chapter.id, chapter.name.toLocaleLowerCase()]),
  );
  const children = new Map<string, ChapterNode[]>();
  const roots: ChapterNode[] = [];
  const labels = new Map<string, string>();
  for (const chapter of chapters) {
    if (chapter.parent_id && byId.has(chapter.parent_id)) {
      const siblings = children.get(chapter.parent_id) ?? [];
      siblings.push(chapter);
      children.set(chapter.parent_id, siblings);
    } else {
      roots.push(chapter);
    }
  }
  return {
    size: byId.size,
    get(id: string): string | undefined {
      if (!byId.has(id)) return undefined;
      if (!labels.has(id)) labels.set(id, chapterPath(id, byId));
      return labels.get(id);
    },
    search(query: string): Set<string> {
      const keyword = query.trim().toLocaleLowerCase();
      if (!keyword) return new Set(byId.keys());
      const matches = new Set<string>();
      const visited = new Set<string>();
      const stack = roots.map((node) => ({ node, suffix: "", matched: false }));
      while (stack.length) {
        const entry = stack.pop();
        if (!entry || visited.has(entry.node.id)) continue;
        const { node } = entry;
        visited.add(node.id);
        const separator = node.parent_id && byId.has(node.parent_id) ? " > " : "";
        const text = entry.suffix + separator + names.get(node.id);
        const matched = entry.matched || text.includes(keyword);
        if (matched) matches.add(node.id);
        // Retain only the tail needed for a match spanning the next path separator.
        const suffix =
          matched || keyword.length === 1 ? "" : text.slice(1 - keyword.length);
        for (const child of children.get(node.id) ?? []) {
          stack.push({ node: child, suffix, matched });
        }
      }
      // Malformed cyclic components have no root; preserve chapterPath's cycle semantics.
      for (const chapter of chapters) {
        if (
          !visited.has(chapter.id) &&
          chapterPath(chapter.id, byId).toLocaleLowerCase().includes(keyword)
        ) {
          matches.add(chapter.id);
        }
      }
      return matches;
    },
  };
}

/** All ancestors with at least one bank question anywhere below them. */
export function questionBearingChapterIds(
  chapters: ChapterNode[],
  questions: { chapter_id?: string | null }[],
): Set<string> {
  const byId = new Map(chapters.map((chapter) => [chapter.id, chapter])),
    ids = new Set<string>();
  for (const question of questions) {
    let id = question.chapter_id;
    const seen = new Set<string>();
    while (id && !seen.has(id)) {
      seen.add(id);
      const node = byId.get(id);
      if (!node) break;
      ids.add(id);
      id = node.parent_id;
    }
  }
  return ids;
}
