"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { labels } from "@/lib/labels";

export function ComposeInContext({
  parentPostingId,
  onCreated,
}: {
  parentPostingId: string;
  onCreated?: () => void;
}) {
  const [text, setText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    const trimmed = text.trim();
    if (!trimmed || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/postings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: trimmed,
          parentPostingId,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to post");
      }

      setText("");
      toast.success(labels.coordination.postSuccess);
      onCreated?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to post");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <textarea
          className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
          placeholder={labels.coordination.composePlaceholder}
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={isSubmitting}
        />

        <div className="flex items-center justify-between">
          <Link
            href={`/postings/new?parent=${parentPostingId}`}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {labels.coordination.expandLink}
          </Link>

          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!text.trim() || isSubmitting}
          >
            {labels.coordination.postButton}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
