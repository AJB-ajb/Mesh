"use client";

import { useState, useCallback } from "react";
import { MapPin } from "lucide-react";

import { labels } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { LocationData } from "@/lib/supabase/types";

interface CreateLocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: LocationData) => void;
  suggestedLabel?: string;
}

export function CreateLocationDialog({
  open,
  onOpenChange,
  onSubmit,
  suggestedLabel,
}: CreateLocationDialogProps) {
  const [label, setLabel] = useState(suggestedLabel ?? "");

  const canSubmit = label.trim().length > 0;

  const handleSubmit = useCallback(() => {
    if (!canSubmit) return;
    const locationData: LocationData = {
      label: label.trim(),
      options: [
        { label: "Confirm", votes: [] },
        { label: "Suggest different", votes: [] },
      ],
      lat: null,
      lng: null,
    };
    onSubmit(locationData);
    setLabel("");
    onOpenChange(false);
  }, [canSubmit, label, onSubmit, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="size-4" />
            {labels.cards.createLocation}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <label
              htmlFor="location-label"
              className="text-sm font-medium mb-1.5 block"
            >
              {labels.cards.locationLabel}
            </label>
            <Input
              id="location-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={labels.cards.locationLabelPlaceholder}
              autoFocus
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {labels.cards.cancel}
          </Button>
          <Button disabled={!canSubmit} onClick={handleSubmit}>
            {labels.cards.createLocationSubmit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
