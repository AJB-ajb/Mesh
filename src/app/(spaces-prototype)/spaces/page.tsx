"use client";

import { useState } from "react";
import { SpaceHeader } from "@/components/spaces-prototype/space-header";
import {
  FilterChips,
  type FilterValue,
} from "@/components/spaces-prototype/filter-chips";
import { SpaceListItem } from "@/components/spaces-prototype/space-list-item";
import { SpaceFab } from "@/components/spaces-prototype/space-fab";
import { SPACES } from "@/components/spaces-prototype/mock-data";

export default function SpacesPage() {
  const [filter, setFilter] = useState<FilterValue>("All");

  const filtered = SPACES.filter((space) => {
    switch (filter) {
      case "DMs":
        return space.type === "dm";
      case "Groups":
        return space.type === "small" || space.type === "large";
      case "Public":
        return space.type === "global" || space.type === "large";
      case "Pinned":
        return space.pinned;
      default:
        return true;
    }
  });

  // Sort: pinned first (global always top), then by recency
  const sorted = [...filtered].sort((a, b) => {
    if (a.type === "global") return -1;
    if (b.type === "global") return 1;
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return 0;
  });

  return (
    <>
      <SpaceHeader title="Spaces" />
      <FilterChips value={filter} onChange={setFilter} />
      <div className="flex-1 overflow-y-auto pb-20">
        <div className="divide-y divide-border">
          {sorted.map((space) => (
            <SpaceListItem key={space.id} space={space} />
          ))}
        </div>
        {sorted.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-12">
            No spaces match this filter
          </p>
        )}
      </div>
      <SpaceFab />
    </>
  );
}
