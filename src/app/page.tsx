import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Building2,
  Check,
  ChevronRight,
  ClipboardList,
  FileQuestion,
  GraduationCap,
  LineChart,
  LockKeyhole,
  Mail,
  Menu,
  MonitorCheck,
  PlayCircle,
  School,
  ShieldCheck,
  Sparkles,
  Timer,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";

const navItems = [
  { label: "Tính năng", href: "#features" },
  { label: "Bảng giá", href: "#pricing" },
  { label: "Tài liệu", href: "#docs" },
  { label: "Về chúng tôi", href: "#about" },
];

const trustLogos = [
  { name: "Đại học Bách Khoa", icon: School },
  { name: "FPT Education", icon: GraduationCap },
  { name: "HUST Center", icon: Building2 },
  { name: "EduLab", icon: BookOpen },
  { name: "ExamPro", icon: ClipboardList },
  { name: "Tech Academy", icon: Users },
];

const stats = [
  { value: "98.7%", label: "tỷ lệ hoàn thành bài thi" },
  { value: "42k+", label: "thí sinh mỗi tháng" },
  { value: "12 phút", label: "để tạo một kỳ thi" },
];

const features = [
  {
    title: "Ngân hàng câu hỏi thông minh",
    description:
      "Quản lý câu hỏi trắc nghiệm, tự luận, câu hỏi nhóm và đáp án nhiều định dạng trong một thư viện tập trung.",
    icon: FileQuestion,
    className: "lg:col-span-2",
    accent: "from-blue-600/12 to-sky-400/8",
    visual: "library",
  },
  {
    title: "Tổ chức kỳ thi linh hoạt",
    description:
      "Hẹn giờ tự động, chia ca thi, cấu hình thời gian làm bài và luật nộp bài theo từng lớp học.",
    icon: Timer,
    className: "",
    accent: "from-cyan-500/12 to-blue-600/8",
    visual: "schedule",
  },
  {
    title: "Giám sát phòng thi và chống gian lận",
    description:
      "Khóa màn hình, cảnh báo vi phạm, giới hạn thiết bị đăng nhập và ghi nhận hành vi bất thường theo thời gian thực.",
    icon: ShieldCheck,
    className: "",
    accent: "from-indigo-500/12 to-blue-600/8",
    visual: "security",
  },
  {
    title: "Thống kê và báo cáo trực quan",
    description:
      "Biểu đồ phổ điểm, tỷ lệ hoàn thành, câu hỏi có độ khó cao và báo cáo xuất file cho giảng viên.",
    icon: LineChart,
    className: "lg:col-span-2",
    accent: "from-blue-600/12 to-emerald-400/8",
    visual: "analytics",
  },
];

const steps = [
  {
    title: "Tạo đề",
    description:
      "Nhập câu hỏi, trộn đề, gán mức độ và cấu hình thang điểm chỉ trong vài phút.",
    icon: FileQuestion,
  },
  {
    title: "Mời thí sinh",
    description:
      "Gửi mã phòng thi, import danh sách lớp hoặc chia link truy cập bảo mật.",
    icon: Users,
  },
  {
    title: "Thi trực tuyến",
    description:
      "Thí sinh làm bài trên trình duyệt, hệ thống tự động giám sát và ghi nhận sự kiện.",
    icon: MonitorCheck,
  },
  {
    title: "Chấm điểm và báo cáo",
    description:
      "Tự động chấm bài trắc nghiệm, tổng hợp kết quả và phân tích chất lượng đề thi.",
    icon: BarChart3,
  },
];

const plans = [
  {
    name: "Cá nhân / Giáo viên",
    price: "0đ",
    period: "/tháng",
    description: "Phù hợp cho giáo viên bắt đầu số hóa bài kiểm tra.",
    cta: "Bắt đầu miễn phí",
    href: "/signup",
    features: [
      "3 kỳ thi mỗi tháng",
      "100 thí sinh / kỳ thi",
      "Ngân hàng câu hỏi cơ bản",
      "Báo cáo điểm tổng quan",
    ],
  },
  {
    name: "Trung tâm",
    price: "799k",
    period: "/tháng",
    description: "Gói phổ biến cho trung tâm đào tạo và khoa bộ môn.",
    cta: "Dùng thử 14 ngày",
    href: "/signup",
    popular: true,
    features: [
      "Không giới hạn kỳ thi",
      "2,000 thí sinh / tháng",
      "Chống gian lận nâng cao",
      "Phân quyền giáo viên",
      "Xuất báo cáo Excel/PDF",
    ],
  },
  {
    name: "Doanh nghiệp",
    price: "Liên hệ",
    period: "",
    description:
      "Triển khai riêng cho doanh nghiệp, trường đại học và hệ thống lớn.",
    cta: "Liên hệ tư vấn",
    href: "#contact",
    features: [
      "SSO và tên miền riêng",
      "SLA và hỗ trợ ưu tiên",
      "Tích hợp API/LMS",
      "Lưu trữ và bảo mật tùy chỉnh",
    ],
  },
];

const footerLinks = [
  {
    title: "Sản phẩm",
    links: ["Tính năng", "Bảng giá", "Bảo mật", "Lộ trình"],
  },
  {
    title: "Tài nguyên",
    links: ["Tài liệu", "Hướng dẫn API", "Blog", "Mẫu đề thi"],
  },
  {
    title: "Công ty",
    links: ["Về Testhub", "Liên hệ", "Đối tác", "Tuyển dụng"],
  },
];

function BrandLogo({ uppercase = false }: { uppercase?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-3" aria-label="Testhub">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0b63ce] text-sm font-black text-white shadow-sm shadow-blue-600/25">
        T
      </span>
      <span className="text-lg font-extrabold tracking-normal text-slate-950">
        TESTHUB
      </span>
    </Link>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <p className="text-sm font-bold uppercase tracking-normal text-[#0b63ce]">
        {eyebrow}
      </p>
      <h2 className="mt-4 text-3xl font-black leading-tight tracking-normal text-slate-950 md:text-5xl">
        {title}
      </h2>
      <p className="mt-5 text-base leading-7 text-slate-600">{description}</p>
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <BrandLogo uppercase />

        <nav className="hidden items-center gap-8 md:flex">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm font-semibold text-slate-600 transition hover:text-[#0b63ce]"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Button
            asChild
            variant="ghost"
            className="rounded-xl px-5 font-bold text-slate-700 hover:bg-blue-50 hover:text-[#0b63ce]"
          >
            <Link href="/login">Đăng nhập</Link>
          </Button>
          <Button
            asChild
            className="rounded-xl bg-[#0b63ce] px-5 font-bold text-white shadow-sm shadow-blue-600/20 hover:bg-[#0858bb]"
          >
            <Link href="/signup">Đăng ký ngay</Link>
          </Button>
        </div>

        <details className="group relative md:hidden">
          <summary className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm [&::-webkit-details-marker]:hidden">
            <Menu className="h-5 w-5" />
          </summary>
          <div className="absolute right-0 mt-3 w-72 rounded-2xl border border-slate-200 bg-white p-3 shadow-md">
            <nav className="grid gap-1">
              {navItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-blue-50 hover:text-[#0b63ce]"
                >
                  {item.label}
                </a>
              ))}
            </nav>
            <div className="mt-3 grid gap-2 border-t border-slate-200 pt-3">
              <Button
                asChild
                variant="ghost"
                className="rounded-xl font-bold text-slate-700"
              >
                <Link href="/login">Đăng nhập</Link>
              </Button>
              <Button
                asChild
                className="rounded-xl bg-[#0b63ce] font-bold text-white hover:bg-[#0858bb]"
              >
                <Link href="/signup">Đăng ký ngay</Link>
              </Button>
            </div>
          </div>
        </details>
      </div>
    </header>
  );
}

function DashboardMockup() {
  return (
    <div className="relative">
      <div className="absolute -inset-6 rounded-[32px] bg-[radial-gradient(circle_at_50%_35%,rgba(11,99,206,0.26),transparent_62%)] blur-2xl" />
      <div className="relative rounded-2xl bg-gradient-to-br from-white via-white to-blue-50 p-px shadow-md shadow-blue-900/10">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-rose-400" />
              <span className="h-3 w-3 rounded-full bg-amber-400" />
              <span className="h-3 w-3 rounded-full bg-emerald-400" />
            </div>
            <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-500">
              exam.testhub.vn/live
            </div>
          </div>

          <div className="grid gap-0 lg:grid-cols-[230px_1fr]">
            <aside className="hidden border-r border-slate-200 bg-slate-50/60 p-4 lg:block">
              <div className="mb-5 flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 p-3">
                <ShieldCheck className="h-5 w-5 text-[#0b63ce]" />
                <div>
                  <p className="text-xs font-black text-slate-950">
                    Phòng thi #A12
                  </p>
                  <p className="text-[11px] text-slate-500">Đang giám sát</p>
                </div>
              </div>
              {["Tổng quan", "Thí sinh", "Cảnh báo", "Báo cáo"].map(
                (item, index) => (
                  <div
                    key={item}
                    className={`mb-2 rounded-xl px-3 py-2 text-sm font-semibold ${
                      index === 0
                        ? "bg-[#0b63ce] text-white"
                        : "text-slate-600 hover:bg-white"
                    }`}
                  >
                    {item}
                  </div>
                ),
              )}
            </aside>

            <div className="p-4 sm:p-6">
              <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <p className="text-xs font-bold uppercase text-[#0b63ce]">
                    Kỳ thi đang diễn ra
                  </p>
                  <h3 className="mt-1 text-xl font-black text-slate-950">
                    Kiểm tra giữa kỳ - Lớp 12A1
                  </h3>
                </div>
                <div className="inline-flex w-fit items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  48 đang làm bài
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  ["Hoàn thành", "76%", "bg-blue-600"],
                  ["Cảnh báo", "03", "bg-amber-500"],
                  ["Còn lại", "24:18", "bg-slate-900"],
                ].map(([label, value, color]) => (
                  <div
                    key={label}
                    className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <p className="text-xs font-semibold text-slate-500">
                      {label}
                    </p>
                    <div className="mt-3 flex items-end justify-between gap-3">
                      <p className="text-2xl font-black text-slate-950">
                        {value}
                      </p>
                      <span className={`h-8 w-8 rounded-xl ${color}`} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-sm font-black text-slate-950">
                      Phổ điểm tạm tính
                    </p>
                    <BarChart3 className="h-4 w-4 text-[#0b63ce]" />
                  </div>
                  <div className="flex h-36 items-end gap-2">
                    {[38, 54, 82, 64, 94, 72, 48, 78, 58, 88].map(
                      (height, index) => (
                        <span
                          key={index}
                          className="flex-1 rounded-t-lg bg-gradient-to-t from-[#0b63ce] to-sky-300"
                          style={{ height: `${height}%` }}
                        />
                      ),
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-sm font-black text-slate-950">
                      Cảnh báo mới
                    </p>
                    <LockKeyhole className="h-4 w-4 text-amber-500" />
                  </div>
                  <div className="space-y-3">
                    {[
                      "Chuyển tab 2 lần",
                      "Đăng nhập thiết bị mới",
                      "Mất kết nối 18 giây",
                    ].map((item) => (
                      <div
                        key={item}
                        className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"
                      >
                        <span className="text-xs font-semibold text-slate-600">
                          {item}
                        </span>
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureVisual({ type }: { type: string }) {
  if (type === "analytics") {
    return (
      <div className="mt-8 flex h-28 items-end gap-3">
        {[52, 78, 44, 92, 68, 84, 58].map((height, index) => (
          <span
            key={index}
            className="flex-1 rounded-t-xl bg-gradient-to-t from-[#0b63ce] to-sky-300"
            style={{ height: `${height}%` }}
          />
        ))}
      </div>
    );
  }

  if (type === "security") {
    return (
      <div className="mt-8 grid grid-cols-3 gap-3">
        {["Khóa tab", "1 thiết bị", "Log sự kiện"].map((item) => (
          <div
            key={item}
            className="rounded-xl border border-blue-100 bg-white/75 p-3 text-center text-xs font-bold text-slate-600"
          >
            <LockKeyhole className="mx-auto mb-2 h-4 w-4 text-[#0b63ce]" />
            {item}
          </div>
        ))}
      </div>
    );
  }

  if (type === "schedule") {
    return (
      <div className="mt-8 space-y-3">
        {["Ca sáng 08:00", "Ca chiều 14:00", "Tự động đóng đề"].map((item) => (
          <div
            key={item}
            className="flex items-center justify-between rounded-xl border border-blue-100 bg-white/75 px-4 py-3"
          >
            <span className="text-sm font-bold text-slate-700">{item}</span>
            <Timer className="h-4 w-4 text-[#0b63ce]" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="mt-8 grid grid-cols-2 gap-3">
      {["Trắc nghiệm", "Tự luận", "Đáp án nhiều lựa chọn", "Import Excel"].map(
        (item) => (
          <div
            key={item}
            className="rounded-xl border border-blue-100 bg-white/75 px-4 py-3 text-sm font-bold text-slate-700"
          >
            {item}
          </div>
        ),
      )}
    </div>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen bg-[#bdd9ea] text-slate-950">
      <Header />

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(189,217,234,0.7)_46%,rgba(189,217,234,1))]" />
        <div className="absolute left-1/2 top-16 h-72 w-72 -translate-x-1/2 rounded-full bg-blue-400/20 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 pb-20 pt-20 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:px-8 lg:pb-28 lg:pt-28">
          <div>
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white/80 px-4 py-2 text-sm font-bold text-[#0b63ce] shadow-sm">
              <Sparkles className="h-4 w-4" />
              Nền tảng thi trực tuyến bảo mật cho giáo dục hiện đại
            </div>

            <h1 className="max-w-4xl text-5xl font-black leading-[1.12] tracking-normal text-slate-950 md:text-7xl md:leading-[1.08]">
              Quản lý và tổ chức thi online
              <span className="block pb-2 bg-gradient-to-r from-[#0b63ce] to-[#04a3d8] bg-clip-text text-transparent">
                thông minh, chống gian lận.
              </span>
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-600">
              Testhub giúp nhà trường, trung tâm và doanh nghiệp tạo đề, mời thí
              sinh, giám sát phòng thi, chấm điểm và phân tích kết quả trong một
              hệ thống duy nhất.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="h-12 rounded-xl bg-[#0b63ce] px-6 font-bold text-white shadow-md shadow-blue-600/20 transition hover:-translate-y-0.5 hover:bg-[#0858bb]"
              >
                <Link href="/signup">
                  Bắt đầu miễn phí <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-12 rounded-xl border-slate-200 bg-white/85 px-6 font-bold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50 hover:text-[#0b63ce]"
              >
                <a href="#demo">
                  <PlayCircle className="h-4 w-4" /> Xem Demo
                </a>
              </Button>
            </div>

            <div className="mt-10 grid max-w-2xl gap-4 sm:grid-cols-3">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm backdrop-blur"
                >
                  <p className="text-2xl font-black text-slate-950">
                    {stat.value}
                  </p>
                  <p className="mt-1 text-sm leading-5 text-slate-600">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div id="demo" className="lg:pl-4">
            <DashboardMockup />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <p className="text-center text-sm font-bold uppercase tracking-normal text-slate-500">
          Được tin dùng bởi các đơn vị đào tạo và doanh nghiệp
        </p>
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {trustLogos.map((logo) => {
            const Icon = logo.icon;

            return (
              <div
                key={logo.name}
                className="flex h-20 items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white/65 px-4 text-slate-500 shadow-sm grayscale transition hover:grayscale-0"
              >
                <Icon className="h-5 w-5 text-slate-400" />
                <span className="text-sm font-black leading-5">
                  {logo.name}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section
        id="features"
        className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8"
      >
        <SectionHeading
          eyebrow="Tính năng cốt lõi"
          title="Một không gian điều hành kỳ thi được thiết kế cho độ tin cậy."
          description="Bento grid tập trung vào các quy trình quan trọng nhất: ngân hàng câu hỏi, cấu hình ca thi, giám sát và báo cáo."
        />

        <div className="mt-14 grid gap-5 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <article
                key={feature.title}
                className={`group rounded-2xl border border-slate-200 bg-gradient-to-br ${feature.accent} p-px shadow-sm transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-md ${feature.className}`}
              >
                <div className="h-full rounded-2xl bg-white/82 p-6 backdrop-blur">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0b63ce] text-white shadow-sm shadow-blue-600/20">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-6 text-2xl font-black tracking-normal text-slate-950">
                    {feature.title}
                  </h3>
                  <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
                    {feature.description}
                  </p>
                  <FeatureVisual type={feature.visual} />
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Cách thức hoạt động"
          title="Từ đề thi đến báo cáo trong 4 bước rõ ràng."
          description="Quy trình đơn giản để giáo viên vận hành nhanh, trong khi hệ thống vẫn đảm bảo bảo mật và khả năng theo dõi chi tiết."
        />

        <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => {
            const Icon = step.icon;

            return (
              <article
                key={step.title}
                className="relative rounded-2xl border border-slate-200 bg-white/78 p-6 shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black text-[#0b63ce]">
                    0{index + 1}
                  </span>
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-[#0b63ce]">
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
                <h3 className="mt-8 text-xl font-black text-slate-950">
                  {step.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {step.description}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section
        id="pricing"
        className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8"
      >
        <SectionHeading
          eyebrow="Bảng giá minh bạch"
          title="Chọn gói phù hợp với quy mô đào tạo của bạn."
          description="Bắt đầu miễn phí, nâng cấp khi số lượng kỳ thi và nhu cầu giám sát tăng lên."
        />

        <div className="mt-14 grid gap-5 lg:grid-cols-3">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={`relative rounded-2xl border bg-white/82 p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md ${
                plan.popular
                  ? "border-[#0b63ce] ring-4 ring-blue-500/10"
                  : "border-slate-200"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-6 rounded-full bg-[#0b63ce] px-4 py-1.5 text-xs font-black uppercase text-white shadow-sm shadow-blue-600/25">
                  Phổ biến nhất
                </div>
              )}
              <h3 className="text-xl font-black text-slate-950">{plan.name}</h3>
              <p className="mt-3 min-h-14 text-sm leading-6 text-slate-600">
                {plan.description}
              </p>
              <div className="mt-7 flex items-end gap-1">
                <span className="text-4xl font-black text-slate-950">
                  {plan.price}
                </span>
                <span className="pb-1 text-sm font-bold text-slate-500">
                  {plan.period}
                </span>
              </div>
              <Button
                asChild
                className={`mt-7 h-12 w-full rounded-xl font-bold ${
                  plan.popular
                    ? "bg-[#0b63ce] text-white hover:bg-[#0858bb]"
                    : "border border-slate-200 bg-white text-slate-800 hover:border-blue-200 hover:bg-blue-50 hover:text-[#0b63ce]"
                }`}
              >
                <Link href={plan.href}>{plan.cta}</Link>
              </Button>
              <ul className="mt-7 space-y-4">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex gap-3 text-sm text-slate-600"
                  >
                    <Check className="mt-0.5 h-4 w-4 flex-none text-[#0b63ce]" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section
        id="docs"
        className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8"
      >
        <div className="rounded-2xl border border-blue-200 bg-[#0b63ce] p-8 text-white shadow-md shadow-blue-900/10 md:p-12">
          <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <p className="text-sm font-bold uppercase text-blue-100">
                Sẵn sàng triển khai?
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-normal md:text-4xl">
                Tạo phòng thi đầu tiên của bạn trong hôm nay.
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-blue-100">
                Dùng thử miễn phí để trải nghiệm tạo đề, mời thí sinh và xem báo
                cáo mẫu trước khi nâng cấp gói.
              </p>
            </div>
            <Button
              asChild
              size="lg"
              className="h-12 rounded-xl bg-white px-6 font-black text-[#0b63ce] hover:bg-blue-50"
            >
              <Link href="/signup">
                Đăng ký ngay <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <footer
        id="about"
        className="mt-16 border-t border-slate-200 bg-white/86"
      >
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.2fr_1fr] lg:grid-cols-[1.25fr_0.8fr_0.8fr_0.8fr_1.2fr] lg:px-8">
          <div>
            <BrandLogo />
            <p className="mt-5 max-w-sm text-sm leading-7 text-slate-600">
              Testhub là nền tảng quản lý thi trực tuyến dành cho nhà trường,
              trung tâm và doanh nghiệp cần một hệ thống bảo mật, dễ dùng và có
              khả năng mở rộng.
            </p>
            <div className="mt-6 flex gap-3">
              {["in", "f", "yt"].map((item) => (
                <a
                  key={item}
                  href="#"
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-black text-slate-600 shadow-sm hover:border-blue-200 hover:text-[#0b63ce]"
                >
                  {item}
                </a>
              ))}
            </div>
          </div>

          {footerLinks.map((group) => (
            <div key={group.title}>
              <h3 className="font-black text-slate-950">{group.title}</h3>
              <ul className="mt-5 space-y-3">
                {group.links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-sm font-medium text-slate-600 hover:text-[#0b63ce]"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div id="contact">
            <h3 className="font-black text-slate-950">Nhận bản tin</h3>
            <p className="mt-5 text-sm leading-6 text-slate-600">
              Cập nhật tính năng mới, tài liệu vận hành kỳ thi và mẹo chống gian
              lận.
            </p>
            <form className="mt-5 flex gap-2">
              <label className="sr-only" htmlFor="newsletter-email">
                Email
              </label>
              <input
                id="newsletter-email"
                type="email"
                placeholder="email@domain.com"
                className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-500/10"
              />
              <Button
                className="h-11 rounded-xl bg-[#0b63ce] px-4 text-white hover:bg-[#0858bb]"
                type="submit"
                aria-label="Đăng ký nhận bản tin"
              >
                <Mail className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>

        <div className="border-t border-slate-200">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
            <p>© 2026 Testhub. All rights reserved.</p>
            <div className="flex gap-5">
              <a href="#" className="hover:text-[#0b63ce]">
                Điều khoản
              </a>
              <a href="#" className="hover:text-[#0b63ce]">
                Bảo mật
              </a>
              <a href="#" className="hover:text-[#0b63ce]">
                Hỗ trợ
              </a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
