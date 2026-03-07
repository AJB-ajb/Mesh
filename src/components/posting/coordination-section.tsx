"use client";

import { Card, CardContent } from "@/components/ui/card";
import { labels } from "@/lib/labels";
import { useChildPostings } from "@/lib/hooks/use-child-postings";
import { ChildPostingCard } from "./child-posting-card";

export function CoordinationSection({
  parentPostingId,
}: {
  parentPostingId: string;
}) {
  const { childPostings, isLoading } = useChildPostings(parentPostingId);

  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="text-sm font-semibold">
            {labels.coordination.sectionTitle}
          </h3>
          {childPostings.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {childPostings.length}
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="px-4 py-6 text-center text-sm text-muted-foreground">
            {labels.common.loading}
          </div>
        ) : childPostings.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-muted-foreground">
            {labels.coordination.emptyState}
          </div>
        ) : (
          <div>
            {childPostings.map((child) => (
              <ChildPostingCard key={child.id} posting={child} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
