"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Info } from "lucide-react";
import { useState } from "react";

import { labels } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import type { SpaceDetail } from "@/lib/hooks/use-space";
import { GLOBAL_SPACE_ID } from "@/lib/supabase/types";
import { SpaceInfoSheet } from "./space-info-sheet";

interface SpaceHeaderProps {
  space: SpaceDetail;
  memberCount: number;
}

export function SpaceHeader({ space, memberCount }: SpaceHeaderProps) {
  const router = useRouter();
  const [showInfo, setShowInfo] = useState(false);
  const isGlobal = space.id === GLOBAL_SPACE_ID;

  return (
    <>
      <div className="flex items-center gap-2 border-b border-border px-4 py-3 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => router.push("/spaces")}
          aria-label="Back to spaces"
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
          onClick={() => setShowInfo(true)}
          aria-label={labels.spaces.info}
        >
          <Info className="size-4" />
        </Button>
      </div>

      <SpaceInfoSheet
        space={space}
        open={showInfo}
        onOpenChange={setShowInfo}
      />
    </>
  );
}
