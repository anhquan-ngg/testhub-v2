import { defineRouting } from "next-intl/routing";
import { defaultLocale, locales, LOCALE_COOKIE } from "./config";

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: "always",
  localeCookie: { name: LOCALE_COOKIE },
});
