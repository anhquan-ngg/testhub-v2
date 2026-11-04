import { QuestionImportScreen } from "@/components/question-import/QuestionImportScreen";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Dedicated question-bank import page with optional topic/chapter context. */
export default async function QuestionImportPage({ searchParams }: Props) {
  const { topic, chapter } = await searchParams;
  return (
    <QuestionImportScreen
      defaultTopicId={typeof topic === "string" ? topic : undefined}
      defaultChapterId={typeof chapter === "string" ? chapter : undefined}
    />
  );
}
