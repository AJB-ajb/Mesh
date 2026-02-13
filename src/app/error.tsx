"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("Application error:", error);
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      {/* Icon */}
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="h-8 w-8 text-destructive" />
      </div>

      {/* Title */}
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
        Something went wrong
      </h1>

      {/* Description */}
      <p className="mt-4 max-w-md text-muted-foreground">
        We encountered an unexpected error. Our team has been notified and is
        working on a fix.
      </p>

      {/* Error ID (for support) */}
      {error.digest && (
        <p className="mt-2 text-xs text-muted-foreground">
          Error ID: {error.digest}
        </p>
      )}

      {/* Actions */}
      <div className="mt-8 flex flex-col gap-4 sm:flex-row">
        <Button onClick={reset}>
          <RefreshCw className="h-4 w-4" />
          Try again
        </Button>
        <Button variant="outline" asChild>
          <Link href="/">
            <Home className="h-4 w-4" />
            Go home
          </Link>
        </Button>
      </div>
    </div>
  );
}
