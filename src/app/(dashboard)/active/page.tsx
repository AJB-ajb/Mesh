"use client";

import { Loader2, Zap } from "lucide-react";

import { labels } from "@/lib/labels";
import { EmptyState } from "@/components/ui/empty-state";
import { useActivePostings } from "@/lib/hooks/use-active-postings";
import { ActivePostingCard } from "@/components/posting/active-posting-card";

export default function ActivePage() {
  const { postings, isLoading } = useActivePostings();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {labels.active.title}
        </h1>
        <p className="mt-1 text-muted-foreground">{labels.active.subtitle}</p>
      </div>

      {isLoading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : postings.length === 0 ? (
        <EmptyState
          icon={<Zap />}
          title={labels.active.empty}
          description={labels.active.emptyDescription}
          action={{ label: labels.active.discoverCta, href: "/discover" }}
        />
      ) : (
        <div className="space-y-4">
          {postings.map((posting) => (
            <ActivePostingCard key={posting.id} posting={posting} />
          ))}
        </div>
      )}
    </div>
  );
}
