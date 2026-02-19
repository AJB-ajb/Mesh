"use client";

import { Bookmark, Loader2 } from "lucide-react";

import { labels } from "@/lib/labels";
import { EmptyState } from "@/components/ui/empty-state";
import { InterestSentCard } from "@/components/match/interest-sent-card";
import { useBookmarks } from "@/lib/hooks/use-bookmarks";

export default function BookmarksPage() {
  const { bookmarks, isLoading } = useBookmarks();

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {labels.bookmarks.title}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {labels.bookmarks.subtitle}
        </p>
      </div>

      {bookmarks.length === 0 ? (
        <EmptyState
          icon={<Bookmark />}
          title={labels.bookmarks.emptyTitle}
          description={labels.bookmarks.emptyDescription}
          action={{
            label: labels.bookmarks.browsePostings,
            href: "/postings",
          }}
        />
      ) : (
        <div className="space-y-4">
          {bookmarks.map((interest) => (
            <InterestSentCard key={interest.id} interest={interest} />
          ))}
        </div>
      )}
    </div>
  );
}
