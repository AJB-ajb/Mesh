"use client";

import { useState, useCallback, useRef } from "react";
import {
  filterCommands,
  SLASH_COMMANDS,
  type SlashCommand,
} from "@/lib/slash-commands/registry";
import type { OverlayResult } from "@/components/shared/slash-command-overlays";

interface UseSlashCommandsOptions {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (newValue: string) => void;
}

export interface UseSlashCommandsReturn {
  menuOpen: boolean;
  menuPosition: { top: number; left: number } | null;
  filteredCommands: SlashCommand[];
  selectedIndex: number;
  activeOverlay: string | null;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onSelect: (command: SlashCommand) => void;
  closeOverlay: () => void;
  handleOverlayResult: (result: string | OverlayResult) => void;
  checkForSlashCommand: () => void;
}

/**
 * Detects `/` trigger in a textarea, manages a slash-command popup menu,
 * and dispatches to overlay pickers for action commands.
 */
export function useSlashCommands({
  textareaRef,
  value,
  onChange,
}: UseSlashCommandsOptions): UseSlashCommandsReturn {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeOverlay, setActiveOverlay] = useState<string | null>(null);

  // Track where the `/` trigger started so we can replace the command text
  const slashStartRef = useRef<number | null>(null);

  const filteredCommands =
    query === "" ? SLASH_COMMANDS : filterCommands(query);

  /**
   * Extracts the slash-command query from the current textarea value and
   * cursor position. Returns null if no valid slash trigger is found.
   */
  const getSlashQuery = useCallback(
    (cursorPos: number): string | null => {
      // Search backwards from cursor for the `/` character
      const textBeforeCursor = value.slice(0, cursorPos);

      // Find the last `/` that could be a command trigger
      let slashPos = -1;
      for (let i = textBeforeCursor.length - 1; i >= 0; i--) {
        if (textBeforeCursor[i] === "/") {
          slashPos = i;
          break;
        }
        // Stop searching if we hit whitespace or newline (query can't contain spaces)
        if (/\s/.test(textBeforeCursor[i]!)) {
          break;
        }
      }

      if (slashPos === -1) return null;

      // `/` must be at start of line or after whitespace
      if (slashPos > 0 && !/\s/.test(textBeforeCursor[slashPos - 1]!)) {
        return null;
      }

      const queryText = textBeforeCursor.slice(slashPos + 1);

      // No spaces allowed in the command name
      if (/\s/.test(queryText)) return null;

      slashStartRef.current = slashPos;
      return queryText;
    },
    [value],
  );

  /**
   * Calculate approximate menu position based on textarea and cursor.
   */
  const computeMenuPosition = useCallback((): {
    top: number;
    left: number;
  } | null => {
    const textarea = textareaRef.current;
    if (!textarea) return null;

    const rect = textarea.getBoundingClientRect();
    const { selectionStart } = textarea;

    // Create a hidden mirror element to measure cursor position
    const mirror = document.createElement("div");
    const style = window.getComputedStyle(textarea);

    mirror.style.position = "absolute";
    mirror.style.visibility = "hidden";
    mirror.style.whiteSpace = "pre-wrap";
    mirror.style.wordWrap = "break-word";
    mirror.style.width = style.width;
    mirror.style.fontFamily = style.fontFamily;
    mirror.style.fontSize = style.fontSize;
    mirror.style.lineHeight = style.lineHeight;
    mirror.style.padding = style.padding;
    mirror.style.border = style.border;
    mirror.style.boxSizing = style.boxSizing;

    const textBeforeCursor = textarea.value.slice(0, selectionStart);
    const span = document.createElement("span");
    mirror.textContent = textBeforeCursor;
    span.textContent = "|";
    mirror.appendChild(span);

    document.body.appendChild(mirror);

    const spanRect = span.getBoundingClientRect();
    const mirrorRect = mirror.getBoundingClientRect();

    const top =
      rect.top +
      (spanRect.top - mirrorRect.top) -
      textarea.scrollTop +
      parseInt(style.lineHeight, 10);
    const left =
      rect.left + (spanRect.left - mirrorRect.left) - textarea.scrollLeft;

    document.body.removeChild(mirror);

    return { top, left: Math.max(left, rect.left) };
  }, [textareaRef]);

  /**
   * Called after value changes (e.g., from an onChange handler) to check
   * if a slash command trigger is active.
   */
  const checkForSlashCommand = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursorPos = textarea.selectionStart;
    const q = getSlashQuery(cursorPos);

    if (q !== null) {
      setQuery(q);
      setSelectedIndex(0);
      setMenuPosition(computeMenuPosition());
      setMenuOpen(true);
    } else {
      setMenuOpen(false);
      setQuery("");
      slashStartRef.current = null;
    }
  }, [textareaRef, getSlashQuery, computeMenuPosition]);

  /**
   * Remove the `/command` text from the textarea value.
   */
  const removeSlashText = useCallback(
    (cursorPos: number): { newValue: string; insertPos: number } => {
      const start = slashStartRef.current ?? 0;
      const before = value.slice(0, start);
      const after = value.slice(cursorPos);
      return { newValue: before + after, insertPos: start };
    },
    [value],
  );

  /**
   * Select a command: remove the `/command` text, then either insert
   * content or open an overlay.
   */
  const onSelect = useCallback(
    (command: SlashCommand) => {
      const textarea = textareaRef.current;
      const cursorPos = textarea?.selectionStart ?? value.length;

      const { newValue, insertPos } = removeSlashText(cursorPos);

      setMenuOpen(false);
      setQuery("");

      if (command.type === "action") {
        // Store cleaned value so overlay result can be inserted
        onChange(newValue);
        slashStartRef.current = insertPos;
        setActiveOverlay(command.name);
      } else {
        // Content commands would insert text directly (future use)
        onChange(newValue);
      }
    },
    [textareaRef, value, removeSlashText, onChange],
  );

  /**
   * Keyboard handler for when the menu is open.
   */
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (!menuOpen) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < filteredCommands.length - 1 ? prev + 1 : 0,
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredCommands.length - 1,
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          onSelect(filteredCommands[selectedIndex]);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        setMenuOpen(false);
        setQuery("");
        slashStartRef.current = null;
      }
    },
    [menuOpen, filteredCommands, selectedIndex, onSelect],
  );

  const closeOverlay = useCallback(() => {
    setActiveOverlay(null);
  }, []);

  /**
   * Called when an overlay produces a result. Accepts either a plain string or
   * an OverlayResult with display text and optional structured data. Inserts
   * the display text at the position where the command was and closes the overlay.
   */
  const handleOverlayResult = useCallback(
    (result: string | OverlayResult) => {
      const text = typeof result === "string" ? result : result.display;
      const insertPos = slashStartRef.current ?? value.length;
      const before = value.slice(0, insertPos);
      const after = value.slice(insertPos);
      const newValue = before + text + after;
      onChange(newValue);
      setActiveOverlay(null);
      slashStartRef.current = null;
    },
    [value, onChange],
  );

  return {
    menuOpen,
    menuPosition,
    filteredCommands,
    selectedIndex,
    activeOverlay,
    onKeyDown,
    onSelect,
    closeOverlay,
    handleOverlayResult,
    checkForSlashCommand,
  };
}
