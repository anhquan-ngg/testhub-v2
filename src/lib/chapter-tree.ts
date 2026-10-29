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

/** Compute full import labels without recursive function calls. */
export function buildChapterPaths(
  chapters: ChapterNode[],
): Map<string, string> {
  const byId = new Map(chapters.map((chapter) => [chapter.id, chapter]));
  return new Map(
    chapters.map((chapter) => [chapter.id, chapterPath(chapter.id, byId)]),
  );
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
