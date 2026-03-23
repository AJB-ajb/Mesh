"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, Loader2, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { labels } from "@/lib/labels";
import { ClientDate } from "@/components/ui/client-date";
import {
  AppleIcon,
  OutlookIcon,
  NextcloudIcon,
} from "@/components/icons/calendar-icons";
import type { CalendarConnection } from "@/lib/calendar/types";
import { SyncStatusBadge } from "./sync-status-badge";

type ICalConnectionsSectionProps = {
  icalConnections: CalendarConnection[];
  onDisconnect: (conn: CalendarConnection) => void;
  onAddIcal: (url: string) => Promise<void>;
};

type ProviderGuide = {
  name: string;
  icon: ReactNode;
  steps: string[];
};

const PROVIDER_GUIDES: ProviderGuide[] = [
  {
    name: labels.calendar.icalGuideAppleName,
    icon: <AppleIcon className="size-4 shrink-0" />,
    steps: labels.calendar.icalGuideAppleSteps,
  },
  {
    name: labels.calendar.icalGuideOutlookName,
    icon: <OutlookIcon className="size-4 shrink-0" />,
    steps: labels.calendar.icalGuideOutlookSteps,
  },
  {
    name: labels.calendar.icalGuideNextcloudName,
    icon: <NextcloudIcon className="size-4 shrink-0" />,
    steps: labels.calendar.icalGuideNextcloudSteps,
  },
];

export function ICalConnectionsSection({
  icalConnections,
  onDisconnect,
  onAddIcal,
}: ICalConnectionsSectionProps) {
  const [icalUrl, setIcalUrl] = useState("");
  const [isAddingIcal, setIsAddingIcal] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

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
              <p className="max-w-xs truncate text-sm font-medium">
                {conn.icalUrl ?? "iCal Feed"}
              </p>
              <SyncStatusBadge conn={conn} />
            </div>
            {conn.lastSyncedAt && (
              <p className="text-sm text-muted-foreground">
                Last synced: <ClientDate date={conn.lastSyncedAt} showTime />
              </p>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDisconnect(conn)}
          >
            <Trash2 className="mr-2 size-4" />
            {labels.calendar.disconnect}
          </Button>
        </div>
      ))}

      {/* Add iCal feed */}
      <div className="space-y-2">
        <label className="text-sm font-medium">
          {labels.calendar.icalSectionTitle}
        </label>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
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
            className="w-full sm:w-auto"
            onClick={handleAddIcal}
            disabled={isAddingIcal || !icalUrl.trim()}
          >
            {isAddingIcal ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                {labels.calendar.icalAdding}
              </>
            ) : (
              <>
                <Plus className="mr-2 size-4" />
                {labels.calendar.icalSubmit}
              </>
            )}
          </Button>
        </div>

        {/* Provider guide toggle */}
        <button
          type="button"
          onClick={() => setShowGuide((v) => !v)}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          aria-expanded={showGuide}
        >
          <ChevronDown
            className={`size-3.5 transition-transform ${showGuide ? "rotate-180" : ""}`}
          />
          {labels.calendar.icalGuideToggle}
        </button>

        {showGuide && (
          <div className="grid gap-3 sm:grid-cols-3">
            {PROVIDER_GUIDES.map((provider) => (
              <div
                key={provider.name}
                className="rounded-lg border border-border p-3 space-y-2"
              >
                <div className="flex items-center gap-2">
                  {provider.icon}
                  <span className="text-sm font-medium">{provider.name}</span>
                </div>
                <ol className="space-y-1 text-xs text-muted-foreground list-decimal list-inside">
                  {provider.steps.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
