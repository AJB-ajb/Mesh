"use client";

import { useState } from "react";
import { Loader2, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { labels } from "@/lib/labels";
import type { CalendarConnection } from "@/lib/calendar/types";

type ICalConnectionsSectionProps = {
  icalConnections: CalendarConnection[];
  onDisconnect: (conn: CalendarConnection) => void;
  onAddIcal: (url: string) => Promise<void>;
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

export function ICalConnectionsSection({
  icalConnections,
  onDisconnect,
  onAddIcal,
}: ICalConnectionsSectionProps) {
  const [icalUrl, setIcalUrl] = useState("");
  const [isAddingIcal, setIsAddingIcal] = useState(false);

  const handleAddIcal = async () => {
    setIsAddingIcal(true);
    try {
      await onAddIcal(icalUrl.trim());
      setIcalUrl("");
    } finally {
      setIsAddingIcal(false);
    }
  };

  return (
    <>
      {icalConnections.map((conn) => (
        <div
          key={conn.id}
          className="flex items-center justify-between rounded-lg border border-border p-4"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <p className="font-medium text-sm truncate max-w-xs">
                {conn.icalUrl ?? "iCal Feed"}
              </p>
              {getSyncStatusBadge(conn)}
            </div>
            {conn.lastSyncedAt && (
              <p className="text-sm text-muted-foreground">
                {labels.calendar.lastSynced(
                  new Date(conn.lastSyncedAt).toLocaleString(),
                )}
              </p>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDisconnect(conn)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {labels.calendar.disconnect}
          </Button>
        </div>
      ))}

      {/* Add iCal feed */}
      <div className="flex items-center gap-2">
        <Input
          type="url"
          placeholder={labels.calendar.icalPlaceholder}
          value={icalUrl}
          onChange={(e) => setIcalUrl(e.target.value)}
          className="flex-1"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={handleAddIcal}
          disabled={isAddingIcal || !icalUrl.trim()}
        >
          {isAddingIcal ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {labels.calendar.icalAdding}
            </>
          ) : (
            <>
              <Plus className="mr-2 h-4 w-4" />
              {labels.calendar.icalSubmit}
            </>
          )}
        </Button>
      </div>
    </>
  );
}
