"use client";

import { useState } from "react";
import { CalendarCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { RichCard } from "./rich-card";
import type { CardData, RsvpOption } from "./mock-data";

type RsvpCardProps = {
  card: CardData;
};

export function RsvpCard({ card }: RsvpCardProps) {
  const [selected, setSelected] = useState<RsvpOption | null>(null);

  if (!card.rsvpCounts) return null;

  const counts = { ...card.rsvpCounts };
  if (selected === "yes") counts.yes += 1;
  if (selected === "maybe") counts.maybe += 1;
  if (selected === "no") counts.no += 1;

  const options: { key: RsvpOption; label: string }[] = [
    { key: "yes", label: "Yes" },
    { key: "no", label: "No" },
    { key: "maybe", label: "Maybe" },
  ];

  return (
    <RichCard
      icon={<CalendarCheck className="size-4 text-primary" />}
      title={`RSVP — ${card.eventTime ?? "Event"}`}
    >
      <div className="flex gap-2">
        {options.map((opt) => (
          <Button
            key={opt.key}
            variant={selected === opt.key ? "default" : "outline"}
            size="sm"
            className={cn(
              "flex-1 min-h-[44px]",
              selected === opt.key &&
                opt.key === "yes" &&
                "bg-green-600 hover:bg-green-700",
              selected === opt.key &&
                opt.key === "no" &&
                "bg-red-600 hover:bg-red-700",
              selected === opt.key &&
                opt.key === "maybe" &&
                "bg-amber-600 hover:bg-amber-700",
            )}
            onClick={() =>
              setSelected((prev) => (prev === opt.key ? null : opt.key))
            }
          >
            {opt.label}
          </Button>
        ))}
      </div>
      <div className="flex gap-4 text-xs text-muted-foreground pt-1">
        <span>{counts.yes} yes</span>
        <span>{counts.no} no</span>
        <span>{counts.maybe} maybe</span>
      </div>
    </RichCard>
  );
}
