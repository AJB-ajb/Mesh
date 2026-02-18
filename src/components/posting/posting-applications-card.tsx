"use client";

import {
  Users,
  MessageSquare,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getInitials } from "@/lib/format";
import type { Application } from "@/lib/hooks/use-posting-detail";

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return date.toLocaleDateString();
};

type PostingApplicationsCardProps = {
  applications: Application[];
  isUpdatingApplication: string | null;
  onUpdateStatus: (
    applicationId: string,
    newStatus: "accepted" | "rejected",
  ) => void;
  onMessage: (applicantId: string) => void;
};

export function PostingApplicationsCard({
  applications,
  isUpdatingApplication,
  onUpdateStatus,
  onMessage,
}: PostingApplicationsCardProps) {
  const pendingCount = applications.filter(
    (a) => a.status === "pending",
  ).length;
  const waitlistedApps = applications
    .filter((a) => a.status === "waitlisted")
    .sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
  const nonWaitlistedApps = applications.filter(
    (a) => a.status !== "waitlisted",
  );

  return (
    <Card className={pendingCount > 0 ? "border-primary/50 shadow-md" : ""}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full ${pendingCount > 0 ? "bg-primary text-primary-foreground" : "bg-muted"}`}
            >
              <Users className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Join Requests</CardTitle>
              <CardDescription>
                {pendingCount > 0 ? (
                  <span className="text-primary font-medium">
                    {pendingCount} pending review
                  </span>
                ) : (
                  `${applications.length} join request${applications.length !== 1 ? "s" : ""} received`
                )}
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {applications.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 mx-auto text-muted-foreground/50" />
            <p className="mt-4 text-sm text-muted-foreground">
              No join requests yet
            </p>
            <p className="text-xs text-muted-foreground">
              Share your posting to attract collaborators!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {nonWaitlistedApps.map((application) => (
              <div
                key={application.id}
                className={`rounded-lg border p-4 transition-colors ${
                  application.status === "pending"
                    ? "border-primary/30 bg-primary/5"
                    : "border-border"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-sm font-medium shrink-0">
                      {getInitials(application.profiles?.full_name || null)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium truncate">
                          {application.profiles?.full_name || "Unknown"}
                        </h4>
                        {application.status === "pending" && (
                          <Badge
                            variant="secondary"
                            className="text-xs shrink-0"
                          >
                            New
                          </Badge>
                        )}
                      </div>
                      {application.profiles?.headline && (
                        <p className="text-sm text-muted-foreground truncate">
                          {application.profiles.headline}
                        </p>
                      )}
                      {application.cover_message && (
                        <div className="mt-2 p-2 rounded bg-muted/50">
                          <p className="text-sm text-muted-foreground italic">
                            &quot;{application.cover_message}&quot;
                          </p>
                        </div>
                      )}
                      <p className="mt-2 text-xs text-muted-foreground">
                        Requested {formatDate(application.created_at)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onMessage(application.applicant_id)}
                    >
                      <MessageSquare className="h-4 w-4" />
                      Message
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    {application.status === "pending" ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-green-500/50 text-green-600 hover:bg-green-50 hover:text-green-700"
                          onClick={() =>
                            onUpdateStatus(application.id, "accepted")
                          }
                          disabled={isUpdatingApplication === application.id}
                        >
                          {isUpdatingApplication === application.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4" />
                              Accept
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-500/50 text-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={() =>
                            onUpdateStatus(application.id, "rejected")
                          }
                          disabled={isUpdatingApplication === application.id}
                        >
                          {isUpdatingApplication === application.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <XCircle className="h-4 w-4" />
                              Decline
                            </>
                          )}
                        </Button>
                      </>
                    ) : (
                      <Badge
                        variant={
                          application.status === "accepted"
                            ? "default"
                            : application.status === "rejected"
                              ? "destructive"
                              : "secondary"
                        }
                        className="capitalize"
                      >
                        {application.status}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {/* Waitlisted section */}
            {waitlistedApps.length > 0 && (
              <>
                <div className="border-t border-border pt-4 mt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <h4 className="text-sm font-medium text-muted-foreground">
                      Waitlisted ({waitlistedApps.length})
                    </h4>
                  </div>
                  <div className="space-y-3">
                    {waitlistedApps.map((application, index) => (
                      <div
                        key={application.id}
                        className="rounded-lg border border-border p-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium shrink-0">
                              #{index + 1}
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-medium text-sm truncate">
                                {application.profiles?.full_name || "Unknown"}
                              </h4>
                              {application.profiles?.headline && (
                                <p className="text-xs text-muted-foreground truncate">
                                  {application.profiles.headline}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                onMessage(application.applicant_id)
                              }
                            >
                              <MessageSquare className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-green-500/50 text-green-600 hover:bg-green-50 hover:text-green-700"
                              onClick={() =>
                                onUpdateStatus(application.id, "accepted")
                              }
                              disabled={
                                isUpdatingApplication === application.id
                              }
                            >
                              {isUpdatingApplication === application.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <>
                                  <CheckCircle className="h-3 w-3" />
                                  Accept
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
