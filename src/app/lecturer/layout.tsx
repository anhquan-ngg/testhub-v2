"use client";

import type React from "react";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";

export default function LecturerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-neutral-100">
      <AppSidebar role="lecturer" />

      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader role="lecturer" profileHref="/lecturer/profile" />

        <main className="flex-1 overflow-x-hidden overflow-y-auto px-6 pb-10 pt-7 md:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
