"use client";

import { useState, useCallback } from "react";
import { labels } from "@/lib/labels";

export function useSharePosting(title: string | null) {
  const [shared, setShared] = useState(false);

  const handleShare = useCallback(async () => {
    const url = window.location.href;
    const shareTitle = title || labels.postingDetail.shareTitle;

    if (navigator.share) {
      try {
        await navigator.share({ title: shareTitle, url });
      } catch {
        // User cancelled or share failed
      }
    } else {
      await navigator.clipboard.writeText(url);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    }
  }, [title]);

  return { shared, handleShare };
}
