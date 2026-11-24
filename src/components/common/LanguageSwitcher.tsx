"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { ChevronDown, Globe, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { isLocale, localeLabels, locales, type Locale } from "@/i18n/config";

/** Switch the current page language without losing its path or query parameters. */
export function LanguageSwitcher({ className }: { className?: string }) {
  const locale = useLocale();
  const t = useTranslations("language");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentLocale = isLocale(locale) ? locale : locales[0];

  const handleChange = (next: Locale) => {
    if (next === locale || isPending) return;
    startTransition(() => {
      const query = searchParams.toString();
      router.replace(`${pathname}${query ? `?${query}` : ""}`, { locale: next });
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={isPending}
          aria-label={`${t("label")}: ${localeLabels[currentLocale]}`}
          aria-busy={isPending}
          title={localeLabels[currentLocale]}
          className={cn(
            "cursor-pointer border-border bg-background text-neutral-700 shadow-none hover:border-accent-200 hover:bg-accent-50 hover:text-accent-800 data-[state=open]:border-accent-200 data-[state=open]:bg-accent-50 data-[state=open]:text-accent-800",
            className,
          )}
        >
          {isPending ? (
            <LoaderCircle className="size-4 animate-spin text-accent-600" aria-hidden="true" />
          ) : (
            <Globe className="size-4 text-accent-600" aria-hidden="true" />
          )}
          <span className="text-xs font-semibold uppercase">{currentLocale}</span>
          <ChevronDown className="size-3.5 text-neutral-400" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-44 border-border">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          {t("label")}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={currentLocale}
          onValueChange={(next) => { if (isLocale(next)) handleChange(next); }}
        >
          {locales.map((code) => (
            <DropdownMenuRadioItem
              key={code}
              value={code}
              disabled={isPending}
              data-page-navigation={code !== currentLocale ? "locale" : undefined}
              className="min-h-10 cursor-pointer focus:bg-accent-50 focus:text-accent-800 data-[state=checked]:bg-accent-50 data-[state=checked]:font-medium data-[state=checked]:text-accent-800"
            >
              <span lang={code}>{localeLabels[code]}</span>
              <span className="ml-auto text-xs uppercase text-muted-foreground">{code}</span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
