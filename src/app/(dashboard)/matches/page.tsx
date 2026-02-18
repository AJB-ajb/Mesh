"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, Filter, Loader2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { useMatches } from "@/lib/hooks/use-matches";
import { useNlFilter } from "@/lib/hooks/use-nl-filter";
import type { Posting } from "@/lib/supabase/types";
import { applyFilters } from "@/lib/filters/apply-filters";
import { AiMatchCard } from "@/components/match/ai-match-card";

export default function MatchesPage() {
  const {
    matches,
    apiError,
    error: fetchError,
    isLoading,
    mutate,
  } = useMatches();
  const [applyingMatchId, setApplyingMatchId] = useState<string | null>(null);

  const error = fetchError
    ? fetchError instanceof Error
      ? fetchError.message
      : "Failed to load matches"
    : apiError;

  const {
    nlQuery,
    setNlQuery,
    nlFilters,
    nlFilterPills,
    hasActiveFilters,
    isTranslating,
    handleNlSearch,
    handleRemoveNlFilter,
    clearFilters,
  } = useNlFilter();

  // Filter matches by applying NL filters to the posting within each match
  const filteredMatches = useMemo(() => {
    if (!hasActiveFilters) return matches;
    const postings = matches.map((m) => m.posting as Posting).filter(Boolean);
    const filtered = applyFilters(postings, nlFilters);
    const filteredIds = new Set(filtered.map((p) => p.id));
    return matches.filter((m) => {
      const posting = m.posting as Posting | undefined;
      return posting && filteredIds.has(posting.id);
    });
  }, [matches, nlFilters, hasActiveFilters]);

  const handleApply = async (matchId: string) => {
    try {
      setApplyingMatchId(matchId);
      const response = await fetch(`/api/matches/${matchId}/apply`, {
        method: "PATCH",
      });

      if (!response.ok) {
        throw new Error("Failed to apply");
      }

      await mutate();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to apply");
    } finally {
      setApplyingMatchId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    const isProfileError = error.toLowerCase().includes("profile");
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Matches</h1>
          <p className="mt-1 text-muted-foreground">
            Postings that match your skills and interests
          </p>
        </div>
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="rounded-full bg-warning/10 p-3">
                <Search className="h-6 w-6 text-warning" />
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold">
                  {isProfileError
                    ? "Profile Incomplete"
                    : "Unable to Find Matches"}
                </h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  {isProfileError
                    ? "Add a description and skills to your profile so we can find relevant matches for you."
                    : error}
                </p>
              </div>
              {isProfileError && (
                <Button asChild>
                  <Link href="/profile">Go to Profile</Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Matches</h1>
        <p className="mt-1 text-muted-foreground">
          Postings that match your skills and interests
        </p>
      </div>

      {/* Search and filter */}
      <div className="flex gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder='Try "remote React, 10+ hours/week"...'
            className="pl-9 pr-10"
            value={nlQuery}
            onChange={(e) => setNlQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleNlSearch(nlQuery);
              }
            }}
          />
          {isTranslating && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </div>
        <Button
          variant={hasActiveFilters ? "default" : "outline"}
          size="icon"
          disabled
        >
          <Filter className="h-4 w-4" />
          <span className="sr-only">Filter</span>
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
            Clear all
          </Button>
        </div>
      )}

      {filteredMatches.length === 0 ? (
        <EmptyState
          title="No matches yet"
          description="Complete your profile to start seeing matches that align with your skills and interests."
          action={{
            label: "Complete Profile",
            href: "/profile",
          }}
        />
      ) : (
        <div className="space-y-4">
          {filteredMatches.map((match) => (
            <AiMatchCard
              key={match.id}
              match={match}
              isApplying={applyingMatchId === match.id}
              onApply={handleApply}
            />
          ))}
        </div>
      )}
    </div>
  );
}
