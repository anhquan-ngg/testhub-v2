"use client";

import { useLocale, useTranslations } from "next-intl";
import { intlLocales } from "@/i18n/config";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeft,
  Loader2,
  RefreshCw,
  Search,
  ShieldAlert,
  TimerReset,
  WifiOff,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import apiClient from "@/lib/api-client";
import { ENDPOINTS } from "@/constants/endpoints";

type SubmissionStatus = "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
type ViolationType =
  | "TAB_HIDDEN"
  | "WINDOW_BLUR"
  | "FULLSCREEN_EXIT"
  | "CONNECTION_LOST"
  | "COPY"
  | "PASTE";

type RosterRow = {
  student: { id: string; full_name: string; email: string };
  registered: boolean;
  submission_id: string | null;
  status: SubmissionStatus | null;
  attempt: number;
  started_at: string | null;
  submitted_at: string | null;
  last_ping: string | null;
  answered: number;
  total: number;
  violations: number;
  last_violation_type: ViolationType | null;
  last_violation_at: string | null;
};

type RosterSummary = {
  registered: number;
  not_started: number;
  online: number;
  unstable: number;
  offline: number;
  submitted: number;
  absent: number;
  cancelled: number;
  total_violations: number;
};

type RosterResponse = {
  exam: {
    id: string;
    title: string;
    exam_start_time: string;
    exam_end_time: string;
    duration: number;
    practice: boolean;
    is_public: boolean;
    entry_deadline: string;
  };
  server_time: string;
  summary: RosterSummary;
  rows: RosterRow[];
};

type DeltaRow = {
  submissionId: string;
  status?: SubmissionStatus;
  lastPing?: string | null;
  answered?: number;
  total?: number;
  submittedAt?: string | null;
  violations?: number;
  lastViolationType?: ViolationType | null;
  lastViolationAt?: string | null;
};

type PresenceState =
  | "NOT_STARTED"
  | "ABSENT"
  | "ONLINE"
  | "UNSTABLE"
  | "OFFLINE"
  | "SUBMITTED"
  | "CANCELLED";

const WARN_MS = 45_000;
const TIMEOUT_MS = 120_000;
const BACKSTOP_MS = 30_000;

function derivePresence(
  row: RosterRow,
  nowMs: number,
  entryDeadlineMs: number,
): PresenceState {
  if (!row.status) {
    return nowMs > entryDeadlineMs ? "ABSENT" : "NOT_STARTED";
  }
  if (row.status === "CANCELLED") return "CANCELLED";
  if (row.status !== "IN_PROGRESS") return "SUBMITTED";
  const anchor = row.last_ping
    ? new Date(row.last_ping).getTime()
    : row.started_at
      ? new Date(row.started_at).getTime()
      : nowMs;
  const age = nowMs - anchor;
  if (age <= WARN_MS) return "ONLINE";
  if (age <= TIMEOUT_MS) return "UNSTABLE";
  return "OFFLINE";
}

const PRESENCE_META: Record<
  PresenceState,
  { dot: string; badge: string }
> = {
  ONLINE: { dot: "bg-green-500", badge: "bg-green-100 text-green-700" },
  UNSTABLE: { dot: "bg-amber-500", badge: "bg-amber-100 text-amber-700" },
  OFFLINE: { dot: "bg-red-500", badge: "bg-red-100 text-red-700" },
  SUBMITTED: { dot: "bg-accent-500", badge: "bg-accent-100 text-accent-800" },
  NOT_STARTED: { dot: "bg-neutral-300", badge: "bg-neutral-100 text-neutral-600" },
  ABSENT: { dot: "bg-neutral-400", badge: "bg-neutral-200 text-neutral-700" },
  CANCELLED: { dot: "bg-neutral-400", badge: "bg-neutral-200 text-neutral-700" },
};

export default function ExamMonitorPage() {
  const t = useTranslations("lecturer.monitor");
  const locale = useLocale();
  const violationLabels: Record<ViolationType, string> = useMemo(() => ({
    TAB_HIDDEN: t("violationTabHidden"),
    WINDOW_BLUR: t("violationWindowBlur"),
    FULLSCREEN_EXIT: t("violationFullscreenExit"),
    CONNECTION_LOST: t("violationConnectionLost"),
    COPY: t("violationCopy"),
    PASTE: t("violationPaste"),
  }), [t]);
  const presenceLabels: Record<PresenceState, string> = {
    ONLINE: t("presenceOnline"),
    UNSTABLE: t("presenceUnstable"),
    OFFLINE: t("presenceOffline"),
    SUBMITTED: t("presenceSubmitted"),
    NOT_STARTED: t("presenceNotStarted"),
    ABSENT: t("presenceAbsent"),
    CANCELLED: t("presenceCancelled"),
  };
  const timeAgo = (iso: string | null, nowMs: number): string => {
    if (!iso) return "—";
    const diffSec = Math.max(0, Math.floor((nowMs - new Date(iso).getTime()) / 1000));
    if (diffSec < 5) return t("justNow");
    if (diffSec < 60) return t("secondsAgo", { count: diffSec });
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return t("minutesAgo", { count: diffMin });
    return t("hoursAgo", { count: Math.floor(diffMin / 60) });
  };
  const params = useParams();
  const router = useRouter();
  const examId = params.id as string;

  const [roster, setRoster] = useState<RosterResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [connection, setConnection] = useState<"connecting" | "live" | "degraded">(
    "connecting",
  );
  const [extendTarget, setExtendTarget] = useState<{
    studentId: string;
    name: string;
  } | null>(null);
  const [extendMinutes, setExtendMinutes] = useState("15");
  const [isExtending, setIsExtending] = useState(false);

  const clockOffsetRef = useRef(0); // Date.now() - serverTime, applied to get corrected "now"
  const rowsBySubmissionRef = useRef<Map<string, RosterRow>>(new Map());
  const eventSourceRef = useRef<EventSource | null>(null);
  const lastSeqRef = useRef<number>(0);

  const applyClockOffset = useCallback((serverTimeIso: string) => {
    clockOffsetRef.current = Date.now() - new Date(serverTimeIso).getTime();
  }, []);

  const fetchRoster = useCallback(async () => {
    try {
      const response = await apiClient.get<RosterResponse>(
        ENDPOINTS.EXAM_RUNTIME.MONITOR_ROSTER(examId),
      );
      applyClockOffset(response.data.server_time);
      rowsBySubmissionRef.current = new Map(
        response.data.rows
          .filter((r) => r.submission_id)
          .map((r) => [r.submission_id as string, r]),
      );
      setRoster(response.data);
      setError(null);
      lastSeqRef.current = 0;
    } catch (err) {
      console.error("Fetch monitor roster error:", err);
      setError(t("unableToLoadMonitoringListPlease"));
    } finally {
      setIsLoading(false);
    }
  }, [examId, applyClockOffset, t]);

  const handleExtendTime = async () => {
    if (!extendTarget) return;
    const extraMinutes = Number(extendMinutes);
    if (
      !Number.isInteger(extraMinutes) ||
      extraMinutes < 1 ||
      extraMinutes > 120
    ) {
      toast.error(t("theNumberOfMinutesMustBe"));
      return;
    }
    setIsExtending(true);
    try {
      await apiClient.post(
        ENDPOINTS.EXAM_RUNTIME.EXTEND_TIME(examId, extendTarget.studentId),
        { extraMinutes },
      );
      toast.success(t("timeExtended", { minutes: extraMinutes, name: extendTarget.name }));
      setExtendTarget(null);
      void fetchRoster();
    } catch (error) {
      console.error("Extend time error:", error);
      toast.error(t("errorWhenExtendingTime"));
    } finally {
      setIsExtending(false);
    }
  };

  // Initial load
  useEffect(() => {
    void fetchRoster();
  }, [fetchRoster]);

  // 30s REST backstop, independent of SSE health — makes the whole feature
  // degrade to plain polling if the realtime channel is ever unhealthy.
  useEffect(() => {
    const id = window.setInterval(() => void fetchRoster(), BACKSTOP_MS);
    return () => window.clearInterval(id);
  }, [fetchRoster]);

  // 1s re-render tick so presence badges age in place instead of only
  // updating when a server message happens to arrive.
  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1_000);
    return () => window.clearInterval(id);
  }, []);

  /** Returns false when the submission id isn't in the current snapshot —
   * e.g. a student re-entered after submitting and a brand new submission
   * now exists. A sparse delta can only patch rows it already knows about,
   * so the caller falls back to a full roster refetch in that case. */
  const applyDeltaRow = useCallback((delta: DeltaRow): boolean => {
    const current = rowsBySubmissionRef.current.get(delta.submissionId);
    if (!current) return false;
    const merged: RosterRow = {
      ...current,
      status: delta.status ?? current.status,
      last_ping: delta.lastPing !== undefined ? delta.lastPing : current.last_ping,
      answered: delta.answered ?? current.answered,
      total: delta.total ?? current.total,
      submitted_at:
        delta.submittedAt !== undefined ? delta.submittedAt : current.submitted_at,
      violations: delta.violations ?? current.violations,
      last_violation_type:
        delta.lastViolationType !== undefined
          ? delta.lastViolationType
          : current.last_violation_type,
      last_violation_at:
        delta.lastViolationAt !== undefined
          ? delta.lastViolationAt
          : current.last_violation_at,
    };
    rowsBySubmissionRef.current.set(delta.submissionId, merged);
    return true;
  }, []);

  // SSE connection
  useEffect(() => {
    let cancelled = false;

    const connect = () => {
      if (cancelled) return;
      const apiBaseUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const source = new EventSource(
        `${apiBaseUrl}${ENDPOINTS.EXAM_RUNTIME.MONITOR_EVENTS(examId)}`,
        { withCredentials: true },
      );
      eventSourceRef.current = source;

      source.addEventListener("open", () => setConnection("live"));

      source.addEventListener("EXAM_MONITOR_SNAPSHOT", (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data) as RosterResponse;
          applyClockOffset(data.server_time);
          rowsBySubmissionRef.current = new Map(
            data.rows
              .filter((r) => r.submission_id)
              .map((r) => [r.submission_id as string, r]),
          );
          setRoster(data);
          setConnection("live");
        } catch {
          // ignore malformed payload
        }
      });

      source.addEventListener("EXAM_MONITOR_DELTA", (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data) as {
            seq: number;
            serverTime: string;
            activeCount: number;
            submittedCount: number;
            rows: DeltaRow[];
          };
          applyClockOffset(data.serverTime);

          // A seq gap means we missed a delta — resync from a full
          // snapshot rather than silently drifting forever.
          if (lastSeqRef.current !== 0 && data.seq !== lastSeqRef.current + 1) {
            void fetchRoster();
            return;
          }
          lastSeqRef.current = data.seq;

          const allKnown = data.rows
            .map((row) => applyDeltaRow(row))
            .every(Boolean);
          if (!allKnown) {
            // A new submission (re-entered after submitting) isn't in the
            // snapshot this delta is patching — a sparse patch can't add
            // a row, only a full roster refetch can.
            void fetchRoster();
            return;
          }

          // rowsBySubmissionRef only ever holds rows that have a
          // submission_id — students who haven't started (NOT_STARTED) or
          // never showed up (ABSENT) have none, so replacing roster.rows
          // outright would silently drop them from the list. Patch each
          // existing row in place instead, by submission_id, and leave
          // no-submission rows untouched.
          setRoster((prev) => {
            if (!prev) return prev;
            const rows = prev.rows.map((row) =>
              row.submission_id
                ? (rowsBySubmissionRef.current.get(row.submission_id) ?? row)
                : row,
            );
            return { ...prev, rows };
          });
        } catch {
          // ignore malformed payload
        }
      });

      source.addEventListener(
        "EXAM_MONITOR_VIOLATION",
        (event: MessageEvent) => {
          try {
            const data = JSON.parse(event.data) as {
              serverTime: string;
              submissionId: string;
              studentId: string;
              type: ViolationType;
              source: "CLIENT" | "SERVER";
              violationCount: number;
            };
            applyClockOffset(data.serverTime);
            const row = rowsBySubmissionRef.current.get(data.submissionId);
            const name = row?.student.full_name ?? t("aStudent");
            toast.warning(
              `${name}: ${violationLabels[data.type] ?? data.type}`,
              {
                description:
                  t("warningIsNotProof"),
              },
            );
          } catch {
            // ignore malformed payload
          }
        },
      );

      source.addEventListener("EXAM_MONITOR_DEGRADED", () => {
        setConnection("degraded");
      });

      source.onerror = () => {
        if (cancelled) return;
        setConnection("degraded");
        if (source.readyState === EventSource.CLOSED) {
          // The access-token cookie lasts 15 minutes; a reconnect after it
          // expires gets a non-200 handshake and EventSource gives up for
          // good. Refetching over REST rides the same axios 401 -> refresh
          // -> retry interceptor as every other request on this page, then
          // we open a brand new stream.
          source.close();
          void fetchRoster().finally(() => {
            if (!cancelled) connect();
          });
        }
      };
    };

    connect();

    return () => {
      cancelled = true;
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
    };
  }, [examId, applyClockOffset, applyDeltaRow, fetchRoster, t, violationLabels]);

  const correctedNow = nowMs - clockOffsetRef.current;
  const entryDeadlineMs = roster
    ? new Date(roster.exam.entry_deadline).getTime()
    : 0;

  const rowsWithPresence = useMemo(() => {
    if (!roster) return [];
    return roster.rows.map((row) => ({
      row,
      presence: derivePresence(row, correctedNow, entryDeadlineMs),
    }));
  }, [roster, correctedNow, entryDeadlineMs]);

  const liveSummary = useMemo(() => {
    const summary: RosterSummary = {
      registered: roster?.summary.registered ?? 0,
      not_started: 0,
      online: 0,
      unstable: 0,
      offline: 0,
      submitted: 0,
      absent: 0,
      cancelled: 0,
      total_violations: 0,
    };
    rowsWithPresence.forEach(({ row, presence }) => {
      summary.total_violations += row.violations;
      switch (presence) {
        case "NOT_STARTED":
          summary.not_started += 1;
          break;
        case "ONLINE":
          summary.online += 1;
          break;
        case "UNSTABLE":
          summary.unstable += 1;
          break;
        case "OFFLINE":
          summary.offline += 1;
          break;
        case "SUBMITTED":
          summary.submitted += 1;
          break;
        case "ABSENT":
          summary.absent += 1;
          break;
        case "CANCELLED":
          summary.cancelled += 1;
          break;
      }
    });
    return summary;
  }, [rowsWithPresence, roster]);

  const visibleRows = rowsWithPresence.filter(({ row }) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      row.student.full_name.toLowerCase().includes(q) ||
      row.student.email.toLowerCase().includes(q)
    );
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent-600" />
      </div>
    );
  }

  if (error || !roster) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-center">
        <ShieldAlert className="h-9 w-9 text-red-400" />
        <p className="text-neutral-700">
          {error ?? t("noTestFound")}
        </p>
        <Button variant="outline" onClick={() => void fetchRoster()}>
          {t("retry")}</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <button
            type="button"
            onClick={() => router.push("/lecturer/exams")}
            className="mb-2 flex cursor-pointer items-center gap-1 text-sm text-neutral-500 hover:text-neutral-800"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("examManagement")}</button>
          <h2 className="text-2xl font-bold text-neutral-900">
            {t("monitorExam", { title: roster.exam.title })}
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            {new Date(roster.exam.exam_start_time).toLocaleString(intlLocales[locale])} –{" "}
            {new Date(roster.exam.exam_end_time).toLocaleString(intlLocales[locale])}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium">
          {connection === "live" ? (
            <span className="flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1.5 text-green-700">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              {t("direct")}</span>
          ) : connection === "connecting" ? (
            <span className="flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1.5 text-neutral-600">
              <Loader2 className="h-3 w-3 animate-spin" />
              {t("connecting")}</span>
          ) : (
            <span className="flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1.5 text-amber-700">
              <WifiOff className="h-3 w-3" />
              {t("dataMayBeSlow")}</span>
          )}
          <Button
            variant="outline"
            size="sm"
            className="cursor-pointer gap-1.5"
            onClick={() => void fetchRoster()}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {t("refresh")}</Button>
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {(
          [
            [t("examInProgress"), liveSummary.online, "text-green-700"],
            [t("flicker"), liveSummary.unstable, "text-amber-700"],
            [t("lostConnection"), liveSummary.offline, "text-red-700"],
            [t("submitted"), liveSummary.submitted, "text-accent-800"],
            [t("havenTEnteredYet"), liveSummary.not_started, "text-neutral-600"],
            [t("absent"), liveSummary.absent, "text-neutral-600"],
          ] as const
        ).map(([label, value, cls]) => (
          <Card key={label} className="border-neutral-200">
            <CardContent className="px-4">
              <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
                {label}
              </p>
              <p className={`mt-1 font-heading text-2xl font-semibold ${cls}`}>
                {value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {liveSummary.total_violations > 0 && (
        <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            {liveSummary.total_violations} {t("abnormalSignalReferenceDonTAutomatically")}</span>
        </div>
      )}

      <div className="relative w-full max-w-xs">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("searchByNameOrEmail")}
          className="pl-8"
        />
      </div>

      <Card className="border-neutral-200 py-0">
        <CardContent className="divide-y divide-neutral-100 px-0">
          {visibleRows.length === 0 ? (
            <div className="px-6 py-14 text-center text-sm text-neutral-500">
              {t("thereAreNoMatchingStudents")}</div>
          ) : (
            visibleRows.map(({ row, presence }) => {
              const meta = PRESENCE_META[presence];
              return (
                <div
                  key={row.student.id}
                  className="flex flex-wrap items-center gap-4 px-6 py-3.5"
                >
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${meta.dot}`} />
                  <div className="min-w-[180px] flex-1">
                    <p className="font-medium text-neutral-900">
                      {row.student.full_name}
                      {row.attempt > 1 && (
                        <span className="ml-2 text-xs font-normal text-neutral-400">
                          {t("attemptNumber", { number: row.attempt })}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-neutral-500">{row.student.email}</p>
                  </div>

                  <Badge className={`${meta.badge} shrink-0 border-transparent`}>
                    {presenceLabels[presence]}
                  </Badge>

                  <span className="w-32 shrink-0 text-xs text-neutral-500">
                    {presence === "SUBMITTED"
                      ? t("submittedAgo", { time: timeAgo(row.submitted_at, correctedNow) })
                      : row.last_ping
                        ? `Ping ${timeAgo(row.last_ping, correctedNow)}`
                        : "—"}
                  </span>

                  <span className="w-24 shrink-0 text-sm text-neutral-700">
                    {row.total > 0 ? t("answeredQuestions", { answered: row.answered, total: row.total }) : "—"}
                  </span>

                  {row.violations > 0 ? (
                    <span
                      className="flex w-40 shrink-0 items-center gap-1.5 text-xs text-amber-700"
                      title={t("abnormalSignalReferenceDoesNotAutomatically")}
                    >
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {t("violationCount", { count: row.violations })}{row.last_violation_type &&
                        ` · ${violationLabels[row.last_violation_type]}`}
                    </span>
                  ) : (
                    <span className="w-40 shrink-0 text-xs text-neutral-400">
                      {t("noSignal")}</span>
                  )}

                  {!roster.exam.practice &&
                    row.status === "IN_PROGRESS" &&
                    row.submission_id && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="ml-auto shrink-0 cursor-pointer gap-1.5 text-xs"
                        onClick={() =>
                          setExtendTarget({
                            studentId: row.student.id,
                            name: row.student.full_name,
                          })
                        }
                      >
                        <TimerReset className="h-3.5 w-3.5" />
                        {t("extendedTime")}</Button>
                    )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Dialog
        open={!!extendTarget}
        onOpenChange={(open) => !open && setExtendTarget(null)}
      >
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>{t("extendedTime")}</DialogTitle>
            <DialogDescription>
              {t("extendTimeDescription", { name: extendTarget?.name ?? "" })}
            </DialogDescription>
          </DialogHeader>
          <Input
            type="number"
            min={1}
            max={120}
            value={extendMinutes}
            onChange={(e) => setExtendMinutes(e.target.value)}
            placeholder={t("numberOfMinutes")}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setExtendTarget(null)}
              className="cursor-pointer"
            >
              {t("cancel")}</Button>
            <Button
              onClick={() => void handleExtendTime()}
              disabled={isExtending}
              className="cursor-pointer"
            >
              {isExtending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t("confirm")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
