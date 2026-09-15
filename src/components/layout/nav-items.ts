import {
  FileText,
  ClipboardCheck,
  User,
  HelpCircle,
  LayoutDashboard,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  match: (pathname: string) => boolean;
};

export const studentNavItems: NavItem[] = [
  {
    href: "/home",
    label: "Bài thi",
    icon: FileText,
    match: (pathname) => pathname === "/home",
  },
  {
    href: "/result",
    label: "Kết quả",
    icon: ClipboardCheck,
    match: (pathname) => pathname.startsWith("/result"),
  },
  {
    href: "/profile",
    label: "Tài khoản",
    icon: User,
    match: (pathname) => pathname === "/profile",
  },
];

export const lecturerNavItems: NavItem[] = [
  {
    href: "/lecturer",
    label: "Tổng quan",
    icon: LayoutDashboard,
    match: (pathname) => pathname === "/lecturer",
  },
  {
    href: "/lecturer/exams",
    label: "Quản lý bài thi",
    icon: FileText,
    match: (pathname) => pathname.startsWith("/lecturer/exams"),
  },
  {
    href: "/lecturer/questions",
    label: "Ngân hàng câu hỏi",
    icon: HelpCircle,
    match: (pathname) => pathname.startsWith("/lecturer/questions"),
  },
  {
    href: "/lecturer/profile",
    label: "Tài khoản",
    icon: User,
    match: (pathname) => pathname === "/lecturer/profile",
  },
];
