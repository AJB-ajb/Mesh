"use client";

import { useState, useCallback, useMemo } from "react";
import {
  createSlashCommandSuggestion,
  type SlashCommandSuggestionState,
} from "@/components/editor/slash-command-renderer";
import type { SlashCommand } from "@/lib/slash-commands/registry";
import type { Editor } from "@tiptap/core";

export interface UseEditorSlashCommandsReturn {
  /** Slash command suggestion config for the SlashCommandExtension */
  suggestionConfig: ReturnType<typeof createSlashCommandSuggestion>;
  /** Current slash menu state */
  menuState: SlashCommandSuggestionState;
  /** Currently active overlay (e.g. "time", "location") */
  activeOverlay: string | null;
  /** Close the active overlay */
  closeOverlay: () => void;
  /** Handle overlay result -- inserts text at the editor cursor */
  handleOverlayResult: (text: string) => void;
}

export function useEditorSlashCommands(
  editorRef: React.RefObject<Editor | null>,
): UseEditorSlashCommandsReturn {
  const [menuState, setMenuState] = useState<SlashCommandSuggestionState>({
    isOpen: false,
    query: "",
    commands: [],
    selectedIndex: 0,
    clientRect: null,
  });
  const [activeOverlay, setActiveOverlay] = useState<string | null>(null);

  const handleSelect = useCallback(
    (command: SlashCommand) => {
      setMenuState((prev) => ({ ...prev, isOpen: false }));

      if (command.type === "action") {
        setActiveOverlay(command.name);
      }
    },
    [],
  );

  const handleStateChange = useCallback(
    (state: SlashCommandSuggestionState) => {
      setMenuState(state);
    },
    [],
  );

  const suggestionConfig = useMemo(
    () => createSlashCommandSuggestion(handleStateChange, handleSelect),
    [handleStateChange, handleSelect],
  );

  const closeOverlay = useCallback(() => {
    setActiveOverlay(null);
  }, []);

  const handleOverlayResult = useCallback(
    (text: string) => {
      const editor = editorRef.current;
      if (editor) {
        editor.chain().focus().insertContent(text).run();
      }
      setActiveOverlay(null);
    },
    [editorRef],
  );

  return {
    suggestionConfig,
    menuState,
    activeOverlay,
    closeOverlay,
    handleOverlayResult,
  };
}
