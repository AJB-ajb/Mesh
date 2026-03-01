import { Extension } from "@tiptap/core";
import Suggestion, { type SuggestionOptions } from "@tiptap/suggestion";

export interface SlashCommandExtensionOptions {
  suggestion: Partial<SuggestionOptions>;
}

export const SlashCommandExtension =
  Extension.create<SlashCommandExtensionOptions>({
    name: "slashCommand",

    addOptions() {
      return {
        suggestion: {
          char: "/",
          startOfLine: false,
          allowSpaces: false,
        },
      };
    },

    addProseMirrorPlugins() {
      return [
        Suggestion({
          editor: this.editor,
          ...this.options.suggestion,
        }),
      ];
    },
  });
