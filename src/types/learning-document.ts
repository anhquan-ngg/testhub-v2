export type DocumentStatus =
  | "UPLOADING"
  | "QUEUED"
  | "PROCESSING"
  | "EXTRACTED"
  | "PARTIAL"
  | "OCR_REQUIRED"
  | "FAILED";
export type DocumentIndex = {
  id: string;
  profile_id: string;
  status: "QUEUED" | "INDEXING" | "READY" | "FAILED" | "REVOKED";
  chunk_count: number;
  completed_chunks: number;
  error_code: string | null;
  created_at: string;
};
export type RetrievalResult = {
  profile_id: string;
  quality_status: "UNASSESSED";
  context_bytes: number;
  chunks: {
    chunk_id: string;
    version_id: string;
    kind: "PAGE" | "SLIDE" | "NOTES";
    position: number;
    text: string;
    similarity: number;
    start_offset: number;
    end_offset: number;
  }[];
};
export type ExtractionQuality = {
  total_units: number;
  text_units: number;
  ocr_suspected_units: number[];
  blank_units: number[];
};
export type DocumentVersion = {
  indexes: DocumentIndex[];
  id: string;
  version: number;
  created_at: string;
  file_name: string;
  source_type: "PDF" | "PPTX";
  declared_size: number;
  include_notes: boolean;
  status: DocumentStatus;
  error_code: string | null;
  unit_count: number | null;
  quality?: ExtractionQuality | null;
  partial_confirmed_at?: string | null;
};
/** A version can feed RAG/generation when fully extracted or partial and confirmed. */
export const isUsableVersion = (
  version: Pick<DocumentVersion, "status" | "partial_confirmed_at">,
) =>
  version.status === "EXTRACTED" ||
  (version.status === "PARTIAL" && Boolean(version.partial_confirmed_at));
export type LearningDocument = {
  id: string;
  title: string;
  topic_id: string;
  chapter_id: string | null;
  created_at: string;
  archived_at?: string | null;
  last_used_at?: string | null;
  versions: DocumentVersion[];
};
export type DocumentArchiveFilter = "false" | "true" | "all";
export type DocumentQuota = {
  documents: { used: number; limit: number };
  bytes: { used: number; limit: number };
};
export type DocumentHistory = {
  plans: {
    id: string;
    status: string;
    revision: number;
    error_code: string | null;
    created_at: string;
    sourceVersion: { id: string; version: number };
  }[];
  batches: {
    id: string;
    plan_id: string | null;
    status: string;
    requested_count: number;
    total_items: number;
    error_code: string | null;
    created_at: string;
    finished_at: string | null;
    sourceVersion: { id: string; version: number };
  }[];
};
export type DocumentPage<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
};
export type DocumentReservation = {
  document_id: string;
  version_id: string;
  upload_url: string;
  upload_expires_at: string;
  max_bytes: number;
};
export type SourceSpan = {
  kind: "PAGE" | "SLIDE" | "NOTES";
  position: number;
  text: string;
};
export type DocumentContent = DocumentPage<SourceSpan> & {
  document_id: string;
  version_id: string;
  status: DocumentStatus;
  unit_count: number;
  warnings: string[];
  quality?: ExtractionQuality | null;
  partial_confirmed_at?: string | null;
};
export type DocumentUpload = {
  file_name: string;
  source_type: "PDF" | "PPTX";
  mime_type: string;
  size: number;
  include_notes: boolean;
  consent: true;
};

export type DocumentCompletion = {
  document_id: string;
  version_id: string;
  status: DocumentStatus;
  reused_extraction?: boolean;
};
export type DocumentDuplicate = {
  document_id: string;
  title: string;
  topic_id: string;
  chapter_id: string | null;
  archived_at: string | null;
  version_id: string;
  version: number;
  file_name: string;
  status: DocumentStatus;
  include_notes: boolean;
  created_at: string;
};