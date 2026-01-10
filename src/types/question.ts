import { QuestionFormat, QuestionType } from "@prisma/client";

export interface QuestionOption {
  text: string;
  isCorrect: boolean;
}

export interface IQuestion {
  id: string;
  lecturer_id: string;
  question_text: string;
  topic: string;
  options?: QuestionOption[];
  correct_answer?: string;
  image_url?: string;
  question_type: QuestionType;
  question_format: QuestionFormat;
  created_at: Date;
  updated_at: Date;
  lecturer?: {
    full_name: string;
  };
}
