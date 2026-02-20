"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { labels } from "@/lib/labels";

type AccountInfoCardProps = {
  userEmail: string | null;
  persona: string | null;
};

export function AccountInfoCard({ userEmail, persona }: AccountInfoCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{labels.settings.accountTitle}</CardTitle>
        <CardDescription>{labels.settings.accountDescription}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground">
            {labels.common.emailLabel}
          </p>
          <p className="font-medium">{userEmail}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">
            {labels.settings.accountTypeLabel}
          </p>
          <p className="font-medium capitalize">
            {persona ? persona.replace("_", " ") : labels.common.member}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
