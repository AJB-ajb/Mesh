import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MyInterest } from "@/lib/hooks/use-interests";

const statusColors = {
  interested: "bg-pink-500/10 text-pink-600",
};

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return "just now";
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  } else {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} ${days === 1 ? "day" : "days"} ago`;
  }
}

export interface InterestSentCardProps {
  interest: MyInterest;
}

export function InterestSentCard({ interest }: InterestSentCardProps) {
  const posting = interest.postings;

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <CardTitle className="text-lg">
                <Link
                  href={`/postings/${posting?.id}`}
                  className="hover:underline"
                >
                  {posting?.title}
                </Link>
              </CardTitle>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors.interested}`}
              >
                Interested
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Expressed interest {formatTimeAgo(interest.created_at)}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {posting?.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {posting.description}
          </p>
        )}

        {posting?.skills && posting.skills.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {posting.skills.slice(0, 5).map((skill) => (
              <span
                key={skill}
                className="rounded-md border border-border bg-muted/50 px-2.5 py-0.5 text-xs font-medium"
              >
                {skill}
              </span>
            ))}
            {posting.skills.length > 5 && (
              <span className="rounded-md border border-border bg-muted/50 px-2.5 py-0.5 text-xs font-medium">
                +{posting.skills.length - 5}
              </span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {posting && (
            <Button variant="outline" asChild>
              <Link href={`/postings/${posting.id}`}>View Details</Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
