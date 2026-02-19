"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Plus, Search, Filter, Loader2, X } from "lucide-react";
import { labels } from "@/lib/labels";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { usePostings } from "@/lib/hooks/use-postings";
import type { Posting } from "@/lib/hooks/use-postings";
import { PostingDiscoverCard } from "@/components/posting/posting-discover-card";

const categories = [
  { value: "all", label: labels.postings.categories.all },
  { value: "study", label: labels.postings.categories.study },
  { value: "hackathon", label: labels.postings.categories.hackathon },
  { value: "personal", label: labels.postings.categories.personal },
  { value: "professional", label: labels.postings.categories.professional },
  { value: "social", label: labels.postings.categories.social },
] as const;

export default function MyPostingsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterMode, setFilterMode] = useState<string>("all");

  const { postings, userId, isLoading } = usePostings(
    "my-postings",
    filterCategory,
  );

  const hasActiveFilters = filterMode !== "all";

  const clearFilters = () => {
    setFilterMode("all");
  };

  const filteredPostings = useMemo(() => {
    return postings.filter((posting: Posting) => {
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
  }, [postings, searchQuery, filterMode]);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {labels.myPostings.title}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {labels.myPostings.subtitle}
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
            placeholder="Search your postings..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
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

      {/* Filter panel (mode only) */}
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

      {/* Loading state */}
      {isLoading ? (
        <div className="flex min-h-[200px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredPostings.length === 0 ? (
        <Card>
          <CardContent className="flex min-h-[200px] flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">
              {labels.myPostings.noPostings}
            </p>
            <Button asChild className="mt-4">
              <Link href="/postings/new">
                <Plus className="h-4 w-4" />
                {labels.myPostings.createFirst}
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        /* Postings grid */
        <div className="grid gap-6">
          {filteredPostings.map((posting) => {
            const isOwner = userId === posting.creator_id;

            return (
              <PostingDiscoverCard
                key={posting.id}
                posting={posting}
                isOwner={isOwner}
                isAlreadyInterested={false}
                isInteresting={false}
                showInterestButton={false}
                onExpressInterest={() => {}}
                activeTab="my-postings"
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
