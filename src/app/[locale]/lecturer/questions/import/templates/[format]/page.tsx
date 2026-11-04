import { notFound } from "next/navigation";
import { QuestionImportTemplatePreview } from "@/components/question-import/QuestionImportTemplatePreview";

type Props = { params: Promise<{ format: string }> };

/** Opens an internal preview instead of immediately downloading an Office file. */
export default async function QuestionImportTemplatePage({ params }: Props) {
  const { format } = await params;
  if (format !== "word" && format !== "excel") notFound();
  return <QuestionImportTemplatePreview format={format} />;
}
