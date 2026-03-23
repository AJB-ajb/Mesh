import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { ActivityPageClient } from "./activity-page-client";

/**
 * Server component wrapper with Suspense boundary. The client component uses
 * SWR hooks with isLoading state — wrapping in Suspense prevents hydration
 * mismatches between server and client renders.
 */
export default function ActivityPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[200px] items-center justify-center">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <ActivityPageClient />
    </Suspense>
  );
}
