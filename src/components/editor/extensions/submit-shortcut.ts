import { Extension } from "@tiptap/core";

export interface SubmitShortcutOptions {
  onSubmit?: () => void;
}

export const SubmitShortcut = Extension.create<SubmitShortcutOptions>({
  name: "submitShortcut",

  addOptions() {
    return { onSubmit: undefined };
  },

  addKeyboardShortcuts() {
    return {
      "Mod-Enter": () => {
        this.options.onSubmit?.();
        return true;
      },
    };
  },
});
