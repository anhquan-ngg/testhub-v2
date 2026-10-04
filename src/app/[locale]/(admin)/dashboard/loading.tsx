import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  // Add fallback UI that will be shown while the route is loading.
  return (
    <div className="space-y-4 p-4">
      <Skeleton className="h-8 w-1/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-4 w-5/6" />
    </div>
  );
}
