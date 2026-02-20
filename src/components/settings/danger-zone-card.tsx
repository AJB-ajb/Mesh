"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { labels } from "@/lib/labels";

type DangerZoneCardProps = {
  onSignOut: () => void;
};

export function DangerZoneCard({ onSignOut }: DangerZoneCardProps) {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{labels.settings.profileTitle}</CardTitle>
          <CardDescription>
            {labels.settings.profileDescription}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" asChild>
            <Link href="/profile">{labels.common.goToProfile}</Link>
          </Button>
        </CardContent>
      </Card>

      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">
            {labels.settings.dangerZoneTitle}
          </CardTitle>
          <CardDescription>
            {labels.settings.dangerZoneDescription}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{labels.common.signOut}</p>
              <p className="text-sm text-muted-foreground">
                {labels.settings.signOutDescription}
              </p>
            </div>
            <Button variant="destructive" onClick={onSignOut}>
              {labels.common.signOut}
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
