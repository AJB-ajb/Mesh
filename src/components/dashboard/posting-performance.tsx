import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export type PostingMetric = {
  id: string;
  title: string;
  status: string;
  applicants: number;
  matches: number;
  views: number;
};

export function PostingPerformance({
  metrics,
}: {
  metrics: PostingMetric[];
}) {
  return (
    <div data-testid="posting-performance" className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Posting performance</h2>
          <p className="text-sm text-muted-foreground">
            Track your postings and their engagement metrics.
          </p>
        </div>
        <Button asChild>
          <Link href="/postings/new">
            <Plus className="h-4 w-4" />
            Add posting
          </Link>
        </Button>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {metrics.length > 0 ? (
          metrics.map((posting) => (
            <Card key={posting.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{posting.title}</CardTitle>
                  <Badge variant="outline">{posting.status}</Badge>
                </div>
                <CardDescription>
                  Track applicants, matches, and views for this posting.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Applicants</p>
                  <p className="text-lg font-semibold">
                    {posting.applicants}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Matches</p>
                  <p className="text-lg font-semibold">{posting.matches}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Views</p>
                  <p className="text-lg font-semibold">{posting.views}</p>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="flex min-h-[200px] flex-col items-center justify-center py-12">
              <p className="text-muted-foreground">
                You haven&apos;t created any postings yet. Create your first
                posting to see metrics here!
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
