"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { AlertTriangle, RefreshCw, LayoutDashboard } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { labels } from "@/lib/labels";
import { ROUTES } from "@/lib/routes";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("Dashboard error:", error);
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-6 text-center">
      <div className="mb-6 flex size-16 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="size-8 text-destructive" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
        {labels.error.title}
      </h1>
      <p className="mt-4 max-w-md text-muted-foreground">
        {labels.error.description}
      </p>
      {error.digest && (
        <p className="mt-2 text-xs text-muted-foreground">
          {labels.error.errorIdPrefix}
          {error.digest}
        </p>
      )}
      <div className="mt-8 flex flex-col gap-4 sm:flex-row">
        <Button onClick={reset}>
          <RefreshCw className="size-4" />
          {labels.error.tryAgain}
        </Button>
        <Button variant="outline" asChild>
          <Link href={ROUTES.home}>
            <LayoutDashboard className="size-4" />
            {labels.error.goToSpaces}
          </Link>
        </Button>
      </div>
    </div>
  );
}
