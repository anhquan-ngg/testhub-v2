import {
  FileText,
  ClipboardCheck,
  User,
  HelpCircle,
  LayoutDashboard,
  BarChart3,
  Users,
  type LucideIcon,
} from "lucide-react";

// `labelKey` là key trong namespace `nav` của src/messages/*/shared/navigation.json.
export type NavLabelKey =
  | "exams"
  | "results"
  | "account"
  | "overview"
  | "examManagement"
  | "questionBank"
  | "scoreAnalytics"
  | "userManagement";

export type NavItem = {
  href: string;
  labelKey: NavLabelKey;
  icon: LucideIcon;
  match: (pathname: string) => boolean;
};

export const studentNavItems: NavItem[] = [
  {
    href: "/home",
    labelKey: "exams",
    icon: FileText,
    match: (pathname) => pathname === "/home",
  },
  {
    href: "/result",
    labelKey: "results",
    icon: ClipboardCheck,
    match: (pathname) => pathname.startsWith("/result"),
  },
  {
    href: "/profile",
    labelKey: "account",
    icon: User,
    match: (pathname) => pathname === "/profile",
  },
];

export const lecturerNavItems: NavItem[] = [
  {
    href: "/lecturer",
    labelKey: "overview",
    icon: LayoutDashboard,
    match: (pathname) => pathname === "/lecturer",
  },
  {
    href: "/lecturer/exams",
    labelKey: "examManagement",
    icon: FileText,
    match: (pathname) => pathname.startsWith("/lecturer/exams"),
  },
  {
    href: "/lecturer/questions",
    labelKey: "questionBank",
    icon: HelpCircle,
    match: (pathname) => pathname.startsWith("/lecturer/questions"),
  },
  {
    href: "/lecturer/profile",
    labelKey: "account",
    icon: User,
    match: (pathname) => pathname === "/lecturer/profile",
  },
];

export const adminNavItems: NavItem[] = [
  {
    href: "/dashboard",
    labelKey: "scoreAnalytics",
    icon: BarChart3,
    match: (pathname) => pathname === "/dashboard",
  },
  {
    href: "/dashboard/users",
    labelKey: "userManagement",
    icon: Users,
    match: (pathname) => pathname.startsWith("/dashboard/users"),
  },
  {
    href: "/dashboard/exams",
    labelKey: "examManagement",
    icon: FileText,
    match: (pathname) => pathname.startsWith("/dashboard/exams"),
  },
  {
    href: "/dashboard/questions",
    labelKey: "questionBank",
    icon: HelpCircle,
    match: (pathname) => pathname.startsWith("/dashboard/questions"),
  },
];

export type AppRole = "student" | "lecturer" | "admin";

export const navItemsByRole: Record<AppRole, NavItem[]> = {
  student: studentNavItems,
  lecturer: lecturerNavItems,
  admin: adminNavItems,
};
