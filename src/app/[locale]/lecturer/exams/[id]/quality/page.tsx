"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  ArrowDownUp,
  BarChart3,
  ChartNoAxesCombined,
  ChevronLeft,
  ChevronRight,
  ArrowDownRight,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Gauge,
  Info,
  Loader2,
  Pencil,
  Target,
  Users,
  type LucideIcon,
} from "lucide-react";
import apiClient from "@/lib/api-client";
import { ENDPOINTS } from "@/constants/endpoints";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  DifficultyLevel,
  DiscriminationLevel,
  ExamAnalytics,
  QuestionAnalytics,
  ReviewFlag,
} from "@/types/exam-analytics";

const QUESTION_PAGE_SIZE = 5;

const DIFFICULTY_COLOR: Record<DifficultyLevel, string> = {
  EASY: "var(--color-emerald-600)",
  MEDIUM: "var(--color-accent-600)",
  HARD: "var(--color-red-600)",
  INSUFFICIENT_DATA: "var(--color-neutral-400)",
};

const DISCRIMINATION_COLOR: Record<DiscriminationLevel, string> = {
  HIGH: "var(--color-emerald-600)",
  MODERATE: "var(--color-accent-600)",
  LOW: "var(--color-amber-500)",
  NEGATIVE: "var(--color-red-600)",
  INSUFFICIENT_DATA: "var(--color-neutral-400)",
};

const BADGE_CLASS: Record<string, string> = {
  green: "border-green-200 bg-green-50 text-green-700",
  blue: "border-accent-200 bg-accent-100 text-accent-800",
  amber: "border-amber-200 bg-amber-50 text-amber-700",
  red: "border-red-200 bg-red-50 text-red-700",
  gray: "border-gray-200 bg-gray-50 text-gray-600",
};

const DIFFICULTY_TONE: Record<DifficultyLevel, string> = {
  EASY: "green",
  MEDIUM: "blue",
  HARD: "red",
  INSUFFICIENT_DATA: "gray",
};

const DISCRIMINATION_TONE: Record<DiscriminationLevel, string> = {
  HIGH: "green",
  MODERATE: "blue",
  LOW: "amber",
  NEGATIVE: "red",
  INSUFFICIENT_DATA: "gray",
};

const FLAG_TONE: Record<ReviewFlag, string> = {
  TOO_EASY: "amber",
  TOO_HARD: "amber",
  LOW_DISCRIMINATION: "amber",
  NEGATIVE_DISCRIMINATION: "red",
};

const truncate = (text: string, max: number) =>
  text.length > max ? `${text.slice(0, max)}…` : text;

function ToneBadge({ tone, children }: { tone: string; children: React.ReactNode }) {
  return (
    <Badge variant="outline" className={BADGE_CLASS[tone]}>
      {children}
    </Badge>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  warning = false,
  featured = false,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  warning?: boolean;
  featured?: boolean;
}) {
  return (
    <Card className={`min-w-0 justify-between gap-5 rounded-2xl p-4 shadow-none sm:p-5 ${featured ? "border-accent-700 bg-accent-700 text-white" : "border-border bg-white"}`}>
      <div className="flex items-start justify-between gap-2">
        <p className={`min-w-0 break-words text-sm font-medium leading-5 ${featured ? "text-accent-100" : "text-muted-foreground"}`}>{label}</p>
        <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${featured ? "bg-white/10 text-white" : warning ? "bg-amber-50 text-amber-700" : "bg-accent-100 text-accent-700"}`}>
          <Icon className="size-4" aria-hidden="true" />
        </span>
      </div>
      <p className={`font-heading text-3xl font-semibold tracking-tight tabular-nums sm:text-4xl ${featured ? "text-white" : "text-neutral-900"}`}>{value}</p>
    </Card>
  );
}

function MixPie<T extends string>({
  data,
  colors,
  totalLabel,
}: {
  data: { level: T; name: string; value: number }[];
  colors: Record<T, string>;
  totalLabel: string;
}) {
  const formatter = useFormatter();
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="flex min-w-0 items-center gap-4">
      <div className="relative size-28 shrink-0" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={37}
              outerRadius={48}
              paddingAngle={2}
              stroke="var(--card)"
              isAnimationActive={false}
            >
              {data.map((d) => (
                <Cell key={d.level} fill={colors[d.level]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-semibold tracking-tight text-neutral-900 tabular-nums">{formatter.number(total)}</span>
          <span className="text-[10px] text-muted-foreground">{totalLabel}</span>
        </div>
      </div>
      <ul className="min-w-0 flex-1 space-y-2.5 text-xs">
        {data.map((d) => (
          <li key={d.level} className="flex items-start gap-2">
            <span className="mt-1 size-2 shrink-0 rounded-full" style={{ backgroundColor: colors[d.level] }} aria-hidden="true" />
            <span className="min-w-0 flex-1 text-muted-foreground">{d.name}</span>
            <span className="font-semibold text-neutral-900 tabular-nums">{formatter.number(d.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Exam Quality Dashboard: difficulty / discrimination analysis for an exam. */
export default function ExamQualityPage() {
  const t = useTranslations("lecturer.examQuality");
  const formatter = useFormatter();
  const formatNumber = (value: number | null | undefined, digits = 2) =>
    value == null ? "-" : formatter.number(value, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
  const params = useParams();
  const examId = params.id as string;
  const [data, setData] = useState<ExamAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [questionPage, setQuestionPage] = useState(1);
  const questionTableRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);
    try {
      const res = await apiClient.get<ExamAnalytics>(
        ENDPOINTS.EXAMS.ANALYTICS(examId),
      );
      setData(res.data);
      setQuestionPage(1);
    } catch {
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, [examId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center" aria-busy="true">
        <Loader2 className="h-6 w-6 animate-spin text-accent-600" aria-hidden="true" />
      </div>
    );
  }

  if (hasError || !data) {
    return (
      <Card className="mx-auto max-w-xl items-center gap-4 border-border bg-white p-6 text-center" role="alert">
        <span className="flex size-10 items-center justify-center rounded-full bg-amber-50 text-amber-700">
          <AlertTriangle className="size-5" aria-hidden="true" />
        </span>
        <p className="text-sm text-neutral-700">{t("loadError")}</p>
        <Button variant="outline" onClick={() => void load()}>
          {t("retry")}
        </Button>
      </Card>
    );
  }

  const { summary, questions } = data;
  const hasSubmissions = summary.submissionCount > 0;
  const lowSample = hasSubmissions && summary.submissionCount < summary.minSampleSize;
  const reviewQuestions = questions.filter((q) => q.needsReview);
  const indexOf = (q: QuestionAnalytics) => questions.indexOf(q) + 1;
  const questionPageCount = Math.max(1, Math.ceil(questions.length / QUESTION_PAGE_SIZE));
  const currentQuestionPage = Math.min(questionPage, questionPageCount);
  const questionStartIndex = (currentQuestionPage - 1) * QUESTION_PAGE_SIZE;
  const visibleQuestions = questions.slice(questionStartIndex, questionStartIndex + QUESTION_PAGE_SIZE);
  const changeQuestionPage = (page: number) => {
    setQuestionPage(Math.max(1, Math.min(page, questionPageCount)));
    questionTableRef.current?.scrollTo({ top: 0 });
  };

  const difficultyMix = (
    [
      ["EASY", summary.difficulty.easy],
      ["MEDIUM", summary.difficulty.medium],
      ["HARD", summary.difficulty.hard],
      ["INSUFFICIENT_DATA", summary.difficulty.insufficientData],
    ] as [DifficultyLevel, number][]
  )
    .filter(([, count]) => count > 0)
    .map(([level, count]) => ({
      level,
      name: t(`difficulty.${level}`),
      value: count,
    }));

  const discriminationMix = (
    [
      ["HIGH", summary.discrimination.high],
      ["MODERATE", summary.discrimination.moderate],
      ["LOW", summary.discrimination.low],
      ["NEGATIVE", summary.discrimination.negative],
      ["INSUFFICIENT_DATA", summary.discrimination.insufficientData],
    ] as [DiscriminationLevel, number][]
  )
    .filter(([, count]) => count > 0)
    .map(([level, count]) => ({
      level,
      name: t(`discrimination.${level}`),
      value: count,
    }));

  const histogram = summary.scoreDistribution.map((b) => ({
    label: `${formatter.number(b.from)}–${formatter.number(b.to)}`,
    count: b.count,
  }));

  return (
    <div className="min-w-0 space-y-6 pb-4">
      <header className="relative isolate overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-white via-white to-accent-100/80 p-5 sm:p-7">
        <ChartNoAxesCombined className="pointer-events-none absolute -right-8 -bottom-10 -z-10 size-56 text-accent-200/30" strokeWidth={1} aria-hidden="true" />
        <Link href={`/lecturer/exams/${examId}/report`} className="inline-flex min-h-9 items-center gap-1.5 rounded-md text-xs font-medium text-muted-foreground transition-colors hover:text-accent-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <ChevronLeft className="size-4" aria-hidden="true" />
          {t("backToReport")}
        </Link>
        <div className="mt-4 flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
          <div className="min-w-0 max-w-2xl">
            <p className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-wider text-accent-700 uppercase">
              <span className="size-1.5 rounded-full bg-accent-600" aria-hidden="true" />
              {t("workspaceLabel")}
            </p>
            <h1 className="font-heading text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">{t("title")}</h1>
            <p className="mt-2 break-words text-sm font-semibold leading-6 text-neutral-700">{data.examTitle}</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{t("subtitle")}</p>
          </div>
          {hasSubmissions && (
            <Button asChild variant="outline" className="w-full shrink-0 border-accent-200 bg-white text-accent-800 sm:w-fit">
              <a href="#question-details">
                {t("viewDetails")}
                <ArrowDownRight className="size-4" aria-hidden="true" />
              </a>
            </Button>
          )}
        </div>
      </header>

      {!hasSubmissions ? (
        <Card className="items-center gap-3 border-dashed border-border bg-white p-8 text-center text-sm text-muted-foreground">
          <BarChart3 className="size-8 text-accent-600" aria-hidden="true" />
          {t("noData")}
        </Card>
      ) : (
        <>
          {lowSample && (
            <Card
              className="flex-row items-start gap-2 border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"
              role="alert"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              {t("lowSampleWarning", {
                count: summary.submissionCount,
                min: summary.minSampleSize,
              })}
            </Card>
          )}

          <section aria-label={t("overview")} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard icon={Users} label={t("summary.submissions")} value={formatter.number(summary.submissionCount)} />
            <StatCard icon={BarChart3} featured label={t("summary.mean")} value={formatNumber(summary.mean)} />
            <StatCard icon={Gauge} label={t("summary.avgDifficulty")} value={formatNumber(summary.averageDifficulty)} />
            <StatCard icon={ClipboardCheck} warning={summary.reviewCount > 0} label={t("summary.needsReview")} value={formatter.number(summary.reviewCount)} />
          </section>

          <div className="grid items-stretch gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(21rem,1fr)]">
            <Card className="min-w-0 gap-5 overflow-hidden rounded-2xl border-border bg-white pb-0 shadow-none">
              <CardHeader className="px-4 sm:px-6">
                <CardTitle role="heading" aria-level={2} className="text-base text-neutral-900">{t("charts.scoreDistribution")}</CardTitle>
                <p className="text-xs leading-5 text-muted-foreground">{t("charts.scoreDistributionHint")}</p>
              </CardHeader>
              <CardContent className="min-w-0 px-3 sm:px-6">
                <div className="h-64 sm:h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={histogram} margin={{ top: 12, right: 8, left: -20, bottom: 0 }} accessibilityLayer>
                      <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="label" axisLine={false} tickLine={false} minTickGap={12} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} dy={8} />
                      <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                      <Tooltip
                        formatter={(v) => [v, t("charts.students")]}
                        cursor={{ fill: "var(--color-accent-100)" }}
                        contentStyle={{ border: "1px solid var(--border)", borderRadius: "var(--radius)", fontSize: 12, backgroundColor: "var(--card)", color: "var(--card-foreground)" }}
                      />
                      <Bar dataKey="count" fill="var(--primary)" radius={[5, 5, 0, 0]} maxBarSize={48} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
              <dl className="grid grid-cols-1 divide-y divide-border border-t border-border bg-neutral-50/70 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                {[
                  { label: t("summary.median"), value: formatNumber(summary.median), icon: Target },
                  { label: t("summary.stdDev"), value: formatNumber(summary.stdDev), icon: ChartNoAxesCombined },
                  { label: t("summary.range"), value: `${formatNumber(summary.min, 1)} – ${formatNumber(summary.max, 1)}`, icon: ArrowDownUp },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="min-w-0 px-4 py-4 sm:px-5">
                    <dt className="flex items-start gap-1.5 text-xs leading-5 text-muted-foreground">
                      <Icon className="mt-0.5 size-3.5 shrink-0 text-accent-600" aria-hidden="true" />
                      {label}
                    </dt>
                    <dd className="mt-1 text-lg font-semibold tracking-tight text-neutral-900 tabular-nums">{value}</dd>
                  </div>
                ))}
              </dl>
            </Card>

            <Card className="min-w-0 justify-center gap-0 divide-y divide-border rounded-2xl border-border bg-white py-0 shadow-none">
              <section className="min-w-0 space-y-3 p-5 sm:p-6" aria-labelledby="difficulty-mix-title">
                <h2 id="difficulty-mix-title" className="text-base font-semibold text-neutral-900">{t("charts.difficultyMix")}</h2>
                <MixPie data={difficultyMix} colors={DIFFICULTY_COLOR} totalLabel={t("questionUnit")} />
              </section>
              <section className="min-w-0 space-y-3 p-5 sm:p-6" aria-labelledby="discrimination-mix-title">
                <h2 id="discrimination-mix-title" className="text-base font-semibold text-neutral-900">{t("charts.discriminationMix")}</h2>
                <MixPie data={discriminationMix} colors={DISCRIMINATION_COLOR} totalLabel={t("questionUnit")} />
              </section>
            </Card>
          </div>

          <Card className="gap-5 rounded-2xl border-border bg-white shadow-none">
            <CardHeader className="px-4 sm:px-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`flex size-9 items-center justify-center rounded-xl ${reviewQuestions.length > 0 ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
                  <ClipboardCheck className="size-4" aria-hidden="true" />
                </span>
                <CardTitle role="heading" aria-level={2} className="text-base text-neutral-900">{t("review.title")}</CardTitle>
                <Badge variant="outline" className="rounded-full border-border bg-neutral-50 text-neutral-700">{formatter.number(reviewQuestions.length)}</Badge>
              </div>
              <p className="text-xs leading-5 text-muted-foreground">{t("review.description")}</p>
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
              {reviewQuestions.length === 0 ? (
                <p className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 text-sm text-emerald-800">
                  <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
                  {t("review.empty")}
                </p>
              ) : (
                <ul className="grid items-stretch gap-3 xl:grid-cols-3">
                  {reviewQuestions.map((q) => (
                    <li
                      key={q.questionId}
                      className="flex min-w-0 flex-col rounded-xl border border-border border-l-[3px] border-l-amber-400 bg-white p-4 sm:p-5"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-md bg-neutral-100 px-1.5 text-xs font-semibold text-neutral-700 tabular-nums">
                          #{formatter.number(indexOf(q))}
                        </span>
                        {q.flags.map((f) => (
                          <ToneBadge key={f} tone={FLAG_TONE[f]}>
                            {t(`flags.${f}`)}
                          </ToneBadge>
                        ))}
                      </div>
                      <p className="mt-2 break-words text-sm leading-6 text-neutral-800">
                        {q.questionText}
                      </p>
                      <ul className="mt-2 mb-4 list-disc space-y-1 pl-5 text-xs leading-5 text-muted-foreground">
                        {q.flags.map((f) => (
                          <li key={f}>{t(`flagHints.${f}`)}</li>
                        ))}
                      </ul>
                      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
                        <dl className="flex gap-4 text-xs">
                          <div>
                            <dt className="text-muted-foreground">{t("table.difficultyP")}</dt>
                            <dd className="mt-1 font-semibold text-neutral-900 tabular-nums">{formatNumber(q.difficultyIndex)}</dd>
                          </div>
                          <div>
                            <dt className="text-muted-foreground">{t("table.discriminationD")}</dt>
                            <dd className="mt-1 font-semibold text-neutral-900 tabular-nums">{formatNumber(q.discriminationIndex)}</dd>
                          </div>
                        </dl>
                        <Button asChild variant="outline" size="sm" className="border-border bg-white text-accent-800">
                          <Link href={`/lecturer/questions?edit=${encodeURIComponent(q.questionId)}`}>
                            <Pencil className="size-3.5" aria-hidden="true" />
                            {t("review.editQuestion")}
                            <ArrowRight className="size-3.5" aria-hidden="true" />
                          </Link>
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card id="question-details" className="min-w-0 scroll-mt-24 gap-4 overflow-hidden rounded-2xl border-border bg-white shadow-none">
            <CardHeader className="px-4 sm:px-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle role="heading" aria-level={2} className="text-base text-neutral-900">{t("table.title")}</CardTitle>
                <Badge variant="outline" className="rounded-full border-border bg-neutral-50 font-normal text-muted-foreground">{t("questionCount", { count: questions.length })}</Badge>
              </div>
              <p className="text-xs leading-5 text-muted-foreground">{t("table.scrollHint")}</p>
            </CardHeader>
            <CardContent className="min-w-0 px-0">
              <div ref={questionTableRef} id="question-details-table" role="region" aria-label={t("table.title")} tabIndex={0} className="max-h-[40rem] overflow-auto border-y border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring [&>div]:overflow-visible">
              <Table className="min-w-[1200px] [&_tr]:border-border [&_td]:py-4 [&_td]:tabular-nums [&_th]:py-3 [&_th]:text-xs [&_th]:text-muted-foreground">
                <TableHeader className="sticky top-0 z-10 bg-neutral-50">
                  <TableRow>
                    <TableHead className="w-10">{t("table.index")}</TableHead>
                    <TableHead className="min-w-64">{t("table.question")}</TableHead>
                    <TableHead className="min-w-36">{t("table.chapter")}</TableHead>
                    <TableHead className="text-right">{t("table.attempts")}</TableHead>
                    <TableHead className="text-right">{t("table.difficultyP")}</TableHead>
                    <TableHead>{t("table.difficultyLevel")}</TableHead>
                    <TableHead className="text-right">{t("table.discriminationD")}</TableHead>
                    <TableHead>{t("table.discriminationLevel")}</TableHead>
                    <TableHead className="text-right">{t("table.upperLower")}</TableHead>
                    <TableHead>{t("table.flags")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleQuestions.map((q, i) => (
                    <TableRow
                      key={q.questionId}
                      className={q.needsReview ? "bg-amber-50/40" : undefined}
                    >
                      <TableCell className="text-muted-foreground">{formatter.number(questionStartIndex + i + 1)}</TableCell>
                      <TableCell className="max-w-xs whitespace-normal" title={q.questionText}>
                        {truncate(q.questionText, 90)}
                      </TableCell>
                      <TableCell className="whitespace-normal text-neutral-600">
                        {q.chapterName ?? "-"}
                      </TableCell>
                      <TableCell className="text-right">{formatter.number(q.attempts)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatNumber(q.difficultyIndex)}
                      </TableCell>
                      <TableCell>
                        <ToneBadge tone={DIFFICULTY_TONE[q.difficultyLevel]}>
                          {t(`difficulty.${q.difficultyLevel}`)}
                        </ToneBadge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatNumber(q.discriminationIndex)}
                      </TableCell>
                      <TableCell>
                        <ToneBadge tone={DISCRIMINATION_TONE[q.discriminationLevel]}>
                          {t(`discrimination.${q.discriminationLevel}`)}
                        </ToneBadge>
                      </TableCell>
                      <TableCell className="text-right text-neutral-600">
                        {formatNumber(q.upperGroupP)} / {formatNumber(q.lowerGroupP)}
                      </TableCell>
                      <TableCell>
                        {q.flags.length === 0 ? (
                          <span className="text-xs text-neutral-400">{t("table.ok")}</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {q.flags.map((f) => (
                              <ToneBadge key={f} tone={FLAG_TONE[f]}>
                                {t(`flags.${f}`)}
                              </ToneBadge>
                            ))}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
              {questions.length > 0 && (
                <div className="flex flex-col gap-3 px-4 pt-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                  <p className="text-xs tabular-nums text-muted-foreground" aria-live="polite" aria-atomic="true">
                    {t("table.range", {
                      start: formatter.number(questionStartIndex + 1),
                      end: formatter.number(questionStartIndex + visibleQuestions.length),
                      total: formatter.number(questions.length),
                    })}
                  </p>
                  <nav aria-label={t("table.pagination")} className="flex items-center justify-between gap-2 sm:justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="cursor-pointer border-border"
                      aria-controls="question-details-table"
                      disabled={currentQuestionPage <= 1}
                      onClick={() => changeQuestionPage(currentQuestionPage - 1)}
                    >
                      <ChevronLeft className="size-4" aria-hidden="true" />
                      {t("table.previous")}
                    </Button>
                    <span className="whitespace-nowrap text-xs font-medium tabular-nums text-neutral-600">
                      {t("table.pageOf", {
                        page: formatter.number(currentQuestionPage),
                        total: formatter.number(questionPageCount),
                      })}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="cursor-pointer border-border"
                      aria-controls="question-details-table"
                      disabled={currentQuestionPage >= questionPageCount}
                      onClick={() => changeQuestionPage(currentQuestionPage + 1)}
                    >
                      {t("table.next")}
                      <ChevronRight className="size-4" aria-hidden="true" />
                    </Button>
                  </nav>
                </div>
              )}
            </CardContent>
          </Card>

          <aside className="rounded-2xl border border-accent-200 bg-accent-100/40 p-5 sm:p-6" aria-labelledby="metric-guide-title">
            <h2 id="metric-guide-title" className="mb-4 flex items-center gap-2 text-sm font-semibold text-accent-800">
              <Info className="size-4 shrink-0" aria-hidden="true" />
              {t("legend.title")}
            </h2>
            <div className="grid gap-4 text-xs leading-6 text-neutral-600 lg:grid-cols-2">
              <p className="flex items-start gap-3"><span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-accent-200 bg-white font-semibold text-accent-800" aria-hidden="true">P</span>{t("legend.p")}</p>
              <p className="flex items-start gap-3"><span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-accent-200 bg-white font-semibold text-accent-800" aria-hidden="true">D</span>{t("legend.d")}</p>
            </div>
          </aside>
        </>
      )}
    </div>
  );
}
