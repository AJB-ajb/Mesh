"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePostingCoreContext } from "./posting-core-context";
import { PostingAboutCardView } from "./posting-about-card-view";

export function PostingAboutCard() {
  const { posting, isOwner, isAcceptedMember } = usePostingCoreContext();

  return (
    <Card>
      <CardHeader>
        <CardTitle>About this posting</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <PostingAboutCardView
          posting={posting}
          revealHidden={isOwner || isAcceptedMember}
          questionMode={isOwner ? "owner" : "placeholder"}
        />
      </CardContent>
    </Card>
  );
}
