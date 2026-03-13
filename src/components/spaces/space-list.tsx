"use client";

import type { SpaceListItem } from "@/lib/supabase/types";
import { SpaceListItemRow } from "./space-list-item";

interface SpaceListProps {
  spaces: SpaceListItem[];
}

export function SpaceList({ spaces }: SpaceListProps) {
  return (
    <div className="-mx-4 sm:-mx-6 divide-y divide-border">
      {spaces.map((space) => (
        <SpaceListItemRow key={space.id} space={space} />
      ))}
    </div>
  );
}
