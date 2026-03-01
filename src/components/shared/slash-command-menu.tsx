"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Clock, MapPin, Wrench, FileText } from "lucide-react";
import type { SlashCommand } from "@/lib/slash-commands/registry";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Clock,
  MapPin,
  Wrench,
  FileText,
};

interface SlashCommandMenuProps {
  commands: SlashCommand[];
  selectedIndex: number;
  position: { top: number; left: number };
  onSelect: (command: SlashCommand) => void;
  onClose?: () => void;
}

export function SlashCommandMenu({
  commands,
  selectedIndex,
  position,
  onSelect,
  onClose,
}: SlashCommandMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Auto-close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose?.();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

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
      className="fixed z-50 w-64 rounded-lg border bg-popover p-1 shadow-lg"
      style={{ top: position.top, left: position.left }}
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
            onMouseDown={(e) => {
              // Prevent blur on textarea
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
