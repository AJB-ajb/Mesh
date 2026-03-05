"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { labels } from "@/lib/labels";

export function DangerZoneCard() {
  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <CardTitle className="text-destructive">
          {labels.settings.dangerZoneTitle}
        </CardTitle>
        <CardDescription>
          {labels.settings.dangerZoneDescription}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          {labels.settings.deleteAccountPlaceholder}
        </p>
      </CardContent>
    </Card>
  );
}
