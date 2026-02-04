"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, Filter, Check, MessageSquare, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import type { MatchResponse, Project } from "@/lib/supabase/types";

const statusColors = {
  pending: "bg-warning/10 text-warning",
  applied: "bg-info/10 text-info",
  accepted: "bg-success/10 text-success",
  declined: "bg-muted text-muted-foreground",
};

const statusLabels = {
  pending: "Pending",
  applied: "Applied",
  accepted: "Accepted",
  declined: "Declined",
};

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return "just now";
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  } else {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} ${days === 1 ? "day" : "days"} ago`;
  }
}

export default function MatchesPage() {
  const router = useRouter();
  const [matches, setMatches] = useState<MatchResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applyingMatchId, setApplyingMatchId] = useState<string | null>(null);

  const fetchMatches = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch("/api/matches/for-me");

      if (!response.ok) {
        if (response.status === 401) {
          router.replace("/login");
          return;
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to fetch matches");
      }

      const data = await response.json();

      // Handle API-level errors (returned with 200 status)
      if (data.error && (!data.matches || data.matches.length === 0)) {
        setError(data.error);
        setMatches([]);
        return;
      }

      setMatches(data.matches || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load matches");
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  const handleApply = async (matchId: string) => {
    try {
      setApplyingMatchId(matchId);
      const response = await fetch(`/api/matches/${matchId}/apply`, {
        method: "PATCH",
      });

      if (!response.ok) {
        throw new Error("Failed to apply");
      }

      // Refresh matches
      await fetchMatches();
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
            Projects that match your skills and interests
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
                    ? "Complete Your Profile"
                    : "Unable to Find Matches"}
                </h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  {error}
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
          Projects that match your skills and interests
        </p>
      </div>

      {/* Search and filter */}
      <div className="flex gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search matches..."
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="icon">
          <Filter className="h-4 w-4" />
          <span className="sr-only">Filter</span>
        </Button>
      </div>

      {/* Matches list */}
      {matches.length === 0 ? (
        <EmptyState
          title="No matches yet"
          description="Complete your profile to start seeing project matches that align with your skills and interests."
          action={{
            label: "Complete Profile",
            href: "/profile",
          }}
        />
      ) : (
        <div className="space-y-4">
          {matches.map((match) => {
            const project = match.project as Project;
            const matchScore = Math.round(match.score * 100);
            const matchedAt = formatTimeAgo(match.created_at);

            return (
              <Card key={match.id}>
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <CardTitle className="text-xl">
                          <Link
                            href={`/matches/${match.id}`}
                            className="hover:underline"
                          >
                            {project.title}
                          </Link>
                        </CardTitle>
                        <span className="rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success">
                          {matchScore}% match
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            statusColors[
                              match.status as keyof typeof statusColors
                            ]
                          }`}
                        >
                          {
                            statusLabels[
                              match.status as keyof typeof statusLabels
                            ]
                          }
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Matched {matchedAt}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Why you matched */}
                  {match.explanation && (
                    <div className="rounded-lg border border-border bg-muted/30 p-4">
                      <p className="text-sm font-medium text-muted-foreground mb-2">
                        Why you matched
                      </p>
                      <p className="text-sm">{match.explanation}</p>
                    </div>
                  )}

                  {/* Project description */}
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {project.description}
                  </p>

                  {/* Skills */}
                  {project.required_skills &&
                    project.required_skills.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {project.required_skills.slice(0, 5).map((skill) => (
                          <span
                            key={skill}
                            className="rounded-md border border-border bg-muted/50 px-2.5 py-0.5 text-xs font-medium"
                          >
                            {skill}
                          </span>
                        ))}
                        {project.required_skills.length > 5 && (
                          <span className="rounded-md border border-border bg-muted/50 px-2.5 py-0.5 text-xs font-medium">
                            +{project.required_skills.length - 5}
                          </span>
                        )}
                      </div>
                    )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    {match.status === "pending" && (
                      <>
                        <Button
                          className="flex-1 sm:flex-none"
                          onClick={() => handleApply(match.id)}
                          disabled={applyingMatchId === match.id}
                        >
                          {applyingMatchId === match.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                          Apply
                        </Button>
                      </>
                    )}
                    {match.status === "applied" && (
                      <Button variant="secondary" disabled>
                        Application Sent
                      </Button>
                    )}
                    {match.status === "accepted" && (
                      <Button asChild>
                        <Link href={`/messages?project=${project.id}`}>
                          <MessageSquare className="h-4 w-4" />
                          Message Team
                        </Link>
                      </Button>
                    )}
                    <Button variant="outline" asChild>
                      <Link href={`/matches/${match.id}`}>View Details</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
