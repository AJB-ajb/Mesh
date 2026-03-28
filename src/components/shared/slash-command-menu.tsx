"use client";

import { useEffect, useRef, useState, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
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
import type { SlashCommand } from "@/lib/slash-commands/registry";

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

interface SlashCommandMenuProps {
  commands: SlashCommand[];
  selectedIndex: number;
  /** Cursor coordinates — menu flips above when insufficient space below */
  anchor: { top: number; bottom: number; left: number };
  onSelect: (command: SlashCommand) => void;
  onClose?: () => void;
}

export function SlashCommandMenu({
  commands,
  selectedIndex,
  anchor,
  onSelect,
  onClose,
}: SlashCommandMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<{ top: number; left: number }>({
    top: anchor.bottom + 4,
    left: anchor.left,
  });

  // Auto-close on outside click (pointerdown for touch + mouse)
  useEffect(() => {
    function handleClickOutside(e: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose?.();
      }
    }

    document.addEventListener("pointerdown", handleClickOutside);
    return () =>
      document.removeEventListener("pointerdown", handleClickOutside);
  }, [onClose]);

  // Measure menu and flip above cursor when insufficient space below
  useLayoutEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;
    const rect = menu.getBoundingClientRect();
    const spaceBelow = window.innerHeight - anchor.bottom - 8;
    if (rect.height > spaceBelow && anchor.top > rect.height + 8) {
      // Flip above: position bottom edge at cursor top
      setPlacement({ top: anchor.top - rect.height - 4, left: anchor.left });
    } else {
      setPlacement({ top: anchor.bottom + 4, left: anchor.left });
    }
  }, [anchor, commands.length]);

  // Scroll selected item into view
  useEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;
    const selected = menu.querySelector('[data-selected="true"]');
    if (selected && typeof selected.scrollIntoView === "function") {
      selected.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  if (commands.length === 0) return null;

  const menu = (
    <div
      ref={menuRef}
      role="listbox"
      className="fixed z-50 w-64 max-h-[min(400px,50vh)] overflow-y-auto rounded-lg border bg-popover p-1 shadow-lg"
      style={{ top: placement.top, left: placement.left }}
    >
      {commands.map((command, index) => {
        const Icon = ICON_MAP[command.icon];
        const isSelected = index === selectedIndex;

        return (
          <button
            key={command.name}
            role="option"
            aria-selected={isSelected}
            data-selected={isSelected}
            className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm transition-colors ${
              isSelected
                ? "bg-accent text-accent-foreground"
                : "hover:bg-accent/50"
            }`}
            onPointerDown={(e) => {
              // Prevent blur on textarea (works for touch + mouse)
              e.preventDefault();
              onSelect(command);
            }}
          >
            {Icon && (
              <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
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
  );

  return createPortal(menu, document.body);
}
