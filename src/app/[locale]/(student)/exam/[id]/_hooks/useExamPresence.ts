import { useEffect } from "react";
import apiClient from "@/lib/api-client";
import { ENDPOINTS } from "@/constants/endpoints";

/**
 * Sends a periodic presence ping while the exam is running and resyncs the
 * countdown from the server's deadline on every ping.
 */
export function useExamPresence(
  submissionId: string | undefined,
  testStarted: boolean,
  setTimeLeft: (seconds: number) => void,
): void {
  // Presence heartbeat. A plain REST ping on the same cookie-authenticated
  // axios client every request on this page already uses. The previous
  // socket.io heartbeat connected to a namespace that only ever accepted a
  // token via `handshake.auth` or an Authorization header; this app never
  // sends either (the access token is httpOnly), so the server disconnected
  // the socket immediately on every connection and no heartbeat was ever
  // actually recorded. REST also means a token refresh mid-exam (the
  // access-token cookie lasts 15 minutes) is handled for free by the existing
  // axios 401-retry interceptor, unlike a raw WebSocket.
  useEffect(() => {
    if (!submissionId || !testStarted) return;

    const PING_INTERVAL_MS = 20_000;
    const PING_JITTER_MS = 3_000;
    let stopped = false;
    let timeoutId: number | undefined;

    const ping = () => {
      if (stopped) return;
      apiClient
        .post(ENDPOINTS.EXAM_RUNTIME.PING(submissionId))
        .then((response) => {
          // Resyncs the countdown from the server's deadline on every ping —
          // the only way an already-open tab picks up a lecturer's "extend
          // time" grant without a dedicated push channel.
          const autoSubmitAt = response?.data?.autoSubmitAt;
          if (!stopped && autoSubmitAt) {
            setTimeLeft(
              Math.max(
                0,
                Math.ceil((new Date(autoSubmitAt).getTime() - Date.now()) / 1000),
              ),
            );
          }
        })
        .catch((error) => {
          // A single failed ping isn't alarming by itself — the lecturer's
          // monitor judges presence from the *age* of the last successful ping
          // server-side, not from client retry logic.
          console.error("Exam ping failed:", error);
        });
    };

    const scheduleNext = () => {
      if (stopped) return;
      // Jitter keeps 200 students who all pressed "start" in the same second
      // from pinging in lockstep forever.
      const jitter = (Math.random() * 2 - 1) * PING_JITTER_MS;
      timeoutId = window.setTimeout(() => {
        ping();
        scheduleNext();
      }, PING_INTERVAL_MS + jitter);
    };

    ping();
    scheduleNext();

    const handleVisibility = () => {
      if (!document.hidden) ping();
    };
    const handleOnline = () => ping();

    // A suspended laptop's timers just stop dead. Detect the wall-clock jump
    // on resume and ping immediately, instead of leaving the student marked
    // OFFLINE for up to a full interval after they wake it back up.
    let lastTick = Date.now();
    const clockCheck = window.setInterval(() => {
      const now = Date.now();
      if (now - lastTick > 5_000) ping();
      lastTick = now;
    }, 1_000);

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("online", handleOnline);

    return () => {
      stopped = true;
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      window.clearInterval(clockCheck);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("online", handleOnline);
    };
  }, [submissionId, testStarted, setTimeLeft]);
}
