"use client";

import { Bookmark, Loader2 } from "lucide-react";

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
        <h1 className="text-3xl font-bold tracking-tight">Bookmarks</h1>
        <p className="mt-1 text-muted-foreground">
          Postings you&apos;ve saved for later
        </p>
      </div>

      {bookmarks.length === 0 ? (
        <EmptyState
          icon={<Bookmark />}
          title="No bookmarks yet"
          description="Browse postings and bookmark ones you're interested in."
          action={{
            label: "Browse Postings",
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
