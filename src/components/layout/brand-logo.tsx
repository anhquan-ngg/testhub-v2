import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export function BrandLogo({
  collapsed = false,
  href = "/",
  subtitle,
  className,
}: {
  collapsed?: boolean;
  href?: string;
  subtitle?: string;
  className?: string;
}) {
  return (
    <Link href={href} className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-600 font-heading text-sm font-bold text-white">
        T
      </span>
      {!collapsed && (
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-heading text-lg font-semibold leading-tight tracking-tight text-neutral-900">
            TESTHUB
          </span>
          {subtitle && (
            <span className="truncate text-xs font-medium leading-tight text-neutral-500">
              {subtitle}
            </span>
          )}
        </span>
      )}
    </Link>
  );
}
