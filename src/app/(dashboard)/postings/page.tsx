"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Plus, Search, Filter, Loader2, X } from "lucide-react";
import { SpeechInput } from "@/components/ai-elements/speech-input";
import { transcribeAudio } from "@/lib/transcribe";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { usePostings } from "@/lib/hooks/use-postings";
import type { Posting, TabId } from "@/lib/hooks/use-postings";
import { useNlFilter } from "@/lib/hooks/use-nl-filter";
import { usePostingInterest } from "@/lib/hooks/use-posting-interest";
import { applyFilters } from "@/lib/filters/apply-filters";
import { PostingDiscoverCard } from "@/components/posting/posting-discover-card";

const tabs: { id: TabId; label: string }[] = [
  { id: "discover", label: "Discover" },
  { id: "my-postings", label: "My Postings" },
];

const categories = [
  { value: "all", label: "All" },
  { value: "study", label: "Study" },
  { value: "hackathon", label: "Hackathon" },
  { value: "personal", label: "Personal" },
  { value: "professional", label: "Professional" },
  { value: "social", label: "Social" },
] as const;

export default function PostingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("discover");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterMode, setFilterMode] = useState<string>("all");

  const { postings, userId, interestedPostingIds, isLoading, mutate } =
    usePostings(activeTab, filterCategory);

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

  // Apply text search and mode filter first
  const textFiltered = postings.filter((posting: Posting) => {
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

  // Then apply NL-parsed structured filters
  const filteredPostings = applyFilters(textFiltered, nlFilters);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Postings</h1>
          <p className="mt-1 text-muted-foreground">
            Discover postings or manage your own
          </p>
        </div>
        <Button asChild>
          <Link href="/postings/new">
            <Plus className="h-4 w-4" />
            New Posting
          </Link>
        </Button>
      </div>

      {/* Tabs and search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Tabs */}
        <div className="flex rounded-lg border border-border bg-muted/50 p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                tab.id === activeTab
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search and filter */}
        <div className="flex gap-2">
          <div className="relative flex-1 sm:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder='Try "remote React, 10+ hours/week"...'
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
            <span className="sr-only">Filter</span>
          </Button>
        </div>
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
            Clear all
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

      {/* Filter panel (mode only — category handled by chips) */}
      {showFilters && (
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium">Filters</h3>
              <div className="flex gap-2">
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    Clear all
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
                Mode
              </label>
              <select
                value={filterMode}
                onChange={(e) => setFilterMode(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              >
                <option value="all">Any mode</option>
                <option value="open">Open</option>
                <option value="friend_ask">Sequential Invite</option>
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
              {activeTab === "my-postings"
                ? "You haven't created any postings yet."
                : "No postings found."}
            </p>
            {activeTab === "my-postings" && (
              <Button asChild className="mt-4">
                <Link href="/postings/new">
                  <Plus className="h-4 w-4" />
                  Create your first posting
                </Link>
              </Button>
            )}
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
              !isOwner &&
              activeTab === "discover" &&
              posting.mode === "open" &&
              !isAlreadyInterested;

            return (
              <PostingDiscoverCard
                key={posting.id}
                posting={posting}
                isOwner={isOwner}
                isAlreadyInterested={isAlreadyInterested}
                isInteresting={isInteresting}
                showInterestButton={showInterestButton}
                onExpressInterest={handleExpressInterest}
                activeTab={activeTab}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
