import { useEffect, type MutableRefObject } from "react";
import apiClient from "@/lib/api-client";
import { ENDPOINTS } from "@/constants/endpoints";

/**
 * Reports proctoring signals (tab hidden, blur, fullscreen exit, copy, paste)
 * for the running exam.
 */
export function useExamProctoring(
  submissionId: string | undefined,
  testStarted: boolean,
  intentionalFullscreenExit: MutableRefObject<boolean>,
  onFullscreenExited: () => void,
): void {
  // Proctoring signals. Self-reported, client-debounced (the server debounces
  // and caps independently too — this just avoids firing a request for every
  // one of the 2-4 events a single alt-tab produces). Honesty check: any of
  // these listeners can be trivially removed via devtools, so their absence is
  // not proof of anything — only the *silence* of pings (judged server-side)
  // is tamper-resistant.
  useEffect(() => {
    if (!submissionId || !testStarted) return;

    const DEBOUNCE_MS: Record<string, number> = {
      TAB_HIDDEN: 10_000,
      WINDOW_BLUR: 10_000,
      FULLSCREEN_EXIT: 5_000,
      COPY: 30_000,
      PASTE: 30_000,
    };
    const lastSentAt: Record<string, number> = {};

    const report = (type: keyof typeof DEBOUNCE_MS) => {
      const now = Date.now();
      if (now - (lastSentAt[type] ?? 0) < DEBOUNCE_MS[type]) return;
      lastSentAt[type] = now;
      apiClient
        .post(ENDPOINTS.EXAM_RUNTIME.VIOLATIONS(submissionId), { type })
        .catch(() => {
          // Best-effort — the server enforces its own debounce/budget too.
        });
    };

    const handleVisibility = () => {
      if (document.hidden) report("TAB_HIDDEN");
    };
    const handleBlur = () => report("WINDOW_BLUR");
    const handleFullscreenChange = () => {
      if (document.fullscreenElement) return;
      if (intentionalFullscreenExit.current) {
        intentionalFullscreenExit.current = false;
        return;
      }
      onFullscreenExited();
      report("FULLSCREEN_EXIT");
    };
    const handleCopy = () => report("COPY");
    const handlePaste = () => report("PASTE");

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("copy", handleCopy);
    document.addEventListener("paste", handlePaste);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("paste", handlePaste);
    };
  }, [submissionId, testStarted, intentionalFullscreenExit, onFullscreenExited]);
}
