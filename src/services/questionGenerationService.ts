import apiClient from "@/lib/api-client";
import { ENDPOINTS } from "@/constants/endpoints";
import type {
  GeneratedSingleChoiceQuestion,
  GenerationCommitResult,
  GenerationPage,
  QuestionGenerationBatch,
  QuestionGenerationItem,
  TextQuestionGenerationCommand,
} from "@/types/question-generation";

const routes = ENDPOINTS.QUESTION_GENERATION;

/** API operations use the existing cookie session; no AI tokens reach the browser. */
export const questionGenerationService = {
  async list(page = 1, signal?: AbortSignal) {
    return (
      await apiClient.get<GenerationPage<QuestionGenerationBatch>>(
        routes.BASE,
        { params: { page, limit: 10 }, signal },
      )
    ).data;
  },
  async create(command: TextQuestionGenerationCommand, key: string) {
    return (
      await apiClient.post<{
        batch_id: string;
        status: QuestionGenerationBatch["status"];
      }>(routes.BASE, command, { headers: { "Idempotency-Key": key } })
    ).data;
  },
  async get(id: string, signal?: AbortSignal) {
    return (
      await apiClient.get<QuestionGenerationBatch>(routes.DETAIL(id), {
        signal,
      })
    ).data;
  },
  async items(id: string, signal?: AbortSignal) {
    // A text batch has at most 20 questions, so a single page is complete.
    return (
      await apiClient.get<GenerationPage<QuestionGenerationItem>>(
        routes.ITEMS(id),
        { params: { limit: 100 }, signal },
      )
    ).data;
  },
  async edit(
    id: string,
    item: QuestionGenerationItem,
    data: GeneratedSingleChoiceQuestion,
  ) {
    return (
      await apiClient.patch<QuestionGenerationItem>(routes.ITEM(id, item.id), {
        revision: item.revision,
        data,
      })
    ).data;
  },
  async review(
    id: string,
    item: QuestionGenerationItem,
    decision: "APPROVE" | "REJECT",
  ) {
    return (
      await apiClient.post<QuestionGenerationItem>(routes.REVIEW(id, item.id), {
        revision: item.revision,
        decision,
      })
    ).data;
  },
  async commit(id: string, items: { id: string; revision: number }[]) {
    return (
      await apiClient.post<GenerationCommitResult>(routes.COMMIT(id), { items })
    ).data;
  },
};
