"use client";

import { Suspense, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import { Plus, Loader2, Bookmark, Search, ArrowLeft } from "lucide-react";
import { labels } from "@/lib/labels";

import { Button } from "@/components/ui/button";
import { usePostings } from "@/lib/hooks/use-postings";
import { useConnections } from "@/lib/hooks/use-connections";
import type {
  Posting,
  PostingWithScore,
  QueryFilters,
} from "@/lib/hooks/use-postings";
import { useNlFilter } from "@/lib/hooks/use-nl-filter";
import { useSkillDescendants } from "@/lib/hooks/use-skill-descendants";
import { usePostingInterest } from "@/lib/hooks/use-posting-interest";
import { useBookmarks } from "@/lib/hooks/use-bookmarks";
import { applyFilters } from "@/lib/filters/apply-filters";
import { UnifiedPostingCard } from "@/components/posting";
import { stripTitleMarkdown } from "@/lib/format";
import { PostingFilters } from "@/components/posting/posting-filters";
import { EmptyState } from "@/components/ui/empty-state";
import { createClient } from "@/lib/supabase/client";

type SortOption = "recent" | "match";

/** Fetch parent posting title for scoped discover header */
async function fetchParentTitle(key: string): Promise<string | null> {
  const id = key.split("/").pop();
  if (!id) return null;
  const supabase = createClient();
  const { data } = await supabase
    .from("postings")
    .select("title")
    .eq("id", id)
    .single();
  return data?.title ?? null;
}

function DiscoverContent() {
  const searchParams = useSearchParams();
  const initialSavedFilter = searchParams.get("filter") === "saved";
  const contextParentId = searchParams.get("context") ?? "";

  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterVisibility, setFilterVisibility] = useState<string>("all");
  const [showSaved, setShowSaved] = useState(initialSavedFilter);
  const [showConnections, setShowConnections] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("recent");

  // Fetch parent posting title when in scoped discover mode
  const { data: parentTitle } = useSWR(
    contextParentId ? `parent-title/${contextParentId}` : null,
    fetchParentTitle,
  );

  // Skill filter state — populated when a skill filter UI is added
  const [selectedSkillIds] = useState<string[]>([]);

  // Resolve selected skill node IDs to their tree-expanded descendants
  const { descendantIds: resolvedSkillIds } =
    useSkillDescendants(selectedSkillIds);

  // Build query-level filters to pass to usePostings
  const queryFilters = useMemo<QueryFilters | undefined>(() => {
    const filters: QueryFilters = {};
    if (resolvedSkillIds.length > 0) filters.skillNodeIds = resolvedSkillIds;
    if (contextParentId) filters.parentPostingId = contextParentId;
    if (searchQuery) filters.searchQuery = searchQuery;
    if (filterVisibility !== "all") filters.visibility = filterVisibility;
    return Object.keys(filters).length > 0 ? filters : undefined;
  }, [resolvedSkillIds, contextParentId, searchQuery, filterVisibility]);

  const { postings, userId, interestedPostingIds, isLoading, mutate } =
    usePostings("discover", filterCategory, queryFilters);

  const onCategoryChange = useCallback(
    (cat: string | undefined) => setFilterCategory(cat ?? "all"),
    [],
  );
  const onVisibilityChange = useCallback(
    (visibility: string | undefined) =>
      setFilterVisibility(visibility ?? "all"),
    [],
  );

  const {
    nlQuery,
    setNlQuery,
    nlFilterPills,
    nlFilters,
    hasActiveFilters: hasNlFilters,
    isTranslating,
    handleNlSearch,
    handleRemoveNlFilter,
    clearFilters: clearNlFilters,
  } = useNlFilter({ onCategoryChange, onVisibilityChange });

  const hasActiveFilters = filterVisibility !== "all" || hasNlFilters;

  const clearFilters = () => {
    setFilterVisibility("all");
    clearNlFilters();
  };

  const { interestingIds, interestError, handleExpressInterest } =
    usePostingInterest(mutate);

  const { bookmarkedIds, toggleBookmark } = useBookmarks();

  const { connections } = useConnections();
  const connectionUserIds = useMemo(() => {
    const ids = new Set<string>();
    for (const c of connections) {
      if (c.friend?.user_id) ids.add(c.friend.user_id);
      if (c.user?.user_id) ids.add(c.user.user_id);
    }
    // Don't include the current user's own ID
    if (userId) ids.delete(userId);
    return ids;
  }, [connections, userId]);

  // Apply NL filters, saved filter, connections filter, and sort
  // (text search and visibility are now applied server-side via queryFilters)
  const filteredPostings = useMemo(() => {
    let result = postings as PostingWithScore[];

    // Apply NL-parsed structured filters
    result = applyFilters(result, nlFilters);

    // Apply saved filter (bookmarked postings)
    if (showSaved) {
      result = result.filter((posting: Posting) =>
        bookmarkedIds.has(posting.id),
      );
    }

    // Apply connections filter
    if (showConnections) {
      result = result.filter((posting: Posting) =>
        connectionUserIds.has(posting.creator_id),
      );
    }

    // Apply sort
    if (sortBy === "match") {
      result = [...result].sort(
        (a, b) => (b.compatibility_score ?? 0) - (a.compatibility_score ?? 0),
      );
    }
    // "recent" is the default sort from the hook (created_at desc), no re-sort needed

    return result;
  }, [
    postings,
    nlFilters,
    showSaved,
    bookmarkedIds,
    showConnections,
    connectionUserIds,
    sortBy,
  ]);

  return (
    <div className="space-y-6">
      {/* Scoped discover back link */}
      {contextParentId && (
        <Link
          href={`/postings/${contextParentId}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {labels.coordination.backToGroup}
        </Link>
      )}

      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            {contextParentId && parentTitle
              ? labels.coordination.scopedDiscoverTitle(
                  stripTitleMarkdown(parentTitle),
                )
              : labels.discover.title}
          </h1>
          {!contextParentId && (
            <p className="mt-1 hidden md:block text-muted-foreground">
              {labels.discover.subtitle}
            </p>
          )}
        </div>
        <Button asChild>
          <Link
            href={
              contextParentId
                ? `/postings/new?parent=${contextParentId}`
                : "/postings/new"
            }
          >
            <Plus className="h-4 w-4" />
            {labels.common.newPosting}
          </Link>
        </Button>
      </div>

      <PostingFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filterCategory={filterCategory}
        onCategoryChange={setFilterCategory}
        filterVisibility={filterVisibility}
        onVisibilityChange={setFilterVisibility}
        showFilters={showFilters}
        onToggleFilters={() => setShowFilters((v) => !v)}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={clearFilters}
        showNlSearch
        nlQuery={nlQuery}
        onNlQueryChange={setNlQuery}
        onNlSearch={handleNlSearch}
        nlFilterPills={nlFilterPills}
        onRemoveNlFilter={handleRemoveNlFilter}
        isTranslating={isTranslating}
        showSavedToggle
        showSaved={showSaved}
        onToggleSaved={() => setShowSaved((v) => !v)}
        showConnectionsToggle
        showConnections={showConnections}
        onToggleConnections={() => setShowConnections((v) => !v)}
        showSort
        sortBy={sortBy}
        onSortChange={setSortBy}
      />

      {interestError && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {interestError}
        </p>
      )}

      {/* Loading state */}
      {isLoading ? (
        <div className="flex min-h-[200px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredPostings.length === 0 ? (
        showSaved ? (
          <EmptyState
            icon={<Bookmark />}
            title={labels.discover.noSavedTitle}
            description={labels.discover.noSavedDescription}
          />
        ) : (
          <EmptyState
            icon={<Search />}
            title={labels.discover.noResultsTitle}
            description={labels.discover.noResultsDescription}
          />
        )
      ) : (
        /* Postings grid */
        <div className="grid gap-3 sm:gap-6">
          {filteredPostings.map((posting) => {
            const isOwner = userId === posting.creator_id;
            const isAlreadyInterested = interestedPostingIds.includes(
              posting.id,
            );
            const isInteresting = interestingIds.has(posting.id);
            const postingVisibility =
              posting.visibility ??
              (posting.mode === "friend_ask" ? "private" : "public");
            const showInterestButton =
              !isOwner &&
              postingVisibility !== "private" &&
              !isAlreadyInterested;

            return (
              <UnifiedPostingCard
                key={posting.id}
                variant="full"
                id={posting.id}
                title={stripTitleMarkdown(posting.title)}
                description={posting.description ?? ""}
                status={posting.status}
                category={posting.category}
                createdAt={posting.created_at}
                creatorId={posting.creator_id}
                creator={{
                  name: posting.profiles?.full_name || "Unknown",
                  userId: posting.profiles?.user_id,
                }}
                skills={posting.skills}
                tags={posting.tags}
                teamSizeMin={posting.team_size_min}
                teamSizeMax={posting.team_size_max}
                estimatedTime={posting.estimated_time}
                locationMode={posting.location_mode}
                locationName={posting.location_name}
                visibility={posting.visibility}
                mode={posting.mode}
                contextIdentifier={posting.context_identifier}
                compatibilityScore={posting.compatibility_score}
                scoreBreakdown={posting.score_breakdown}
                isOwner={isOwner}
                isAlreadyInterested={isAlreadyInterested}
                isInteresting={isInteresting}
                showInterestButton={showInterestButton}
                onExpressInterest={handleExpressInterest}
                activeTab="discover"
                isBookmarked={bookmarkedIds.has(posting.id)}
                onToggleBookmark={toggleBookmark}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function DiscoverPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[200px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <DiscoverContent />
    </Suspense>
  );
}
