"use client";

import { Suspense, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Plus, Loader2, Bookmark, Search } from "lucide-react";
import { labels } from "@/lib/labels";

import { Button } from "@/components/ui/button";
import { usePostings } from "@/lib/hooks/use-postings";
import type { Posting, QueryFilters } from "@/lib/hooks/use-postings";
import { useNlFilter } from "@/lib/hooks/use-nl-filter";
import { useSkillDescendants } from "@/lib/hooks/use-skill-descendants";
import { usePostingInterest } from "@/lib/hooks/use-posting-interest";
import { useBookmarks } from "@/lib/hooks/use-bookmarks";
import { applyFilters } from "@/lib/filters/apply-filters";
import { UnifiedPostingCard } from "@/components/posting";
import { stripTitleMarkdown } from "@/lib/format";
import { PostingFilters } from "@/components/posting/posting-filters";
import { EmptyState } from "@/components/ui/empty-state";

type SortOption = "recent" | "match";

function DiscoverContent() {
  const searchParams = useSearchParams();
  const initialSavedFilter = searchParams.get("filter") === "saved";

  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterVisibility, setFilterVisibility] = useState<string>("all");
  const [showSaved, setShowSaved] = useState(initialSavedFilter);
  const [sortBy, setSortBy] = useState<SortOption>("recent");

  // Skill filter state — populated when a skill filter UI is added
  const [selectedSkillIds] = useState<string[]>([]);

  // Resolve selected skill node IDs to their tree-expanded descendants
  const { descendantIds: resolvedSkillIds } =
    useSkillDescendants(selectedSkillIds);

  // Build query-level filters to pass to usePostings
  const queryFilters = useMemo<QueryFilters | undefined>(() => {
    if (resolvedSkillIds.length === 0) return undefined;
    return { skillNodeIds: resolvedSkillIds };
  }, [resolvedSkillIds]);

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

  // Apply text search, mode filter, saved filter, and sort
  const filteredPostings = useMemo(() => {
    // Text search and mode filter
    let result = postings.filter((posting: Posting) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          posting.title.toLowerCase().includes(query) ||
          posting.description.toLowerCase().includes(query) ||
          posting.skills.some((skill: string) =>
            skill.toLowerCase().includes(query),
          );
        if (!matchesSearch) return false;
      }

      if (
        filterVisibility !== "all" &&
        (posting.visibility ??
          (posting.mode === "friend_ask" ? "private" : "public")) !==
          filterVisibility
      )
        return false;

      return true;
    });

    // Apply NL-parsed structured filters
    result = applyFilters(result, nlFilters);

    // Apply saved filter (bookmarked postings)
    if (showSaved) {
      result = result.filter((posting: Posting) =>
        bookmarkedIds.has(posting.id),
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
    searchQuery,
    filterVisibility,
    nlFilters,
    showSaved,
    bookmarkedIds,
    sortBy,
  ]);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {labels.discover.title}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {labels.discover.subtitle}
          </p>
        </div>
        <Button asChild>
          <Link href="/postings/new">
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
        <div className="grid gap-6">
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
