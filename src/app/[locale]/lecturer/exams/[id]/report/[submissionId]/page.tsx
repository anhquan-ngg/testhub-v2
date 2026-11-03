import { SubmissionResultPrint } from "@/components/exam/submission-result-print";

/** Opens the lecturer result preview without crossing the student-only route boundary. */
export default async function SubmissionResultPage({
  params,
}: {
  params: Promise<{ id: string; submissionId: string }>;
}) {
  const { id, submissionId } = await params;
  return (
    <SubmissionResultPrint
      key={`${id}:${submissionId}`}
      examId={id}
      submissionId={submissionId}
    />
  );
}
