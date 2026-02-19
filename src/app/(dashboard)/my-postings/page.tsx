"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Plus, Loader2 } from "lucide-react";
import { labels } from "@/lib/labels";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { usePostings } from "@/lib/hooks/use-postings";
import type { Posting } from "@/lib/hooks/use-postings";
import { PostingDiscoverCard } from "@/components/posting/posting-discover-card";
import { PostingFilters } from "@/components/posting/posting-filters";

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
      />

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
