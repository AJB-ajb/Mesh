"use client";

import { useMemo, useState } from "react";
import { Plus, MessageSquare, Loader2, Search, X } from "lucide-react";

import { labels } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { useSpaceList } from "@/lib/hooks/use-space-list";
import { SpaceList } from "@/components/spaces/space-list";
import { FilterChips } from "@/components/spaces/filter-chips";
import { NewSpaceDialog } from "@/components/spaces/new-space-dialog";

export type SpaceFilter = "all" | "dms" | "groups" | "public" | "pinned";

export default function SpacesPage() {
  const { spaces, userId, isLoading } = useSpaceList();
  const [filter, setFilter] = useState<SpaceFilter>("all");
  const [search, setSearch] = useState("");
  const [showNewSpace, setShowNewSpace] = useState(false);

  const filteredSpaces = useMemo(() => {
    let result = spaces;

    // Text search by name
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((s) => s.name?.toLowerCase().includes(q));
    }

    // Category filter
    if (filter !== "all") {
      result = result.filter((space) => {
        if (filter === "dms") return space.type === "dm";
        if (filter === "groups")
          return space.type === "small" || space.type === "large";
        if (filter === "public")
          return space.type === "large" || space.is_global;
        if (filter === "pinned") return space.space_members?.[0]?.pinned;
        return true;
      });
    }

    return result;
  }, [spaces, filter, search]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">
          {labels.nav.spaces}
        </h1>
        <Button size="sm" onClick={() => setShowNewSpace(true)}>
          <Plus className="size-4" />
          <span className="hidden sm:inline">{labels.nav.newSpace}</span>
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder={labels.spaces.searchSpaces}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 pr-9"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* Filter chips */}
      <FilterChips value={filter} onChange={setFilter} />

      {/* Space list */}
      {isLoading ? (
        <div className="flex min-h-[200px] items-center justify-center">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredSpaces.length === 0 ? (
        <EmptyState
          icon={<MessageSquare />}
          title={labels.spaces.emptyTitle}
          description={labels.spaces.emptyHint}
        />
      ) : (
        <SpaceList spaces={filteredSpaces} currentUserId={userId} />
      )}

      <NewSpaceDialog open={showNewSpace} onOpenChange={setShowNewSpace} />
    </div>
  );
}
