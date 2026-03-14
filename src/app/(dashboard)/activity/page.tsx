"use client";

import { Bell, Loader2 } from "lucide-react";

import { labels } from "@/lib/labels";
import { Badge } from "@/components/ui/badge";
import { Stack } from "@/components/ui/stack";
import { Group } from "@/components/ui/group";
import { EmptyState } from "@/components/ui/empty-state";
import { useActivityFeed } from "@/lib/hooks/use-activity-feed";
import { ActivityFeed } from "@/components/activity/activity-feed";

export default function ActivityPage() {
  const { cards, pendingCount, isLoading, actOnCard } = useActivityFeed();

  return (
    <Stack gap="md">
      {/* Header */}
      <Group gap="sm">
        <h1 className="text-2xl font-bold tracking-tight">
          {labels.activity.title}
        </h1>
        {pendingCount > 0 && (
          <Badge variant="secondary">
            {labels.activity.pendingCount(pendingCount)}
          </Badge>
        )}
      </Group>

      {/* Activity feed */}
      {isLoading ? (
        <div className="flex min-h-[200px] items-center justify-center">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : cards.length === 0 ? (
        <EmptyState
          icon={<Bell />}
          title={labels.activity.emptyTitle}
          description={labels.activity.emptyHint}
        />
      ) : (
        <ActivityFeed cards={cards} onAction={actOnCard} />
      )}
    </Stack>
  );
}
