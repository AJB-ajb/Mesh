"use client";

import { Loader2, RefreshCw, Trash2, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { labels } from "@/lib/labels";
import type { CalendarConnection } from "@/lib/calendar/types";

type GoogleCalendarSectionProps = {
  googleConnection: CalendarConnection | undefined;
  syncingId: string | null;
  onConnect: () => void;
  onSync: (connectionId: string) => void;
  onDisconnect: (conn: CalendarConnection) => void;
};

function getSyncStatusBadge(conn: CalendarConnection) {
  const variant =
    conn.syncStatus === "synced"
      ? "default"
      : conn.syncStatus === "error"
        ? "destructive"
        : "secondary";
  return (
    <Badge variant={variant} className="text-xs">
      {labels.calendar.syncStatusLabels[conn.syncStatus]}
    </Badge>
  );
}

export function GoogleCalendarSection({
  googleConnection,
  syncingId,
  onConnect,
  onSync,
  onDisconnect,
}: GoogleCalendarSectionProps) {
  if (!googleConnection) {
    return (
      <Button variant="outline" onClick={onConnect}>
        <Link2 className="mr-2 h-4 w-4" />
        {labels.calendar.googleConnect}
      </Button>
    );
  }

  return (
    <div className="flex items-center justify-between rounded-lg border border-border p-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <p className="font-medium">{labels.calendar.googleConnected}</p>
          {getSyncStatusBadge(googleConnection)}
        </div>
        {googleConnection.lastSyncedAt && (
          <p className="text-sm text-muted-foreground">
            {labels.calendar.lastSynced(
              new Date(googleConnection.lastSyncedAt).toLocaleString(),
            )}
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
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {labels.calendar.syncing}
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              {labels.calendar.syncNow}
            </>
          )}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onDisconnect(googleConnection)}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          {labels.calendar.disconnect}
        </Button>
      </div>
    </div>
  );
}
