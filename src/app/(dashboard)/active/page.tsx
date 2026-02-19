"use client";

import { useState, useMemo } from "react";
import { Loader2, Zap } from "lucide-react";

import { labels } from "@/lib/labels";
import { EmptyState } from "@/components/ui/empty-state";
import { useActivePostings } from "@/lib/hooks/use-active-postings";
import { ActivePostingCard } from "@/components/posting/active-posting-card";

type RoleFilter = "all" | "created" | "joined";

const roleFilters: { value: RoleFilter; label: string }[] = [
  { value: "all", label: labels.active.filterAll },
  { value: "created", label: labels.active.filterCreated },
  { value: "joined", label: labels.active.filterJoined },
];

export default function ActivePage() {
  const { postings, isLoading } = useActivePostings();
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");

  const filteredPostings = useMemo(() => {
    if (roleFilter === "all") return postings;
    return postings.filter((p) => p.role === roleFilter);
  }, [postings, roleFilter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {labels.active.title}
        </h1>
        <p className="mt-1 text-muted-foreground">{labels.active.subtitle}</p>
      </div>

      {/* Role filter chips */}
      <div className="flex flex-wrap gap-2">
        {roleFilters.map((filter) => (
          <button
            key={filter.value}
            onClick={() => setRoleFilter(filter.value)}
            className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
              roleFilter === filter.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredPostings.length === 0 ? (
        <EmptyState
          icon={<Zap />}
          title={labels.active.empty}
          description={labels.active.emptyDescription}
          action={{ label: labels.active.discoverCta, href: "/discover" }}
        />
      ) : (
        <div className="space-y-4">
          {filteredPostings.map((posting) => (
            <ActivePostingCard key={posting.id} posting={posting} />
          ))}
        </div>
      )}
    </div>
  );
}
