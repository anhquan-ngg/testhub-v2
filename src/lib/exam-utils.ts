// Helper function to parse JSON options
export function parseOptions(optionsString: string | null): any[] {
  if (!optionsString) return [];
  try {
    return JSON.parse(optionsString);
  } catch {
    return [];
  }
}

export const getDistributionQuestions = (distributions: any) => {
  const parsedDistribution = JSON.parse(distributions);
  let res = 0;
  for (let i = 0; i < parsedDistribution.length; i++) {
    res += parsedDistribution[i].quantity;
  }
  return res;
};

export const calculateTotalQuesions = (submissions: any): number => {
  switch (submissions.exam.mode) {
    case "RANDOM_N":
      return submissions.exam.sample_size;
    case "BY_TYPE":
      return getDistributionQuestions(submissions.exam.distribution);
    default:
      return submissions.exam._count.questions;
  }
};

export const calculateScorePerQuestion = (submission: any): number => {
  const MAX_SCORE = 10;
  const totalQuestions = calculateTotalQuesions(submission);
  // Tránh chia cho 0, mặc định trả về 0 hoặc MAX_SCORE tùy logic của bạn
  if (totalQuestions <= 0) return 0;
  return Number((MAX_SCORE / totalQuestions).toFixed(2));
};
