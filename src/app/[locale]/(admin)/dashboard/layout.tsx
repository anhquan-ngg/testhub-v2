"use client";

import type React from "react";

import SessionTransferPanel from "@/components/common/SessionTransferPanel";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-neutral-100">
      <AppSidebar role="admin" />

      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader role="admin" />

        <main className="flex-1 overflow-x-hidden overflow-y-auto px-6 pb-10 pt-7 md:px-8">
          <div className="mb-6">
            <SessionTransferPanel />
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}