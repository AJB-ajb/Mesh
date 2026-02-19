"use client";

import Link from "next/link";
import { labels } from "@/lib/labels";

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="mx-auto max-w-md text-center">
        <div className="mb-8">
          <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-muted">
            <svg
              className="h-12 w-12 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
              />
            </svg>
          </div>
          <h1 className="mb-2 text-3xl font-bold tracking-tight">
            {labels.offline.title}
          </h1>
          <p className="text-muted-foreground">{labels.offline.description}</p>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border bg-card p-4 text-left">
            <h2 className="mb-2 font-semibold">
              {labels.offline.whatYouCanDo}
            </h2>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="mt-0.5">✓</span>
                <span>{labels.offline.viewPreviousPages}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5">✓</span>
                <span>{labels.offline.browseCachedContent}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5">✗</span>
                <span>{labels.offline.requiresConnection}</span>
              </li>
            </ul>
          </div>

          <div className="flex flex-col gap-2">
            <button
              onClick={() => window.location.reload()}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {labels.offline.tryAgain}
            </button>
            <Link
              href="/"
              className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              {labels.offline.goToHome}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
