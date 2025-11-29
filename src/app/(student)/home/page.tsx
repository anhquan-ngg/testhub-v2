"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Award, Clock, Calendar } from "lucide-react";
import Link from "next/link";
import StudentSideBar from "@/components/common/student/sidebar";
import StudentMenu from "@/components/common/student/menu";
import { useEffect, useState } from "react";
import { useFindManyExam } from "../../../../generated/hooks";

export default function StudentDashboard() {
  const [tests, setTests] = useState([] as any[]);

  const { data: testsData } = useFindManyExam({
    orderBy: {
      created_at: "asc",
    },
  });

  useEffect(() => {
    if (testsData) {
      setTests(testsData);
    }
  }, [testsData]);

  return (
    <div
      className="min-h-screen flex"
      style={{
        background: "linear-gradient(to bottom right, #a8c5e6, #d4e4f7)",
      }}
    >
      {/* Sidebar */}
      <StudentSideBar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <StudentMenu />

        <main className="flex-1 px-8 pb-8">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-bold text-gray-900">Bài thi</h2>
              <Button className="bg-white text-[#0066cc] hover:bg-white/90 hover:cursor-pointer border border-[#0066cc]">
                Xem tất cả các bài thi
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {testsData?.map((test) => {
                const isPractice = test.practice;
                const borderLeftColor = isPractice
                  ? "border-l-green-500"
                  : "border-l-blue-600";
                const bgGradient = isPractice
                  ? "bg-gradient-to-r from-green-50 to-white"
                  : "bg-gradient-to-r from-blue-50 to-white";
                const badgeColor = isPractice
                  ? "bg-green-500 hover:bg-green-600"
                  : "bg-blue-600 hover:bg-blue-700";
                const Icon = isPractice ? BookOpen : Award;

                return (
                  <Card
                    key={test.id}
                    className={`shadow-lg hover:shadow-2xl transition-all duration-300 bg-white border border-gray-300 border-l-4 ${borderLeftColor} overflow-hidden hover:scale-[1.02]`}
                  >
                    {/* Header with gradient */}
                    <div
                      className={`${bgGradient} px-6 pt-6 pb-4 border-b border-gray-100`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-xl font-bold text-gray-900 flex-1">
                          {test.title}
                        </h3>
                        <Icon
                          className={`w-6 h-6 ${
                            isPractice ? "text-green-600" : "text-blue-600"
                          } flex-shrink-0`}
                        />
                      </div>
                      <Badge
                        className={`${badgeColor} text-white mt-3 font-medium`}
                      >
                        {isPractice ? "Luyện tập" : "Bài thi chính thức"}
                      </Badge>
                    </div>

                    <CardContent className="p-6 space-y-4">
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <span className="text-sm text-gray-500 min-w-[130px] font-medium">
                            Chủ đề:
                          </span>
                          <span className="text-sm font-semibold text-gray-900">
                            {test.topic}
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
                            {new Date(test.exam_start_time).toLocaleDateString(
                              "vi-VN"
                            )}
                            {" - "}
                            {new Date(test.exam_end_time).toLocaleDateString(
                              "vi-VN"
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-gray-100">
                        {(() => {
                          const now = new Date();
                          const startTime = new Date(test.exam_start_time);
                          const endTime = new Date(test.exam_end_time);

                          if (now < startTime) {
                            // Chưa bắt đầu
                            return (
                              <Button
                                disabled
                                className="w-full bg-gray-200 text-gray-500 cursor-not-allowed font-semibold"
                              >
                                Chưa bắt đầu
                              </Button>
                            );
                          } else if (now >= startTime && now <= endTime) {
                            // Trong khoảng thời gian thi
                            const buttonColor = isPractice
                              ? "bg-green-500 hover:bg-green-600"
                              : "bg-blue-600 hover:bg-blue-700";
                            return (
                              <Button
                                className={`w-full ${buttonColor} text-white hover:cursor-pointer font-semibold shadow-md hover:shadow-lg transition-all`}
                                asChild
                              >
                                <Link href={`/exam/${test.id}`}>Vào thi</Link>
                              </Button>
                            );
                          } else {
                            // Đã qua thời gian thi
                            return (
                              <Button
                                disabled
                                className="w-full bg-gray-200 text-gray-500 cursor-not-allowed font-semibold"
                              >
                                Đã qua
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
          </div>
        </main>
      </div>
    </div>
  );
}
