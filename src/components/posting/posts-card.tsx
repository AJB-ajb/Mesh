"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Users, MessageSquare, Pencil } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MarkdownRenderer } from "@/components/shared/markdown-renderer";
import { labels } from "@/lib/labels";
import { formatDateAgo, stripTitleMarkdown } from "@/lib/format";
import type { PostsCardData } from "@/lib/hooks/use-posts-page";

function getStatusColor(status: string) {
  switch (status) {
    case "open":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    case "filled":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
    case "closed":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-muted text-muted-foreground";
  }
}

type PostsCardProps = {
  item: PostsCardData;
};

export function PostsCard({ item }: PostsCardProps) {
  const router = useRouter();
  const roleLabel =
    item.role === "owner" ? labels.active.youCreated : labels.active.youJoined;

  return (
    <Link href={item.href} className="block min-w-0">
      <Card className="overflow-hidden transition-colors hover:bg-muted/50">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3
                  className="font-semibold truncate"
                  title={stripTitleMarkdown(item.title)}
                >
                  {stripTitleMarkdown(item.title)}
                </h3>
                <Badge
                  variant="secondary"
                  className={getStatusColor(item.status)}
                >
                  {item.status}
                </Badge>
              </div>
              <MarkdownRenderer
                content={item.description ?? ""}
                clamp={2}
                className="mt-1 text-muted-foreground"
              />
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <Badge variant="outline" className="text-xs">
                {roleLabel}
              </Badge>
              {item.role === "owner" && (
                <button
                  type="button"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  aria-label="Edit"
                  onClick={(e) => {
                    e.preventDefault();
                    router.push(`/postings/${item.id}?tab=edit`);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {item.teamSizeMin}–{item.teamSizeMax}
            </span>
            {item.category && (
              <Badge variant="outline" className="text-xs capitalize">
                {item.category}
              </Badge>
            )}
            <span className="text-xs">{formatDateAgo(item.createdAt)}</span>
            {item.role === "joined" &&
              item.unreadCount != null &&
              item.unreadCount > 0 && (
                <span className="flex items-center gap-1 text-xs text-primary font-medium">
                  <MessageSquare className="h-3.5 w-3.5" />
                  {labels.active.unreadMessages(item.unreadCount)}
                </span>
              )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
