"use client";

import { Calendar } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { labels } from "@/lib/labels";
import { CalendarConnect } from "./calendar-connect";

type CalendarSettingsCardProps = {
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
};

export function CalendarSettingsCard({
  onError,
  onSuccess,
}: CalendarSettingsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          {labels.calendar.settingsTitle}
        </CardTitle>
        <CardDescription>{labels.calendar.settingsDescription}</CardDescription>
      </CardHeader>
      <CardContent>
        <CalendarConnect onError={onError} onSuccess={onSuccess} />
      </CardContent>
    </Card>
  );
}
