import {
  FileText,
  ClipboardCheck,
  User,
  HelpCircle,
  LayoutDashboard,
  type LucideIcon,
} from "lucide-react";

// `labelKey` là key trong namespace `nav` của src/messages/*/shared/navigation.json.
export type NavLabelKey =
  | "exams"
  | "results"
  | "account"
  | "overview"
  | "examManagement"
  | "questionBank";

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
