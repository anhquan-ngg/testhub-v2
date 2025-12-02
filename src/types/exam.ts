export interface ExamOption {
  text: string;
  isCorrect: boolean;
}

export interface ExamQuestion {
  id: string;
  question_text: string;
  image_url: string | null;
  options: string | null; // JSON string that needs parsing
  question_type: "ESSAY" | "SINGLE_CHOICE" | "MULTIPLE_CHOICE";
}

export interface ExamData {
  id: string;
  created_at: string;
  updated_at: string;
  lecturer_id: string;
  topic: string;
  title: string;
  exam_start_time: string;
  exam_end_time: string;
  duration: number;
  practice: boolean;
  mode: "MANUAL" | string; // Add other modes if known
  sample_size: number | null;
  distribution: any | null; // Update type if distribution structure is known
  status: "ACTIVE" | string; // Add other statuses if known
  questions: ExamQuestion[];
  submissionId: string;
}
