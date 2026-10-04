"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { localeLabels, locales, type Locale } from "@/i18n/config";

export function LanguageSwitcher({ className }: { className?: string }) {
  const locale = useLocale();
  const t = useTranslations("language");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const handleChange = (next: Locale) => {
    if (next === locale) return;
    startTransition(() => {
      const query = searchParams.toString();
      router.replace(`${pathname}${query ? `?${query}` : ""}`, { locale: next });
    });
  };

  return (
    <div
      role="group"
      aria-label={t("label")}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-white/80 p-0.5 text-xs font-medium",
        isPending && "opacity-60",
        className,
      )}
    >
      <Globe className="ml-1.5 h-3.5 w-3.5 text-neutral-500" aria-hidden="true" />
      {locales.map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => handleChange(code)}
          aria-pressed={code === locale}
          title={localeLabels[code]}
          className={cn(
            "cursor-pointer rounded-full px-2 py-1 uppercase transition-colors",
            code === locale
              ? "bg-neutral-900 text-white"
              : "text-neutral-600 hover:bg-neutral-100",
          )}
        >
          {code}
        </button>
      ))}
    </div>
  );
}
