/**
 * Locale-aware labels and semantic colour tones for icon-only buttons.
 */
import { useTranslations } from "next-intl";

export const ICON_LABEL_KEYS = [
  "add",
  "allowRetake",
  "back",
  "close",
  "collapse",
  "copy",
  "delete",
  "download",
  "edit",
  "expand",
  "hidePassword",
  "showPassword",
  "moreActions",
  "next",
  "notifications",
  "openMenu",
  "print",
  "printExam",
  "toggleSidebar",
  "preview",
  "removeItem",
  "refresh",
  "retry",
  "uploadPhoto",
  "viewDetails",
  "viewReport",
  "monitor",
  "manageParticipants",
  "editRole",
  "manageChapters",
  "manageSubChapters",
  "manageQuestions",
  "reorder",
] as const;

export type IconLabelKey = (typeof ICON_LABEL_KEYS)[number];

/**
 * Returns icon-button labels translated for the active locale
 * (Vietnamese for `vi`, English for `en`).
 */
export function useIconLabels(): Record<IconLabelKey, string> {
  const t = useTranslations("shared.iconButton");
  return Object.fromEntries(
    ICON_LABEL_KEYS.map((key) => [key, t(key)]),
  ) as Record<IconLabelKey, string>;
}
/** Props that give an icon-only button an accessible name and a hover tooltip. */
export function iconLabelProps(label: string) {
  return { title: label, "aria-label": label } as const;
}

/** Accessible name only; pair with `IconTooltip` for the visual tooltip. */
export function iconAriaProps(label: string) {
  return { "aria-label": label } as const;
}

/** Semantic colour tones built from design tokens (no hardcoded hex values). */
export const ICON_TONE = {
  danger:
    "text-destructive hover:bg-destructive/10 hover:text-destructive focus-visible:ring-destructive/30",
  primary: "text-primary hover:bg-primary/10 hover:text-primary",
  success: "text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700",
  neutral: "text-muted-foreground hover:bg-neutral-100 hover:text-foreground",
} as const;
