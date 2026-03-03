"use client";

import { useState, useCallback, useMemo } from "react";
import {
  slashCommandPlugin,
  selectSlashCommand,
  dispatchCloseSlashMenu,
  type SlashMenuState,
} from "@/components/editor/extensions/slash-command-plugin";
import type { SlashCommand } from "@/lib/slash-commands/registry";
import type { EditorView } from "@codemirror/view";
import type { Extension } from "@codemirror/state";

export interface UseEditorSlashCommandsReturn {
  /** CodeMirror extension for slash commands */
  slashExtension: Extension;
  /** Current slash menu state */
  menuState: SlashMenuState;
  /** Select a command (for mouse clicks on menu items) */
  selectCommand: (view: EditorView, command: SlashCommand) => void;
  /** Currently active overlay (e.g. "time", "location") */
  activeOverlay: string | null;
  /** Close the active overlay */
  closeOverlay: () => void;
  /** Close the CM slash menu state AND reset React state (menu + overlay) */
  closeMenu: (view: EditorView | null) => void;
  /** Handle overlay result -- inserts text at the editor cursor */
  handleOverlayResult: (view: EditorView, text: string) => void;
}

/** Map of content command names to the text they insert at cursor. */
const CONTENT_INSERTS: Record<string, { text: string; cursorOffset: number }> =
  {
    hidden: { text: "||\n\n||", cursorOffset: 3 },
  };

export function useEditorSlashCommands(): UseEditorSlashCommandsReturn {
  const [menuState, setMenuState] = useState<SlashMenuState>({
    isOpen: false,
    query: "",
    commands: [],
    selectedIndex: 0,
    from: 0,
    to: 0,
  });
  const [activeOverlay, setActiveOverlay] = useState<string | null>(null);

  const handleSelect = useCallback(
    (command: SlashCommand, view?: EditorView) => {
      setMenuState((prev) => ({ ...prev, isOpen: false }));
      if (command.type === "action") {
        setActiveOverlay(command.name);
      } else if (command.type === "content" && view) {
        const insert = CONTENT_INSERTS[command.name];
        if (insert) {
          const pos = view.state.selection.main.head;
          view.dispatch({
            changes: { from: pos, to: pos, insert: insert.text },
            selection: { anchor: pos + insert.cursorOffset },
          });
          view.focus();
        }
      }
    },
    [],
  );

  const handleStateChange = useCallback((state: SlashMenuState) => {
    setMenuState(state);
  }, []);

  const slashExtension = useMemo(
    () =>
      slashCommandPlugin({
        onStateChange: handleStateChange,
        onSelectCommand: handleSelect,
      }),
    [handleStateChange, handleSelect],
  );

  const closeOverlay = useCallback(() => {
    setActiveOverlay(null);
  }, []);

  const closeMenu = useCallback((view: EditorView | null) => {
    if (view) dispatchCloseSlashMenu(view);
    setMenuState((prev) => ({ ...prev, isOpen: false }));
    setActiveOverlay(null);
  }, []);

  const handleOverlayResult = useCallback((view: EditorView, text: string) => {
    const pos = view.state.selection.main.head;
    view.dispatch({
      changes: { from: pos, to: pos, insert: text },
    });
    view.focus();
    setActiveOverlay(null);
  }, []);

  const selectCommandFromMenu = useCallback(
    (view: EditorView, command: SlashCommand) => {
      selectSlashCommand(view);
      handleSelect(command, view);
    },
    [handleSelect],
  );

  return {
    slashExtension,
    menuState,
    selectCommand: selectCommandFromMenu,
    activeOverlay,
    closeOverlay,
    closeMenu,
    handleOverlayResult,
  };
}
