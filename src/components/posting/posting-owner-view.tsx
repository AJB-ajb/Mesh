"use client";

import { useRouter } from "next/navigation";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { labels } from "@/lib/labels";
import { usePostingCoreContext } from "./posting-core-context";
import { PostingDetailHeader } from "./posting-detail-header";
import { PostingEditTab } from "./posting-edit-tab";
import { PostingManageTab } from "./posting-manage-tab";
import { PostingActivityTab } from "./posting-activity-tab";

export function PostingOwnerView() {
  const router = useRouter();
  const { activeTab, onTabChange, projectEnabled } = usePostingCoreContext();

  return (
    <div className="space-y-6">
      <PostingDetailHeader hideApplySection={false} />

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
