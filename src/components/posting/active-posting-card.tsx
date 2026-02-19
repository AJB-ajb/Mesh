"use client";

import Link from "next/link";
import { Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { labels } from "@/lib/labels";
import type { ActivePosting } from "@/lib/hooks/use-active-postings";

type ActivePostingCardProps = {
  posting: ActivePosting;
};

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

export function ActivePostingCard({ posting }: ActivePostingCardProps) {
  const roleLabel =
    posting.role === "created"
      ? labels.active.youCreated
      : labels.active.youJoined;

  return (
    <Card className="transition-colors hover:bg-muted/50">
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold truncate">
              <Link
                href={`/postings/${posting.id}?tab=activity`}
                className="hover:underline"
              >
                {posting.title}
              </Link>
            </h3>
            <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
              {posting.description}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <Badge variant="outline" className="text-xs">
              {roleLabel}
            </Badge>
            <Badge
              variant="secondary"
              className={getStatusColor(posting.status)}
            >
              {posting.status}
            </Badge>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {posting.acceptedCount} / min {posting.team_size_min} (max{" "}
              {posting.team_size_max})
            </span>
            <Badge variant="outline" className="text-xs capitalize">
              {posting.category}
            </Badge>
            <span className="text-xs">
              {new Date(posting.created_at).toLocaleDateString()}
            </span>
          </div>

          {/* Navigation links */}
          <div className="flex gap-3 text-sm">
            {posting.role === "created" && (
              <>
                <Link
                  href={`/postings/${posting.id}?tab=edit`}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {labels.postingDetail.tabs.edit}
                </Link>
                <Link
                  href={`/postings/${posting.id}?tab=manage`}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {labels.postingDetail.tabs.manage}
                </Link>
              </>
            )}
            <Link
              href={`/postings/${posting.id}?tab=activity`}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {labels.postingDetail.tabs.activity}
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
