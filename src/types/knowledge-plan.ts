import type { GenerationQuestionType } from "./question-generation";
import type { QuestionFormat } from "./backend-enums";

export type SourceUnit = { kind: "PAGE" | "SLIDE" | "NOTES"; position: number };
export type PlanNode = {
  id: string;
  parent_id: string | null;
  name: string;
  source_units: SourceUnit[];
};
export type MatrixRow = {
  id: string;
  node_id: string;
  objective: string;
  question_type: GenerationQuestionType;
  source_units: SourceUnit[];
  counts: Record<QuestionFormat, number>;
};
export type PlanMatrix = { nodes: PlanNode[]; rows: MatrixRow[] };
export type FrozenPlan = {
  plan_id: string;
  revision: number;
  nodes: PlanNode[];
  items: {
    id: string;
    node_id: string;
    knowledge_title: string;
    objective: string;
    source_units: SourceUnit[];
    question_type: GenerationQuestionType;
    question_format: QuestionFormat;
    count: number;
  }[];
};
export type KnowledgePlan = {
  id: string;
  topic_id: string;
  source_version_id: string;
  revision: number;
  status:
    | "WAITING_SOURCE"
    | "PREPARING"
    | "REVIEW_REQUIRED"
    | "APPROVED"
    | "FAILED";
  error_code: string | null;
  sourceVersion: { file_name: string };
  matrix: PlanMatrix | null;
  content_map: {
    nodes: (PlanNode & { origin: "HEADING" | "INFERRED"; evidence: string })[];
    source_units: SourceUnit[];
    warnings: string[];
  } | null;
  chapter_matches?: {
    node_id: string;
    chapter_id: string | null;
    ambiguous: boolean;
  }[];
};
