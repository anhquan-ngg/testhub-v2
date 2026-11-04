"use client";

import { useLocale, useTranslations } from "next-intl";
import { intlLocales } from "@/i18n/config";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "@/i18n/navigation";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowRight,
  BarChart3,
  CalendarClock,
  FileText,
  Loader2,
  PlayCircle,
  Users,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAppSelector } from "@/store/hook";
import { fetchAllPages } from "@/lib/pagination";
import { ENDPOINTS } from "@/constants/endpoints";

type LecturerExamItem = {
  id: string;
  title: string;
  topic?: string | { name?: string | null } | null;
  exam_start_time: string;
  exam_end_time: string;
  duration: number;
  practice: boolean;
  status?: string;
};

type ExamRegistrationItem = {
  id: string;
  exam_id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
};

type ExamSubmissionItem = {
  exam_id: string;
  total_score?: number | string | null;
};

const getTopicName = (topic: LecturerExamItem["topic"], fallback: string) => {
  if (!topic) return fallback;
  if (typeof topic === "string") return topic;
  return topic.name ?? fallback;
};

export default function LecturerHome() {
  const t = useTranslations("lecturer.dashboard");
  const locale = useLocale();
  const user = useAppSelector((state) => state.user);
  const [exams, setExams] = useState<LecturerExamItem[]>([]);
  const [registrations, setRegistrations] = useState<ExamRegistrationItem[]>(
    [],
  );
  const [submissions, setSubmissions] = useState<ExamSubmissionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    if (!user.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const lecturerExams = await fetchAllPages<LecturerExamItem>(
        ENDPOINTS.EXAMS.BASE,
        { lecturer_id: user.id },
      );
      setExams(lecturerExams);

      const [registrationLists, submissionLists] = await Promise.all([
        Promise.all(
          lecturerExams.map((exam) =>
            fetchAllPages<ExamRegistrationItem>(ENDPOINTS.EXAM_REGISTRATIONS.BASE, { exam_id: exam.id }),
          ),
        ),
        Promise.all(
          lecturerExams.map((exam) =>
            fetchAllPages<ExamSubmissionItem>(ENDPOINTS.SUBMISSIONS.BASE, { exam_id: exam.id, status: "COMPLETED" }),
          ),
        ),
      ]);

      setRegistrations(registrationLists.flat());
      setSubmissions(submissionLists.flat());
    } catch (error) {
      console.error("Fetch lecturer dashboard error:", error);
      toast.error(t("anErrorOccurredWhileLoadingThe"));
      setExams([]);
      setRegistrations([]);
      setSubmissions([]);
    } finally {
      setIsLoading(false);
    }
  }, [user.id, t]);

  useEffect(() => {
    void fetchDashboard();
  }, [fetchDashboard]);

  // Ticks so liveExams/upcomingExams (and their badges) flip over on their
  // own as an exam's start/end time passes, instead of only updating on
  // the next unrelated re-render.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const liveExams = useMemo(
    () =>
      exams.filter((exam) => {
        const start = new Date(exam.exam_start_time).getTime();
        const end = new Date(exam.exam_end_time).getTime();
        return start <= now && now <= end;
      }),
    [exams, now],
  );

  const upcomingExams = useMemo(
    () =>
      exams
        .filter((exam) => new Date(exam.exam_start_time).getTime() > now)
        .sort(
          (a, b) =>
            new Date(a.exam_start_time).getTime() -
            new Date(b.exam_start_time).getTime(),
        ),
    [exams, now],
  );

  const pendingCount = useMemo(
    () => registrations.filter((r) => r.status === "PENDING").length,
    [registrations],
  );

  const approvedCount = useMemo(
    () => registrations.filter((r) => r.status === "APPROVED").length,
    [registrations],
  );

  const registrationsByExam = useMemo(() => {
    const map = new Map<string, { pending: number; approved: number }>();
    registrations.forEach((r) => {
      const entry = map.get(r.exam_id) ?? { pending: 0, approved: 0 };
      if (r.status === "PENDING") entry.pending += 1;
      if (r.status === "APPROVED") entry.approved += 1;
      map.set(r.exam_id, entry);
    });
    return map;
  }, [registrations]);

  const stats = [
    {
      label: t("statManagedExams"),
      value: exams.length,
      icon: FileText,
      chip: "bg-sky-50 text-sky-700",
    },
    {
      label: t("statLiveExams"),
      value: liveExams.length,
      icon: PlayCircle,
      chip: "bg-emerald-50 text-emerald-700",
    },
    {
      label: t("statPendingRegistrations"),
      value: pendingCount,
      icon: Users,
      chip: "bg-amber-50 text-amber-700",
    },
    {
      label: t("statApprovedRegistrations"),
      value: approvedCount,
      icon: BarChart3,
      chip: "bg-violet-50 text-violet-700",
    },
  ];

  const examsById = useMemo(
    () => new Map(exams.map((exam) => [exam.id, exam])),
    [exams],
  );

  const scoreData = useMemo(() => {
    const ranges = [
      { range: "0-2.0", count: 0, countPractice: 0 },
      { range: "2.1-4.0", count: 0, countPractice: 0 },
      { range: "4.1-6.0", count: 0, countPractice: 0 },
      { range: "6.1-8.0", count: 0, countPractice: 0 },
      { range: "8.1-10.0", count: 0, countPractice: 0 },
    ];

    submissions.forEach((sub) => {
      // A COMPLETED submission can still have a null total_score briefly
      // (grading runs async after submit) — treating that as a score of 0
      // would misclassify an ungraded attempt as the worst possible one.
      if (sub.total_score === null || sub.total_score === undefined) return;
      const score = Number(sub.total_score);
      if (!Number.isFinite(score)) return;
      const isPractice = examsById.get(sub.exam_id)?.practice ?? false;

      let rangeIndex = -1;
      if (score >= 0 && score <= 2.0) rangeIndex = 0;
      else if (score > 2.0 && score <= 4.0) rangeIndex = 1;
      else if (score > 4.0 && score <= 6.0) rangeIndex = 2;
      else if (score > 6.0 && score <= 8.0) rangeIndex = 3;
      else if (score > 8.0 && score <= 10.0) rangeIndex = 4;

      if (rangeIndex !== -1) {
        if (isPractice) ranges[rangeIndex].countPractice += 1;
        else ranges[rangeIndex].count += 1;
      }
    });

    return ranges;
  }, [submissions, examsById]);

  const spotlightExams = [...liveExams, ...upcomingExams].slice(0, 5);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent-600" />
      </div>
    );
  }

  return (
    <div className="space-y-7">
      {/* Welcome */}
      <div>
        <span className="text-xs font-semibold uppercase tracking-wide text-accent-600">
          {t("overview")}</span>
        <h2 className="mt-1 text-2xl font-bold text-neutral-900">
          {t("greeting", { name: user.full_name || t("friend") })}
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          {pendingCount > 0
            ? t("pendingRegistrations", { count: pendingCount })
            : t("thereAreNoRegistrationsPendingApproval")}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-gray-300 bg-white shadow-sm">
            <CardContent className="flex items-start justify-between px-5">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                  {stat.label}
                </p>
                <p className="mt-1.5 font-heading text-3xl font-semibold text-neutral-900">
                  {stat.value}
                </p>
              </div>
              <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${stat.chip}`}>
                <stat.icon className="h-5 w-5" />
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {/* Upcoming / live exams */}
        <div className="min-w-0">
          <h3 className="mb-3 text-lg font-semibold text-neutral-900">
            {t("theExamIsAboutToTake")}</h3>
          <Card className="border-gray-300 bg-white py-0 shadow-sm">
            <CardContent className="divide-y divide-neutral-100 px-0">
              {spotlightExams.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
                  <CalendarClock className="h-8 w-8 text-neutral-300" />
                  <p className="text-sm text-neutral-500">
                    {t("youDonTHaveAnyUpcoming")}</p>
                </div>
              ) : (
                spotlightExams.map((exam) => {
                  const isLive = liveExams.some((e) => e.id === exam.id);
                  const regInfo = registrationsByExam.get(exam.id);
                  return (
                    <div
                      key={exam.id}
                      className="flex flex-wrap items-center gap-3 px-6 py-4"
                    >
                      {isLive ? (
                        <Badge variant="outline" className="shrink-0 border-emerald-200 bg-emerald-50 text-emerald-700">
                          {t("open")}</Badge>
                      ) : regInfo?.pending ? (
                        <Badge
                          variant="outline"
                          className="shrink-0 border-accent-300 text-accent-700"
                        >
                          {regInfo.pending} {t("waitingForApproval")}</Badge>
                      ) : (
                        <Badge variant="secondary" className="shrink-0">
                          {t("aboutToOpen")}</Badge>
                      )}
                      <div className="order-first w-full min-w-0">
                        <p className="truncate font-heading text-base font-semibold text-neutral-900">
                          {exam.title}
                        </p>
                        <p className="break-words text-xs text-neutral-500">
                          {getTopicName(exam.topic, t("uncategorized"))} ·{" "}
                          {new Date(exam.exam_start_time).toLocaleString(
                            intlLocales[locale],
                          )}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-auto shrink-0 cursor-pointer gap-1.5 text-accent-700 hover:text-accent-800"
                        asChild
                      >
                        <Link href={`/lecturer/exams/${exam.id}/report`}>
                          {t("viewReport")}<ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Score distribution */}
        <div className="min-w-0">
          <h3 className="mb-3 text-lg font-semibold text-neutral-900">
            {t("scoreSpectrumTestBeingAdministered")}</h3>
          <Card className="border-gray-300 bg-white shadow-sm">
            <CardContent className="px-3 sm:px-5">
              <div className="h-[300px] w-full min-w-0 sm:h-[340px] xl:h-[360px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={scoreData}
                    margin={{ top: 12, right: 8, left: 0, bottom: 0 }}
                    barGap={6}
                    barCategoryGap="24%"
                    maxBarSize={48}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-neutral-200)" />
                    <XAxis
                      dataKey="range"
                      tickMargin={10}
                      tick={{ fontSize: 12, fill: "var(--color-neutral-500)" }}
                    />
                    <YAxis
                      width={32}
                      allowDecimals={false}
                      tick={{ fontSize: 12, fill: "var(--color-neutral-500)" }}
                    />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 13, paddingTop: 16 }} />
                    <Bar
                      dataKey="count"
                      fill="var(--color-accent-600)"
                      name={t("official")}
                      radius={[3, 3, 0, 0]}
                    />
                    <Bar
                      dataKey="countPractice"
                      fill="var(--color-accent-300)"
                      name={t("practice")}
                      radius={[3, 3, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
