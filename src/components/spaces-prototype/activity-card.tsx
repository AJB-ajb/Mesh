"use client";

import { useState } from "react";
import {
  Sparkles,
  UserPlus,
  Calendar,
  Users,
  CalendarCheck,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ActivityItem, ActivityItemType } from "./mock-data";

const typeIcons: Record<ActivityItemType, typeof Sparkles> = {
  match: Sparkles,
  invite: UserPlus,
  scheduling: Calendar,
  connection: Users,
  rsvp: CalendarCheck,
};

const typeColors: Record<ActivityItemType, string> = {
  match: "text-green-600 dark:text-green-400",
  invite: "text-blue-600 dark:text-blue-400",
  scheduling: "text-amber-600 dark:text-amber-400",
  connection: "text-purple-600 dark:text-purple-400",
  rsvp: "text-primary",
};

type ActivityCardProps = {
  item: ActivityItem;
};

export function ActivityCard({ item }: ActivityCardProps) {
  const [acted, setActed] = useState(false);
  const Icon = typeIcons[item.type];

  if (acted) {
    return (
      <Card className="opacity-60 transition-opacity">
        <CardContent className="p-3 text-center text-sm text-muted-foreground">
          Done
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="p-4 space-y-2">
        {/* Type + time */}
        <div className="flex items-center gap-2">
          <Icon className={cn("size-4", typeColors[item.type])} />
          <span className="text-xs text-muted-foreground capitalize">
            {item.type}
          </span>
          {item.score != null && (
            <Badge
              variant="default"
              className="ml-auto bg-green-500 hover:bg-green-600 text-xs"
            >
              <Sparkles className="size-3 mr-0.5" />
              {item.score}%
            </Badge>
          )}
          <span className="text-xs text-muted-foreground ml-auto">
            {item.time}
          </span>
        </div>

        {/* Title */}
        <h3 className="font-semibold text-sm">{item.title}</h3>

        {/* Subtitle */}
        <p className="text-sm text-muted-foreground">{item.subtitle}</p>

        {/* Detail */}
        {item.detail && (
          <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-2">
            {item.detail}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          {item.actions.map((action) => (
            <Button
              key={action.label}
              variant={action.variant}
              size="sm"
              className="flex-1 min-h-[44px]"
              onClick={() => setActed(true)}
            >
              {action.label}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
