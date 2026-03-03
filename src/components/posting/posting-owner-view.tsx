"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { labels } from "@/lib/labels";
import { useExtractionReview } from "@/lib/hooks/use-extraction-review";
import { usePostingCoreContext } from "./posting-core-context";
import { PostingDetailHeader } from "./posting-detail-header";
import { ExtractionReviewCard } from "./extraction-review-card";
import { PostingEditTab } from "./posting-edit-tab";
import { PostingManageTab } from "./posting-manage-tab";
import { PostingActivityTab } from "./posting-activity-tab";

export function PostingOwnerView() {
  const {
    posting,
    postingId,
    activeTab,
    onTabChange,
    projectEnabled,
    onMutate,
  } = usePostingCoreContext();

  const router = useRouter();
  const searchParams = useSearchParams();

  // Extraction review (triggered by ?extraction=pending from text-first creation)
  const extractionPending = searchParams.get("extraction") === "pending";
  const sourceText = posting.source_text ?? posting.description;

  const extraction = useExtractionReview({
    postingId,
    sourceText: sourceText ?? null,
    shouldExtract: extractionPending ?? false,
    currentPosting: posting,
    onMutate,
  });

  return (
    <div className="space-y-6">
      <PostingDetailHeader />

      {/* Extraction review card (after text-first creation) */}
      <ExtractionReviewCard
        status={extraction.status}
        appliedFields={extraction.appliedFields}
        undo={extraction.undo}
        dismiss={extraction.dismiss}
        retry={extraction.retry}
      />

      <Tabs
        value={activeTab}
        onValueChange={(v) => {
          onTabChange(v);
          router.replace(`?tab=${v}`, { scroll: false });
        }}
      >
        <TabsList variant="line">
          <TabsTrigger value="edit">
            {labels.postingDetail.tabs.edit}
          </TabsTrigger>
          <TabsTrigger value="manage">
            {labels.postingDetail.tabs.manage}
          </TabsTrigger>
          <TabsTrigger
            value="project"
            disabled={!projectEnabled}
            title={
              !projectEnabled ? labels.postingDetail.projectDisabled : undefined
            }
          >
            {labels.postingDetail.tabs.project}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="edit">
          <PostingEditTab />
        </TabsContent>

        <TabsContent value="manage">
          <PostingManageTab />
        </TabsContent>

        <TabsContent value="project">
          <PostingActivityTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
