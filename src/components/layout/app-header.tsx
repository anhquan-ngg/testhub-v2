"use client";

import { useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, Menu, PanelLeftClose, PanelLeftOpen, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { useAppSelector } from "@/store/hook";
import NotificationBell from "@/components/NotificationBell";
import { useSidebarCollapsed, useMobileSidebarOpen } from "./sidebar-store";
import { lecturerNavItems, studentNavItems } from "./nav-items";

function useInitials(name?: string | null) {
  return useMemo(() => {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/);
    const first = parts[0]?.[0] ?? "";
    const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
    return (first + last).toUpperCase() || "?";
  }, [name]);
}

export function AppHeader({
  role,
  profileHref,
}: {
  role: "student" | "lecturer";
  profileHref: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useSidebarCollapsed();
  const [, setMobileSidebarOpen] = useMobileSidebarOpen();
  const fullName = useAppSelector((state) => state.user.full_name);
  const { handleLogout } = useAuth();
  const initials = useInitials(fullName);

  const items = role === "student" ? studentNavItems : lecturerNavItems;
  const activeItem = items.find((item) => item.match(pathname));

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-neutral-200 bg-white/95 px-4 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/80 md:px-6">
      <button
        type="button"
        onClick={() => setMobileSidebarOpen(true)}
        className="flex shrink-0 cursor-pointer items-center justify-center rounded-md p-2 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 md:hidden"
        aria-label="Mở menu điều hướng"
      >
        <Menu className="h-[18px] w-[18px]" />
      </button>
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="hidden shrink-0 cursor-pointer items-center justify-center rounded-md p-2 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 md:flex"
        aria-label={collapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"}
      >
        {collapsed ? (
          <PanelLeftOpen className="h-[18px] w-[18px]" />
        ) : (
          <PanelLeftClose className="h-[18px] w-[18px]" />
        )}
      </button>

      <span className="truncate text-sm font-medium text-neutral-500">
        {activeItem?.label ?? "TESTHUB"}
      </span>

      <div className="ml-auto flex items-center gap-2">
        <NotificationBell />
        <div className="hidden h-6 w-px bg-neutral-200 sm:block" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex cursor-pointer items-center gap-2 px-2 hover:bg-neutral-100"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-100 font-heading text-xs font-semibold text-accent-800">
                {initials}
              </span>
              <span className="hidden max-w-[140px] truncate text-sm font-medium text-neutral-800 sm:inline">
                {fullName || (role === "student" ? "Học viên" : "Giảng viên")}
              </span>
              <ChevronDown className="hidden h-4 w-4 text-neutral-400 sm:inline" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => router.push(profileHref)}
            >
              <UserIcon className="mr-1 h-4 w-4" />
              Thông tin cá nhân
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              className="cursor-pointer"
              onClick={() => handleLogout()}
            >
              Đăng xuất
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
