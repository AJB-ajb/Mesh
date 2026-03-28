"use client";

import {
  Clock,
  MapPin,
  Wrench,
  FileText,
  Lock,
  Users,
  Eye,
  CalendarClock,
  CheckCircle,
  UserPlus,
  Sparkles,
  Eraser,
  HelpCircle,
  CalendarDays,
  RefreshCw,
  Pencil,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { labels } from "@/lib/labels";
import type {
  SlashCommand,
  SlashCommandType,
} from "@/lib/slash-commands/registry";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Clock,
  MapPin,
  Wrench,
  FileText,
  Lock,
  Users,
  Eye,
  CalendarClock,
  CheckCircle,
  UserPlus,
  Sparkles,
  Eraser,
  HelpCircle,
  CalendarDays,
  RefreshCw,
  Pencil,
};

const TYPE_ORDER: SlashCommandType[] = [
  "action",
  "content",
  "setting",
  "immediate",
];

const TYPE_LABELS: Record<SlashCommandType, string> = {
  action: "Actions",
  content: "Content",
  setting: "Settings",
  immediate: "Immediate",
};

interface MobileCommandSheetProps {
  open: boolean;
  commands: SlashCommand[];
  onSelect: (command: SlashCommand) => void;
  onClose: () => void;
}

export function MobileCommandSheet({
  open,
  commands,
  onSelect,
  onClose,
}: MobileCommandSheetProps) {
  // Group commands by type
  const grouped = TYPE_ORDER.map((type) => ({
    type,
    label: TYPE_LABELS[type],
    commands: commands.filter((c) => c.type === type),
  })).filter((g) => g.commands.length > 0);

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="max-h-[70vh]">
        <SheetHeader>
          <SheetTitle>{labels.mobileCommandSheet.title}</SheetTitle>
        </SheetHeader>
        <div className="overflow-y-auto px-4 pb-4">
          {grouped.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              {labels.slashCommands.noResults}
            </p>
          )}
          {grouped.map((group) => (
            <div key={group.type} className="mb-3">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {group.label}
              </p>
              {group.commands.map((command) => {
                const Icon = ICON_MAP[command.icon];
                return (
                  <button
                    key={command.name}
                    className="flex w-full items-center gap-3 rounded-md px-3 py-3 text-left text-sm transition-colors hover:bg-accent/50 active:bg-accent"
                    onClick={() => {
                      onSelect(command);
                      onClose();
                    }}
                  >
                    {Icon && (
                      <Icon className="size-5 shrink-0 text-muted-foreground" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">/{command.name}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {command.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
