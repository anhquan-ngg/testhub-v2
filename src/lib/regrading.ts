import type { RegradeScore, RegradeWorkspace } from "@/types/regrading";

/** Validate the complete active question set and convert integer percentages to normalized scores. */
export function validateRegradeScores(ids: string[], values: Record<string, string>): RegradeScore[] | null {
  if (!ids.length || new Set(ids).size !== ids.length || Object.keys(values).length !== ids.length) return null;
  const scores: RegradeScore[] = [];
  for (const id of ids) {
    const value = values[id];
    if (typeof value !== "string" || !/^\d{1,3}$/.test(value)) return null;
    const percent = Number(value);
    if (!Number.isFinite(percent) || percent < 0 || percent > 100) return null;
    scores.push({ submission_question_id: id, score: percent / 100 });
  }
  return scores;
}

/** Restore a persisted draft, falling back only to published scores when no draft exists. */
export function regradeValues(workspace: RegradeWorkspace): Record<string, string> {
  const scores = workspace.draft?.scores ?? workspace.submission.questions.map((question) => ({
    submission_question_id: question.id,
    score: Number(question.score ?? 0),
  }));
  return Object.fromEntries(scores.map((item) => [item.submission_question_id, String(Math.round(item.score * 100))]));
}

/** Compute the /10 total without rounding individual question contributions. */
export function regradeTotal(scores: RegradeScore[]): number {
  return scores.length ? scores.reduce((sum, item) => sum + item.score, 0) * 10 / scores.length : 0;
}

export type RegradeOption = { text: string; isCorrect: boolean };

/** Parse option JSON defensively without rendering untrusted HTML. */
export function regradeOptions(value: string | null): RegradeOption[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((option: unknown) => {
      if (typeof option === "string") return [{ text: option, isCorrect: false }];
      if (!option || typeof option !== "object" || !("text" in option) || typeof option.text !== "string") return [];
      return [{ text: option.text, isCorrect: "isCorrect" in option && option.isCorrect === true }];
    });
  } catch {
    return [];
  }
}
