import Link from "next/link";
import { FolderKanban, Users, TrendingUp, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { labels } from "@/lib/labels";

export function QuickActions() {
  return (
    <Card data-testid="quick-actions">
      <CardHeader>
        <CardTitle>{labels.quickActions.title}</CardTitle>
        <CardDescription>{labels.quickActions.subtitle}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Button
          variant="outline"
          className="justify-start gap-3 h-auto py-4"
          asChild
        >
          <Link href="/postings/new">
            <FolderKanban className="h-5 w-5" />
            <div className="text-left">
              <div className="font-medium">
                {labels.quickActions.createPosting}
              </div>
              <div className="text-xs text-muted-foreground">
                {labels.quickActions.createPostingDescription}
              </div>
            </div>
            <ArrowRight className="ml-auto h-4 w-4" />
          </Link>
        </Button>
        <Button
          variant="outline"
          className="justify-start gap-3 h-auto py-4"
          asChild
        >
          <Link href="/discover">
            <Users className="h-5 w-5" />
            <div className="text-left">
              <div className="font-medium">
                {labels.quickActions.reviewMatches}
              </div>
              <div className="text-xs text-muted-foreground">
                {labels.quickActions.reviewMatchesDescription}
              </div>
            </div>
            <ArrowRight className="ml-auto h-4 w-4" />
          </Link>
        </Button>
        <Button
          variant="outline"
          className="justify-start gap-3 h-auto py-4"
          asChild
        >
          <Link href="/my-postings">
            <TrendingUp className="h-5 w-5" />
            <div className="text-left">
              <div className="font-medium">
                {labels.quickActions.browsePostings}
              </div>
              <div className="text-xs text-muted-foreground">
                {labels.quickActions.browsePostingsDescription}
              </div>
            </div>
            <ArrowRight className="ml-auto h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
