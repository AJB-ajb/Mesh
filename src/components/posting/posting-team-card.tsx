"use client";

import { Users } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getInitials } from "@/lib/format";
import type { Application } from "@/lib/hooks/use-posting-detail";

type PostingTeamCardProps = {
  applications: Application[];
  creatorName: string | null;
  teamSizeMin: number;
  teamSizeMax: number;
};

export function PostingTeamCard({
  applications,
  creatorName,
  teamSizeMin,
  teamSizeMax,
}: PostingTeamCardProps) {
  const accepted = applications.filter((a) => a.status === "accepted");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Team Members
          <Badge variant="secondary" className="ml-auto">
            {accepted.length + 1} / min {teamSizeMin} (max {teamSizeMax})
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Creator */}
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
              {getInitials(creatorName)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">
                {creatorName || "Unknown"}
              </p>
              <p className="text-xs text-muted-foreground">Owner</p>
            </div>
          </div>

          {/* Accepted members */}
          {accepted.map((app) => (
            <div key={app.id} className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-sm font-medium">
                {getInitials(app.profiles?.full_name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">
                  {app.profiles?.full_name || "Unknown"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Joined {new Date(app.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}

          {accepted.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No members have joined yet.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
