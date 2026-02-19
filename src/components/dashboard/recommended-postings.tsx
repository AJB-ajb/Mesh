import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PostingCard } from "@/components/posting/posting-card";

export type RecommendedPosting = {
  id: string;
  title: string;
  description: string;
  skills: string[];
  teamSize: string;
  estimatedTime: string;
  category: string;
  matchScore: number;
  expiresAt?: string | null;
  tags?: string[];
  mode?: string;
  contextIdentifier?: string;
  creator: { name: string; initials: string };
  createdAt: string;
};

export function RecommendedPostings({
  postings,
}: {
  postings: RecommendedPosting[];
}) {
  return (
    <div data-testid="recommended-postings" className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Recommended postings</h2>
          <p className="text-sm text-muted-foreground">
            Postings that match your profile and preferences.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/my-postings">Browse all postings</Link>
        </Button>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {postings.length > 0 ? (
          postings.map((posting) => (
            <PostingCard key={posting.id} {...posting} />
          ))
        ) : (
          <Card>
            <CardContent className="p-0">
              <EmptyState
                title="No recommendations yet"
                description="Complete your profile to get personalized posting recommendations."
                className="min-h-[200px]"
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
