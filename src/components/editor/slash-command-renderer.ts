import {
  filterCommands,
  SLASH_COMMANDS,
  type SlashCommand,
} from "@/lib/slash-commands/registry";

export interface SlashCommandSuggestionState {
  isOpen: boolean;
  query: string;
  commands: SlashCommand[];
  selectedIndex: number;
  clientRect: (() => DOMRect | null) | null;
}

/**
 * Create a Tiptap suggestion config that manages slash command state
 * and delegates selection to an external handler. The returned object
 * contains both the `suggestion` config (passed to SlashCommandExtension)
 * and a `selectCommand` helper for programmatic (mouse-click) selection.
 */
export function createSlashCommandSuggestion(
  onStateChange: (state: SlashCommandSuggestionState) => void,
  onSelectCommand: (command: SlashCommand) => void,
) {
  let state: SlashCommandSuggestionState = {
    isOpen: false,
    query: "",
    commands: [],
    selectedIndex: 0,
    clientRect: null,
  };

  // Store the command function from the suggestion plugin so mouse-clicks
  // can also trigger proper cleanup of the trigger text.
  let executeCommand: ((command: SlashCommand) => void) | null = null;

  const suggestion = {
    char: "/",

    items: ({ query }: { query: string }) => {
      return query === "" ? SLASH_COMMANDS : filterCommands(query);
    },

    // Called when a command is executed (by Enter keypress or programmatic call).
    // Deletes the trigger text and forwards the selected command.
    command: ({
      editor,
      range,
      props,
    }: {
      editor: { chain: () => { focus: () => { deleteRange: (r: unknown) => { run: () => void } } } };
      range: unknown;
      props: SlashCommand;
    }) => {
      editor.chain().focus().deleteRange(range).run();
      onSelectCommand(props);
    },

    render: () => ({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onStart: (props: any) => {
        executeCommand = (cmd: SlashCommand) => props.command(cmd);
        state = {
          isOpen: true,
          query: props.query,
          commands: props.items,
          selectedIndex: 0,
          clientRect: props.clientRect,
        };
        onStateChange(state);
      },

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onUpdate: (props: any) => {
        executeCommand = (cmd: SlashCommand) => props.command(cmd);
        state = {
          ...state,
          query: props.query,
          commands: props.items,
          clientRect: props.clientRect,
        };
        onStateChange(state);
      },

      onKeyDown: ({ event }: { event: KeyboardEvent }) => {
        if (event.key === "ArrowDown") {
          state = {
            ...state,
            selectedIndex:
              (state.selectedIndex + 1) % Math.max(1, state.commands.length),
          };
          onStateChange(state);
          return true;
        }

        if (event.key === "ArrowUp") {
          state = {
            ...state,
            selectedIndex:
              (state.selectedIndex - 1 + state.commands.length) %
              Math.max(1, state.commands.length),
          };
          onStateChange(state);
          return true;
        }

        if (event.key === "Enter") {
          const cmd = state.commands[state.selectedIndex];
          if (cmd && executeCommand) {
            executeCommand(cmd);
          }
          return true;
        }

        if (event.key === "Escape") {
          state = { ...state, isOpen: false };
          onStateChange(state);
          return true;
        }

        return false;
      },

      onExit: () => {
        state = { ...state, isOpen: false };
        onStateChange(state);
        executeCommand = null;
      },
    }),
  };

  return {
    /** Pass this to SlashCommandExtension.configure({ suggestion }) */
    suggestion,
    /** Call this from a menu's onSelect handler for mouse clicks */
    selectCommand: (cmd: SlashCommand) => executeCommand?.(cmd),
  };
}
