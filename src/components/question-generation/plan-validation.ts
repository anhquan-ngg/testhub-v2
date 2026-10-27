import { z } from "zod";
import { GENERATION_QUESTION_FORMATS as levels } from "./generation-validation";
const units = z
  .array(
    z.object({
      kind: z.enum(["PAGE", "SLIDE", "NOTES"]),
      position: z.number().int().min(1).max(500),
    }),
  )
  .min(1)
  .max(1000);
export const planMatrixSchema = z
  .object({
    nodes: z
      .array(
        z.object({
          id: z.uuid(),
          parent_id: z.uuid().nullable(),
          name: z.string().trim().min(1).max(200),
          source_units: units,
        }),
      )
      .min(1)
      .max(1000),
    rows: z
      .array(
        z.object({
          id: z.uuid(),
          node_id: z.uuid(),
          objective: z.string().trim().min(1).max(400),
          question_type: z.enum(["SINGLE_CHOICE", "MULTIPLE_CHOICE"]),
          source_units: units,
          counts: z.object({
            KNOWLEDGE: z.number().int().min(0).max(20),
            UNDERSTANDING: z.number().int().min(0).max(20),
            APPLYING: z.number().int().min(0).max(20),
            ADVANCED: z.number().int().min(0).max(20),
          }),
        }),
      )
      .min(1)
      .max(20),
  })
  .superRefine((value, ctx) => {
    const ids = new Set(value.nodes.map((node) => node.id)),
      done = new Set<string>();
    let frontier = value.nodes.filter((node) => node.parent_id === null);
    while (frontier.length) {
      const next = [];
      for (const node of frontier) {
        if (done.has(node.id)) continue;
        done.add(node.id);
        next.push(
          ...value.nodes.filter((child) => child.parent_id === node.id),
        );
      }
      frontier = next;
    }
    const nodeUnits = new Map(
      value.nodes.map((node) => [
        node.id,
        new Set(
          node.source_units.map((unit) => `${unit.kind}:${unit.position}`),
        ),
      ]),
    );
    const total = value.rows.reduce(
      (n, row) => n + levels.reduce((sum, level) => sum + row.counts[level], 0),
      0,
    );
    if (
      ids.size !== value.nodes.length ||
      done.size !== value.nodes.length ||
      value.rows.some(
        (row) =>
          row.source_units.some(
            (unit) =>
              !nodeUnits.get(row.node_id)?.has(`${unit.kind}:${unit.position}`),
          ) ||
          !ids.has(row.node_id) ||
          levels.every((level) => !row.counts[level]),
      ) ||
      total < 1 ||
      total > 20
    )
      ctx.addIssue({
        code: "custom",
        message: "Invalid tree, objective, matrix or total (1..20)",
      });
  });
