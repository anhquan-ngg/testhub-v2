import axios from "axios";
import apiClient from "@/lib/api-client";
import { ENDPOINTS } from "@/constants/endpoints";
import type {
  DocumentContent,
  DocumentIndex,
  RetrievalResult,
  DocumentPage,
  DocumentReservation,
  DocumentUpload,
  LearningDocument,
} from "@/types/learning-document";

const paths = ENDPOINTS.LEARNING_DOCUMENTS;

/** Business calls use the cookie client; signed storage URLs never receive cookies or interceptors. */
export const learningDocumentService = {
  async index(id:string,version:string){return (await apiClient.post<DocumentIndex>(paths.INDEX(id,version))).data;},
  async retryIndex(id:string){return (await apiClient.post<DocumentIndex>(paths.RETRY_INDEX(id))).data;},
  async retrieve(version:string,query:string,signal:AbortSignal){return (await apiClient.post<RetrievalResult>(paths.RETRIEVE,{version_ids:[version],query,top_k:6},{signal,timeout:60000})).data;},
  async list(page: number, signal?: AbortSignal) {
    return (
      await apiClient.get<DocumentPage<LearningDocument>>(paths.BASE, {
        params: { page, limit: 10 },
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
    chapter_id: string;
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
  async complete(id: string, versionId: string) {
    await apiClient.post(paths.COMPLETE(id, versionId), undefined, {
      timeout: 90_000,
    });
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
