import { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import {
  StatsOverview,
  type StatItem,
} from "@/components/dashboard/stats-overview";
import { QuickActions } from "@/components/dashboard/quick-actions";
import {
  RecommendedPostings,
  type RecommendedPosting,
} from "@/components/dashboard/recommended-postings";
import {
  PostingPerformance,
  type PostingMetric,
} from "@/components/dashboard/posting-performance";
import { RecentActivityList } from "@/components/dashboard/recent-activity-list";
import {
  fetchOwnerStats,
  fetchRecommendedPostings,
  fetchOwnerPostingMetrics,
  defaultStats,
} from "@/components/dashboard/dashboard-data";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let stats: StatItem[] = defaultStats;
  let recommendedPostings: RecommendedPosting[] = [];
  let ownerPostingMetrics: PostingMetric[] = [];

  if (user) {
    [stats, recommendedPostings, ownerPostingMetrics] = await Promise.all([
      fetchOwnerStats(supabase, user.id),
      fetchRecommendedPostings(supabase, user.id),
      fetchOwnerPostingMetrics(supabase, user.id),
    ]);
  }

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-muted-foreground">
            Welcome back! Here&apos;s what&apos;s happening with your postings.
          </p>
        </div>
        <Button asChild>
          <Link href="/postings/new">
            <Plus className="h-4 w-4" />
            New Posting
          </Link>
        </Button>
      </div>

      <StatsOverview stats={stats} />
      <QuickActions />

      <RecommendedPostings postings={recommendedPostings} />
      {ownerPostingMetrics.length > 0 && (
        <PostingPerformance metrics={ownerPostingMetrics} />
      )}

      {/* Recent activity */}
      <Card data-testid="recent-activity">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Your latest matches, join requests, and messages
          </CardDescription>
        </CardHeader>
        <CardContent>
          {user ? (
            <RecentActivityList supabase={supabase} userId={user.id} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Sign in to see your recent activity
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
