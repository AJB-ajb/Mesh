"use client";

import { useState, useSyncExternalStore } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { labels } from "@/lib/labels";
import { FreeFormUpdate } from "@/components/shared/free-form-update";
import { usePostingCoreContext } from "./posting-core-context";
import { usePostingEditContext } from "./posting-edit-context";
import { PostingAboutCard } from "./posting-about-card";
import { PostingSidebar } from "./posting-sidebar";

function useIsDesktop() {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia("(min-width: 1024px)");
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia("(min-width: 1024px)").matches,
    () => false,
  );
}

export function PostingEditTab() {
  const { posting, postingId } = usePostingCoreContext();
  const { isApplyingUpdate, onApplyUpdate, onUndoUpdate } =
    usePostingEditContext();

  const isDesktop = useIsDesktop();
  const [manualOverride, setManualOverride] = useState<boolean | null>(null);
  const showManualForm = manualOverride ?? isDesktop;

  return (
    <div className="grid gap-6 lg:grid-cols-3 mt-6">
      <div className="space-y-6 lg:col-span-2">
        <FreeFormUpdate
          entityType="posting"
          entityId={postingId}
          sourceText={posting.source_text ?? null}
          canUndo={!!posting.previous_source_text}
          isApplying={isApplyingUpdate}
          onUpdate={onApplyUpdate}
          onUndo={onUndoUpdate}
        />

        {/* Collapsible manual edit form */}
        <div>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
            onClick={() => setManualOverride((v) => !(v ?? isDesktop))}
          >
            <ChevronDown
              className={cn(
                "size-4 transition-transform",
                showManualForm && "rotate-180",
              )}
            />
            {labels.postingEdit.editManuallyToggle}
          </button>
          <p className="mt-1 px-3 text-xs text-muted-foreground lg:hidden">
            {labels.postingEdit.editManuallyHint}
          </p>

          {showManualForm && (
            <div className="mt-4 lg:mt-0">
              <PostingAboutCard />
            </div>
          )}
        </div>
      </div>

      <PostingSidebar />
    </div>
  );
}
