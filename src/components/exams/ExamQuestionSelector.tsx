"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ListChecks, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ChapterPicker } from "@/components/ChapterPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useEnumLabels } from "@/i18n/useEnumLabels";
import { questionBearingChapterIds } from "@/lib/chapter-tree";
import { ICON_TONE, iconLabelProps, useIconLabels } from "@/lib/icon-button";
import { fetchAllPages } from "@/lib/pagination";
import apiClient from "@/lib/api-client";
import { ENDPOINTS } from "@/constants/endpoints";
import { buildDistribution, selectionValidationKey, type ExamMode, type ExamQuestionSelection, type QuestionConfig } from "./question-selection";

type QuestionItem = {
  id: string;
  chapter_id?: string;
  question_text: string;
  question_type: QuestionConfig["question_type"];
  question_format: QuestionConfig["question_format"];
  topic?: string | null;
  chapter?: { name?: string | null; topic?: { name?: string | null; } | null; } | null;
};
type ChapterItem = { id: string; name: string; topic_id: string; parent_id?: string | null; };
type DeltaFeasibility = {
  max_feasible_d: number;
  total_questions: number;
  warnings: { code: string; message: string; }[];
};
const EMPTY_QUESTIONS: QuestionItem[] = [];
const EMPTY_CHAPTERS: ChapterItem[] = [];
const DELTA_OPTIONS = [0, 1, 2] as const;
const KNOWN_DELTA_WARNINGS = ["BASELINE_INSUFFICIENT", "NO_FEASIBLE_VARIATION", "DELTA_ABOVE_MAX_FEASIBLE", "DELTA_HIGH_FOR_TOTAL"] as const;
const isKnownDeltaWarning = (code: string): code is (typeof KNOWN_DELTA_WARNINGS)[number] => (KNOWN_DELTA_WARNINGS as readonly string[]).includes(code);
const getQuestionTopicName = (question: QuestionItem) => question.topic ?? question.chapter?.topic?.name ?? question.chapter?.name ?? "";

/** Shared question-bank selection and configuration for exam creation and editing. */
export function ExamQuestionSelector({ topicId, title, value, onChange, disabled = false }: {
  topicId: string;
  title: string;
  value: ExamQuestionSelection;
  onChange: (value: ExamQuestionSelection) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("lecturer.editExam");
  const enumLabel = useEnumLabels();
  const iconLabels = useIconLabels();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [retry, setRetry] = useState(0);
  const [bank, setBank] = useState<{
    topicId: string;
    status: "loading" | "ready" | "error";
    questions: QuestionItem[];
    chapters: ChapterItem[];
  }>({ topicId: "", status: "ready", questions: [], chapters: [] });
  const [deltaFeasibility, setDeltaFeasibility] = useState<DeltaFeasibility | null>(null);
  const { mode: questionSelectionMode, selectedQuestions, randomCount, configRows, distributionDelta, distributionDeltaOnline } = value;
  const update = (patch: Partial<ExamQuestionSelection>) => onChange({ ...value, ...patch });
  const setQuestionSelectionMode = (mode: ExamMode) => update({ mode });
  const setRandomCount = (randomCount: string) => update({ randomCount });
  const setDistributionDeltaOnline = (distributionDeltaOnline: boolean) => update({ distributionDeltaOnline });
  const isLoadingQuestionBank = !!topicId && (bank.topicId !== topicId || bank.status === "loading");
  const bankFailed = bank.topicId === topicId && bank.status === "error";
  const questionBank = bank.topicId === topicId ? bank.questions : EMPTY_QUESTIONS;
  const chapters = bank.topicId === topicId ? bank.chapters : EMPTY_CHAPTERS;
  const supportsDelta = questionSelectionMode === "BY_TYPE" || questionSelectionMode === "BY_CHAPTER";
  const distribution = buildDistribution(questionSelectionMode, configRows);
  const deltaTotal = distribution.reduce((total, row) => total + row.quantity, 0);
  const deltaDistributionJson = supportsDelta ? JSON.stringify(distribution) : "";
  const parsedRandomCount = Number(randomCount);
  const activeCount = questionSelectionMode === "MANUAL"
    ? selectedQuestions.length
    : questionSelectionMode === "RANDOM_N"
      ? (Number.isSafeInteger(parsedRandomCount) && parsedRandomCount > 0 ? parsedRandomCount : 0)
      : deltaTotal;
  const modeLabel = t(({
    MANUAL: "manualSelection",
    RANDOM_N: "randomlySelectNSentences",
    BY_TYPE: "configurableByTypeAndFormat",
    BY_CHAPTER: "configureByChapter",
  } as const)[questionSelectionMode]);
  const chapterOptions = useMemo(() => {
    const available = questionBearingChapterIds(chapters, questionBank);
    const selected = new Set(configRows.map((row) => row.chapter_id));
    return chapters.filter((chapter) => available.has(chapter.id) || selected.has(chapter.id));
  }, [chapters, questionBank, configRows]);

  useEffect(() => {
    if (!topicId) return;
    let active = true;
    setBank({ topicId, status: "loading", questions: [], chapters: [] });
    void (async () => {
      try {
        // The question endpoint filters by chapter, not topic. Follow all pages of every topic chapter.
        const chapters = await fetchAllPages<ChapterItem>(ENDPOINTS.CHAPTERS.BASE, { topic_id: topicId });
        const lists = await Promise.all(chapters.map((chapter) =>
          fetchAllPages<QuestionItem>(ENDPOINTS.QUESTIONS.BASE, { chapter_id: chapter.id }),
        ));
        const questions = [...new Map(lists.flat().map((question) => [question.id, question])).values()];
        if (active) setBank({ topicId, status: "ready", questions, chapters });
      } catch {
        if (active) setBank({ topicId, status: "error", questions: [], chapters: [] });
      }
    })();
    return () => { active = false; };
  }, [topicId, retry]);

  useEffect(() => {
    let active = true;
    setDeltaFeasibility(null);
    if (!supportsDelta || !topicId || deltaTotal <= 0) return;
    const timeout = setTimeout(() => {
      void apiClient.post<DeltaFeasibility>(ENDPOINTS.EXAMS.DISTRIBUTION_DELTA_CHECK, {
        topic_id: topicId,
        mode: questionSelectionMode,
        distribution: deltaDistributionJson,
        distribution_delta: distributionDelta,
      })
        .then((response) => { if (active) setDeltaFeasibility(response.data); })
        .catch(() => { /* Feasibility hints never block saving. */ });
    }, 600);
    return () => { active = false; clearTimeout(timeout); };
  }, [topicId, supportsDelta, questionSelectionMode, deltaDistributionJson, distributionDelta, deltaTotal]);

  const handleAddConfigRow = () => update({
    configRows: [...configRows, {
      id: configRows.reduce((max, row) => Math.max(max, row.id), 0) + 1,
      question_type: "SINGLE_CHOICE",
      question_format: "KNOWLEDGE",
      quantity: 0,
    }],
  });
  const handleUpdateConfigRow = (id: number, key: keyof QuestionConfig, fieldValue: string | number) => update({
    configRows: configRows.map((row) => row.id === id ? { ...row, [key]: fieldValue } : row),
  });
  const handleRemoveConfigRow = (id: number) => update({
    configRows: configRows.filter((row) => row.id !== id),
  });
  const handleToggleQuestion = (id: string) => {
    if (isLoadingQuestionBank) return;
    update({
      selectedQuestions: selectedQuestions.includes(id)
        ? selectedQuestions.filter((selected) => selected !== id)
        : [...selectedQuestions, id],
    });
  };
  const handleSelectByConfig = () => {
    const error = selectionValidationKey(value);
    if (error) {
      toast.warning(t(error));
      return;
    }
    setIsDialogOpen(false);
  };

  return (
    <section className="min-w-0 space-y-4 rounded-xl border border-gray-200 bg-gray-50/50 p-4 sm:p-5" aria-label={t("chooseQuestionsFromTheBank")}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#0066cc]">
            <ListChecks className="size-5" aria-hidden="true" />
          </div>
          <div className="min-w-0 space-y-1">
            <h3 className="font-semibold text-neutral-900">{t("chooseQuestionsFromTheBank")}</h3>
            <p className="text-sm leading-relaxed text-neutral-500">
              {topicId ? t("questionSelectionHint") : t("chooseTopicFirst")}
            </p>
          </div>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              disabled={disabled || !topicId}
              className="bg-[#0066cc] hover:bg-[#0052a3] text-white"
            >
              {t("selectQuestion")}
            </Button>
          </DialogTrigger>
          <DialogContent className="flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] flex-col gap-0 overflow-hidden border-gray-300 bg-white p-0 sm:max-w-3xl">
            <DialogHeader className="shrink-0 border-b border-gray-200 p-5 pr-12 text-left sm:p-6 sm:pr-12">
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#0066cc]">
                  <ListChecks className="size-5" aria-hidden="true" />
                </div>
                <div className="min-w-0 space-y-1">
                  <DialogTitle className="text-lg font-semibold text-neutral-900">
                    {t("selectQuestion")}
                  </DialogTitle>
                  <DialogDescription className="break-words text-sm text-neutral-500">
                    {t("chooseQuestionsForExam", {
                      title: title || t("untitledExam"),
                    })}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <div className="min-h-0 space-y-5 overflow-y-auto p-5 sm:p-6">
              <div className="space-y-2">
                <Label htmlFor="question-selection-mode">
                  {t("selectionMethod")}
                </Label>
                <Select
                  value={questionSelectionMode}
                  onValueChange={(value) =>
                    setQuestionSelectionMode(value as ExamMode)
                  }
                >
                  <SelectTrigger
                    id="question-selection-mode"
                    className="w-full min-w-0 border-gray-300 bg-white"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-300">
                    <SelectItem value="MANUAL">
                      {t("manualSelection")}
                    </SelectItem>
                    <SelectItem value="RANDOM_N">
                      {t("randomlySelectNSentences")}
                    </SelectItem>
                    <SelectItem value="BY_TYPE">
                      {t("configurableByTypeAndFormat")}
                    </SelectItem>
                    <SelectItem value="BY_CHAPTER">
                      {t("configureByChapter")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {isLoadingQuestionBank && (
                <p role="status" className="text-sm text-neutral-500">{t("loadingQuestionBank")}</p>
              )}
              {bankFailed && (
                <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <p>{t("unableToLoadQuestionBank")}</p>
                  <Button variant="outline" onClick={() => setRetry((current) => current + 1)}>
                    {t("retryLoading")}
                  </Button>
                </div>
              )}
              {questionSelectionMode === "MANUAL" && !isLoadingQuestionBank && !bankFailed && (
                <div className="space-y-2">
                  <div className="border border-gray-300 rounded-lg p-4 space-y-3 max-h-64 overflow-y-auto">
                    {!isLoadingQuestionBank &&
                      questionBank?.length > 0 ? (
                      questionBank.map((question) => (
                        <div
                          key={question.id}
                          className="flex items-start space-x-3 p-2 hover:bg-gray-50 rounded"
                        >
                          <Checkbox
                            id={`question-${question.id}`}
                            checked={selectedQuestions.includes(
                              question.id,
                            )}
                            onCheckedChange={() =>
                              handleToggleQuestion(question.id)
                            }
                            className="mt-1 bg-white border-gray-300"
                          />
                          <label
                            htmlFor={`question-${question.id}`}
                            className="min-w-0 flex-1 cursor-pointer break-words"
                          >
                            <div className="font-medium text-sm">
                              {question.question_text}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {t("questionMetadata", {
                                topic: getQuestionTopicName(question),
                                type: enumLabel.questionType(
                                  question.question_type,
                                ),
                                format: enumLabel.questionFormat(
                                  question.question_format,
                                ),
                              })}
                            </div>
                          </label>
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-gray-500 py-4">
                        {t("noQuestionsAsked")}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {questionSelectionMode === "RANDOM_N" && (
                <div className="space-y-3">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="random-count">
                        {t("numberOfQuestions")}
                      </Label>
                      <Input
                        id="random-count"
                        type="number"
                        min="1"
                        value={randomCount}
                        onChange={(e) => setRandomCount(e.target.value)}
                        placeholder="10"
                        className="bg-white border-gray-300"
                      />
                    </div>
                  </div>
                </div>
              )}

              {(questionSelectionMode === "BY_TYPE" ||
                questionSelectionMode === "BY_CHAPTER") && (
                  <div className="min-w-0 space-y-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <h3 className="text-sm font-semibold text-neutral-900">
                        {t("questionConfiguration")}
                      </h3>
                      <Button
                        onClick={handleAddConfigRow}
                        variant="outline"
                        className="border-gray-300 bg-white hover:bg-gray-50"
                      >
                        <Plus className="size-4" aria-hidden="true" />
                        {t("addGoodsConfiguration")}
                      </Button>
                    </div>
                    {questionSelectionMode === "BY_CHAPTER" && (
                      <p className="text-sm leading-relaxed text-neutral-500">
                        {t("includesAllDescendants")}
                      </p>
                    )}
                    <div className="space-y-3">
                      {configRows.map((row) => (
                        <div
                          key={row.id}
                          className={`grid min-w-0 grid-cols-[minmax(0,1fr)_2.25rem] items-start gap-4 rounded-lg border border-gray-200 bg-gray-50/60 p-4 ${questionSelectionMode === "BY_CHAPTER" ? "sm:grid-cols-[minmax(0,1fr)_6rem_2.25rem]" : "sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_6rem_2.25rem]"}`}
                        >
                          {questionSelectionMode === "BY_CHAPTER" && (
                            <div className="col-span-2 min-w-0 space-y-2 sm:col-span-1 [&_select]:h-9 [&_select]:rounded-md [&_select]:border-gray-300 [&_select]:shadow-xs">
                              <Label
                                htmlFor={`question-chapter-${row.id}`}
                              >
                                {t("chapter")}
                              </Label>
                              <ChapterPicker
                                id={`question-chapter-${row.id}`}
                                chapters={chapterOptions}
                                value={row.chapter_id}
                                onChange={(value) =>
                                  handleUpdateConfigRow(
                                    row.id,
                                    "chapter_id",
                                    value,
                                  )
                                }
                              />
                            </div>
                          )}
                          {questionSelectionMode === "BY_TYPE" && (
                            <>
                              <div className="col-span-2 min-w-0 space-y-2 sm:col-span-1">
                                <Label
                                  htmlFor={`question-type-${row.id}`}
                                >
                                  {t("questionType")}
                                </Label>
                                <Select
                                  value={row.question_type}
                                  onValueChange={(value) =>
                                    handleUpdateConfigRow(
                                      row.id,
                                      "question_type",
                                      value,
                                    )
                                  }
                                >
                                  <SelectTrigger
                                    id={`question-type-${row.id}`}
                                    className="w-full min-w-0 bg-white border-gray-300"
                                  >
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="bg-white border-gray-300">
                                    <SelectItem value="SINGLE_CHOICE">
                                      {t("multipleChoice1Answer")}
                                    </SelectItem>
                                    <SelectItem value="MULTIPLE_CHOICE">
                                      {t(
                                        "multipleChoiceTestWithMultipleAnswers",
                                      )}
                                    </SelectItem>
                                    <SelectItem value="ESSAY">
                                      {t("essay")}
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="col-span-2 min-w-0 space-y-2 sm:col-span-1">
                                <Label
                                  htmlFor={`question-format-${row.id}`}
                                >
                                  {t("format2")}
                                </Label>
                                <Select
                                  value={row.question_format}
                                  onValueChange={(value) =>
                                    handleUpdateConfigRow(
                                      row.id,
                                      "question_format",
                                      value,
                                    )
                                  }
                                >
                                  <SelectTrigger
                                    id={`question-format-${row.id}`}
                                    className="w-full min-w-0 bg-white border-gray-300"
                                  >
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="bg-white border-gray-300">
                                    <SelectItem value="KNOWLEDGE">
                                      {t("recognize")}
                                    </SelectItem>
                                    <SelectItem value="UNDERSTANDING">
                                      {t("understanding")}
                                    </SelectItem>
                                    <SelectItem value="APPLYING">
                                      {t("manipulate")}
                                    </SelectItem>
                                    <SelectItem value="ADVANCED">
                                      {t("advanced")}
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </>
                          )}
                          <div className="min-w-0 space-y-2">
                            <Label
                              htmlFor={`question-quantity-${row.id}`}
                            >
                              {t("quantity")}
                            </Label>
                            <Input
                              id={`question-quantity-${row.id}`}
                              type="number"
                              min="0"
                              value={Number.isNaN(row.quantity) ? "" : row.quantity}
                              onChange={(e) =>
                                handleUpdateConfigRow(
                                  row.id,
                                  "quantity",
                                  e.target.value === "" ? 0 : Number(e.target.value),
                                )
                              }
                              className="w-full bg-white border-gray-300"
                            />
                          </div>
                          <div className="pt-[22px]">
                            <Button
                              variant="ghost"
                              size="sm"
                              className={`h-9 w-9 p-0 ${ICON_TONE.danger}`}
                              onClick={() =>
                                handleRemoveConfigRow(row.id)
                              }
                              {...iconLabelProps(iconLabels.delete)}
                            >
                              <Trash2
                                className="h-4 w-4"
                                aria-hidden="true"
                              />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
                      <div className="space-y-2">
                        <Label htmlFor="distribution-delta">
                          {t("distributionDelta")}
                        </Label>
                        <Select
                          value={String(distributionDelta)}
                          onValueChange={(value) => {
                            const next = Number.parseInt(value, 10);
                            update({ distributionDelta: next, distributionDeltaOnline: next > 0 && distributionDeltaOnline });
                          }}
                        >
                          <SelectTrigger
                            id="distribution-delta"
                            className="w-full min-w-0 bg-white border-gray-300 sm:w-64"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-gray-300">
                            {DELTA_OPTIONS.map((option) => (
                              <SelectItem
                                key={option}
                                value={String(option)}
                              >
                                {option === 0
                                  ? t("deltaOff")
                                  : t("deltaUpTo", { count: option })}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-sm leading-relaxed text-neutral-500">
                          {t("distributionDeltaHint")}
                        </p>
                      </div>
                      {distributionDelta > 0 && deltaTotal > 0 && (
                        <p className="text-sm text-neutral-600">
                          {t("deltaImpact", {
                            total: deltaTotal,
                            percent: (
                              (100 * distributionDelta) /
                              deltaTotal
                            ).toFixed(1),
                          })}
                        </p>
                      )}
                      <div className="flex items-start gap-2">
                        <Checkbox
                          id="distribution-delta-online"
                          checked={distributionDeltaOnline}
                          disabled={distributionDelta === 0}
                          onCheckedChange={(checked) =>
                            setDistributionDeltaOnline(checked === true)
                          }
                        />
                        <div className="space-y-1">
                          <Label htmlFor="distribution-delta-online">
                            {t("deltaApplyOnline")}
                          </Label>
                          <p className="text-sm leading-relaxed text-neutral-500">
                            {t("deltaApplyOnlineHint")}
                          </p>
                        </div>
                      </div>
                      {deltaFeasibility &&
                        deltaFeasibility.warnings.length > 0 && (
                          <div
                            role="status"
                            className="space-y-1 rounded-md border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800"
                          >
                            <p className="font-medium">
                              {t("deltaWarningTitle")}
                            </p>
                            <ul className="list-disc pl-5">
                              {deltaFeasibility.warnings.map(
                                (warning) => (
                                  <li key={warning.code}>
                                    {isKnownDeltaWarning(warning.code)
                                      ? t(
                                        `deltaWarnings.${warning.code}`,
                                        {
                                          max: deltaFeasibility.max_feasible_d,
                                          total:
                                            deltaFeasibility.total_questions,
                                        },
                                      )
                                      : warning.message}
                                  </li>
                                ),
                              )}
                            </ul>
                          </div>
                        )}
                    </div>
                  </div>
                )}
            </div>
            <div className="flex shrink-0 flex-col gap-3 border-t border-gray-200 bg-gray-50/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p
                className="text-sm font-medium text-neutral-600"
                aria-live="polite"
              >
                {t("selectedQuestionCount", {
                  count: activeCount,
                })}
              </p>
              <Button
                onClick={handleSelectByConfig}
                className="h-auto min-h-9 whitespace-normal bg-[#0066cc] py-2 leading-snug text-white hover:bg-[#0052a3]"
              >
                {t("confirmSelection")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      {topicId && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-md border border-gray-200 bg-white px-2.5 py-1 text-neutral-600">
            {modeLabel}
          </span>
          <span className="rounded-md bg-blue-50 px-2.5 py-1 font-medium text-[#0066cc]" aria-live="polite">
            {t("configuredQuestionCount", { count: activeCount })}
          </span>
        </div>
      )}
      {topicId && questionSelectionMode === "MANUAL" && selectedQuestions.length > 0 && (
        <div className="divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200 bg-white">
          {selectedQuestions.slice(0, 5).map((id, index) => (
            <div key={id} className="flex items-start gap-3 p-3">
              <span className="pt-1 text-xs text-neutral-400">{index + 1}.</span>
              <p className="min-w-0 flex-1 break-words pt-0.5 text-sm text-neutral-700">
                {questionBank.find((question) => question.id === id)?.question_text ?? t("selectedQuestionPlaceholder")}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={disabled}
                className={ICON_TONE.danger}
                onClick={() => update({ selectedQuestions: selectedQuestions.filter((questionId) => questionId !== id) })}
                {...iconLabelProps(iconLabels.delete)}
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </Button>
            </div>
          ))}
          {selectedQuestions.length > 5 && (
            <p className="p-3 text-sm text-neutral-500">
              {t("moreSelectedQuestions", { count: selectedQuestions.length - 5 })}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
