import Link from "next/link";
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
import { formatTimeAgo } from "@/lib/format";
import { labels } from "@/lib/labels";
import type { MyInterest } from "@/lib/hooks/use-interests";

export interface InterestSentCardProps {
  interest: MyInterest;
}

export function InterestSentCard({ interest }: InterestSentCardProps) {
  const posting = interest.postings;
  const creatorName = posting?.profiles?.full_name || "Unknown";

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <CardTitle className="text-xl">
                <Link
                  href={`/postings/${posting?.id}`}
                  className="hover:underline cursor-pointer"
                >
                  {posting?.title}
                </Link>
              </CardTitle>
              {posting?.category && (
                <Badge variant="secondary">{posting.category}</Badge>
              )}
              <Badge variant="outline" className="text-xs">
                {labels.joinRequest.action.requested}
              </Badge>
            </div>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            {posting && (
              <Button variant="outline" asChild>
                <Link href={`/postings/${posting.id}`}>View Details</Link>
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {posting?.description && (
          <CardDescription className="text-sm line-clamp-2">
            {posting.description}
          </CardDescription>
        )}

        {posting?.skills && posting.skills.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {posting.skills.slice(0, 5).map((skill) => (
              <Badge key={skill} variant="secondary">
                {skill}
              </Badge>
            ))}
            {posting.skills.length > 5 && (
              <Badge variant="outline">+{posting.skills.length - 5}</Badge>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 border-t border-border pt-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium">
            {getInitials(creatorName)}
          </div>
          <span className="text-sm text-muted-foreground">
            Posted by{" "}
            <Link
              href={`/profile/${posting?.profiles?.user_id}`}
              className="hover:underline text-foreground"
            >
              {creatorName}
            </Link>{" "}
            • Requested {formatTimeAgo(interest.created_at)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
