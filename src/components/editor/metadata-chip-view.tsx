"use client";

import { NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";

const CHIP_EMOJI: Record<string, string> = {
  location: "\uD83D\uDCCD",
  time: "\uD83D\uDD52",
  skills: "\uD83D\uDEE0\uFE0F",
};

const CHIP_COLORS: Record<string, string> = {
  location:
    "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800",
  time: "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-800",
  skills:
    "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-green-200 dark:border-green-800",
};

export function MetadataChipView({ node }: NodeViewProps) {
  const { chipType, display } = node.attrs;
  const emoji = CHIP_EMOJI[chipType] ?? "";
  const colors =
    CHIP_COLORS[chipType] ?? "bg-muted text-foreground border-border";

  return (
    <NodeViewWrapper
      as="span"
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-sm font-medium cursor-pointer select-none ${colors}`}
      data-type="metadata-chip"
      contentEditable={false}
    >
      {emoji && <span className="text-xs">{emoji}</span>}
      <span>{display}</span>
    </NodeViewWrapper>
  );
}
