import Link from "next/link";
import { FolderKanban, Users, MessageSquare, TrendingUp } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { formatTimeAgo } from "@/lib/format";

type Activity = {
  type: "match" | "application" | "message" | "posting";
  title: string;
  description: string;
  time: string;
  href: string;
};

type RecentActivityListProps = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
};

export async function RecentActivityList({
  supabase,
  userId,
}: RecentActivityListProps) {
  const activities: Activity[] = [];

  {
    // Get user's postings IDs
    const { data: userPostings } = await supabase
      .from("postings")
      .select("id")
      .eq("creator_id", userId);

    const postingIds = userPostings?.map((p) => p.id) || [];

    if (postingIds.length > 0) {
      // Get recent applications
      const { data: recentApplications } = await supabase
        .from("applications")
        .select(
          `
          id,
          created_at,
          status,
          postings:posting_id (
            id,
            title
          ),
          profiles:applicant_id (
            full_name,
            user_id
          )
        `,
        )
        .in("posting_id", postingIds)
        .order("created_at", { ascending: false })
        .limit(3);

      if (recentApplications) {
        recentApplications.forEach((app: unknown) => {
          const a = app as Record<string, unknown>;
          const profiles = a.profiles as Record<string, unknown> | null;
          const postings = a.postings as Record<string, unknown> | null;
          activities.push({
            type: "application",
            title: `New join request from ${profiles?.full_name || "Someone"}`,
            description: `Requested to join "${postings?.title || "Posting"}"`,
            time: formatTimeAgo(a.created_at as string),
            href: `/postings/${postings?.id}`,
          });
        });
      }

      // Get recent matches (exclude near-zero scores)
      const { data: recentMatches } = await supabase
        .from("matches")
        .select(
          `
          id,
          created_at,
          status,
          postings:posting_id (
            id,
            title
          ),
          profiles:user_id (
            full_name,
            user_id
          )
        `,
        )
        .in("posting_id", postingIds)
        .gt("similarity_score", 0.05)
        .order("created_at", { ascending: false })
        .limit(3);

      if (recentMatches) {
        recentMatches.forEach((match: unknown) => {
          const m = match as Record<string, unknown>;
          const profiles = m.profiles as Record<string, unknown> | null;
          const postings = m.postings as Record<string, unknown> | null;
          activities.push({
            type: "match",
            title: `New match: ${profiles?.full_name || "Developer"}`,
            description: `Matched with "${postings?.title || "Posting"}"`,
            time: formatTimeAgo(m.created_at as string),
            href: `/matches`,
          });
        });
      }
    }
  }

  {
    // Get recent applications by this user
    const { data: recentApplications } = await supabase
      .from("applications")
      .select(
        `
        id,
        created_at,
        status,
        postings:posting_id (
          id,
          title
        )
      `,
      )
      .eq("applicant_id", userId)
      .order("created_at", { ascending: false })
      .limit(3);

    if (recentApplications) {
      recentApplications.forEach((app: unknown) => {
        const a = app as Record<string, unknown>;
        const postings = a.postings as Record<string, unknown> | null;
        activities.push({
          type: "application",
          title: `Requested to join "${postings?.title || "Posting"}"`,
          description: `Status: ${a.status}`,
          time: formatTimeAgo(a.created_at as string),
          href: `/postings/${postings?.id}`,
        });
      });
    }

    // Get recent matches (exclude near-zero scores)
    const { data: recentMatches } = await supabase
      .from("matches")
      .select(
        `
        id,
        created_at,
        status,
        similarity_score,
        postings:posting_id (
          id,
          title
        )
      `,
      )
      .eq("user_id", userId)
      .gt("similarity_score", 0.05)
      .order("created_at", { ascending: false })
      .limit(3);

    if (recentMatches) {
      recentMatches.forEach((match: unknown) => {
        const m = match as Record<string, unknown>;
        const postings = m.postings as Record<string, unknown> | null;
        activities.push({
          type: "match",
          title: `New match: "${postings?.title || "Posting"}"`,
          description: `Match score: ${Math.round(((m.similarity_score as number) || 0) * 100)}%`,
          time: formatTimeAgo(m.created_at as string),
          href: `/matches`,
        });
      });
    }
  }

  // Get recent messages
  const { data: userConversations } = await supabase
    .from("conversations")
    .select("id")
    .or(`participant_1.eq.${userId},participant_2.eq.${userId}`);

  const conversationIds = userConversations?.map((c) => c.id) || [];
  if (conversationIds.length > 0) {
    const { data: recentMessages } = await supabase
      .from("messages")
      .select(
        `
        id,
        content,
        created_at,
        sender_id,
        conversations:conversation_id (
          id
        )
      `,
      )
      .in("conversation_id", conversationIds)
      .order("created_at", { ascending: false })
      .limit(3);

    if (recentMessages) {
      recentMessages.forEach((msg: unknown) => {
        const m = msg as Record<string, unknown>;
        const content = m.content as string;
        const conversations = m.conversations as Record<string, unknown> | null;
        activities.push({
          type: "message",
          title: "New message",
          description:
            content.slice(0, 50) + (content.length > 50 ? "..." : ""),
          time: formatTimeAgo(m.created_at as string),
          href: `/connections?conversation=${conversations?.id}`,
        });
      });
    }
  }

  // Sort by time and limit to 5 most recent
  const sortedActivities = [...activities].sort((a, b) => {
    const timeA = a.time.includes("Just now")
      ? 0
      : a.time.includes("minute")
        ? 1
        : a.time.includes("hour")
          ? 2
          : a.time.includes("day")
            ? 3
            : 4;
    const timeB = b.time.includes("Just now")
      ? 0
      : b.time.includes("minute")
        ? 1
        : b.time.includes("hour")
          ? 2
          : b.time.includes("day")
            ? 3
            : 4;
    return timeA - timeB;
  });
  const recentActivities = sortedActivities.slice(0, 5);

  if (recentActivities.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No recent activity yet. Create a posting or explore matches to get
        started!
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {recentActivities.map((activity, index) => (
        <Link
          key={index}
          href={activity.href}
          className="flex items-start gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
        >
          <div className="mt-0.5">
            {activity.type === "match" && (
              <Users className="h-4 w-4 text-primary" />
            )}
            {activity.type === "application" && (
              <FolderKanban className="h-4 w-4 text-primary" />
            )}
            {activity.type === "message" && (
              <MessageSquare className="h-4 w-4 text-primary" />
            )}
            {activity.type === "posting" && (
              <TrendingUp className="h-4 w-4 text-primary" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{activity.title}</p>
            <p className="text-xs text-muted-foreground">
              {activity.description}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {activity.time}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
