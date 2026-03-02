"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePostingCoreContext } from "./posting-core-context";
import { usePostingEditContext } from "./posting-edit-context";
import { PostingAboutCardView } from "./posting-about-card-view";
import { PostingAboutCardEdit } from "./posting-about-card-edit";

export function PostingAboutCard() {
  const { posting } = usePostingCoreContext();
  const { isEditing, form, onFormChange } = usePostingEditContext();

  return (
    <Card>
      <CardHeader>
        <CardTitle>About this posting</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isEditing ? (
          <PostingAboutCardEdit form={form} onFormChange={onFormChange} />
        ) : (
          <PostingAboutCardView posting={posting} />
        )}
      </CardContent>
    </Card>
  );
}
