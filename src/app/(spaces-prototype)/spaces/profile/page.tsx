"use client";

import { SpaceHeader } from "@/components/spaces-prototype/space-header";
import { ProfileView } from "@/components/spaces-prototype/profile-view";

export default function ProfilePage() {
  return (
    <>
      <SpaceHeader title="Profile" />
      <div className="flex-1 overflow-y-auto pb-20">
        <ProfileView />
      </div>
    </>
  );
}
