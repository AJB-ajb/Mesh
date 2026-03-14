"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Info, Search } from "lucide-react";
import { useState } from "react";

import { labels } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import type { SpaceDetail } from "@/lib/hooks/use-space";
import { GLOBAL_SPACE_ID, type SpaceMember } from "@/lib/supabase/types";
import { SpaceInfoSheet } from "./space-info-sheet";
import { SpaceSearch } from "./space-search";

interface SpaceHeaderProps {
  space: SpaceDetail;
  memberCount: number;
  currentMember?: SpaceMember | null;
}

export function SpaceHeader({
  space,
  memberCount,
  currentMember,
}: SpaceHeaderProps) {
  const router = useRouter();
  const [showInfo, setShowInfo] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const isGlobal = space.id === GLOBAL_SPACE_ID;
  const backTarget = space.parent_space_id
    ? `/spaces/${space.parent_space_id}`
    : "/spaces";

  return (
    <>
      <div className="flex items-center gap-2 border-b border-border px-4 py-3 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => router.push(backTarget)}
          aria-label={labels.spaces.backToSpaces}
        >
          <ArrowLeft className="size-4" />
        </Button>

        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-sm truncate">
            {isGlobal ? labels.spaces.explore : space.name}
          </h2>
          <p className="text-xs text-muted-foreground">
            {labels.spaces.members(memberCount)}
          </p>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => setShowSearch((v) => !v)}
          aria-label={labels.spaces.search.toggle}
        >
          <Search className="size-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => setShowInfo(true)}
          aria-label={labels.spaces.info}
        >
          <Info className="size-4" />
        </Button>
      </div>

      {showSearch && (
        <SpaceSearch spaceId={space.id} onClose={() => setShowSearch(false)} />
      )}

      <SpaceInfoSheet
        space={space}
        currentMember={currentMember ?? null}
        open={showInfo}
        onOpenChange={setShowInfo}
      />
    </>
  );
}
