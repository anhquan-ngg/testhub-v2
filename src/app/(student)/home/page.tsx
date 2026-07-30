"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Award, Clock, Calendar, Loader2, User } from "lucide-react";
import Link from "next/link";
import StudentSideBar from "@/components/common/student/sidebar";
import StudentMenu from "@/components/common/student/menu";
import { useEffect, useState, useCallback } from "react";
import { useAppSelector } from "@/store/hook";
import { toast } from "sonner";
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

export default function StudentDashboard() {
  const [testsData, setTestsData] = useState<StudentExam[]>([]);
  const [registrationsData, setRegistrationsData] = useState<
    ExamRegistration[]
  >([]);
  const [submissions, setSubmissions] = useState<StudentSubmission[]>([]);
  const [selectedTopic, setSelectedTopic] = useState("all");
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
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

  const filteredExams = testsData.filter((exam) => {
    const isRegistered = registrationsData?.some((r) => r.exam_id === exam.id);
    const isPublic = exam.is_public;
    const topicName = exam.topic?.name;

    if (!isPublic && !isRegistered) return false;

    if (selectedTopic !== "all" && topicName !== selectedTopic) return false;

    return true;
  });

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

  return (
    <div
      className="min-h-screen flex"
      style={{
        background: "linear-gradient(to bottom right, #a8c5e6, #d4e4f7)",
      }}
    >
      <StudentSideBar />

      <div className="flex-1 flex flex-col">
        <StudentMenu />

        <main className="flex-1 px-8 pb-8">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-bold text-gray-900">Bài thi</h2>
              <div className="w-[200px]">
                <Select value={selectedTopic} onValueChange={setSelectedTopic}>
                  <SelectTrigger className="w-full bg-white text-[#0066cc] hover:bg-white/90 hover:cursor-pointer border border-[#0066cc]">
                    <SelectValue placeholder="Chọn chủ đề" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-300">
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

            {isLoading ? (
              <div className="flex min-h-[300px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-[#0066cc]" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredExams.map((test) => {
                  const isPractice = test.practice;
                  const bgGradient = isPractice
                    ? "bg-gradient-to-r from-purple-50 to-white"
                    : "bg-gradient-to-r from-blue-50 to-white";
                  const badgeColor = isPractice
                    ? "bg-purple-500 hover:bg-purple-600"
                    : "bg-blue-600 hover:bg-blue-700";
                  const Icon = isPractice ? BookOpen : Award;

                  const registration = registrationsData?.find(
                    (r) => r.exam_id === test.id,
                  );

                  return (
                    <Card
                      key={test.id}
                      className={`shadow-lg hover:shadow-2xl transition-all duration-300 bg-white border border-gray-300 overflow-hidden hover:scale-[1.02]`}
                    >
                      <div
                        className={`${bgGradient} px-6 pt-6 pb-4 border-b border-gray-100`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="text-xl font-bold text-gray-900 flex-1">
                            {test.title}
                          </h3>
                          <Icon
                            className={`w-6 h-6 ${
                              isPractice ? "text-purple-600" : "text-blue-600"
                            } flex-shrink-0`}
                          />
                        </div>
                        <Badge
                          className={`${badgeColor} text-white mt-3 font-medium`}
                        >
                          {isPractice ? "Luyện tập" : "Bài thi chính thức"}
                        </Badge>
                      </div>

                      <CardContent className="px-6 py-2 space-y-4">
                        <div className="space-y-3">
                          <div className="flex items-start gap-3">
                            <span className="text-sm text-gray-500 min-w-[130px] font-medium">
                              Chủ đề:
                            </span>
                            <span className="text-sm font-semibold text-gray-900">
                              {test.topic?.name ?? "N/A"}
                            </span>
                          </div>

                          <div className="flex items-start gap-3">
                            <User className="w-4 h-4 text-gray-400 mt-0.5" />
                            <span className="text-sm text-gray-500 min-w-[110px] font-medium">
                              Giảng viên:
                            </span>
                            <span className="text-sm font-semibold text-gray-900">
                              {test.lecturer?.full_name ?? "N/A"}
                            </span>
                          </div>

                          <div className="flex items-start gap-3">
                            <Clock className="w-4 h-4 text-gray-400 mt-0.5" />
                            <span className="text-sm text-gray-500 min-w-[110px] font-medium">
                              Thời lượng:
                            </span>
                            <span className="text-sm font-semibold text-gray-900">
                              {test.duration} phút
                            </span>
                          </div>

                          <div className="flex items-start gap-3">
                            <Calendar className="w-4 h-4 text-gray-400 mt-0.5" />
                            <span className="text-sm text-gray-500 min-w-[110px] font-medium">
                              Thời gian thi:
                            </span>
                            <span className="text-sm font-semibold text-gray-900">
                              {new Date(
                                test.exam_start_time,
                              ).toLocaleDateString("vi-VN")}
                              {" - "}
                              {new Date(test.exam_end_time).toLocaleDateString(
                                "vi-VN",
                              )}
                            </span>
                          </div>
                        </div>

                        <div className="pt-4 border-t border-gray-100">
                          {(() => {
                            const now = new Date();
                            const startTime = new Date(test.exam_start_time);
                            const endTime = new Date(test.exam_end_time);

                            const isCompleted = submissions?.some(
                              (s) => s.exam_id === test.id,
                            );

                            // Logic for official exams
                            if (!test.practice && isCompleted) {
                              return (
                                <Button
                                  disabled
                                  className="w-full bg-green-100 text-green-700 cursor-not-allowed font-semibold border border-green-200"
                                >
                                  Hoàn thành
                                </Button>
                              );
                            }

                            if (!registration) {
                              return (
                                <Button
                                  className="w-full bg-[#0066cc] hover:bg-[#0052a3] text-white hover:cursor-pointer font-semibold shadow-md"
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
                                  className="w-full bg-yellow-100 text-yellow-700 cursor-not-allowed font-semibold border border-yellow-200"
                                >
                                  Đang chờ duyệt
                                </Button>
                              );
                            }

                            if (registration.status === "REJECTED") {
                              return (
                                <Button
                                  disabled
                                  className="w-full bg-red-100 text-red-700 cursor-not-allowed font-semibold border border-red-200"
                                >
                                  Bị từ chối
                                </Button>
                              );
                            }

                            // APPROVED
                            if (now < startTime) {
                              return (
                                <Button
                                  disabled
                                  className="w-full bg-blue-100 text-blue-700 cursor-not-allowed font-semibold border border-blue-200"
                                >
                                  Đã duyệt - Chờ giờ thi
                                </Button>
                              );
                            } else if (now >= startTime && now <= endTime) {
                              return (
                                <Button
                                  className={`w-full bg-green-500 hover:bg-green-600 text-white hover:cursor-pointer font-semibold shadow-md hover:shadow-lg transition-all`}
                                  asChild
                                >
                                  <Link href={`/exam/${test.id}`}>Vào thi</Link>
                                </Button>
                              );
                            } else {
                              return (
                                <Button
                                  disabled
                                  className="w-full bg-gray-200 text-gray-500 cursor-not-allowed font-semibold"
                                >
                                  Đã qua thời gian thi
                                </Button>
                              );
                            }
                          })()}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
