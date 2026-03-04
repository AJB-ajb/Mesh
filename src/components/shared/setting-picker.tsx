"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";

export interface SettingOption {
  label: string;
  value: string;
}

interface SettingPickerProps {
  title: string;
  options: SettingOption[];
  currentValue?: string;
  position: { top: number; left: number };
  onSelect: (value: string) => void;
  onClose: () => void;
}

export function SettingPicker({
  title,
  options,
  currentValue,
  position,
  onSelect,
  onClose,
}: SettingPickerProps) {
  const [selectedIndex, setSelectedIndex] = useState(() => {
    const idx = options.findIndex((o) => o.value === currentValue);
    return idx >= 0 ? idx : 0;
  });
  const menuRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((i) => (i + 1) % options.length);
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((i) => (i - 1 + options.length) % options.length);
          break;
        case "Enter":
          e.preventDefault();
          onSelect(options[selectedIndex].value);
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
      }
    },
    [options, selectedIndex, onSelect, onClose],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  // Scroll selected into view
  useEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;
    const selected = menu.querySelector('[data-selected="true"]');
    if (selected) selected.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  const picker = (
    <div
      ref={menuRef}
      role="listbox"
      className="fixed z-50 w-56 rounded-lg border bg-popover p-1 shadow-lg"
      style={{ top: position.top, left: position.left }}
    >
      <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground">
        {title}
      </div>
      {options.map((option, index) => {
        const isSelected = index === selectedIndex;
        const isCurrent = option.value === currentValue;

        return (
          <button
            key={option.value}
            role="option"
            aria-selected={isSelected}
            data-selected={isSelected}
            className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors ${
              isSelected
                ? "bg-accent text-accent-foreground"
                : "hover:bg-accent/50"
            }`}
            onMouseDown={(e) => {
              e.preventDefault();
              onSelect(option.value);
            }}
          >
            <span>{option.label}</span>
            {isCurrent && (
              <span className="text-xs text-muted-foreground">(current)</span>
            )}
          </button>
        );
      })}
    </div>
  );

  return createPortal(picker, document.body);
}
