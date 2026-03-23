"use client";

import { Loader2, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GoogleIcon } from "@/components/icons/auth-icons";
import { labels } from "@/lib/labels";
import { ClientDate } from "@/components/ui/client-date";
import type { CalendarConnection } from "@/lib/calendar/types";
import { SyncStatusBadge } from "./sync-status-badge";

type GoogleCalendarSectionProps = {
  googleConnection: CalendarConnection | undefined;
  syncingId: string | null;
  onConnect: () => void;
  onSync: (connectionId: string) => void;
  onDisconnect: (conn: CalendarConnection) => void;
};

export function GoogleCalendarSection({
  googleConnection,
  syncingId,
  onConnect,
  onSync,
  onDisconnect,
}: GoogleCalendarSectionProps) {
  if (!googleConnection) {
    return (
      <Button
        variant="outline"
        onClick={onConnect}
        className="h-10 gap-2.5 border-border/80 bg-background px-4 text-sm font-medium shadow-sm hover:bg-accent/50"
      >
        <GoogleIcon className="size-4 shrink-0" />
        {labels.calendar.googleConnect}
      </Button>
    );
  }

  return (
    <div className="flex items-center justify-between rounded-lg border border-border p-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <GoogleIcon className="size-4 shrink-0" />
          <p className="font-medium">{labels.calendar.googleConnected}</p>
          <SyncStatusBadge conn={googleConnection} />
        </div>
        {googleConnection.lastSyncedAt && (
          <p className="text-sm text-muted-foreground">
            Last synced:{" "}
            <ClientDate date={googleConnection.lastSyncedAt} showTime />
          </p>
        )}
        {googleConnection.syncStatus === "error" &&
          googleConnection.syncError && (
            <p className="text-sm text-destructive">
              {labels.calendar.syncError(googleConnection.syncError)}
            </p>
          )}
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onSync(googleConnection.id)}
          disabled={syncingId !== null}
        >
          {syncingId === googleConnection.id ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              {labels.calendar.syncing}
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 size-4" />
              {labels.calendar.syncNow}
            </>
          )}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onDisconnect(googleConnection)}
        >
          <Trash2 className="mr-2 size-4" />
          {labels.calendar.disconnect}
        </Button>
      </div>
    </div>
  );
}
