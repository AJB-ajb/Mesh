"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { labels } from "@/lib/labels";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TextDiffModalProps {
  open: boolean;
  onClose: () => void;
  onAccept: () => void;
  original: string;
  proposed: string;
  title: string;
}

interface DiffSegment {
  type: "equal" | "added" | "removed";
  text: string;
}

// ---------------------------------------------------------------------------
// Simple word-level diff
// ---------------------------------------------------------------------------

/**
 * Compute a word-level diff between two strings using a simple LCS approach.
 * Splits on whitespace boundaries (preserving whitespace) and compares tokens.
 */
export function computeWordDiff(
  original: string,
  proposed: string,
): DiffSegment[] {
  const origTokens = original.split(/(\s+)/);
  const propTokens = proposed.split(/(\s+)/);

  // Build LCS table
  const m = origTokens.length;
  const n = propTokens.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0),
  );

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (origTokens[i - 1] === propTokens[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to build diff segments
  const segments: DiffSegment[] = [];
  let i = m;
  let j = n;

  const rawSegments: DiffSegment[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && origTokens[i - 1] === propTokens[j - 1]) {
      rawSegments.push({ type: "equal", text: origTokens[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      rawSegments.push({ type: "added", text: propTokens[j - 1] });
      j--;
    } else {
      rawSegments.push({ type: "removed", text: origTokens[i - 1] });
      i--;
    }
  }

  rawSegments.reverse();

  // Merge consecutive segments of the same type
  for (const seg of rawSegments) {
    const last = segments[segments.length - 1];
    if (last && last.type === seg.type) {
      last.text += seg.text;
    } else {
      segments.push({ ...seg });
    }
  }

  return segments;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TextDiffModal({
  open,
  onClose,
  onAccept,
  original,
  proposed,
  title,
}: TextDiffModalProps) {
  const diffSegments = computeWordDiff(original, proposed);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription aria-describedby={undefined} className="sr-only">
            {labels.textTools.originalLabel} / {labels.textTools.proposedLabel}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2 overflow-auto flex-1 min-h-0">
          {/* Original panel */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              {labels.textTools.originalLabel}
            </p>
            <div className="rounded-md border bg-muted/30 p-3 whitespace-pre-wrap font-mono text-sm overflow-auto max-h-[50vh]">
              {original}
            </div>
          </div>

          {/* Proposed panel with diff highlighting */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              {labels.textTools.proposedLabel}
            </p>
            <div className="rounded-md border bg-muted/30 p-3 whitespace-pre-wrap font-mono text-sm overflow-auto max-h-[50vh]">
              {diffSegments.map((seg, idx) => {
                if (seg.type === "removed") {
                  return (
                    <span
                      key={idx}
                      className="bg-red-100 line-through text-red-800 dark:bg-red-900/30 dark:text-red-400"
                    >
                      {seg.text}
                    </span>
                  );
                }
                if (seg.type === "added") {
                  return (
                    <span
                      key={idx}
                      className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                    >
                      {seg.text}
                    </span>
                  );
                }
                return <span key={idx}>{seg.text}</span>;
              })}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {labels.textTools.cancelButton}
          </Button>
          <Button onClick={onAccept}>{labels.textTools.acceptButton}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
