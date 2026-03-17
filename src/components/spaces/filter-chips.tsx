"use client";

import { cn } from "@/lib/utils";
import { labels } from "@/lib/labels";
import type { SpaceFilter } from "@/app/(dashboard)/spaces/spaces-page-client";

const filters: { value: SpaceFilter; label: string }[] = [
  { value: "all", label: labels.spaces.filterAll },
  { value: "dms", label: labels.spaces.filterDMs },
  { value: "groups", label: labels.spaces.filterGroups },
  { value: "public", label: labels.spaces.filterPublic },
  { value: "pinned", label: labels.spaces.filterPinned },
  { value: "archived", label: labels.spaces.filterArchived },
];

interface FilterChipsProps {
  value: SpaceFilter;
  onChange: (value: SpaceFilter) => void;
}

export function FilterChips({ value, onChange }: FilterChipsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mb-1 scrollbar-none">
      {filters.map((f) => (
        <button
          key={f.value}
          type="button"
          onClick={() => onChange(f.value)}
          className={cn(
            "shrink-0 rounded-full px-3 py-1 text-sm font-medium transition-colors",
            value === f.value
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground",
          )}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}
