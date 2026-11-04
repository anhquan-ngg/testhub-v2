import { getTranslations } from "next-intl/server";
import { ArrowLeft, Download, FileSpreadsheet, FileText, Info } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const optionFields = [
  "option_a", "option_b", "option_c", "option_d", "option_e", "option_f",
] as const;
const columns = [
  "code", "chapter", "question_type", "question_format", "question_text",
  ...optionFields, "correct_keys", "essay_answer", "image",
] as const;
const wordFields = [
  "code", "chapter", "question_type", "question_format", "question_text", "image",
  ...optionFields, "correct_keys", "essay_answer",
] as const;
type Column = (typeof columns)[number];
type Sample = Record<Column, string>;

const guidance = [
  ["code", "fieldCode"],
  ["chapter", "fieldChapter"],
  ["question_type", "fieldType"],
  ["question_format", "fieldFormat"],
  ["question_text", "fieldText"],
  ["image", "fieldImage"],
  ["option_a ... option_f", "fieldOptions"],
  ["correct_keys", "fieldCorrectKeys"],
  ["essay_answer", "fieldEssayAnswer"],
] as const;

/** Read-only, localized guide to the fields and examples in the bundled Office templates. */
export async function QuestionImportTemplatePreview({
  format,
}: {
  format: "word" | "excel";
}) {
  const t = await getTranslations("shared.questionImport");
  const isWord = format === "word";
  const title = isWord ? t("wordTemplate") : t("excelTemplate");
  const Icon = isWord ? FileText : FileSpreadsheet;
  const tone = isWord ? "border-blue-200 bg-blue-50 text-blue-700" : "border-emerald-200 bg-emerald-50 text-emerald-700";
  const empty: Sample = {
    code: "", chapter: "", question_type: "", question_format: "", question_text: "", image: "",
    option_a: "", option_b: "", option_c: "", option_d: "", option_e: "", option_f: "", correct_keys: "", essay_answer: "",
  };
  const samples: Sample[] = [
    {
      ...empty,
      code: "Q001",
      chapter: t("sampleFunctionChapter"),
      question_type: "SINGLE_CHOICE",
      question_format: "KNOWLEDGE",
      question_text: t("sampleGraphQuestion"),
      image: t("sampleEmbeddedImage"),
      option_a: "y = 2x + 1",
      option_b: "y = x - 1",
      option_c: "y = -2x + 1",
      option_d: "y = 2x - 1",
      correct_keys: "A",
    },
    {
      ...empty,
      code: "Q002",
      chapter: t("sampleArithmeticChapter"),
      question_type: "MULTIPLE_CHOICE",
      question_format: "UNDERSTANDING",
      question_text: t("samplePrimeQuestion"),
      option_a: "2",
      option_b: "4",
      option_c: "5",
      option_d: "9",
      correct_keys: "A,C",
    },
    {
      ...empty,
      code: "Q003",
      chapter: t("sampleEquationChapter"),
      question_type: "ESSAY",
      question_format: "APPLYING",
      question_text: t("sampleEssayQuestion"),
      essay_answer: "x = 3",
    },
  ];

  return (
    <div className="w-full min-w-0 space-y-6">
      <Button variant="ghost" asChild className="gap-2 px-0 text-neutral-600 hover:bg-transparent hover:text-[#0066cc]">
        <Link href="/lecturer/questions/import"><ArrowLeft className="h-4 w-4" />{t("backToImport")}</Link>
      </Button>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className={`rounded-xl border p-3 ${tone}`}><Icon className="h-6 w-6" /></div>
          <div>
            <h2 className="text-2xl font-bold text-neutral-900">{title}</h2>
            <p className="mt-1 text-sm text-neutral-500">{t("templatePreviewDescription")}</p>
          </div>
        </div>
        <Button asChild className="self-start bg-[#0066cc] text-white hover:bg-[#0052a3] sm:self-auto">
          <a href={`/templates/question-import-template.${isWord ? "docx" : "xlsx"}`} download><Download className="h-4 w-4" />{t("downloadTemplate")}</a>
        </Button>
      </header>

      <section className="rounded-xl border border-blue-200 bg-blue-50/70 p-4 sm:p-5" aria-labelledby="template-instructions">
        <h3 id="template-instructions" className="flex items-center gap-2 font-semibold text-blue-900"><Info className="h-4 w-4" />{t("templateInstructions")}</h3>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-neutral-700">
          <li>{isWord ? t("wordStructureHint") : t("excelStructureHint")}</li>
          <li>{t("replaceExamplesHint")}</li>
          <li>{t("embeddedImagesHint")}</li>
          <li>{t("chapterGuidance")}</li>
          <li>{t("reviewBeforeImportHint")}</li>
        </ol>
      </section>

      <section className="min-w-0 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm" aria-labelledby="template-fields">
        <div className="border-b border-neutral-200 px-4 py-4 sm:px-6"><h3 id="template-fields" className="font-semibold text-neutral-900">{t("templateFields")}</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50 text-neutral-600"><tr><th scope="col" className="px-4 py-3 sm:px-6">{t("templateField")}</th><th scope="col" className="px-4 py-3 sm:px-6">{t("templateHowToFill")}</th></tr></thead>
            <tbody className="divide-y divide-neutral-100">
              {guidance.map(([field, key]) => <tr key={field}><th scope="row" className="px-4 py-3 align-top font-mono text-xs font-medium text-neutral-800 sm:px-6">{field}</th><td className="min-w-64 px-4 py-3 leading-relaxed text-neutral-600 sm:px-6">{t(key)}</td></tr>)}
            </tbody>
          </table>
        </div>
      </section>

      <section className="min-w-0 space-y-4" aria-labelledby="template-examples">
        <div className="flex flex-wrap items-center gap-2"><h3 id="template-examples" className="font-semibold text-neutral-900">{t("templateExamples")}</h3><Badge variant="outline" className={tone}>{isWord ? ".docx" : "Questions"}</Badge></div>
        <p className="text-sm text-neutral-500">{t("previewOnlyHint")}</p>
        {isWord ? samples.map((sample) => (
          <article key={sample.code} className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center gap-2 border-b border-neutral-200 bg-neutral-50 px-4 py-3"><Badge variant="outline" className={tone}>{sample.code}</Badge><span className="text-xs font-medium text-neutral-600">{sample.question_type}</span></div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm"><caption className="sr-only">{t("templateExampleLabel", { code: sample.code })}</caption><tbody className="divide-y divide-neutral-100">
                {wordFields.map((field) => <tr key={field}><th scope="row" className="w-44 bg-neutral-50/50 px-4 py-3 align-top font-mono text-xs font-medium text-neutral-600">{field}</th><td className="min-w-48 px-4 py-3 text-neutral-800">{sample[field]}</td></tr>)}
              </tbody></table>
            </div>
          </article>
        )) : (
          <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
            <div className="border-b border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">Questions</div>
            <div className="overflow-x-auto" role="region" aria-label={t("excelTemplate")} tabIndex={0}>
              <table className="w-full min-w-[1800px] text-left text-xs"><caption className="sr-only">{t("templateExamples")}</caption>
                <thead className="bg-neutral-50"><tr>{columns.map((field) => <th key={field} scope="col" className="whitespace-nowrap border-b border-r border-neutral-200 px-3 py-3 font-mono font-medium text-neutral-600">{field}</th>)}</tr></thead>
                <tbody className="divide-y divide-neutral-200">{samples.map((sample) => <tr key={sample.code}>{columns.map((field) => <td key={field} className={`border-r border-neutral-100 px-3 py-4 align-top text-neutral-700 ${field === "question_text" ? "min-w-64" : "min-w-24"}`}>{sample[field]}</td>)}</tr>)}</tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
