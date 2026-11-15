import apiClient from "@/lib/api-client";
import type {
  KnowledgePlan,
  PlanMatrix,
  PlanNode,
} from "@/types/knowledge-plan";
import type {
  GenerationPage,
  QuestionGenerationConfig,
} from "@/types/question-generation";

const base = "/question-generation-plans";
/** Durable proposals and revision-checked confirmation; bank writes use the existing commit API. */
export const knowledgePlanService = {
  async create(
    input: {
      topic_id: string;
      version_id: string;
      question_configs: QuestionGenerationConfig[];
      external_processing_consent: true;
    },
    key: string,
  ) {
    return (
      await apiClient.post<KnowledgePlan>(base, input, {
        headers: { "Idempotency-Key": key },
      })
    ).data;
  },
  async list(signal?: AbortSignal) {
    return (
      await apiClient.get<GenerationPage<KnowledgePlan>>(base, {
        params: { limit: 20 },
        signal,
      })
    ).data;
  },
  async get(id: string, signal?: AbortSignal) {
    return (await apiClient.get<KnowledgePlan>(`${base}/${id}`, { signal }))
      .data;
  },
  async save(plan: KnowledgePlan, matrix: PlanMatrix) {
    return (
      await apiClient.patch<KnowledgePlan>(`${base}/${plan.id}`, {
        revision: plan.revision,
        matrix,
      })
    ).data;
  },
  /** Persist the edited chapter list and regenerate rows to the batch size (clears approval). */
  async rebuildMatrix(plan: KnowledgePlan, nodes: PlanNode[]) {
    return (
      await apiClient.post<KnowledgePlan>(`${base}/${plan.id}/rebuild-matrix`, {
        revision: plan.revision,
        nodes,
      })
    ).data;
  },
  async approve(plan: KnowledgePlan) {
    return (
      await apiClient.post<KnowledgePlan>(`${base}/${plan.id}/approve`, {
        revision: plan.revision,
      })
    ).data;
  },
  /** User-initiated retry of a failed preparation; page loads never call it. */
  async retry(plan: KnowledgePlan) {
    return (await apiClient.post<KnowledgePlan>(`${base}/${plan.id}/retry`))
      .data;
  },
  async generate(plan: KnowledgePlan, key: string) {
    return (
      await apiClient.post<{ batch_id: string }>(
        `${base}/${plan.id}/generate`,
        { revision: plan.revision },
        { headers: { "Idempotency-Key": key } },
      )
    ).data;
  },
};
