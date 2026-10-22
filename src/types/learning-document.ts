export type DocumentStatus =
  | "UPLOADING"
  | "QUEUED"
  | "PROCESSING"
  | "EXTRACTED"
  | "OCR_REQUIRED"
  | "FAILED";
export type DocumentIndex = { id:string;profile_id:string;status:"QUEUED"|"INDEXING"|"READY"|"FAILED"|"REVOKED";chunk_count:number;completed_chunks:number;error_code:string|null;created_at:string };
export type RetrievalResult = {profile_id:string;quality_status:"UNASSESSED";context_bytes:number;chunks:{chunk_id:string;version_id:string;kind:"PAGE"|"SLIDE"|"NOTES";position:number;text:string;similarity:number;start_offset:number;end_offset:number}[]};
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
};
export type LearningDocument = {
  id: string;
  title: string;
  topic_id: string;
  chapter_id: string;
  created_at: string;
  versions: DocumentVersion[];
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
};
export type DocumentUpload = {
  file_name: string;
  source_type: "PDF" | "PPTX";
  mime_type: string;
  size: number;
  include_notes: boolean;
  consent: true;
};
