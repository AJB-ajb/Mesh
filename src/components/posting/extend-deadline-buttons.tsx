"use client";

import { useState } from "react";
import { CalendarPlus, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DEADLINES } from "@/lib/constants";

const EXTEND_OPTIONS = DEADLINES.EXTEND_OPTIONS.map((days) => ({
  label: `${days} days`,
  days,
}));

export function ExtendDeadlineButtons({
  isExtending,
  onExtend,
}: {
  isExtending: boolean;
  onExtend: (days: number) => void;
}) {
  const [selectedDays, setSelectedDays] = useState<number | null>(null);

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {EXTEND_OPTIONS.map((opt) => (
        <Button
          key={opt.days}
          size="sm"
          variant={selectedDays === opt.days ? "default" : "outline"}
          disabled={isExtending}
          onClick={() => {
            setSelectedDays(opt.days);
            onExtend(opt.days);
          }}
        >
          {isExtending && selectedDays === opt.days ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <CalendarPlus className="h-3 w-3" />
          )}
          +{opt.label}
        </Button>
      ))}
    </div>
  );
}
