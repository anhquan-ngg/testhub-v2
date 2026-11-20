"use client";

import { useCallback, useEffect, useState } from "react";
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
  blue: "border-blue-200 bg-blue-50 text-blue-700",
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
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  warning?: boolean;
}) {
  return (
    <Card className="min-w-0 gap-3 border-border bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 break-words text-xs font-medium leading-5 text-muted-foreground">{label}</p>
        <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${warning ? "bg-amber-50 text-amber-700" : "bg-accent-100 text-accent-700"}`}>
          <Icon className="size-4" aria-hidden="true" />
        </span>
      </div>
      <p className="font-heading text-2xl font-semibold tracking-tight text-neutral-900 tabular-nums">{value}</p>
    </Card>
  );
}

function MixPie<T extends string>({
  data,
  colors,
}: {
  data: { level: T; name: string; value: number }[];
  colors: Record<T, string>;
}) {
  return (
    <div className="flex min-w-0 items-center gap-4">
      <div className="size-28 shrink-0" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={32}
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
      </div>
      <ul className="min-w-0 flex-1 space-y-2.5 text-xs">
        {data.map((d) => (
          <li key={d.level} className="flex items-start gap-2">
            <span className="mt-1 size-2 shrink-0 rounded-full" style={{ backgroundColor: colors[d.level] }} aria-hidden="true" />
            <span className="min-w-0 flex-1 text-muted-foreground">{d.name}</span>
            <span className="font-semibold text-neutral-900 tabular-nums">{d.value}</span>
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

  const load = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);
    try {
      const res = await apiClient.get<ExamAnalytics>(
        ENDPOINTS.EXAMS.ANALYTICS(examId),
      );
      setData(res.data);
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
    label: `${b.from}-${b.to}`,
    count: b.count,
  }));

  return (
    <div className="min-w-0 space-y-6">
      <div className="space-y-4">
        <Button asChild variant="outline" size="sm" className="border-border bg-white text-muted-foreground">
          <Link href={`/lecturer/exams/${examId}/report`}>
            <ChevronLeft className="size-4" aria-hidden="true" />
            {t("backToReport")}
          </Link>
        </Button>
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent-100 text-accent-700">
            <ChartNoAxesCombined className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900">{t("title")}</h1>
            <p className="mt-1 break-words text-sm font-medium text-neutral-700">{data.examTitle}</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{t("subtitle")}</p>
          </div>
        </div>
      </div>

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

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 2xl:grid-cols-7">
            <StatCard icon={Users} label={t("summary.submissions")} value={formatter.number(summary.submissionCount)} />
            <StatCard icon={BarChart3} label={t("summary.mean")} value={formatNumber(summary.mean)} />
            <StatCard icon={Target} label={t("summary.median")} value={formatNumber(summary.median)} />
            <StatCard icon={ChartNoAxesCombined} label={t("summary.stdDev")} value={formatNumber(summary.stdDev)} />
            <StatCard
              icon={ArrowDownUp}
              label={t("summary.range")}
              value={`${formatNumber(summary.min, 1)} - ${formatNumber(summary.max, 1)}`}
            />
            <StatCard
              icon={Gauge}
              label={t("summary.avgDifficulty")}
              value={formatNumber(summary.averageDifficulty)}
            />
            <StatCard icon={ClipboardCheck} warning={summary.reviewCount > 0} label={t("summary.needsReview")} value={formatter.number(summary.reviewCount)} />
          </div>

          <div className="grid items-stretch gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(20rem,1fr)]">
            <Card className="min-w-0 gap-5 border-border bg-white">
              <CardHeader className="px-4 sm:px-6">
                <CardTitle className="text-base text-neutral-900">{t("charts.scoreDistribution")}</CardTitle>
                <p className="text-xs leading-5 text-muted-foreground">{t("charts.scoreDistributionHint")}</p>
              </CardHeader>
              <CardContent className="min-w-0 px-3 sm:px-6">
                <div className="h-72 sm:h-80">
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
            </Card>

            <div className="grid min-w-0 gap-4 lg:grid-cols-2 xl:grid-cols-1">
              <Card className="min-w-0 gap-3 border-border bg-white">
                <CardHeader className="px-4 sm:px-6">
                  <CardTitle className="text-base text-neutral-900">{t("charts.difficultyMix")}</CardTitle>
                </CardHeader>
                <CardContent className="px-4 sm:px-6">
                  <MixPie data={difficultyMix} colors={DIFFICULTY_COLOR} />
                </CardContent>
              </Card>
              <Card className="min-w-0 gap-3 border-border bg-white">
                <CardHeader className="px-4 sm:px-6">
                  <CardTitle className="text-base text-neutral-900">{t("charts.discriminationMix")}</CardTitle>
                </CardHeader>
                <CardContent className="px-4 sm:px-6">
                  <MixPie data={discriminationMix} colors={DISCRIMINATION_COLOR} />
                </CardContent>
              </Card>
            </div>
          </div>

          <Card className="gap-4 border-border bg-white">
            <CardHeader className="px-4 sm:px-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                  <ClipboardCheck className="size-4" aria-hidden="true" />
                </span>
                <CardTitle className="text-base text-neutral-900">{t("review.title")}</CardTitle>
                <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-800">{reviewQuestions.length}</Badge>
              </div>
              <p className="text-xs leading-5 text-muted-foreground">{t("review.description")}</p>
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
              {reviewQuestions.length === 0 ? (
                <p className="text-sm text-neutral-500">{t("review.empty")}</p>
              ) : (
                <ul className="space-y-3">
                  {reviewQuestions.map((q) => (
                    <li
                      key={q.questionId}
                      className="rounded-lg border border-amber-200/70 bg-amber-50/40 p-4"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-neutral-900">
                          #{indexOf(q)}
                        </span>
                        {q.flags.map((f) => (
                          <ToneBadge key={f} tone={FLAG_TONE[f]}>
                            {t(`flags.${f}`)}
                          </ToneBadge>
                        ))}
                        <span className="ml-auto text-xs text-neutral-500">
                          P {formatNumber(q.difficultyIndex)} · D{" "}
                          {formatNumber(q.discriminationIndex)}
                        </span>
                      </div>
                      <p className="mt-2 break-words text-sm leading-6 text-neutral-800">
                        {truncate(q.questionText, 200)}
                      </p>
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-5 text-muted-foreground">
                        {q.flags.map((f) => (
                          <li key={f}>{t(`flagHints.${f}`)}</li>
                        ))}
                      </ul>
                      <div className="mt-3 flex justify-end">
                        <Button asChild variant="outline" size="sm" className="border-border bg-white">
                          <Link href={`/lecturer/questions?edit=${encodeURIComponent(q.questionId)}`}>
                            <Pencil className="size-4" aria-hidden="true" />
                            {t("review.editQuestion")}
                          </Link>
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="min-w-0 gap-4 overflow-hidden border-border bg-white">
            <CardHeader className="px-4 sm:px-6">
              <CardTitle className="text-base text-neutral-900">{t("table.title")}</CardTitle>
            </CardHeader>
            <CardContent className="min-w-0 px-4 sm:px-6">
              <div className="overflow-hidden rounded-lg border border-border">
              <Table className="min-w-[1100px] [&_tr]:border-border [&_td]:py-3 [&_th]:text-xs [&_th]:text-muted-foreground">
                <TableHeader className="bg-muted/70">
                  <TableRow>
                    <TableHead className="w-10">{t("table.index")}</TableHead>
                    <TableHead>{t("table.question")}</TableHead>
                    <TableHead>{t("table.chapter")}</TableHead>
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
                  {questions.map((q, i) => (
                    <TableRow
                      key={q.questionId}
                      className={q.needsReview ? "bg-amber-50/40" : undefined}
                    >
                      <TableCell>{i + 1}</TableCell>
                      <TableCell className="max-w-xs whitespace-normal" title={q.questionText}>
                        {truncate(q.questionText, 90)}
                      </TableCell>
                      <TableCell className="whitespace-normal text-neutral-600">
                        {q.chapterName ?? "-"}
                      </TableCell>
                      <TableCell className="text-right">{q.attempts}</TableCell>
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
            </CardContent>
          </Card>

          <Card className="flex-row items-start gap-3 border-accent-200 bg-accent-100/50 p-4 text-xs leading-6 text-accent-800">
            <Info className="mt-1 size-4 shrink-0 text-accent-700" aria-hidden="true" />
            <div className="min-w-0 space-y-1">
              <p className="font-semibold">{t("legend.title")}</p>
              <p>{t("legend.p")}</p>
              <p>{t("legend.d")}</p>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
