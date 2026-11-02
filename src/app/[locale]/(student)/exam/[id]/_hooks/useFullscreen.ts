import { useRef, useSyncExternalStore, type MutableRefObject } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

// Fullscreen state read straight from the DOM so the UI can never drift from
// what the browser actually shows (Esc / F11 exit without any React handler).
const subscribeFullscreen = (onChange: () => void) => {
  document.addEventListener("fullscreenchange", onChange);
  return () => document.removeEventListener("fullscreenchange", onChange);
};
const subscribeNoop = () => () => {};
const getIsFullscreen = () => Boolean(document.fullscreenElement);
// Browsers without the Fullscreen API (e.g. iPhone Safari) skip the
// requirement instead of locking the student out of the exam.
const getFullscreenSupported = () => Boolean(document.fullscreenEnabled);

export type FullscreenControls = {
  isFullscreen: boolean;
  fullscreenSupported: boolean;
  /** Set right before the page itself leaves fullscreen so it is not reported as a violation. */
  intentionalFullscreenExit: MutableRefObject<boolean>;
  enterFullscreen: () => Promise<boolean>;
  leaveFullscreen: () => void;
};

/** Tracks browser fullscreen state and exposes helpers to enter/leave it. */
export function useFullscreen(): FullscreenControls {
  const t = useTranslations("student.exam");
  const isFullscreen = useSyncExternalStore(
    subscribeFullscreen,
    getIsFullscreen,
    () => false,
  );
  const fullscreenSupported = useSyncExternalStore(
    subscribeNoop,
    getFullscreenSupported,
    () => true,
  );
  // Set right before the page itself leaves fullscreen (after submitting), so
  // that exit is not reported to the lecturer as a violation.
  const intentionalFullscreenExit = useRef(false);

  // Must be called synchronously from a click handler: browsers only grant
  // fullscreen in response to a user gesture.
  const enterFullscreen = async () => {
    try {
      intentionalFullscreenExit.current = false;
      await document.documentElement.requestFullscreen({ navigationUI: "hide" });
      return true;
    } catch (error) {
      console.error("Fullscreen request failed:", error);
      toast.error(t("fullscreenRequestFailed"));
      return false;
    }
  };

  const leaveFullscreen = () => {
    if (!document.fullscreenElement) return;
    intentionalFullscreenExit.current = true;
    document.exitFullscreen().catch(() => {
      intentionalFullscreenExit.current = false;
    });
  };

  return {
    isFullscreen,
    fullscreenSupported,
    intentionalFullscreenExit,
    enterFullscreen,
    leaveFullscreen,
  };
}
