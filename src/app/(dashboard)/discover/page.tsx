"use client";

import { Suspense, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import { labels } from "@/lib/labels";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { usePostings } from "@/lib/hooks/use-postings";
import type { Posting } from "@/lib/hooks/use-postings";
import { useNlFilter } from "@/lib/hooks/use-nl-filter";
import { usePostingInterest } from "@/lib/hooks/use-posting-interest";
import { applyFilters } from "@/lib/filters/apply-filters";
import { PostingDiscoverCard } from "@/components/posting/posting-discover-card";
import { PostingFilters } from "@/components/posting/posting-filters";

type SortOption = "recent" | "match";

function DiscoverContent() {
  const searchParams = useSearchParams();
  const initialSavedFilter = searchParams.get("filter") === "saved";

  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterMode, setFilterMode] = useState<string>("all");
  const [showSaved, setShowSaved] = useState(initialSavedFilter);
  const [sortBy, setSortBy] = useState<SortOption>("recent");

  const { postings, userId, interestedPostingIds, isLoading, mutate } =
    usePostings("discover", filterCategory);

  const onCategoryChange = useCallback(
    (cat: string | undefined) => setFilterCategory(cat ?? "all"),
    [],
  );
  const onModeChange = useCallback(
    (mode: string | undefined) => setFilterMode(mode ?? "all"),
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
  } = useNlFilter({ onCategoryChange, onModeChange });

  const hasActiveFilters = filterMode !== "all" || hasNlFilters;

  const clearFilters = () => {
    setFilterMode("all");
    clearNlFilters();
  };

  const { interestingIds, interestError, handleExpressInterest } =
    usePostingInterest(mutate);

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

      if (filterMode !== "all" && posting.mode !== filterMode) return false;

      return true;
    });

    // Apply NL-parsed structured filters
    result = applyFilters(result, nlFilters);

    // Apply saved filter
    if (showSaved) {
      result = result.filter((posting: Posting) =>
        interestedPostingIds.includes(posting.id),
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
    filterMode,
    nlFilters,
    showSaved,
    interestedPostingIds,
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
        filterMode={filterMode}
        onModeChange={setFilterMode}
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
        <Card>
          <CardContent className="flex min-h-[200px] flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">
              {showSaved
                ? labels.discover.noSavedPostings
                : labels.discover.noResults}
            </p>
          </CardContent>
        </Card>
      ) : (
        /* Postings grid */
        <div className="grid gap-6">
          {filteredPostings.map((posting) => {
            const isOwner = userId === posting.creator_id;
            const isAlreadyInterested = interestedPostingIds.includes(
              posting.id,
            );
            const isInteresting = interestingIds.has(posting.id);
            const showInterestButton =
              !isOwner && posting.mode === "open" && !isAlreadyInterested;

            return (
              <PostingDiscoverCard
                key={posting.id}
                posting={posting}
                isOwner={isOwner}
                isAlreadyInterested={isAlreadyInterested}
                isInteresting={isInteresting}
                showInterestButton={showInterestButton}
                onExpressInterest={handleExpressInterest}
                activeTab="discover"
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
