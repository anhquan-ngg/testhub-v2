"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  Award,
  Clock,
  Calendar,
  Loader2,
  User,
  Search,
  CalendarClock,
  CircleCheckBig,
  Hourglass,
  ListChecks,
} from "lucide-react";
import Link from "next/link";
import StudentSideBar from "@/components/common/student/sidebar";
import StudentMenu from "@/components/common/student/menu";
import { useEffect, useState, useCallback, useMemo, type ReactNode } from "react";
import { useAppSelector } from "@/store/hook";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSocket } from "@/components/providers/SocketProvider";
import apiClient from "@/lib/api-client";
import { ENDPOINTS } from "@/constants/endpoints";

type PageResult<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
};

type StudentExam = {
  id: string;
  title: string;
  duration: number;
  exam_start_time: string;
  exam_end_time: string;
  is_public: boolean;
  practice: boolean;
  topic?: {
    id: string;
    name: string;
  } | null;
  lecturer?: {
    full_name?: string | null;
  } | null;
};

type ExamRegistration = {
  id: string;
  exam_id: string;
  student_id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
};

type StudentSubmission = {
  id: string;
  exam_id: string;
  status: string;
};

type ExamRuntimeStatus = {
  examId: string;
  serverTime: string;
  isOpen: boolean;
  canStart: boolean;
  reason: string | null;
  entryDeadline: string;
  activeCount: number;
};

export default function StudentDashboard() {
  const [testsData, setTestsData] = useState<StudentExam[]>([]);
  const [registrationsData, setRegistrationsData] = useState<
    ExamRegistration[]
  >([]);
  const [submissions, setSubmissions] = useState<StudentSubmission[]>([]);
  const [selectedTopic, setSelectedTopic] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [examStatuses, setExamStatuses] = useState<
    Record<string, ExamRuntimeStatus>
  >({});
  const user = useAppSelector((state) => state.user);
  const { socket } = useSocket();

  const fetchRegistrations = useCallback(async () => {
    if (!user.id) return;

    try {
      const response = await apiClient.get<PageResult<ExamRegistration>>(
        ENDPOINTS.EXAM_REGISTRATIONS.BASE,
        {
          params: {
            student_id: user.id,
            limit: 100,
          },
        },
      );

      setRegistrationsData(response.data.data ?? []);
    } catch (error) {
      console.error("Fetch registrations error:", error);
      setRegistrationsData([]);
    }
  }, [user.id]);

  const fetchStudentData = useCallback(async () => {
    if (!user.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const [examsResponse, registrationsResponse, submissionsResponse] =
        await Promise.all([
          apiClient.get<PageResult<StudentExam>>(ENDPOINTS.EXAMS.BASE, {
            params: { limit: 100 },
          }),
          apiClient.get<PageResult<ExamRegistration>>(
            ENDPOINTS.EXAM_REGISTRATIONS.BASE,
            {
              params: {
                student_id: user.id,
                limit: 100,
              },
            },
          ),
          apiClient.get<PageResult<StudentSubmission>>(
            ENDPOINTS.SUBMISSIONS.BASE,
            {
              params: {
                student_id: user.id,
                limit: 100,
              },
            },
          ),
        ]);

      setTestsData(examsResponse.data.data ?? []);
      setRegistrationsData(registrationsResponse.data.data ?? []);
      setSubmissions(submissionsResponse.data.data ?? []);
    } catch (error) {
      console.error("Fetch student dashboard error:", error);
      toast.error("Có lỗi xảy ra khi tải danh sách bài thi.");
      setTestsData([]);
      setRegistrationsData([]);
      setSubmissions([]);
    } finally {
      setIsLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    void fetchStudentData();
  }, [fetchStudentData]);

  const handleRegister = async (examId: string) => {
    setIsRegistering(true);
    try {
      await apiClient.post(ENDPOINTS.EXAMS.REGISTRATIONS.REQUEST, {
        examId,
      });
      toast.success("Gửi yêu cầu đăng ký thành công!");
      await fetchRegistrations();
    } catch (error) {
      toast.error("Có lỗi xảy ra khi gửi yêu cầu đăng ký.");
      console.error(error);
    } finally {
      setIsRegistering(false);
    }
  };

  // Listen for real-time exam events
  useEffect(() => {
    if (!socket) return;

    const handleRegistrationApproved = () => {
      void fetchRegistrations();
    };

    const handleStudentAdded = () => {
      void fetchRegistrations();
    };

    socket.on("exam:registration_approved", handleRegistrationApproved);
    socket.on("exam:student_added", handleStudentAdded);

    return () => {
      socket.off("exam:registration_approved", handleRegistrationApproved);
      socket.off("exam:student_added", handleStudentAdded);
    };
  }, [socket, fetchRegistrations]);

  const filteredExams = useMemo(
    () =>
      testsData.filter((exam) => {
        const isRegistered = registrationsData?.some(
          (r) => r.exam_id === exam.id,
        );
        const isPublic = exam.is_public;
        const topicName = exam.topic?.name;

        if (!isPublic && !isRegistered) return false;

        if (selectedTopic !== "all" && topicName !== selectedTopic)
          return false;

        return true;
      }),
    [registrationsData, selectedTopic, testsData],
  );

  useEffect(() => {
    if (!user.id || filteredExams.length === 0) return;

    let cancelled = false;

    const fetchStatuses = async () => {
      const statuses = await Promise.all(
        filteredExams.map(async (exam) => {
          try {
            const response = await apiClient.get<ExamRuntimeStatus>(
              ENDPOINTS.EXAM_RUNTIME.STATUS(exam.id),
            );
            return [exam.id, response.data] as const;
          } catch (error) {
            console.error("Fetch exam runtime status error:", error);
            return null;
          }
        }),
      );

      if (cancelled) return;

      setExamStatuses((prev) => {
        const next = { ...prev };
        statuses.forEach((item) => {
          if (item) next[item[0]] = item[1];
        });
        return next;
      });
    };

    void fetchStatuses();

    return () => {
      cancelled = true;
    };
  }, [user.id, filteredExams]);

  useEffect(() => {
    if (!user.id || filteredExams.length === 0 || typeof window === "undefined")
      return;

    const apiBaseUrl =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const eventSources = filteredExams.map((exam) => {
      const source = new EventSource(
        `${apiBaseUrl}${ENDPOINTS.EXAM_RUNTIME.EVENTS(exam.id)}`,
        { withCredentials: true },
      );

      const upsertStatus = (event: MessageEvent) => {
        let payload: ExamRuntimeStatus;
        try {
          payload = JSON.parse(event.data) as ExamRuntimeStatus;
        } catch {
          return;
        }
        setExamStatuses((prev) => ({
          ...prev,
          [exam.id]: {
            ...(prev[exam.id] ?? payload),
            ...payload,
          },
        }));
      };

      const handleOpen = (event: MessageEvent) => {
        let payload: Partial<ExamRuntimeStatus>;
        try {
          payload = JSON.parse(event.data) as Partial<ExamRuntimeStatus>;
        } catch {
          return;
        }
        setExamStatuses((prev) => ({
          ...prev,
          [exam.id]: {
            ...(prev[exam.id] ?? {
              examId: exam.id,
              serverTime: new Date().toISOString(),
              entryDeadline: exam.exam_end_time,
              reason: null,
              activeCount: 0,
            }),
            ...payload,
            isOpen: true,
            canStart: true,
            reason: null,
          } as ExamRuntimeStatus,
        }));
      };

      const handleClosed = (event: MessageEvent) => {
        let payload: Partial<ExamRuntimeStatus>;
        try {
          payload = JSON.parse(event.data) as Partial<ExamRuntimeStatus>;
        } catch {
          return;
        }
        setExamStatuses((prev) => ({
          ...prev,
          [exam.id]: {
            ...(prev[exam.id] ?? {
              examId: exam.id,
              serverTime: new Date().toISOString(),
              entryDeadline: exam.exam_end_time,
              reason: "EXAM_CLOSED",
              activeCount: 0,
            }),
            ...payload,
            isOpen: false,
            canStart: false,
            reason: "EXAM_CLOSED",
          } as ExamRuntimeStatus,
        }));
      };

      const handleActiveCount = (event: MessageEvent) => {
        let payload: Partial<ExamRuntimeStatus>;
        try {
          payload = JSON.parse(event.data) as Partial<ExamRuntimeStatus>;
        } catch {
          return;
        }
        setExamStatuses((prev) => ({
          ...prev,
          [exam.id]: {
            ...(prev[exam.id] ?? {
              examId: exam.id,
              serverTime: new Date().toISOString(),
              entryDeadline: exam.exam_end_time,
              isOpen: false,
              canStart: false,
              reason: null,
            }),
            activeCount: Number(payload.activeCount ?? 0),
          } as ExamRuntimeStatus,
        }));
      };

      source.addEventListener("EXAM_STATUS", upsertStatus);
      source.addEventListener("EXAM_OPEN", handleOpen);
      source.addEventListener("EXAM_CLOSED", handleClosed);
      source.addEventListener("EXAM_ACTIVE_COUNT", handleActiveCount);

      return source;
    });

    return () => {
      eventSources.forEach((source) => source.close());
    };
  }, [user.id, filteredExams]);

  const availableTopics = Array.from(
    new Set(
      testsData
        .filter((exam) => {
          const isRegistered = registrationsData?.some(
            (r) => r.exam_id === exam.id,
          );
          const isPublic = exam.is_public;
          return isPublic || isRegistered;
        })
        .map((e) => e.topic?.name),
    ),
  ).filter(Boolean);

  // Renders the CTA button for one exam card, driven purely by the
  // registration / submission / runtime-status state machine — unchanged
  // from the previous design, just extracted so the highlight card and
  // the grid card can share it.
  const renderExamCta = (test: StudentExam): ReactNode => {
    const registration = registrationsData?.find((r) => r.exam_id === test.id);
    const isCompleted = submissions?.some(
      (s) => s.exam_id === test.id && s.status === "COMPLETED",
    );
    const hasInProgressSubmission = submissions?.some(
      (s) => s.exam_id === test.id && s.status === "IN_PROGRESS",
    );
    const runtimeStatus = examStatuses[test.id];

    if (!test.practice && isCompleted) {
      return (
        <Button
          disabled
          className="w-full cursor-not-allowed border border-green-200 bg-green-100 font-semibold text-green-700"
        >
          Hoàn thành
        </Button>
      );
    }

    if (!registration) {
      return (
        <Button
          className="w-full cursor-pointer bg-accent-600 font-semibold text-white shadow-md hover:bg-accent-700"
          onClick={() => handleRegister(test.id)}
          disabled={isRegistering}
        >
          {isRegistering ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            "Đăng ký tham gia"
          )}
        </Button>
      );
    }

    if (registration.status === "PENDING") {
      return (
        <Button
          disabled
          className="w-full cursor-not-allowed border border-yellow-200 bg-yellow-100 font-semibold text-yellow-700"
        >
          Đang chờ duyệt
        </Button>
      );
    }

    if (registration.status === "REJECTED") {
      return (
        <Button
          disabled
          className="w-full cursor-not-allowed border border-red-200 bg-red-100 font-semibold text-red-700"
        >
          Bị từ chối
        </Button>
      );
    }

    // APPROVED
    const canStartExam = runtimeStatus?.canStart ?? false;

    if (
      !hasInProgressSubmission &&
      (!runtimeStatus || runtimeStatus.reason === "NOT_STARTED")
    ) {
      return (
        <Button
          disabled
          className="w-full cursor-not-allowed border border-accent-200 bg-accent-100 font-semibold text-accent-700"
        >
          Đã duyệt - Chờ giờ thi
        </Button>
      );
    }

    if (canStartExam || hasInProgressSubmission) {
      return (
        <Button
          className="w-full cursor-pointer bg-green-500 font-semibold text-white shadow-md transition-all hover:bg-green-600 hover:shadow-lg"
          asChild
        >
          <Link href={`/exam/${test.id}`}>Vào thi</Link>
        </Button>
      );
    }

    return (
      <Button
        disabled
        className="w-full cursor-not-allowed bg-gray-200 font-semibold text-gray-500"
      >
        Đã qua thời gian thi
      </Button>
    );
  };

  const visibleExams = filteredExams.filter((exam) =>
    exam.title.toLowerCase().includes(searchQuery.trim().toLowerCase()),
  );

  const now = Date.now();
  const upcomingExams = filteredExams
    .filter((exam) => new Date(exam.exam_start_time).getTime() > now)
    .sort(
      (a, b) =>
        new Date(a.exam_start_time).getTime() -
        new Date(b.exam_start_time).getTime(),
    );
  const nextExam = upcomingExams[0];

  const pendingCount = registrationsData.filter(
    (r) => r.status === "PENDING",
  ).length;
  // A student can have more than one COMPLETED submission for the same
  // exam (practice retakes, or an official retake granted by a lecturer),
  // so this counts distinct completed exams rather than every attempt.
  const completedCount = new Set(
    submissions
      .filter((s) => s.status === "COMPLETED")
      .map((s) => s.exam_id),
  ).size;

  const stats = [
    {
      label: "Sắp diễn ra",
      value: upcomingExams.length,
      icon: CalendarClock,
    },
    {
      label: "Đang chờ duyệt",
      value: pendingCount,
      icon: Hourglass,
    },
    {
      label: "Đã hoàn thành",
      value: completedCount,
      icon: CircleCheckBig,
    },
    {
      label: "Bài thi khả dụng",
      value: filteredExams.length,
      icon: ListChecks,
    },
  ];

  return (
    <div className="flex min-h-screen bg-neutral-100">
      <StudentSideBar />

      <div className="flex flex-1 flex-col min-w-0">
        <StudentMenu />

        <main className="flex-1 space-y-7 px-6 pb-10 pt-7 md:px-8">
          {/* Welcome */}
          <div>
            <span className="text-xs font-semibold uppercase tracking-wide text-accent-600">
              Tổng quan
            </span>
            <h2 className="mt-1 text-3xl font-bold text-neutral-900">
              Chào, {user.full_name || "bạn"}
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              Bạn có {upcomingExams.length} bài thi sắp diễn ra
              {pendingCount > 0 &&
                ` và ${pendingCount} lượt đăng ký đang chờ duyệt`}
              .
            </p>
          </div>

          {/* Stats */}
          {isLoading ? (
            <div className="flex min-h-[100px] items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-accent-600" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {stats.map((stat) => (
                <Card key={stat.label} className="border-neutral-200">
                  <CardContent className="flex items-start justify-between px-5">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                        {stat.label}
                      </p>
                      <p className="mt-1.5 font-heading text-3xl font-semibold text-neutral-900">
                        {stat.value}
                      </p>
                    </div>
                    <stat.icon className="h-5 w-5 text-accent-600" />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Upcoming highlight */}
          {!isLoading && nextExam && (
            <Card className="border-neutral-200 bg-white">
              <CardContent className="flex flex-wrap items-center justify-between gap-5 px-6">
                <div className="min-w-0">
                  <Badge
                    className={`${
                      nextExam.practice
                        ? "bg-purple-500 hover:bg-purple-600"
                        : "bg-blue-600 hover:bg-blue-700"
                    } text-white`}
                  >
                    {nextExam.practice ? "Luyện tập" : "Bài thi chính thức"}
                  </Badge>
                  <h3 className="mt-2 truncate text-lg font-semibold text-neutral-900">
                    Bài thi sắp diễn ra: {nextExam.title}
                  </h3>
                  <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-neutral-500">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4" />
                      {new Date(nextExam.exam_start_time).toLocaleString(
                        "vi-VN",
                      )}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4" />
                      {nextExam.duration} phút
                    </span>
                    <span className="flex items-center gap-1.5">
                      <User className="h-4 w-4" />
                      {nextExam.lecturer?.full_name ?? "N/A"}
                    </span>
                  </div>
                </div>
                <div className="w-full shrink-0 sm:w-56">
                  {renderExamCta(nextExam)}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Filter row */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-neutral-900">
              Tất cả bài thi
            </h2>
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm kiếm bài thi..."
                  className="w-52 pl-8"
                />
              </div>
              <div className="w-[190px]">
                <Select value={selectedTopic} onValueChange={setSelectedTopic}>
                  <SelectTrigger className="w-full cursor-pointer">
                    <SelectValue placeholder="Chọn chủ đề" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả chủ đề</SelectItem>
                    {availableTopics.map((topic) => (
                      <SelectItem key={topic as string} value={topic as string}>
                        {topic as string}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="flex min-h-[300px] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-accent-600" />
            </div>
          ) : visibleExams.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-neutral-300 bg-white py-16 text-center">
              <BookOpen className="h-9 w-9 text-accent-400" />
              <p className="font-heading text-lg font-semibold text-neutral-900">
                Chưa có bài thi nào phù hợp
              </p>
              <p className="max-w-sm text-sm text-neutral-500">
                Không tìm thấy bài thi khớp với từ khóa hoặc chủ đề đã chọn.
                Hãy thử xóa bộ lọc hoặc quay lại sau.
              </p>
              {(searchQuery || selectedTopic !== "all") && (
                <Button
                  variant="outline"
                  className="mt-1 cursor-pointer"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedTopic("all");
                  }}
                >
                  Xóa bộ lọc
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {visibleExams.map((test) => {
                const isPractice = test.practice;
                const bgGradient = isPractice
                  ? "bg-gradient-to-r from-purple-50 to-white"
                  : "bg-gradient-to-r from-blue-50 to-white";
                const badgeColor = isPractice
                  ? "bg-purple-500 hover:bg-purple-600"
                  : "bg-blue-600 hover:bg-blue-700";
                const Icon = isPractice ? BookOpen : Award;

                return (
                  <Card
                    key={test.id}
                    className="overflow-hidden border-neutral-200 py-0 shadow-sm transition-all duration-300 hover:shadow-lg"
                  >
                    <div
                      className={`${bgGradient} border-b border-neutral-100 px-6 pb-4 pt-6`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="flex-1 text-xl font-bold text-neutral-900">
                          {test.title}
                        </h3>
                        <Icon
                          className={`h-6 w-6 flex-shrink-0 ${
                            isPractice ? "text-purple-600" : "text-blue-600"
                          }`}
                        />
                      </div>
                      <Badge className={`${badgeColor} mt-3 font-medium text-white`}>
                        {isPractice ? "Luyện tập" : "Bài thi chính thức"}
                      </Badge>
                    </div>

                    <CardContent className="space-y-4 px-6 py-4">
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <span className="min-w-[130px] text-sm font-medium text-neutral-500">
                            Chủ đề:
                          </span>
                          <span className="text-sm font-semibold text-neutral-900">
                            {test.topic?.name ?? "N/A"}
                          </span>
                        </div>

                        <div className="flex items-start gap-3">
                          <User className="mt-0.5 h-4 w-4 text-neutral-400" />
                          <span className="min-w-[110px] text-sm font-medium text-neutral-500">
                            Giảng viên:
                          </span>
                          <span className="text-sm font-semibold text-neutral-900">
                            {test.lecturer?.full_name ?? "N/A"}
                          </span>
                        </div>

                        <div className="flex items-start gap-3">
                          <Clock className="mt-0.5 h-4 w-4 text-neutral-400" />
                          <span className="min-w-[110px] text-sm font-medium text-neutral-500">
                            Thời lượng:
                          </span>
                          <span className="text-sm font-semibold text-neutral-900">
                            {test.duration} phút
                          </span>
                        </div>

                        <div className="flex items-start gap-3">
                          <Calendar className="mt-0.5 h-4 w-4 text-neutral-400" />
                          <span className="min-w-[110px] text-sm font-medium text-neutral-500">
                            Thời gian thi:
                          </span>
                          <span className="text-sm font-semibold text-neutral-900">
                            {new Date(test.exam_start_time).toLocaleDateString(
                              "vi-VN",
                            )}
                            {" - "}
                            {new Date(test.exam_end_time).toLocaleDateString(
                              "vi-VN",
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="border-t border-neutral-100 pt-4">
                        {renderExamCta(test)}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
