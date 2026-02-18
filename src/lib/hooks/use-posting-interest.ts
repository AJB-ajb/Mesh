import { useState, useCallback } from "react";

export interface UsePostingInterestReturn {
  interestingIds: Set<string>;
  interestError: string | null;
  handleExpressInterest: (postingId: string) => Promise<void>;
}

export function usePostingInterest(
  mutate: () => Promise<unknown>,
): UsePostingInterestReturn {
  const [interestingIds, setInterestingIds] = useState<Set<string>>(new Set());
  const [interestError, setInterestError] = useState<string | null>(null);

  const handleExpressInterest = useCallback(
    async (postingId: string) => {
      setInterestingIds((prev) => new Set(prev).add(postingId));
      setInterestError(null);
      try {
        const response = await fetch("/api/applications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ posting_id: postingId }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error?.message || "Failed to submit request");
        }

        await mutate();
      } catch (err) {
        setInterestingIds((prev) => {
          const next = new Set(prev);
          next.delete(postingId);
          return next;
        });
        setInterestError(
          err instanceof Error ? err.message : "Failed to submit request",
        );
      }
    },
    [mutate],
  );

  return {
    interestingIds,
    interestError,
    handleExpressInterest,
  };
}
