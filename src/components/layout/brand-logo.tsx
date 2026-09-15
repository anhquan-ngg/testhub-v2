import Link from "next/link";
import { cn } from "@/lib/utils";

export function BrandLogo({
  collapsed = false,
  href = "/",
  className,
}: {
  collapsed?: boolean;
  href?: string;
  className?: string;
}) {
  return (
    <Link href={href} className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-600 font-heading text-sm font-bold text-white">
        T
      </span>
      {!collapsed && (
        <span className="truncate font-heading text-lg font-semibold tracking-tight text-neutral-900">
          TESTHUB
        </span>
      )}
    </Link>
  );
}
