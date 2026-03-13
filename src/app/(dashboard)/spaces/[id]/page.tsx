"use client";

import { use } from "react";
import { Loader2 } from "lucide-react";

import { useSpace } from "@/lib/hooks/use-space";
import { SpaceView } from "@/components/spaces/space-view";

export default function SpacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { space, currentMember, isLoading } = useSpace(id);

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!space) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-muted-foreground">Space not found</p>
      </div>
    );
  }

  return <SpaceView space={space} currentMember={currentMember} />;
}
