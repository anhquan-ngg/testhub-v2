export type RegradeScore = {
  submission_question_id: string;
  score: number;
};

export type RegradeQuestion = {
  id: string;
  score: number | string | null;
  answer: string | null;
  options: string | null;
  question: {
    id: string;
    question_text: string;
    question_type: string;
    options: string | null;
    correct_answer: string | null;
    files?: {
      order: number;
      file: { id: string; url: string; name: string; type: string };
    }[];
  };
};

export type RegradeWorkspace = {
  submission: {
    id: string;
    grading_revision: number;
    total_score: number | string | null;
    student?: { full_name?: string | null } | null;
    exam: { id: string; title: string };
    questions: RegradeQuestion[];
  };
  draft: {
    revision: number;
    base_grade_revision: number;
    published_revision: number | null;
    scores: RegradeScore[];
    reason: string;
  } | null;
  history: {
    id: string;
    revision: number;
    grader_id: string;
    created_at: string;
    previous_total_score: number | string | null;
    total_score: number | string | null;
    reason: string;
    changes: unknown;
  }[];
};
