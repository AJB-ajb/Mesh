"use client";

import { SpaceHeader } from "@/components/spaces-prototype/space-header";
import { ActivityCard } from "@/components/spaces-prototype/activity-card";
import { ACTIVITY_ITEMS } from "@/components/spaces-prototype/mock-data";

export default function ActivityPage() {
  return (
    <>
      <SpaceHeader title="Activity" />
      <div className="flex-1 overflow-y-auto pb-20">
        <div className="space-y-3 p-4">
          {ACTIVITY_ITEMS.map((item) => (
            <ActivityCard key={item.id} item={item} />
          ))}
        </div>
      </div>
    </>
  );
}
