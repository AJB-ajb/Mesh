import { FolderKanban, Users, MessageSquare, TrendingUp } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { formatDate, getInitials } from "@/lib/format";
import type { StatItem } from "@/components/dashboard/stats-overview";
import type { RecommendedPosting } from "@/components/dashboard/recommended-postings";
import type { PostingMetric } from "@/components/dashboard/posting-performance";

export async function fetchOwnerStats(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<StatItem[]> {
  const { count: livePostingsCount } = await supabase
    .from("postings")
    .select("*", { count: "exact", head: true })
    .eq("creator_id", userId)
    .eq("status", "open");

  const { data: userPostings } = await supabase
    .from("postings")
    .select("id")
    .eq("creator_id", userId);

  const postingIds = userPostings?.map((p) => p.id) || [];

  const { count: applicationsCount } =
    postingIds.length > 0
      ? await supabase
          .from("applications")
          .select("*", { count: "exact", head: true })
          .in("posting_id", postingIds)
          .eq("status", "pending")
      : { count: 0 };

  const { count: matchesCount } =
    postingIds.length > 0
      ? await supabase
          .from("matches")
          .select("*", { count: "exact", head: true })
          .in("posting_id", postingIds)
          .eq("status", "pending")
      : { count: 0 };

  const applicantsCount = (applicationsCount || 0) + (matchesCount || 0);

  const { count: conversationsCount } = await supabase
    .from("conversations")
    .select("*", { count: "exact", head: true })
    .or(`participant_1.eq.${userId},participant_2.eq.${userId}`);

  const { data: userConversations } = await supabase
    .from("conversations")
    .select("id")
    .or(`participant_1.eq.${userId},participant_2.eq.${userId}`);

  const conversationIds = userConversations?.map((c) => c.id) || [];

  const { count: unreadMessagesCount } =
    conversationIds.length > 0
      ? await supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .in("conversation_id", conversationIds)
          .eq("read", false)
          .neq("sender_id", userId)
      : { count: 0 };

  const { data: matchesData } =
    postingIds.length > 0
      ? await supabase
          .from("matches")
          .select("similarity_score")
          .in("posting_id", postingIds)
      : { data: null };

  const avgMatchQuality =
    matchesData && matchesData.length > 0
      ? Math.round(
          (matchesData.reduce((sum, m) => sum + m.similarity_score, 0) /
            matchesData.length) *
            100,
        )
      : 0;

  return [
    {
      title: "Live Postings",
      value: String(livePostingsCount || 0),
      description: "Postings currently open",
      icon: FolderKanban,
      href: "/postings",
    },
    {
      title: "New Applicants",
      value: String(applicantsCount || 0),
      description: "Applications + matches pending",
      icon: Users,
      href: "/matches",
    },
    {
      title: "Conversations",
      value: String(conversationsCount || 0),
      description: `${unreadMessagesCount || 0} unread messages`,
      icon: MessageSquare,
      href: "/inbox",
    },
    {
      title: "Match Quality",
      value: `${avgMatchQuality}%`,
      description: "Average match strength",
      icon: TrendingUp,
      href: "/matches",
    },
  ];
}

export async function fetchRecommendedPostings(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<RecommendedPosting[]> {
  const { data: topMatches } = await supabase
    .from("matches")
    .select(
      `
      postings:posting_id (
        id,
        title,
        description,
        skills,
        team_size_min,
        team_size_max,
        estimated_time,
        category,
        tags,
        mode,
        context_identifier,
        created_at,
        expires_at,
        profiles:creator_id (
          full_name,
          user_id
        ),
        posting_skills(skill_nodes(name))
      ),
      similarity_score
    `,
    )
    .eq("user_id", userId)
    .eq("status", "pending")
    .order("similarity_score", { ascending: false })
    .limit(2);

  if (!topMatches) return [];

  return topMatches
    .map((match: unknown) => {
      const m = match as Record<string, unknown>;
      const posting = m.postings as Record<string, unknown> | null;
      if (!posting) return null;

      const profiles = posting.profiles as Record<string, unknown> | null;
      // Derive skills from join table
      const joinSkills = (
        posting.posting_skills as
          | { skill_nodes: { name: string } | null }[]
          | null
      )
        ?.map((ps) => ps.skill_nodes?.name)
        .filter((n): n is string => !!n);
      return {
        id: posting.id,
        title: posting.title,
        description: posting.description,
        skills:
          joinSkills && joinSkills.length > 0
            ? joinSkills
            : (posting.skills as string[]) || [],
        teamSize: `${posting.team_size_min}-${posting.team_size_max} people`,
        estimatedTime: (posting.estimated_time as string) || "",
        category: (posting.category as string) || "",
        matchScore: Math.round((m.similarity_score as number) * 100),
        creator: {
          name: (profiles?.full_name as string) || "Unknown",
          initials: getInitials((profiles?.full_name as string) || null),
        },
        expiresAt: (posting.expires_at as string) || null,
        tags: (posting.tags as string[]) || [],
        mode: (posting.mode as string) || "open",
        contextIdentifier: (posting.context_identifier as string) || undefined,
        createdAt: formatDate(posting.created_at as string),
      };
    })
    .filter(Boolean) as RecommendedPosting[];
}

export async function fetchOwnerPostingMetrics(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<PostingMetric[]> {
  const { data: userPostings } = await supabase
    .from("postings")
    .select("id, title, status")
    .eq("creator_id", userId)
    .eq("status", "open")
    .limit(2);

  if (!userPostings) return [];

  const postingIds = userPostings.map((p) => p.id);

  const { data: matchesData } =
    postingIds.length > 0
      ? await supabase
          .from("matches")
          .select("posting_id, status")
          .in("posting_id", postingIds)
      : { data: null };

  return userPostings.map(
    (posting: { id: string; title: string; status: string }) => {
      const postingMatches =
        matchesData?.filter((m) => m.posting_id === posting.id) || [];
      const applicants = postingMatches.filter(
        (m) => m.status === "pending",
      ).length;
      const totalMatches = postingMatches.length;

      return {
        id: posting.id,
        title: posting.title,
        status: posting.status,
        applicants,
        matches: totalMatches,
        views: 0,
      };
    },
  );
}

export const defaultStats: StatItem[] = [
  {
    title: "Active Postings",
    value: "0",
    description: "Postings you're involved in",
    icon: FolderKanban,
    href: "/postings",
  },
  {
    title: "New Matches",
    value: "0",
    description: "Postings waiting for your review",
    icon: Users,
    href: "/matches",
  },
  {
    title: "Messages",
    value: "0",
    description: "Total conversations",
    icon: MessageSquare,
    href: "/inbox",
  },
  {
    title: "Match Rate",
    value: "0%",
    description: "Average compatibility",
    icon: TrendingUp,
    href: "/matches",
  },
];
