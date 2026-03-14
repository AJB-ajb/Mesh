"use client";

import { useState, useCallback } from "react";
import { useSWRConfig } from "swr";

import { labels } from "@/lib/labels";
import { cacheKeys } from "@/lib/swr/keys";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  PostingComposeFields,
  type PostingFields,
} from "./posting-compose-fields";
import type { SpacePosting } from "@/lib/supabase/types";

interface PostingEditDialogProps {
  posting: SpacePosting;
  spaceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PostingEditDialog({
  posting,
  spaceId,
  open,
  onOpenChange,
}: PostingEditDialogProps) {
  const { mutate } = useSWRConfig();
  const [text, setText] = useState(posting.text);
  const [fields, setFields] = useState<PostingFields>({
    category: posting.category ?? undefined,
    capacity: posting.capacity,
    deadline: posting.deadline ?? undefined,
    visibility: posting.visibility as "public" | "private",
    autoAccept: posting.auto_accept,
    tags: posting.tags.length > 0 ? posting.tags : undefined,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/spaces/${spaceId}/postings/${posting.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text.trim(),
          category: fields.category ?? null,
          capacity: fields.capacity,
          deadline: fields.deadline ?? null,
          visibility: fields.visibility ?? "public",
          auto_accept: fields.autoAccept ?? false,
          tags: fields.tags ?? [],
        }),
      });
      if (res.ok) {
        mutate(cacheKeys.spacePostings(spaceId));
        onOpenChange(false);
      }
    } finally {
      setSaving(false);
    }
  }, [text, fields, spaceId, posting.id, mutate, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit posting</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            className="w-full resize-none rounded-lg border border-input bg-muted/50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <PostingComposeFields fields={fields} onChange={setFields} />
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {labels.spaces.posting.cancel}
          </Button>
          <Button onClick={handleSave} disabled={!text.trim() || saving}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
