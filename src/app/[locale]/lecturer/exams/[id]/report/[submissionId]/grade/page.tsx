import { RegradeWorkspace } from "@/components/regrading/RegradeWorkspace";

/** Open the owning lecturer's submission grading workspace. */
export default async function GradeSubmissionPage({ params }: {
  params: Promise<{ id: string; submissionId: string }>;
}) {
  const { id, submissionId } = await params;
  return <RegradeWorkspace key={`${id}:${submissionId}`} examId={id} submissionId={submissionId} />;
}
