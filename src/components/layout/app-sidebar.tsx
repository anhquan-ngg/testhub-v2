"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandLogo } from "./brand-logo";
import { useSidebarCollapsed, useMobileSidebarOpen } from "./sidebar-store";
import { lecturerNavItems, studentNavItems } from "./nav-items";
import type { NavItem } from "./nav-items";

function NavLinks({
  items,
  pathname,
  collapsed,
  onNavigate,
}: {
  items: NavItem[];
  pathname: string;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  return (
    <>
      {items.map((item) => {
        const active = item.match(pathname);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-label={item.label}
            onClick={onNavigate}
            className={cn(
              "group relative flex items-center gap-3 rounded-md border-l-2 border-transparent px-3 py-2.5 text-sm font-medium transition-colors",
              collapsed && "justify-center px-0",
              active
                ? "border-accent-600 bg-accent-100 text-accent-800"
                : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900",
            )}
          >
            <Icon className="h-[18px] w-[18px] shrink-0" />
            {!collapsed && <span className="truncate">{item.label}</span>}
            {collapsed && (
              <span className="pointer-events-none absolute left-full z-50 ml-2 hidden whitespace-nowrap rounded-md bg-neutral-900 px-2 py-1 text-xs font-medium text-white group-hover:block">
                {item.label}
              </span>
            )}
          </Link>
        );
      })}
    </>
  );
}

export function AppSidebar({ role }: { role: "student" | "lecturer" }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useSidebarCollapsed();
  const [mobileOpen, setMobileOpen] = useMobileSidebarOpen();
  const items = role === "student" ? studentNavItems : lecturerNavItems;

  // Close the mobile drawer on route change and on Escape, and stop the
  // background from scrolling while it's open — the minimum a modal
  // overlay needs to behave like one instead of a fixed div.
  useEffect(() => {
    setMobileOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileOpen, setMobileOpen]);

  return (
    <>
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-neutral-200 bg-white transition-[width] duration-200 md:flex",
          collapsed ? "w-[72px]" : "w-60",
        )}
      >
        <div
          className={cn(
            "flex h-16 items-center border-b border-neutral-200 px-4",
            collapsed && "justify-center px-0",
          )}
        >
          <BrandLogo collapsed={collapsed} />
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-2.5">
          <NavLinks items={items} pathname={pathname} collapsed={collapsed} />
        </nav>

        <div className="border-t border-neutral-200 p-2.5">
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              "flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900",
              collapsed && "justify-center px-0",
            )}
            aria-label={collapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-[18px] w-[18px]" />
            ) : (
              <PanelLeftClose className="h-[18px] w-[18px]" />
            )}
            {!collapsed && <span>Thu gọn</span>}
          </button>
        </div>
      </aside>

      {/* Mobile drawer — the sidebar above is `hidden` below md, so this is
          the only way to reach navigation on a phone-width screen. */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            aria-hidden="true"
            onClick={() => setMobileOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={role === "student" ? "Menu điều hướng học viên" : "Menu điều hướng giảng viên"}
            className="absolute inset-y-0 left-0 flex h-full w-72 max-w-[80vw] flex-col bg-white shadow-xl"
          >
            <div className="flex h-16 items-center justify-between border-b border-neutral-200 px-4">
              <BrandLogo collapsed={false} />
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Đóng menu"
                className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
              >
                <X className="h-[18px] w-[18px]" />
              </button>
            </div>
            <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-2.5">
              <NavLinks
                items={items}
                pathname={pathname}
                collapsed={false}
                onNavigate={() => setMobileOpen(false)}
              />
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
