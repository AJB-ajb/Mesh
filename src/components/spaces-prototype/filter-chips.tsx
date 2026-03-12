"use client";

import { cn } from "@/lib/utils";

const FILTERS = ["All", "DMs", "Groups", "Public", "Pinned"] as const;

export type FilterValue = (typeof FILTERS)[number];

type FilterChipsProps = {
  value: FilterValue;
  onChange: (value: FilterValue) => void;
};

export function FilterChips({ value, onChange }: FilterChipsProps) {
  return (
    <div
      className="flex gap-2 overflow-x-auto px-4 py-2 scrollbar-none"
      role="radiogroup"
      aria-label="Filter spaces"
    >
      {FILTERS.map((filter) => (
        <button
          key={filter}
          type="button"
          role="radio"
          aria-checked={value === filter}
          onClick={() => onChange(filter)}
          className={cn(
            "shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors min-h-[36px]",
            value === filter
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80",
          )}
        >
          {filter}
        </button>
      ))}
    </div>
  );
}
