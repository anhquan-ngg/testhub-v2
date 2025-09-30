import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#a8c5e6] to-[#d4e4f7] flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Logo */}
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold text-[#0066cc] mb-4">TESTHUB</h1>
          <p className="text-xl text-gray-700">
            Nền tảng quản lý và thực hiện bài kiểm tra trực tuyến
          </p>
        </div>

        {/* Main Card */}
        <Card className="shadow-2xl bg-white border-none">
          <CardContent className="p-12">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Chào mừng đến với TESTHUB
              </h2>
              <p className="text-gray-600 text-lg leading-relaxed">
                Hệ thống quản lý bài kiểm tra hiện đại, giúp bạn tạo, quản lý và
                thực hiện các bài kiểm tra một cách dễ dàng và hiệu quả.
              </p>
            </div>

            {/* Features */}
            <div className="grid md:grid-cols-3 gap-6 mb-10">
              <div className="text-center p-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg
                    className="w-8 h-8 text-[#0066cc]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                    />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  Làm bài kiểm tra
                </h3>
                <p className="text-sm text-gray-600">
                  Thực hiện bài kiểm tra trực tuyến thuận tiện
                </p>
              </div>

              <div className="text-center p-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg
                    className="w-8 h-8 text-[#0066cc]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  Chấm điểm tự động
                </h3>
                <p className="text-sm text-gray-600">
                  Hệ thống chấm điểm và trả điểm ngay sau khi nộp bài
                </p>
              </div>

              <div className="text-center p-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg
                    className="w-8 h-8 text-[#0066cc]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  Theo dõi kết quả
                </h3>
                <p className="text-sm text-gray-600">
                  Xem báo cáo và phân tích chi tiết
                </p>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                asChild
                size="lg"
                className="bg-[#0066cc] hover:bg-[#0052a3] text-white px-8 py-6 text-lg rounded-xl"
              >
                <Link href="/signup">Đăng ký ngay</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="border-2 border-[#0066cc] text-[#0066cc] hover:bg-[#0066cc] hover:text-white px-8 py-6 text-lg rounded-xl bg-transparent"
              >
                <Link href="/login">Đăng nhập</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
