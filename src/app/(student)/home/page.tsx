"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, User, ChevronDown } from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import StudentSideBar from "@/components/common/student/sidebar";
import StudentMenu from "@/components/common/student/menu";

// Mock data for tests
const mockTests = [
  {
    id: 1,
    title: "Bài thi số 1",
    format: "Thi tại địa điểm thi",
    registrationPeriod: "01/01/2024 - 15/01/2024",
    testTime: "20/01/2024",
    status: "expired",
  },
  {
    id: 2,
    title: "Bài thi số 2",
    format: "Thi tại địa điểm thi",
    registrationPeriod: "10/01/2024 - 25/01/2024",
    testTime: "30/01/2024",
    status: "registered",
  },
  {
    id: 3,
    title: "Bài thi số 3",
    format: "Thi tại địa điểm thi",
    registrationPeriod: "15/01/2024 - 30/01/2024",
    testTime: "05/02/2024",
    status: "available",
  },
];

export default function StudentDashboard() {
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
              {mockTests.map((test) => (
                <Card
                  key={test.id}
                  className="shadow-lg hover:shadow-xl transition-shadow bg-white border-gray-300"
                >
                  <CardContent className="p-6 space-y-4">
                    <h3 className="text-xl font-semibold text-gray-900">
                      {test.title}
                    </h3>

                    <div className="space-y-3">
                      <div className="flex items-start gap-2">
                        <span className="text-sm text-gray-600 min-w-[110px]">
                          Hình thức thi:
                        </span>
                        <Badge className="bg-[#7ba7d6] hover:bg-[#6b97c6] text-white">
                          {test.format}
                        </Badge>
                      </div>

                      <div className="flex items-start gap-2">
                        <span className="text-sm text-gray-600 min-w-[110px]">
                          Thời gian đăng ký:
                        </span>
                        <span className="text-sm font-medium text-gray-900">
                          {test.registrationPeriod}
                        </span>
                      </div>

                      <div className="flex items-start gap-2">
                        <span className="text-sm text-gray-600 min-w-[110px]">
                          Thời gian thi:
                        </span>
                        <span className="text-sm font-medium text-gray-900">
                          {test.testTime}
                        </span>
                      </div>
                    </div>

                    <div className="pt-4">
                      {test.status === "expired" && (
                        <Button
                          disabled
                          className="w-full bg-gray-300 text-gray-600 cursor-not-allowed"
                        >
                          Hết hạn đăng ký
                        </Button>
                      )}
                      {test.status === "available" && (
                        <Button className="w-full bg-[#7ba7d6] hover:bg-[#6b97c6] text-white hover:cursor-pointer">
                          Đăng ký
                        </Button>
                      )}
                      {test.status === "registered" && (
                        <Button className="w-full bg-[#7ba7d6] hover:bg-[#6b97c6] text-white hover:cursor-pointer">
                          Đang ký
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
