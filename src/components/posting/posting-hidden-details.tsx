"use client";

import { useState, useEffect } from "react";
import { Lock, Unlock, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { labels } from "@/lib/labels";

interface PostingHiddenDetailsProps {
  postingId: string;
  isAcceptedMember: boolean;
  isOwner: boolean;
}

export function PostingHiddenDetails({
  postingId,
  isAcceptedMember,
  isOwner,
}: PostingHiddenDetailsProps) {
  const [details, setDetails] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAcceptedMember && !isOwner) return;

    let cancelled = false;
    queueMicrotask(() => {
      setIsLoading(true);
    });

    fetch(`/api/postings/${postingId}/hidden-details`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load");
        return res.json();
      })
      .then((data) => {
        if (!cancelled) {
          queueMicrotask(() => {
            setDetails(data.hidden_details);
            setIsLoading(false);
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          queueMicrotask(() => {
            setError(labels.hiddenDetails.loadError);
            setIsLoading(false);
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [postingId, isAcceptedMember, isOwner]);

  // Don't show at all if there are no hidden details and user can see them
  if ((isAcceptedMember || isOwner) && !isLoading && !details && !error) {
    return null;
  }

  // Locked state for non-accepted visitors
  if (!isAcceptedMember && !isOwner) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lock className="h-4 w-4 text-muted-foreground" />
            {labels.hiddenDetails.lockedTitle}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {labels.hiddenDetails.lockedDescription}
          </p>
        </CardContent>
      </Card>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return null; // Silently fail — non-critical
  }

  // Revealed state
  return (
    <Card className="border-green-200 dark:border-green-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Unlock className="h-4 w-4 text-green-600" />
          {labels.hiddenDetails.revealedTitle}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="whitespace-pre-wrap text-sm">{details}</div>
      </CardContent>
    </Card>
  );
}
