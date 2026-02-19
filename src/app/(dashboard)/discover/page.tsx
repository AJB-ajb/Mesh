"use client";

import { Suspense, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Plus, Search, Filter, Loader2, X, Bookmark } from "lucide-react";
import { SpeechInput } from "@/components/ai-elements/speech-input";
import { transcribeAudio } from "@/lib/transcribe";
import { labels } from "@/lib/labels";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { usePostings } from "@/lib/hooks/use-postings";
import type { Posting } from "@/lib/hooks/use-postings";
import { useNlFilter } from "@/lib/hooks/use-nl-filter";
import { usePostingInterest } from "@/lib/hooks/use-posting-interest";
import { applyFilters } from "@/lib/filters/apply-filters";
import { PostingDiscoverCard } from "@/components/posting/posting-discover-card";

type SortOption = "recent" | "match";

const categories = [
  { value: "all", label: labels.postings.categories.all },
  { value: "study", label: labels.postings.categories.study },
  { value: "hackathon", label: labels.postings.categories.hackathon },
  { value: "personal", label: labels.postings.categories.personal },
  { value: "professional", label: labels.postings.categories.professional },
  { value: "social", label: labels.postings.categories.social },
] as const;

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

      {/* Search and filter */}
      <div className="flex gap-2">
        <div className="relative flex-1 sm:w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder={labels.common.searchPlaceholder}
            className="pl-9 pr-10"
            value={nlQuery}
            onChange={(e) => {
              setNlQuery(e.target.value);
              setSearchQuery(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleNlSearch(nlQuery);
              }
            }}
          />
          {isTranslating ? (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          ) : (
            <SpeechInput
              className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
              size="icon"
              variant="ghost"
              onAudioRecorded={transcribeAudio}
              onTranscriptionChange={(text) => {
                setNlQuery(text);
                setSearchQuery(text);
                handleNlSearch(text);
              }}
            />
          )}
        </div>
        <Button
          variant={hasActiveFilters ? "default" : "outline"}
          size="icon"
          onClick={() => setShowFilters((v) => !v)}
        >
          <Filter className="h-4 w-4" />
          <span className="sr-only">{labels.common.filter}</span>
        </Button>
      </div>

      {/* Active NL filter pills */}
      {nlFilterPills.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {nlFilterPills.map((pill) => (
            <Badge
              key={pill.key}
              variant="secondary"
              className="flex items-center gap-1 pr-1"
            >
              {pill.label}
              <button
                onClick={() => handleRemoveNlFilter(pill.key)}
                className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20"
              >
                <X className="h-3 w-3" />
                <span className="sr-only">Remove {pill.label}</span>
              </button>
            </Badge>
          ))}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs"
            onClick={clearFilters}
          >
            {labels.common.clearAll}
          </Button>
        </div>
      )}

      {/* Category chips */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setFilterCategory(cat.value)}
            className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
              filterCategory === cat.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Saved toggle + Sort control */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setShowSaved((v) => !v)}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium transition-colors ${
            showSaved
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
          }`}
        >
          <Bookmark className="h-3.5 w-3.5" />
          {labels.discover.savedFilter}
        </button>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
          className="h-8 rounded-md border border-input bg-background px-2 text-sm"
        >
          <option value="recent">{labels.discover.sortByRecent}</option>
          <option value="match">{labels.discover.sortByMatch}</option>
        </select>
      </div>

      {/* Filter panel (mode only — category handled by chips) */}
      {showFilters && (
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium">
                {labels.postings.filtersTitle}
              </h3>
              <div className="flex gap-2">
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    {labels.common.clearAll}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setShowFilters(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                {labels.postings.modeLabel}
              </label>
              <select
                value={filterMode}
                onChange={(e) => setFilterMode(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              >
                <option value="all">{labels.postings.modeAny}</option>
                <option value="open">{labels.postings.modeOpen}</option>
                <option value="friend_ask">
                  {labels.postings.modeSequentialInvite}
                </option>
              </select>
            </div>
          </CardContent>
        </Card>
      )}

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
