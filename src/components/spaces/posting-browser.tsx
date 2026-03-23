"use client";

import { useState, useMemo } from "react";
import { Search, SlidersHorizontal } from "lucide-react";

import { cn } from "@/lib/utils";
import { labels } from "@/lib/labels";
import type { SpacePostingWithCreator } from "@/lib/supabase/types";
import { Skeleton } from "@/components/ui/skeleton";
import { PostingBrowserCard } from "./posting-browser-card";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PostingBrowserProps {
  spaceId: string;
  postings: SpacePostingWithCreator[];
  isLoading: boolean;
  matchingEnabled: boolean;
  userId: string | null;
  isAdmin?: boolean;
  acceptedPostingIds?: Set<string>;
  className?: string;
}

type StatusFilter = "all" | "open" | "active" | "closed";

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: labels.spaces.postingBrowser.statusAll },
  { value: "open", label: labels.spaces.postingBrowser.statusOpen },
  { value: "active", label: labels.spaces.postingBrowser.statusActive },
  { value: "closed", label: labels.spaces.postingBrowser.statusClosed },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function matchesSearch(
  posting: SpacePostingWithCreator,
  query: string,
): boolean {
  if (!query) return true;
  const lower = query.toLowerCase();
  return (
    posting.text.toLowerCase().includes(lower) ||
    posting.tags.some((t) => t.toLowerCase().includes(lower)) ||
    (posting.category?.toLowerCase().includes(lower) ?? false)
  );
}

function matchesStatus(
  posting: SpacePostingWithCreator,
  status: StatusFilter,
): boolean {
  if (status === "all") return true;
  if (status === "closed") {
    return (
      posting.status === "closed" ||
      posting.status === "filled" ||
      posting.status === "expired"
    );
  }
  return posting.status === status;
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function PostingCardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <div className="flex gap-2">
        <Skeleton className="h-5 w-12 rounded-full" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <div className="flex items-center justify-between pt-1">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-7 w-14 rounded-md" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Chip button
// ---------------------------------------------------------------------------

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors min-h-[32px]",
        active
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function PostingBrowser({
  spaceId,
  postings,
  isLoading,
  matchingEnabled,
  userId,
  isAdmin,
  acceptedPostingIds,
  className,
}: PostingBrowserProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [filtersExpanded, setFiltersExpanded] = useState(matchingEnabled);

  const showControls = postings.length >= 4;

  // Derive unique categories from postings
  const categories = useMemo(
    () =>
      [...new Set(postings.map((p) => p.category).filter(Boolean))] as string[],
    [postings],
  );

  // Filter + sort
  const filtered = useMemo(() => {
    let result = postings;

    // Text search
    if (search) {
      result = result.filter((p) => matchesSearch(p, search));
    }

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((p) => matchesStatus(p, statusFilter));
    }

    // Category filter
    if (categoryFilter) {
      result = result.filter((p) => p.category === categoryFilter);
    }

    // Sort by recency (default — postings already come sorted from the hook,
    // but be explicit after filtering)
    return [...result].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }, [postings, search, statusFilter, categoryFilter]);

  return (
    <div className={cn("flex-1 overflow-y-auto", className)}>
      {/* Search bar */}
      {showControls && (
        <div className="px-4 pt-3 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={labels.spaces.searchPostings}
              className="w-full rounded-lg border border-input bg-muted/50 pl-9 pr-10 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[44px]"
            />
            <button
              type="button"
              onClick={() => setFiltersExpanded((v) => !v)}
              className={cn(
                "absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md transition-colors",
                filtersExpanded
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
              aria-label={labels.spaces.postingBrowser.filters}
              aria-expanded={filtersExpanded}
            >
              <SlidersHorizontal className="size-4" />
            </button>
          </div>
        </div>
      )}

      {/* Filter chips */}
      {showControls && filtersExpanded && (
        <div className="space-y-2 px-4 py-1">
          {/* Status row */}
          <div className="flex gap-2 overflow-x-auto scrollbar-none">
            {STATUS_OPTIONS.map((opt) => (
              <FilterChip
                key={opt.value}
                label={opt.label}
                active={statusFilter === opt.value}
                onClick={() => setStatusFilter(opt.value)}
              />
            ))}
          </div>

          {/* Category row (only if there are categories) */}
          {categories.length > 0 && (
            <div className="flex gap-2 overflow-x-auto scrollbar-none">
              <FilterChip
                label={labels.spaces.postingBrowser.categoryAll}
                active={categoryFilter === null}
                onClick={() => setCategoryFilter(null)}
              />
              {categories.map((cat) => (
                <FilterChip
                  key={cat}
                  label={cat.charAt(0).toUpperCase() + cat.slice(1)}
                  active={categoryFilter === cat}
                  onClick={() => setCategoryFilter(cat)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Posting list */}
      <div className="space-y-3 p-4">
        {isLoading ? (
          <>
            <PostingCardSkeleton />
            <PostingCardSkeleton />
            <PostingCardSkeleton />
          </>
        ) : filtered.length > 0 ? (
          filtered.map((posting) => (
            <PostingBrowserCard
              key={posting.id}
              posting={posting}
              userId={userId}
              spaceId={spaceId}
              isAdmin={isAdmin}
              revealHidden={
                userId === posting.created_by ||
                acceptedPostingIds?.has(posting.id) === true
              }
            />
          ))
        ) : postings.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">
            {labels.spaces.noPostings}
          </p>
        ) : (
          <p className="text-center text-sm text-muted-foreground py-8">
            {labels.spaces.postingBrowser.noResults}
          </p>
        )}
      </div>
    </div>
  );
}
