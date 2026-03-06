"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { NumberPicker } from "@/components/ui/number-picker";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { labels } from "@/lib/labels";

export interface PostingSettings {
  teamSizeMin: string;
  teamSizeMax: string;
  expiresAt: string;
  autoAccept: boolean;
  sequentialCount: number;
}

interface PostingSettingsRowProps {
  settings: PostingSettings;
  onChange: (settings: PostingSettings) => void;
}

export function PostingSettingsRow({
  settings,
  onChange,
}: PostingSettingsRowProps) {
  const [open, setOpen] = useState(false);
  const l = labels.contextBar;

  const update = (partial: Partial<PostingSettings>) =>
    onChange({ ...settings, ...partial });

  return (
    <div className="border-t">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-1 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <span>
          <span className="font-medium">{l.settingsToggle}</span>
          <span className="ml-2 text-xs">{l.settingsHint}</span>
        </span>
        <ChevronDown
          className={cn("size-4 transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="grid gap-4 pb-3 pt-1 sm:grid-cols-2">
          {/* Min team size */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              {l.teamSizeMinLabel}
            </label>
            <NumberPicker
              value={Number(settings.teamSizeMin) || 1}
              onChange={(v) => update({ teamSizeMin: String(v) })}
              min={1}
              max={10}
              label={l.teamSizeMinLabel}
            />
          </div>

          {/* Max team size */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              {l.teamSizeMaxLabel}
            </label>
            <NumberPicker
              value={Number(settings.teamSizeMax) || 1}
              onChange={(v) => update({ teamSizeMax: String(v) })}
              min={1}
              max={10}
              label={l.teamSizeMaxLabel}
            />
          </div>

          {/* Expiry */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              {l.expiryLabel}
            </label>
            <Input
              type="date"
              value={settings.expiresAt}
              onChange={(e) => update({ expiresAt: e.target.value })}
              min={new Date().toISOString().slice(0, 10)}
              className="h-8"
            />
          </div>

          {/* N-sequential */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              {l.sequentialCountLabel}
            </label>
            <NumberPicker
              value={settings.sequentialCount}
              onChange={(v) => update({ sequentialCount: v })}
              min={1}
              max={10}
              label={l.sequentialCountLabel}
            />
          </div>

          {/* Auto-accept */}
          <div className="flex items-center gap-3 sm:col-span-2">
            <Switch
              id="auto-accept-toggle"
              checked={settings.autoAccept}
              onCheckedChange={(checked) => update({ autoAccept: checked })}
            />
            <label htmlFor="auto-accept-toggle" className="text-sm font-medium">
              {l.autoAcceptLabel}
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
