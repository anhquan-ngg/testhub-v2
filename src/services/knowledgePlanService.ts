import apiClient from "@/lib/api-client";
import { ENDPOINTS } from "@/constants/endpoints";
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
      await apiClient.post<KnowledgePlan & { reused?: boolean }>(base, input, {
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
  /** Explicit teacher consent; the server derives owned source positions. Replays reuse the version. */
  async supplementOcr(plan: KnowledgePlan) {
    return (
      await apiClient.post<{ version_id: string }>(ENDPOINTS.KNOWLEDGE_PLANS.OCR(plan.id), {
        revision: plan.revision,
        consent: true,
      })
    ).data;
  },
  /** An explicit consented retry creates a new child for unresolved pages; replays reuse that child. */
  async retryOcr(plan: KnowledgePlan, versionId: string) {
    return (
      await apiClient.post<{ version_id: string }>(ENDPOINTS.KNOWLEDGE_PLANS.OCR_RETRY(plan.id), {
        revision: plan.revision,
        consent: true,
        version_id: versionId,
      })
    ).data;
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
