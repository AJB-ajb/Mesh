"use client";

import { useState, useEffect, useCallback } from "react";
import { Calendar, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { createClient } from "@/lib/supabase/client";
import type { CalendarConnection } from "@/lib/calendar/types";
import type { CalendarVisibility } from "@/lib/calendar/types";
import { GoogleCalendarSection } from "./google-calendar-section";
import { ICalConnectionsSection } from "./ical-connections-section";
import { CalendarVisibilitySection } from "./calendar-visibility-section";

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
  const [visibility, setVisibility] =
    useState<CalendarVisibility>("match_only");
  const [isUpdatingVisibility, setIsUpdatingVisibility] = useState(false);

  // Fetch current visibility setting on mount
  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user || cancelled) return;
      supabase
        .from("profiles")
        .select("calendar_visibility")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          if (!cancelled && data?.calendar_visibility) {
            queueMicrotask(() => {
              setVisibility(data.calendar_visibility as CalendarVisibility);
            });
          }
        });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleVisibilityChange = useCallback(
    async (value: CalendarVisibility) => {
      setIsUpdatingVisibility(true);
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          onError(labels.calendar.errorGeneric);
          return;
        }
        const { error } = await supabase
          .from("profiles")
          .update({ calendar_visibility: value })
          .eq("id", user.id);
        if (error) {
          onError(labels.calendar.errorGeneric);
        } else {
          setVisibility(value);
        }
      } catch {
        onError(labels.calendar.errorGeneric);
      } finally {
        setIsUpdatingVisibility(false);
      }
    },
    [onError],
  );

  const googleConnection = connections.find((c) => c.provider === "google");
  const icalConnections = connections.filter((c) => c.provider === "ical");

  const handleConnectGoogle = () => {
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

  const handleAddIcal = async (url: string) => {
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      onError(labels.calendar.errorInvalidIcalUrl);
      return;
    }

    try {
      const res = await fetch("/api/calendar/ical/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) {
        const data = await res.json();
        onError(data.error?.message ?? labels.calendar.errorGeneric);
      } else {
        onSuccess("iCal feed connected!");
        mutate();
      }
    } catch {
      onError(labels.calendar.errorGeneric);
    }
  };

  const handleStartDisconnect = (conn: CalendarConnection) => {
    setDisconnectingConn(conn);
    setShowDisconnectDialog(true);
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
          <GoogleCalendarSection
            googleConnection={googleConnection}
            syncingId={syncingId}
            onConnect={handleConnectGoogle}
            onSync={handleSync}
            onDisconnect={handleStartDisconnect}
          />

          <ICalConnectionsSection
            icalConnections={icalConnections}
            onDisconnect={handleStartDisconnect}
            onAddIcal={handleAddIcal}
          />

          {connections.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {labels.calendar.noConnections}
            </p>
          )}

          {connections.length > 0 && (
            <CalendarVisibilitySection
              visibility={visibility}
              isUpdating={isUpdatingVisibility}
              onChange={handleVisibilityChange}
            />
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
            <AlertDialogCancel onClick={() => setDisconnectingConn(null)}>
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
