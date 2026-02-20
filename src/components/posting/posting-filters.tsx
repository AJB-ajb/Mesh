"use client";

import { Search, Filter, Loader2, X, Bookmark } from "lucide-react";
import { SpeechInput } from "@/components/ai-elements/speech-input";
import { transcribeAudio } from "@/lib/transcribe";
import { labels } from "@/lib/labels";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

type SortOption = "recent" | "match";

export const postingFilterCategories = [
  { value: "all", label: labels.postings.categories.all },
  { value: "study", label: labels.postings.categories.study },
  { value: "hackathon", label: labels.postings.categories.hackathon },
  { value: "personal", label: labels.postings.categories.personal },
  { value: "professional", label: labels.postings.categories.professional },
  { value: "social", label: labels.postings.categories.social },
] as const;

export interface NlFilterPill {
  key: string;
  label: string;
}

interface PostingFiltersProps {
  // Search
  searchQuery: string;
  onSearchChange: (value: string) => void;

  // Category chips
  filterCategory: string;
  onCategoryChange: (value: string) => void;

  // Visibility filter
  filterVisibility: string;
  onVisibilityChange: (value: string) => void;

  // Filter panel visibility
  showFilters: boolean;
  onToggleFilters: () => void;
  hasActiveFilters: boolean;
  onClearFilters: () => void;

  // NL search (optional — discover only)
  showNlSearch?: boolean;
  nlQuery?: string;
  onNlQueryChange?: (value: string) => void;
  onNlSearch?: (query: string) => void;
  nlFilterPills?: NlFilterPill[];
  onRemoveNlFilter?: (key: string) => void;
  isTranslating?: boolean;

  // Saved toggle (optional — discover only)
  showSavedToggle?: boolean;
  showSaved?: boolean;
  onToggleSaved?: () => void;

  // Sort (optional — discover only)
  showSort?: boolean;
  sortBy?: SortOption;
  onSortChange?: (sort: SortOption) => void;
}

export function PostingFilters({
  searchQuery,
  onSearchChange,
  filterCategory,
  onCategoryChange,
  filterVisibility,
  onVisibilityChange,
  showFilters,
  onToggleFilters,
  hasActiveFilters,
  onClearFilters,
  showNlSearch = false,
  nlQuery,
  onNlQueryChange,
  onNlSearch,
  nlFilterPills = [],
  onRemoveNlFilter,
  isTranslating = false,
  showSavedToggle = false,
  showSaved = false,
  onToggleSaved,
  showSort = false,
  sortBy = "recent",
  onSortChange,
}: PostingFiltersProps) {
  return (
    <>
      {/* Search and filter button */}
      <div className="flex gap-2">
        <div className="relative flex-1 sm:w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          {showNlSearch ? (
            <>
              <Input
                type="search"
                placeholder={labels.common.searchPlaceholder}
                className="pl-9 pr-16"
                value={nlQuery ?? ""}
                onChange={(e) => {
                  onNlQueryChange?.(e.target.value);
                  onSearchChange(e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    onNlSearch?.(nlQuery ?? "");
                  }
                }}
              />
              {nlQuery && !isTranslating && (
                <button
                  type="button"
                  onClick={() => {
                    onNlQueryChange?.("");
                    onSearchChange("");
                  }}
                  className="absolute right-9 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">{labels.common.clearAll}</span>
                </button>
              )}
              {isTranslating ? (
                <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
              ) : (
                <SpeechInput
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                  size="icon"
                  variant="ghost"
                  onAudioRecorded={transcribeAudio}
                  onTranscriptionChange={(text) => {
                    onNlQueryChange?.(text);
                    onSearchChange(text);
                    onNlSearch?.(text);
                  }}
                />
              )}
            </>
          ) : (
            <Input
              type="search"
              placeholder={labels.common.searchPlaceholder}
              className="pl-9"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          )}
        </div>
        <Button
          variant={hasActiveFilters ? "default" : "outline"}
          size="icon"
          onClick={onToggleFilters}
        >
          <Filter className="h-4 w-4" />
          <span className="sr-only">{labels.common.filter}</span>
        </Button>
      </div>

      {/* Active NL filter pills (discover only) */}
      {showNlSearch && nlFilterPills.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {nlFilterPills.map((pill) => (
            <Badge
              key={pill.key}
              variant="secondary"
              className="flex items-center gap-1 pr-1"
            >
              {pill.label}
              <button
                onClick={() => onRemoveNlFilter?.(pill.key)}
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
            onClick={onClearFilters}
          >
            {labels.common.clearAll}
          </Button>
        </div>
      )}

      {/* Category chips */}
      <div className="flex flex-wrap gap-2">
        {postingFilterCategories.map((cat) => (
          <button
            key={cat.value}
            onClick={() => onCategoryChange(cat.value)}
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

      {/* Saved toggle + Sort control (discover only) */}
      {(showSavedToggle || showSort) && (
        <div className="flex items-center gap-3">
          {showSavedToggle && (
            <button
              onClick={onToggleSaved}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                showSaved
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              }`}
            >
              <Bookmark className="h-3.5 w-3.5" />
              {labels.discover.savedFilter}
            </button>
          )}

          {showSort && (
            <select
              value={sortBy}
              onChange={(e) => onSortChange?.(e.target.value as SortOption)}
              className="h-8 rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="recent">{labels.discover.sortByRecent}</option>
              <option value="match">{labels.discover.sortByMatch}</option>
            </select>
          )}
        </div>
      )}

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
                  <Button variant="ghost" size="sm" onClick={onClearFilters}>
                    {labels.common.clearAll}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={onToggleFilters}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                {labels.postings.visibilityLabel}
              </label>
              <select
                value={filterVisibility}
                onChange={(e) => onVisibilityChange(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              >
                <option value="all">{labels.postings.visibilityAny}</option>
                <option value="public">
                  {labels.postings.visibilityPublic}
                </option>
                <option value="private">
                  {labels.postings.visibilityPrivate}
                </option>
              </select>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
