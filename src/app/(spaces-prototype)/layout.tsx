"use client";

import { SpaceBottomBar } from "@/components/spaces-prototype/space-bottom-bar";

export default function SpacesPrototypeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col h-dvh bg-background">
      {children}
      <SpaceBottomBar />
    </div>
  );
}
