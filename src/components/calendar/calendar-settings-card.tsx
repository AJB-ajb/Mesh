"use client";

import { useState } from "react";
import { Calendar, Loader2, RefreshCw, Trash2, Plus, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { labels } from "@/lib/labels";
import { useCalendarConnections } from "@/lib/hooks/use-calendar-connections";
import type { CalendarConnection } from "@/lib/calendar/types";

type CalendarSettingsCardProps = {
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
};

export function CalendarSettingsCard({
  onError,
  onSuccess,
}: CalendarSettingsCardProps) {
  const { connections, isLoading, mutate } = useCalendarConnections();
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [disconnectingConn, setDisconnectingConn] =
    useState<CalendarConnection | null>(null);
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
  const [icalUrl, setIcalUrl] = useState("");
  const [isAddingIcal, setIsAddingIcal] = useState(false);

  const googleConnection = connections.find((c) => c.provider === "google");
  const icalConnections = connections.filter((c) => c.provider === "ical");

  const handleConnectGoogle = () => {
    // Redirect to the OAuth initiation endpoint
    window.location.href = "/api/calendar/google/authorize";
  };

  const handleSync = async (connectionId: string) => {
    setSyncingId(connectionId);
    try {
      const res = await fetch("/api/calendar/google/sync", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        onError(data.error?.message ?? labels.calendar.errorGeneric);
      } else {
        onSuccess("Calendar synced successfully!");
        mutate();
      }
    } catch {
      onError(labels.calendar.errorGeneric);
    } finally {
      setSyncingId(null);
    }
  };

  const handleDisconnect = async () => {
    if (!disconnectingConn) return;
    try {
      const res = await fetch(
        `/api/calendar/connections/${disconnectingConn.id}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        onError(labels.calendar.errorGeneric);
      } else {
        onSuccess("Calendar disconnected.");
        mutate();
      }
    } catch {
      onError(labels.calendar.errorGeneric);
    } finally {
      setShowDisconnectDialog(false);
      setDisconnectingConn(null);
    }
  };

  const handleAddIcal = async () => {
    const trimmed = icalUrl.trim();
    if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
      onError(labels.calendar.errorInvalidIcalUrl);
      return;
    }

    setIsAddingIcal(true);
    try {
      const res = await fetch("/api/calendar/ical/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });
      if (!res.ok) {
        const data = await res.json();
        onError(data.error?.message ?? labels.calendar.errorGeneric);
      } else {
        onSuccess("iCal feed connected!");
        setIcalUrl("");
        mutate();
      }
    } catch {
      onError(labels.calendar.errorGeneric);
    } finally {
      setIsAddingIcal(false);
    }
  };

  const getSyncStatusBadge = (conn: CalendarConnection) => {
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
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {labels.calendar.settingsTitle}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {labels.calendar.settingsTitle}
          </CardTitle>
          <CardDescription>
            {labels.calendar.settingsDescription}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Google Calendar */}
          {googleConnection ? (
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium">
                    {labels.calendar.googleConnected}
                  </p>
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
                  onClick={() => handleSync(googleConnection.id)}
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
                  onClick={() => {
                    setDisconnectingConn(googleConnection);
                    setShowDisconnectDialog(true);
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {labels.calendar.disconnect}
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" onClick={handleConnectGoogle}>
              <Link2 className="mr-2 h-4 w-4" />
              {labels.calendar.googleConnect}
            </Button>
          )}

          {/* iCal connections */}
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
                onClick={() => {
                  setDisconnectingConn(conn);
                  setShowDisconnectDialog(true);
                }}
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

          {connections.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {labels.calendar.noConnections}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Disconnect Confirmation Dialog */}
      <AlertDialog
        open={showDisconnectDialog}
        onOpenChange={setShowDisconnectDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {labels.calendar.disconnectConfirmTitle}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {labels.calendar.disconnectConfirmDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => setDisconnectingConn(null)}
            >
              {labels.common.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisconnect}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {labels.calendar.disconnect}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
