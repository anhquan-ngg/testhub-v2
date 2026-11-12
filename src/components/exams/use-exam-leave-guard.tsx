"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

type NavigateEvent = Event & { navigationType: string; destination: { url: string } };
type NavigationTarget = { addEventListener: (type: "navigate", listener: (event: NavigateEvent) => void) => void; removeEventListener: (type: "navigate", listener: (event: NavigateEvent) => void) => void };

/** Protect unsaved exam metadata and question selections across page exits. */
export function useExamLeaveGuard(dirty: boolean, saving: boolean) {
  const t = useTranslations("lecturer.createExam");
  const router = useRouter();
  const bypass = useRef(false);
  const pending = useRef<(() => void) | null>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);

  const requestLeave = (navigate: () => void) => {
    if (saving) return;
    if (!dirty || bypass.current) { navigate(); return; }
    trigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    pending.current = navigate;
    setOpen(true);
  };

  useEffect(() => {
    if (!dirty && !saving) return;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!bypass.current) { event.preventDefault(); event.returnValue = ""; }
    };
    const beforeLink = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest("a[href], [data-page-navigation]") : null;
      if (bypass.current || event.button !== 0 || !(target instanceof HTMLElement) || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      if (target instanceof HTMLAnchorElement && (target.target === "_blank" || target.hasAttribute("download") || target.href === window.location.href)) return;
      event.preventDefault();
      event.stopPropagation();
      if (saving) return;
      trigger.current = target;
      pending.current = () => {
        if (!(target instanceof HTMLAnchorElement)) { target.click(); return; }
        const url = new URL(target.href);
        if (url.origin === window.location.origin) router.push(url.pathname + url.search + url.hash);
        else window.location.assign(url.href);
      };
      setOpen(true);
    };
    // Traversals must be cancelled before the App Router discards the mounted form.
    const navigation = (window as Window & { navigation?: NavigationTarget }).navigation;
    const beforeNavigate = (event: NavigateEvent) => {
      if (bypass.current || event.navigationType !== "traverse" || !event.cancelable) return;
      if (saving || !window.confirm(t("unsavedChanges"))) event.preventDefault();
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", beforeLink, true);
    navigation?.addEventListener("navigate", beforeNavigate);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", beforeLink, true);
      navigation?.removeEventListener("navigate", beforeNavigate);
    };
  }, [dirty, saving, router, t]);

  const dialog = (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent onCloseAutoFocus={(event) => { event.preventDefault(); trigger.current?.focus(); }}>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("leaveTitle")}</AlertDialogTitle>
          <AlertDialogDescription>{t("unsavedChanges")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("keepEditing")}</AlertDialogCancel>
          <AlertDialogAction disabled={saving} onClick={() => { bypass.current = true; pending.current?.(); }}>{t("discardChanges")}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
  return { requestLeave, allowNavigation: () => { bypass.current = true; }, dialog };
}
