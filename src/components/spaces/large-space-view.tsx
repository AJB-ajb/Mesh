"use client";

import { useState, useMemo } from "react";
import { Search, Clock, Users } from "lucide-react";

import { cn } from "@/lib/utils";
import { labels } from "@/lib/labels";
import { formatTimeAgoShort } from "@/lib/format";
import { useSpacePostings } from "@/lib/hooks/use-space-postings";
import type {
  Space,
  SpaceMember,
  SpacePostingWithCreator,
  SpacePostingStatus,
} from "@/lib/supabase/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RelativeTime } from "@/components/ui/relative-time";
import { Skeleton } from "@/components/ui/skeleton";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LargeSpaceViewProps {
  spaceId: string;
  space: Space;
  currentMember: SpaceMember | null;
}

type PostingFilter = "all" | "newest" | "open" | "filling_up";

const FILTERS: { value: PostingFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "newest", label: "Newest" },
  { value: "open", label: "Open" },
  { value: "filling_up", label: "Filling Up" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function statusBadgeVariant(
  status: SpacePostingStatus,
): "default" | "secondary" | "success" | "warning" | "destructive" {
  switch (status) {
    case "open":
      return "success";
    case "active":
      return "default";
    case "filled":
      return "warning";
    case "closed":
    case "expired":
      return "secondary";
    default:
      return "secondary";
  }
}

function matchesFilter(
  posting: SpacePostingWithCreator,
  filter: PostingFilter,
): boolean {
  switch (filter) {
    case "all":
    case "newest":
      return true;
    case "open":
      return posting.status === "open";
    case "filling_up":
      return posting.status === "open" && posting.capacity > 1;
    default:
      return true;
  }
}

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

// ---------------------------------------------------------------------------
// Posting card (inline, simple)
// ---------------------------------------------------------------------------

function PostingCard({ posting }: { posting: SpacePostingWithCreator }) {
  const creatorName = posting.profiles?.full_name ?? "Unknown";

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-2">
      {/* Text */}
      <p className="text-sm line-clamp-3">{posting.text}</p>

      {/* Tags */}
      {posting.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {posting.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      )}

      {/* Meta row */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Users className="size-3" />
          {posting.capacity}
        </span>
        {posting.deadline && (
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3" />
            {new Date(posting.deadline).toLocaleDateString()}
          </span>
        )}
        <Badge variant={statusBadgeVariant(posting.status)} className="text-xs">
          {posting.status}
        </Badge>
      </div>

      {/* Footer: creator + join */}
      <div className="flex items-center justify-between pt-1">
        <span className="text-xs text-muted-foreground">
          {creatorName}
          {" \u00b7 "}
          <RelativeTime
            date={posting.created_at}
            formatter={formatTimeAgoShort}
          />
        </span>
        <Button size="sm" className="h-7 text-xs">
          {labels.spaces.posting.join}
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loading skeleton
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
// Main component
// ---------------------------------------------------------------------------

export function LargeSpaceView({
  spaceId,
  space,
  currentMember,
}: LargeSpaceViewProps) {
  const { postings, isLoading } = useSpacePostings(spaceId);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<PostingFilter>("all");

  const filtered = useMemo(() => {
    let result = postings.filter((p) => matchesSearch(p, search));
    result = result.filter((p) => matchesFilter(p, filter));

    // "Newest" sorts by created_at desc (default from hook, but be explicit)
    if (filter === "newest") {
      result = [...result].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    }

    return result;
  }, [postings, search, filter]);

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Search */}
      <div className="px-4 pt-3 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={labels.spaces.searchPostings}
            className="w-full rounded-lg border border-input bg-muted/50 pl-9 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[44px]"
          />
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto px-4 py-1 scrollbar-none">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors min-h-[32px]",
              filter === f.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

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
            <PostingCard key={posting.id} posting={posting} />
          ))
        ) : postings.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">
            {labels.spaces.noPostings}
          </p>
        ) : (
          <p className="text-center text-sm text-muted-foreground py-8">
            {labels.spaces.noPostingsMatch}
          </p>
        )}
      </div>
    </div>
  );
}
