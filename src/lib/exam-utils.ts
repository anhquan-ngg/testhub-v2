// Helper function to parse JSON options
export function parseOptions(optionsString: string | null): unknown[] {
  if (!optionsString) return [];
  try {
    const parsedOptions = JSON.parse(optionsString);
    return Array.isArray(parsedOptions) ? parsedOptions : [];
  } catch {
    return [];
  }
}

type ExamDistributionItem = {
  quantity?: number;
};

type SubmissionWithExam = {
  exam: {
    mode: string;
    sample_size?: number | null;
    distribution?: string | null;
    _count: {
      questions: number;
    };
  };
};

export const getDistributionQuestions = (distributions?: string | null) => {
  if (!distributions) return 0;
  try {
    const parsedDistribution = JSON.parse(distributions);
    if (!Array.isArray(parsedDistribution)) return 0;

    let res = 0;
    for (let i = 0; i < parsedDistribution.length; i++) {
      const quantityValue = Number(
        (parsedDistribution[i] as ExamDistributionItem).quantity,
      );
      if (Number.isFinite(quantityValue)) {
        res += quantityValue;
      }
    }
    return res;
  } catch (error) {
    console.error("Failed to parse distribution:", error);
    return 0;
  }
};

export const calculateTotalQuesions = (
  submissions: SubmissionWithExam,
): number => {
  switch (submissions.exam.mode) {
    case "RANDOM_N":
      return submissions.exam.sample_size ?? 0;
    case "BY_TYPE":
    case "BY_CHAPTER":
      return getDistributionQuestions(submissions.exam.distribution);
    default:
      return submissions.exam._count.questions;
  }
};

export const calculateScorePerQuestion = (
  submission: SubmissionWithExam,
): number => {
  const MAX_SCORE = 10;
  const totalQuestions = calculateTotalQuesions(submission);
  // Tránh chia cho 0, mặc định trả về 0 hoặc MAX_SCORE tùy logic của bạn
  if (totalQuestions <= 0) return 0;
  return Number((MAX_SCORE / totalQuestions).toFixed(2));
};
