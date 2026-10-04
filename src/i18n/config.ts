export const locales = ["vi", "en"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "vi";
export const LOCALE_COOKIE = "NEXT_LOCALE";

// Tên hiển thị của mỗi ngôn ngữ (luôn viết bằng chính ngôn ngữ đó).
export const localeLabels: Record<Locale, string> = {
  vi: "Tiếng Việt",
  en: "English",
};

// Locale BCP-47 dùng cho Intl / toLocaleString.
export const intlLocales: Record<Locale, string> = {
  vi: "vi-VN",
  en: "en-US",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}
