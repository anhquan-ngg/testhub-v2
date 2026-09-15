"use client";

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "testhub:sidebar-collapsed";
const EVENT_NAME = "testhub:sidebar-collapsed-change";

function readStored(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function subscribe(callback: () => void) {
  window.addEventListener(EVENT_NAME, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(EVENT_NAME, callback);
    window.removeEventListener("storage", callback);
  };
}

export function setSidebarCollapsed(collapsed: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
  } catch {
    // localStorage unavailable (private mode, etc.) — collapse state just won't persist.
  }
  window.dispatchEvent(new Event(EVENT_NAME));
}

/**
 * Shared collapse state for the app sidebar, kept in sync across the
 * sidebar and header (which live as sibling components on each page,
 * not under a common layout) via localStorage + a same-tab custom event.
 */
export function useSidebarCollapsed() {
  const collapsed = useSyncExternalStore(subscribe, readStored, () => false);
  return [collapsed, setSidebarCollapsed] as const;
}

const MOBILE_EVENT_NAME = "testhub:sidebar-mobile-open-change";
let mobileSidebarOpen = false;

function subscribeMobile(callback: () => void) {
  window.addEventListener(MOBILE_EVENT_NAME, callback);
  return () => window.removeEventListener(MOBILE_EVENT_NAME, callback);
}

export function setMobileSidebarOpen(open: boolean) {
  mobileSidebarOpen = open;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(MOBILE_EVENT_NAME));
  }
}

/**
 * Below the md breakpoint the sidebar renders as a drawer instead of a
 * fixed column, so its visibility is a plain open/closed flag (not the
 * desktop collapse width). Same sibling-component sync trick as above,
 * without localStorage — there's no reason for "open" to survive a reload.
 */
export function useMobileSidebarOpen() {
  const open = useSyncExternalStore(
    subscribeMobile,
    () => mobileSidebarOpen,
    () => false,
  );
  return [open, setMobileSidebarOpen] as const;
}
