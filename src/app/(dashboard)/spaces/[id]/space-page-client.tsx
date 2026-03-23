"use client";

import { use } from "react";

import { useSpace } from "@/lib/hooks/use-space";
import { SpaceView } from "@/components/spaces/space-view";

export function SpacePageClient({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { space, currentMember } = useSpace(id);

  if (!space) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-muted-foreground">Space not found</p>
      </div>
    );
  }

  return <SpaceView space={space} currentMember={currentMember} />;
}
