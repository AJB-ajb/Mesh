"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { labels } from "@/lib/labels";
import { useConnectionsPage } from "@/lib/hooks/use-connections-page";
import { ConnectionsLeftPanel } from "./connections-left-panel";
import { ConnectionChatArea } from "./connection-chat-area";
import { AddConnectionDialog } from "./add-connection-dialog";
import { QrCodeDialog } from "./qr-code-dialog";
import { createClient } from "@/lib/supabase/client";

function ConnectionsPageInner() {
  const searchParams = useSearchParams();
  const userParam = searchParams.get("user");

  const { mergedConnections, pendingIncoming, currentUserId, isLoading, mutate } =
    useConnectionsPage();

  const [selectedUserId, setSelectedUserId] = useState<string | null>(
    userParam,
  );
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showQrDialog, setShowQrDialog] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Current user's name for QR code
  const [currentUserName, setCurrentUserName] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUserId) return;
    const supabase = createClient();
    supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", currentUserId)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.full_name) setCurrentUserName(data.full_name);
      });
  }, [currentUserId]);

  // On mobile: show list when nothing is selected, show chat when selected
  const showListOnMobile = !selectedUserId;
  const showChatOnMobile = !!selectedUserId;

  const selectedConnection =
    mergedConnections.find((c) => c.otherUser.user_id === selectedUserId) ??
    null;

  async function handleAccept(friendshipId: string) {
    await fetch(`/api/friendships/${friendshipId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "accepted" }),
    });
    await mutate();
  }

  async function handleDecline(friendshipId: string) {
    await fetch(`/api/friendships/${friendshipId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "declined" }),
    });
    await mutate();
  }

  function handleShareLink() {
    if (!currentUserId) return;
    const url = `${window.location.origin}/profile/${currentUserId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    });
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {labels.connectionsPage.title}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {labels.connectionsPage.subtitle}
        </p>
        {copiedLink && (
          <p className="mt-1 text-xs text-green-600">
            {labels.connectionsPage.linkCopied}
          </p>
        )}
      </div>

      {/* Split-panel layout */}
      <div className="grid lg:grid-cols-3 gap-0 border border-border rounded-lg overflow-hidden min-h-[600px]">
        {/* Left panel: connection list */}
        <div
          className={cn(
            "lg:col-span-1",
            showListOnMobile ? "block" : "hidden lg:block",
          )}
        >
          <ConnectionsLeftPanel
            connections={mergedConnections}
            pendingIncoming={pendingIncoming}
            selectedUserId={selectedUserId}
            currentUserId={currentUserId}
            onSelect={setSelectedUserId}
            onAccept={handleAccept}
            onDecline={handleDecline}
            onAddConnection={() => setShowAddDialog(true)}
            onQrCode={() => setShowQrDialog(true)}
            onShareLink={handleShareLink}
          />
        </div>

        {/* Right panel: chat area */}
        <div
          className={cn(
            "lg:col-span-2",
            showChatOnMobile ? "block" : "hidden lg:block",
          )}
        >
          <ConnectionChatArea
            selectedConnection={selectedConnection}
            currentUserId={currentUserId}
            onBack={() => setSelectedUserId(null)}
            onConversationCreated={() => mutate()}
          />
        </div>
      </div>

      {/* Dialogs */}
      <AddConnectionDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onConnectionSent={() => mutate()}
      />

      {currentUserId && (
        <QrCodeDialog
          open={showQrDialog}
          onOpenChange={setShowQrDialog}
          userId={currentUserId}
          userName={currentUserName}
          onCopied={() => {
            setCopiedLink(true);
            setTimeout(() => setCopiedLink(false), 2000);
          }}
        />
      )}
    </div>
  );
}

export function ConnectionsPageContent() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <ConnectionsPageInner />
    </Suspense>
  );
}
