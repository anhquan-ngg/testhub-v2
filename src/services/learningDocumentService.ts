import axios from "axios";
import apiClient from "@/lib/api-client";
import { ENDPOINTS } from "@/constants/endpoints";
import type {
  DocumentArchiveFilter,
  DocumentCompletion,
  DocumentDuplicate,
  DocumentContent,
  DocumentHistory,
  DocumentIndex,
  DocumentQuota,
  DocumentVersion,
  RetrievalResult,
  DocumentPage,
  DocumentReservation,
  DocumentUpload,
  LearningDocument,
} from "@/types/learning-document";

const paths = ENDPOINTS.LEARNING_DOCUMENTS;

/** Business calls use the cookie client; signed storage URLs never receive cookies or interceptors. */
export const learningDocumentService = {
  async index(id: string, version: string) {
    return (await apiClient.post<DocumentIndex>(paths.INDEX(id, version))).data;
  },
  async retryIndex(id: string) {
    return (await apiClient.post<DocumentIndex>(paths.RETRY_INDEX(id))).data;
  },
  async retrieve(version: string, query: string, signal: AbortSignal) {
    return (
      await apiClient.post<RetrievalResult>(
        paths.RETRIEVE,
        { version_ids: [version], query, top_k: 6 },
        { signal, timeout: 60000 },
      )
    ).data;
  },
  async list(
    page: number,
    signal?: AbortSignal,
    filter: {
      topic_id?: string;
      limit?: number;
      q?: string;
      archived?: DocumentArchiveFilter;
    } = {},
  ) {
    return (
      await apiClient.get<DocumentPage<LearningDocument>>(paths.BASE, {
        params: {
          page,
          limit: filter.limit ?? 10,
          ...(filter.topic_id ? { topic_id: filter.topic_id } : {}),
          ...(filter.q ? { q: filter.q } : {}),
          ...(filter.archived && filter.archived !== "false"
            ? { archived: filter.archived }
            : {}),
        },
        signal,
      })
    ).data;
  },
  async quota(signal?: AbortSignal) {
    return (await apiClient.get<DocumentQuota>(paths.QUOTA, { signal })).data;
  },
  async rename(id: string, title: string) {
    return (await apiClient.patch<LearningDocument>(paths.DETAIL(id), { title }))
      .data;
  },
  async archive(id: string) {
    return (await apiClient.post<LearningDocument>(paths.ARCHIVE(id))).data;
  },
  async unarchive(id: string) {
    return (await apiClient.post<LearningDocument>(paths.UNARCHIVE(id))).data;
  },
  async purge(id: string) {
    await apiClient.post(paths.PURGE(id));
  },
  async versions(id: string, page: number, signal?: AbortSignal) {
    return (
      await apiClient.get<DocumentPage<DocumentVersion>>(paths.VERSIONS(id), {
        params: { page, limit: 20 },
        signal,
      })
    ).data;
  },
  async history(id: string, signal?: AbortSignal) {
    return (
      await apiClient.get<DocumentHistory>(paths.HISTORY(id), {
        params: { limit: 10 },
        signal,
      })
    ).data;
  },
  async detail(id: string, signal?: AbortSignal) {
    return (await apiClient.get<LearningDocument>(paths.DETAIL(id), { signal }))
      .data;
  },
  async create(input: {
    title: string;
    topic_id: string;
    chapter_id?: string | null;
    upload: DocumentUpload;
  }) {
    return (await apiClient.post<DocumentReservation>(paths.BASE, input)).data;
  },
  async addVersion(id: string, upload: DocumentUpload) {
    return (
      await apiClient.post<DocumentReservation>(paths.VERSIONS(id), upload)
    ).data;
  },
  async upload(reservation: DocumentReservation, file: File, mime: string) {
    await axios.put(reservation.upload_url, file, {
      headers: { "Content-Type": mime },
      withCredentials: false,
      timeout: 120_000,
    });
  },
  /** Lecturer confirms using the extracted pages of a PARTIAL version. */
  async confirmPartial(id: string, versionId: string) {
    return (
      await apiClient.post<{ partial_confirmed_at: string }>(
        paths.CONFIRM_PARTIAL(id, versionId),
      )
    ).data;
  },
  async complete(id: string, versionId: string) {
    return (
      await apiClient.post<DocumentCompletion>(
        paths.COMPLETE(id, versionId),
        undefined,
        { timeout: 90_000 },
      )
    ).data;
  },
  async checkDuplicate(
    sha256: string,
    sourceType: "PDF" | "PPTX",
    signal?: AbortSignal,
  ) {
    return (
      await apiClient.post<{ data: DocumentDuplicate[] }>(
        paths.DUPLICATES,
        { sha256, source_type: sourceType },
        { signal },
      )
    ).data.data;
  },
  async content(
    id: string,
    versionId: string,
    page: number,
    signal?: AbortSignal,
  ) {
    return (
      await apiClient.get<DocumentContent>(paths.CONTENT(id, versionId), {
        params: { page, limit: 5 },
        signal,
      })
    ).data;
  },
  async revoke(id: string) {
    await apiClient.delete(paths.DETAIL(id));
  },
};
