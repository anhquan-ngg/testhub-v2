export type DifficultyLevel = "EASY" | "MEDIUM" | "HARD" | "INSUFFICIENT_DATA";

export type DiscriminationLevel =
  | "HIGH"
  | "MODERATE"
  | "LOW"
  | "NEGATIVE"
  | "INSUFFICIENT_DATA";

export type ReviewFlag =
  | "TOO_EASY"
  | "TOO_HARD"
  | "LOW_DISCRIMINATION"
  | "NEGATIVE_DISCRIMINATION";

export type ScoreBucket = { from: number; to: number; count: number };

export type QuestionAnalytics = {
  questionId: string;
  questionText: string;
  questionType: string;
  questionFormat: string;
  chapterName: string | null;
  attempts: number;
  unanswered: number;
  correctCount: number;
  difficultyIndex: number | null;
  averageScore: number | null;
  difficultyLevel: DifficultyLevel;
  discriminationIndex: number | null;
  pointBiserial: number | null;
  discriminationLevel: DiscriminationLevel;
  upperGroupP: number | null;
  lowerGroupP: number | null;
  groupSize: number;
  flags: ReviewFlag[];
  needsReview: boolean;
};

export type ExamAnalyticsSummary = {
  submissionCount: number;
  mean: number | null;
  median: number | null;
  stdDev: number | null;
  min: number | null;
  max: number | null;
  scoreDistribution: ScoreBucket[];
  questionCount: number;
  averageDifficulty: number | null;
  difficulty: {
    easy: number;
    medium: number;
    hard: number;
    insufficientData: number;
  };
  discrimination: {
    high: number;
    moderate: number;
    low: number;
    negative: number;
    insufficientData: number;
  };
  reviewCount: number;
  minSampleSize: number;
};

export type ExamAnalytics = {
  examId: string;
  examTitle: string;
  summary: ExamAnalyticsSummary;
  questions: QuestionAnalytics[];
};
