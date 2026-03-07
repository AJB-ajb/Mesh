"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Plus, Loader2, FolderKanban } from "lucide-react";

import { labels } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { UnifiedPostingCard } from "@/components/posting";
import { usePostsPage, type PostsPageFilter } from "@/lib/hooks/use-posts-page";

const FILTERS: PostsPageFilter[] = [
  "all",
  "created",
  "joined",
  "applied",
  "invited",
  "completed",
];

function PostsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialFilter =
    (searchParams.get("filter") as PostsPageFilter | null) ?? "all";

  const { posts, isLoading, activeFilter, setActiveFilter } = usePostsPage();

  // Sync URL param on first render
  if (initialFilter !== "all" && activeFilter === "all") {
    setActiveFilter(initialFilter);
  }

  const handleFilterChange = (filter: PostsPageFilter) => {
    setActiveFilter(filter);
    const params = new URLSearchParams(searchParams.toString());
    if (filter === "all") {
      params.delete("filter");
    } else {
      params.set("filter", filter);
    }
    const qs = params.toString();
    router.replace(`/posts${qs ? `?${qs}` : ""}`, { scroll: false });
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            {labels.posts.title}
          </h1>
          <p className="mt-1 hidden md:block text-muted-foreground">
            {labels.posts.subtitle}
          </p>
        </div>
        <Button asChild className="hidden md:inline-flex">
          <Link href="/postings/new">
            <Plus className="h-4 w-4" />
            {labels.posts.newPosting}
          </Link>
        </Button>
      </div>

      {/* Filter chips */}
      <div className="flex gap-3 overflow-x-auto scrollbar-hide">
        {FILTERS.map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => handleFilterChange(filter)}
            className={cn(
              "inline-flex items-center whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors",
              activeFilter === filter
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80",
            )}
          >
            {labels.posts.filters[filter]}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex min-h-[200px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : posts.length === 0 ? (
        <EmptyState
          icon={<FolderKanban />}
          title={labels.posts.empty[activeFilter]}
          description={labels.posts.emptyDescription[activeFilter]}
          action={
            activeFilter === "all"
              ? {
                  label: labels.posts.discoverCta,
                  href: "/discover",
                }
              : undefined
          }
        />
      ) : (
        <div className="grid gap-4">
          {posts.map((item) => (
            <UnifiedPostingCard
              key={item.id}
              variant="compact"
              id={item.id}
              title={item.title}
              description={item.description}
              status={item.status}
              category={item.category}
              createdAt={item.createdAt}
              creatorId={item.creatorId}
              teamSizeMin={item.teamSizeMin}
              teamSizeMax={item.teamSizeMax}
              role={item.role}
              unreadCount={item.unreadCount}
              href={item.href}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function PostsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[200px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <PostsContent />
    </Suspense>
  );
}
